import type { Page, Route } from '@playwright/test';
import {
  OpsDriverDetail,
  OpsDriverListResponse,
  OpsDriverRow,
  RecordRemittanceDTO,
  RemittanceHistoryResponse,
  RemittanceResult,
  SettlementReportResponse,
  SettlementRemittanceEntry,
  SettlementReportRow,
  addDays,
  isMonday,
  settlementToday,
  settlementWeekOf,
} from '@voyyaa/shared';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-expose-headers': 'content-disposition',
};

export async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  });
}

export async function fulfillDomainError(
  route: Route,
  status: number,
  code: string,
  message: string,
): Promise<void> {
  await fulfillJson(route, status, { code, message });
}

export function currentWeekRange(): { from: string; to: string } {
  return settlementWeekOf(settlementToday(new Date()));
}

export function lastWeekRange(): { from: string; to: string } {
  const current = currentWeekRange();
  return { from: addDays(current.from, -7), to: addDays(current.to, -7) };
}

export function settlementRow(overrides: Partial<SettlementReportRow> = {}): SettlementReportRow {
  return SettlementReportRow.parse({
    driver_id: 1,
    driver_name: 'Carlos Mejía',
    national_id: '1037000111',
    plate: 'ABC101',
    trip_count: 12,
    cash_collected: 300_000,
    commission: 30_000,
    driver_net: 270_000,
    amount_to_remit: 30_000,
    pending_cash_trip_count: 0,
    pending_cash_amount: 0,
    remittance: null,
    ...overrides,
  });
}

export const DEFAULT_SETTLEMENT_ROWS: SettlementReportRow[] = [
  settlementRow(),
  settlementRow({
    driver_id: 2,
    driver_name: 'Diana Ríos',
    national_id: '1037000222',
    plate: 'ABC102',
    trip_count: 8,
    cash_collected: 160_000,
    commission: 16_000,
    driver_net: 144_000,
    amount_to_remit: 16_000,
    pending_cash_trip_count: 2,
    pending_cash_amount: 24_000,
  }),
  settlementRow({
    driver_id: 3,
    driver_name: 'Luis Ospina',
    national_id: '1037000333',
    plate: 'ABC103',
    trip_count: 5,
    cash_collected: 80_000,
    commission: 8_000,
    driver_net: 72_000,
    amount_to_remit: 8_000,
  }),
];

export interface QueuedFailure {
  status: number;
  code?: string;
  message?: string;
  network?: boolean;
}

export interface SettlementMock {
  reportQueries: URLSearchParams[];
  exportQueries: URLSearchParams[];
  recordedBodies: unknown[];
  reversalIds: number[];
  entries: SettlementRemittanceEntry[];
  setRows: (rows: SettlementReportRow[]) => void;
  setReportFailure: (failure: QueuedFailure | null) => void;
  failNextExport: (failure: QueuedFailure) => void;
  failNextRecord: (failure: QueuedFailure) => void;
  failNextReversal: (failure: QueuedFailure) => void;
  seedEntry: (entry: Partial<SettlementRemittanceEntry> & { driver_id: number }) => void;
}

const CSV_BODY = '﻿Empresa;Cootrayal\r\nDesde;2026-01-01\r\n';

async function failWith(route: Route, failure: QueuedFailure): Promise<void> {
  if (failure.network) {
    await route.abort('failed');
    return;
  }
  await fulfillDomainError(
    route,
    failure.status,
    failure.code ?? 'INTERNAL',
    failure.message ?? 'Fallo simulado',
  );
}

function summaryFor(
  row: SettlementReportRow,
  entries: SettlementRemittanceEntry[],
  weekStart: string,
): SettlementReportRow['remittance'] {
  const mine = entries.filter(
    (entry) => entry.driver_id === row.driver_id && entry.week_start === weekStart,
  );
  const remitted = mine.reduce(
    (sum, entry) => sum + (entry.kind === 'remittance' ? entry.amount : -entry.amount),
    0,
  );
  const last = mine.filter((entry) => entry.kind === 'remittance').at(-1);
  return {
    remitted_amount: remitted,
    balance: row.amount_to_remit - remitted,
    last_remitted_at: last?.recorded_at ?? null,
  };
}

export async function mockSettlement(
  page: Page,
  initialRows: SettlementReportRow[] = DEFAULT_SETTLEMENT_ROWS,
): Promise<SettlementMock> {
  let rows = initialRows;
  let nextId = 100;
  let reportFailure: QueuedFailure | null = null;
  const queued: Record<'export' | 'record' | 'reversal', QueuedFailure[]> = {
    export: [],
    record: [],
    reversal: [],
  };
  const mock: SettlementMock = {
    reportQueries: [],
    exportQueries: [],
    recordedBodies: [],
    reversalIds: [],
    entries: [],
    setRows: (next) => {
      rows = next;
    },
    setReportFailure: (failure) => {
      reportFailure = failure;
    },
    failNextExport: (failure) => queued.export.push(failure),
    failNextRecord: (failure) => queued.record.push(failure),
    failNextReversal: (failure) => queued.reversal.push(failure),
    seedEntry: (entry) => {
      nextId += 1;
      mock.entries.push(
        SettlementRemittanceEntry.parse({
          remittance_id: nextId,
          week_start: lastWeekRange().from,
          kind: 'remittance',
          amount: 30_000,
          recorded_by: { user_id: 9, name: 'Admin Cootrayal' },
          recorded_at: new Date().toISOString(),
          reverses_remittance_id: null,
          reversed: false,
          ...entry,
        }),
      );
    },
  };

  await page.route(/\/admin\/reports\/settlement(\/.*)?(\?.*)?$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith('/settlement/export')) {
      mock.exportQueries.push(url.searchParams);
      const failure = queued.export.shift();
      if (failure) return failWith(route, failure);
      const from = url.searchParams.get('from') ?? '';
      const to = url.searchParams.get('to') ?? '';
      return route.fulfill({
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="conciliacion_cootrayal_${from}_${to}.csv"`,
        },
        body: CSV_BODY,
      });
    }

    if (path.endsWith('/settlement/remittances') && request.method() === 'POST') {
      const failure = queued.record.shift();
      if (failure) return failWith(route, failure);
      const body = RecordRemittanceDTO.parse(request.postDataJSON());
      mock.recordedBodies.push(body);
      const row = rows.find((candidate) => candidate.driver_id === body.driver_id);
      if (!row) return fulfillDomainError(route, 404, 'DRIVER_NOT_FOUND', 'No existe');
      const balance = summaryFor(row, mock.entries, body.week_start)?.balance ?? 0;
      if (balance <= 0)
        return fulfillDomainError(route, 409, 'NOTHING_TO_REMIT', 'Nada por remitir');
      if (body.expected_amount !== balance) {
        return fulfillDomainError(route, 409, 'SETTLEMENT_BALANCE_CHANGED', 'El saldo cambió');
      }
      nextId += 1;
      const entry = SettlementRemittanceEntry.parse({
        remittance_id: nextId,
        driver_id: body.driver_id,
        week_start: body.week_start,
        kind: 'remittance',
        amount: balance,
        recorded_by: { user_id: 9, name: 'Admin Cootrayal' },
        recorded_at: new Date().toISOString(),
        reverses_remittance_id: null,
        reversed: false,
      });
      mock.entries.push(entry);
      return fulfillJson(
        route,
        200,
        RemittanceResult.parse({
          entry,
          idempotent: false,
          summary: summaryFor(row, mock.entries, body.week_start),
        }),
      );
    }

    if (path.endsWith('/reversal') && request.method() === 'POST') {
      const failure = queued.reversal.shift();
      if (failure) return failWith(route, failure);
      const id = Number(/remittances\/(\d+)\/reversal/.exec(path)?.[1]);
      mock.reversalIds.push(id);
      const target = mock.entries.find((entry) => entry.remittance_id === id);
      if (!target) return fulfillDomainError(route, 404, 'REMITTANCE_NOT_FOUND', 'No existe');
      if (target.kind === 'reversal' || target.reversed) {
        return fulfillDomainError(route, 409, 'REMITTANCE_NOT_REVERSIBLE', 'No reversible');
      }
      target.reversed = true;
      nextId += 1;
      const reversal = SettlementRemittanceEntry.parse({
        ...target,
        remittance_id: nextId,
        kind: 'reversal',
        reverses_remittance_id: target.remittance_id,
        reversed: false,
        recorded_at: new Date().toISOString(),
      });
      mock.entries.push(reversal);
      const row = rows.find((candidate) => candidate.driver_id === target.driver_id);
      return fulfillJson(
        route,
        200,
        RemittanceResult.parse({
          entry: reversal,
          idempotent: false,
          summary: row
            ? summaryFor(row, mock.entries, target.week_start)
            : { remitted_amount: 0, balance: 0, last_remitted_at: null },
        }),
      );
    }

    if (path.endsWith('/settlement/remittances')) {
      const driverId = Number(url.searchParams.get('driver_id'));
      return fulfillJson(
        route,
        200,
        RemittanceHistoryResponse.parse({
          rows: mock.entries.filter((entry) => entry.driver_id === driverId),
        }),
      );
    }

    mock.reportQueries.push(url.searchParams);
    if (reportFailure) return failWith(route, reportFailure);
    const from = url.searchParams.get('from') ?? '';
    const to = url.searchParams.get('to') ?? '';
    const driverId = url.searchParams.get('driver_id');
    const isWeek = isMonday(from) && addDays(from, 6) === to;
    const visible = rows
      .filter((row) => driverId === null || row.driver_id === Number(driverId))
      .map((row) => ({
        ...row,
        remittance: isWeek ? summaryFor(row, mock.entries, from) : null,
      }));
    const sum = (pick: (row: SettlementReportRow) => number): number =>
      visible.reduce((total, row) => total + pick(row), 0);
    const remitted = isWeek ? sum((row) => row.remittance?.remitted_amount ?? 0) : null;
    return fulfillJson(
      route,
      200,
      SettlementReportResponse.parse({
        from,
        to,
        time_zone: 'America/Bogota',
        week_start: isWeek ? from : null,
        in_progress: to >= settlementToday(new Date()),
        generated_at: new Date().toISOString(),
        rows: visible,
        totals: {
          trip_count: sum((row) => row.trip_count),
          cash_collected: sum((row) => row.cash_collected),
          commission: sum((row) => row.commission),
          driver_net: sum((row) => row.driver_net),
          amount_to_remit: sum((row) => row.amount_to_remit),
          pending_cash_trip_count: sum((row) => row.pending_cash_trip_count),
          pending_cash_amount: sum((row) => row.pending_cash_amount),
          remitted_amount: remitted,
          remittance_balance:
            remitted === null ? null : sum((row) => row.amount_to_remit) - remitted,
        },
      }),
    );
  });

  return mock;
}

export function opsDriverRow(overrides: Partial<OpsDriverRow> = {}): OpsDriverRow {
  return OpsDriverRow.parse({
    driver_id: 1,
    first_name: 'Carlos',
    last_name: 'Mejía',
    national_id: '1037000111',
    phone: '3001112233',
    status: 'available',
    vehicle: { vehicle_id: 1, plate: 'ABC101', model: 'Renault Logan' },
    location_updated_at: new Date().toISOString(),
    location_stale: false,
    pin_delivered_at: new Date().toISOString(),
    pin_status: 'personal',
    temporary_pin_expires_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  });
}

const HOUR_MS = 3_600_000;

export const PIN_DRIVERS: OpsDriverRow[] = [
  opsDriverRow({ driver_id: 1, first_name: 'Carlos', last_name: 'Mejía', pin_status: 'personal' }),
  opsDriverRow({
    driver_id: 2,
    first_name: 'Diana',
    last_name: 'Ríos',
    national_id: '1037000222',
    pin_status: 'temporary',
    temporary_pin_expires_at: new Date(Date.now() + 40 * HOUR_MS).toISOString(),
  }),
  opsDriverRow({
    driver_id: 3,
    first_name: 'Luis',
    last_name: 'Ospina',
    national_id: '1037000333',
    pin_status: 'temporary_expired',
    temporary_pin_expires_at: new Date(Date.now() - 3 * HOUR_MS).toISOString(),
  }),
  opsDriverRow({
    driver_id: 4,
    first_name: 'Marta',
    last_name: 'Gil',
    national_id: '1037000444',
    pin_status: 'not_delivered',
    pin_delivered_at: null,
    status: 'off_shift',
  }),
];

export interface OpsDriversMock {
  drivers: OpsDriverRow[];
  resendCalls: number[];
  failNextResend: (failure: QueuedFailure) => void;
  resendDeliveryFailed: (value: boolean) => void;
}

export async function mockOpsDrivers(
  page: Page,
  drivers: OpsDriverRow[] = PIN_DRIVERS,
): Promise<OpsDriversMock> {
  const queued: QueuedFailure[] = [];
  let deliveryFailed = false;
  const state = drivers.map((driver) => ({ ...driver }));
  const mock: OpsDriversMock = {
    drivers: state,
    resendCalls: [],
    failNextResend: (failure) => queued.push(failure),
    resendDeliveryFailed: (value) => {
      deliveryFailed = value;
    },
  };

  await page.route(/\/admin\/drivers\/\d+\/pin\/resend$/, async (route) => {
    const id = Number(/drivers\/(\d+)\/pin/.exec(route.request().url())?.[1]);
    mock.resendCalls.push(id);
    const failure = queued.shift();
    if (failure) return failWith(route, failure);
    return fulfillJson(route, 200, {
      driver_id: id,
      pin_delivery: deliveryFailed ? 'failed' : 'sent',
      pin_delivered_at: deliveryFailed ? null : new Date().toISOString(),
      temporary_pin_expires_at: new Date(Date.now() + 72 * HOUR_MS).toISOString(),
    });
  });

  await page.route(/\/ops\/drivers(\/\d+)?(\?.*)?$/, async (route) => {
    if (route.request().resourceType() !== 'fetch') return route.continue();
    const url = new URL(route.request().url());
    const match = /\/ops\/drivers\/(\d+)$/.exec(url.pathname);
    const serverTime = new Date().toISOString();
    if (match) {
      const driver = state.find((candidate) => candidate.driver_id === Number(match[1]));
      if (!driver) return fulfillDomainError(route, 404, 'DRIVER_NOT_FOUND', 'No existe');
      return fulfillJson(
        route,
        200,
        OpsDriverDetail.parse({
          ...driver,
          server_time: serverTime,
          license: 'LIC-123456',
          active_trip_request_id: null,
        }),
      );
    }
    return fulfillJson(
      route,
      200,
      OpsDriverListResponse.parse({ server_time: serverTime, rows: state }),
    );
  });

  return mock;
}
