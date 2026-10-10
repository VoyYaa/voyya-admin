import type { Page, Route } from '@playwright/test';

export const BLOCKED_AT_ISO = '2026-10-06T15:32:00.000Z';
export const START_CODE_SENTINEL = '4817';

interface StartBlockRow {
  id: number;
  passenger: string;
  failedAttempts: number;
  blockedAt: string | null;
}

export const START_BLOCK_ROWS: StartBlockRow[] = [
  { id: 9101, passenger: 'Valeria Muñoz', failedAttempts: 0, blockedAt: null },
  { id: 9102, passenger: 'Julián Cardona', failedAttempts: 3, blockedAt: null },
  { id: 9103, passenger: 'Daniela Pérez', failedAttempts: 5, blockedAt: BLOCKED_AT_ISO },
];

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function jsonResponse(route: Route, body: object): Promise<void> {
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });
}

const DRIVER = { driver_id: 7, name: 'Conductor7 Yarumal', plate: 'XYZ777' };

export async function mockStartBlockQueue(page: Page): Promise<void> {
  await page.route(/\/ops\/trip-requests(\?|$)/, async (route) => {
    if (route.request().resourceType() !== 'fetch') {
      await route.continue();
      return;
    }
    await jsonResponse(route, {
      server_time: new Date().toISOString(),
      rows: START_BLOCK_ROWS.map((row) => ({
        trip_request_id: row.id,
        status: 'driver_en_route',
        requested_at: isoMinutesAgo(12),
        status_since: isoMinutesAgo(5),
        passenger_name: row.passenger,
        pickup_address: 'Parque Principal',
        dropoff_address: 'Hospital San Juan de Dios',
        fare_total: 8000,
        driver: DRIVER,
        start_failed_attempts: row.failedAttempts,
        start_blocked_at: row.blockedAt,
      })),
    });
  });

  await page.route(/\/ops\/trip-requests\/\d+$/, async (route) => {
    if (route.request().resourceType() !== 'fetch') {
      await route.continue();
      return;
    }
    const id = Number(/(\d+)$/.exec(route.request().url())?.[1]);
    const row = START_BLOCK_ROWS.find((candidate) => candidate.id === id);
    if (!row) {
      await route.continue();
      return;
    }
    await jsonResponse(route, {
      server_time: new Date().toISOString(),
      trip_request_id: row.id,
      status: 'driver_en_route',
      status_since: isoMinutesAgo(5),
      pickup_address: 'Parque Principal',
      dropoff_address: 'Hospital San Juan de Dios',
      fare: {
        base_fare: 8000,
        night_surcharge: 0,
        holiday_surcharge: 0,
        total: 8000,
        commission: 640,
        currency: 'COP',
      },
      passenger_name: row.passenger,
      passenger_phone_masked: '300***4567',
      driver: DRIVER,
      timeline: {
        requested_at: isoMinutesAgo(12),
        assigned_at: isoMinutesAgo(11),
        arrived_at: isoMinutesAgo(6),
        started_at: null,
        finished_at: null,
      },
      cash_collected_at: null,
      start_failed_attempts: row.failedAttempts,
      start_blocked_at: row.blockedAt,
    });
  });
}
