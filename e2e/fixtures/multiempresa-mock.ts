import type { Page, Route } from '@playwright/test';
import {
  AffiliationApplicationCreated,
  AffiliationMunicipality,
  AffiliationMunicipalityListResponse,
  CompanyCommission,
  CompanyCommissionHistory,
  CompanyDecisionResponse,
  CompanyProfile,
  ConsoleSettings,
  MunicipalityFare,
  MunicipalityFareHistory,
  MunicipalityOperationalParams,
  MunicipalityOperationalParamsHistory,
  PlatformCommissionListResponse,
  PlatformCommissionRow,
  PlatformCompanyDetail,
  PlatformCompanyListResponse,
  PlatformCompanyRow,
  PlatformServiceConfigListResponse,
  PlatformServiceConfigRow,
  UploadedDocument,
} from '@voyyaa/shared';
import { fulfillJson } from './settlement-mock';
import { seedSession, type MockRole } from './session';

export interface QueuedFailure {
  status: number;
  code?: string;
  message?: string;
  network?: boolean;
  extra?: Record<string, unknown>;
}

async function failWith(route: Route, failure: QueuedFailure): Promise<void> {
  if (failure.network) {
    await route.abort('failed');
    return;
  }
  await fulfillJson(route, failure.status, {
    code: failure.code ?? 'INTERNAL',
    message: failure.message ?? 'Fallo simulado',
    ...failure.extra,
  });
}

export function isApiCall(route: Route): boolean {
  return route.request().resourceType() !== 'document';
}

export async function openAs(page: Page, role: MockRole): Promise<void> {
  await seedSession(page, role);
}

const NOW = '2026-10-01T15:30:00.000Z';
const AUTHOR = { user_id: 1, name: 'Ana Ruiz' };

export function fare(overrides: Partial<MunicipalityFare> = {}): MunicipalityFare {
  return MunicipalityFare.parse({
    municipality_fare_id: 11,
    municipality_id: 1,
    service_type: 'taxi',
    base_fare: 8000,
    night_surcharge_pct: 25,
    holiday_surcharge_pct: 25,
    is_official: false,
    official_reference: null,
    origin: 'migrated',
    origin_company_name: 'Cooperativa Norte',
    valid_from: NOW,
    valid_to: null,
    created_by: AUTHOR,
    ...overrides,
  });
}

export function params(
  overrides: Partial<MunicipalityOperationalParams> = {},
): MunicipalityOperationalParams {
  return MunicipalityOperationalParams.parse({
    operational_params_id: 21,
    municipality_id: 1,
    service_type: 'taxi',
    search_radius_km: 5,
    expansion_radius_km: 8,
    acceptance_timeout_sec: 30,
    max_auto_retries: 3,
    tiebreak_window_hours: 2,
    location_stale_min: 10,
    avg_speed_kmh: 25,
    cancellation_window_min: 5,
    no_show_grace_min: 5,
    platform_default_keys: [],
    origin: 'migrated',
    origin_company_name: 'Cooperativa Norte',
    valid_from: NOW,
    created_by: AUTHOR,
    ...overrides,
  });
}

export function configRow(
  overrides: Partial<PlatformServiceConfigRow> = {},
): PlatformServiceConfigRow {
  const municipalityId = overrides.municipality_id ?? 1;
  return PlatformServiceConfigRow.parse({
    municipality_id: municipalityId,
    municipality_name: 'Villa Norte',
    department: 'Antioquia',
    dane_code: '05001',
    coverage_active: true,
    service_type: 'taxi',
    active_company_count: 2,
    fare: fare({ municipality_id: municipalityId }),
    operational_params: params({ municipality_id: municipalityId }),
    ...overrides,
  });
}

export const RATE_ROWS: PlatformServiceConfigRow[] = [
  configRow(),
  configRow({
    municipality_id: 2,
    municipality_name: 'Puerto Sur',
    department: 'Bolívar',
    coverage_active: false,
    active_company_count: 1,
    fare: fare({
      municipality_fare_id: 12,
      municipality_id: 2,
      base_fare: 9500,
      is_official: true,
      official_reference: 'Decreto 045 de 2026',
      origin: 'company_approval',
    }),
    operational_params: params({ operational_params_id: 22, municipality_id: 2 }),
  }),
];

function key(municipalityId: number, serviceType: string): string {
  return `${municipalityId}-${serviceType}`;
}

export interface ServiceConfigMock {
  rows: PlatformServiceConfigRow[];
  fareVersions: Map<string, MunicipalityFare[]>;
  paramVersions: Map<string, MunicipalityOperationalParams[]>;
  fareBodies: Record<string, unknown>[];
  paramBodies: Record<string, unknown>[];
  listQueries: URLSearchParams[];
  failList: (failure: QueuedFailure | null) => void;
  failNextFarePut: (failure: QueuedFailure) => void;
  failNextParamsPut: (failure: QueuedFailure) => void;
  setRows: (rows: PlatformServiceConfigRow[]) => void;
  seedFareHistory: (versions: MunicipalityFare[]) => void;
  changeUnderneath: (patch: Partial<MunicipalityFare>) => void;
}

const SERVICE_PATH =
  /\/platform\/municipalities\/(\d+)\/services\/([a-z]+)\/(fare|operational-params)(\?.*)?$/;

export async function mockServiceConfigs(
  page: Page,
  initial: PlatformServiceConfigRow[] = RATE_ROWS,
): Promise<ServiceConfigMock> {
  let listFailure: QueuedFailure | null = null;
  const farePutFailures: QueuedFailure[] = [];
  const paramsPutFailures: QueuedFailure[] = [];

  const mock: ServiceConfigMock = {
    rows: structuredClone(initial),
    fareVersions: new Map(),
    paramVersions: new Map(),
    fareBodies: [],
    paramBodies: [],
    listQueries: [],
    failList: (failure) => {
      listFailure = failure;
    },
    failNextFarePut: (failure) => farePutFailures.push(failure),
    failNextParamsPut: (failure) => paramsPutFailures.push(failure),
    setRows: (rows) => {
      mock.rows = structuredClone(rows);
      mock.fareVersions.clear();
      mock.paramVersions.clear();
    },
    seedFareHistory: (versions) => {
      const first = versions[0];
      if (first) mock.fareVersions.set(key(first.municipality_id, first.service_type), versions);
    },
    changeUnderneath: (patch) => {
      const row = mock.rows[0];
      if (!row?.fare) return;
      const next = fare({
        ...row.fare,
        ...patch,
        municipality_fare_id: row.fare.municipality_fare_id + 1,
        created_by: { user_id: 2, name: 'Luis Gómez' },
      });
      row.fare = next;
      mock.fareVersions.set(key(row.municipality_id, row.service_type), [
        next,
        ...(mock.fareVersions.get(key(row.municipality_id, row.service_type)) ?? []),
      ]);
    },
  };

  function currentFareVersions(row: PlatformServiceConfigRow): MunicipalityFare[] {
    const k = key(row.municipality_id, row.service_type);
    if (!mock.fareVersions.has(k) && row.fare) mock.fareVersions.set(k, [row.fare]);
    return mock.fareVersions.get(k) ?? [];
  }

  function currentParamVersions(row: PlatformServiceConfigRow): MunicipalityOperationalParams[] {
    const k = key(row.municipality_id, row.service_type);
    if (!mock.paramVersions.has(k)) mock.paramVersions.set(k, [row.operational_params]);
    return mock.paramVersions.get(k) ?? [];
  }

  function paginate<T extends { id: number }>(
    versions: T[],
    query: URLSearchParams,
  ): { slice: T[]; next: number | null } {
    const before = query.get('before');
    const limit = Number(query.get('limit') ?? 10);
    const candidates = before
      ? versions.filter((version) => version.id < Number(before))
      : versions;
    const slice = candidates.slice(0, limit);
    const next = candidates.length > limit ? (slice[slice.length - 1]?.id ?? null) : null;
    return { slice, next };
  }

  await page.route(/\/platform\/service-configs(\?.*)?$/, async (route) => {
    if (!isApiCall(route)) return route.fallback();
    const url = new URL(route.request().url());
    mock.listQueries.push(url.searchParams);
    if (listFailure) return failWith(route, listFailure);
    const municipalityId = url.searchParams.get('municipality_id');
    const rows = municipalityId
      ? mock.rows.filter((row) => row.municipality_id === Number(municipalityId))
      : mock.rows;
    return fulfillJson(
      route,
      200,
      PlatformServiceConfigListResponse.parse({ server_time: NOW, rows }),
    );
  });

  await page.route(SERVICE_PATH, async (route) => {
    const request = route.request();
    if (!isApiCall(route)) return route.fallback();
    const url = new URL(request.url());
    const match = SERVICE_PATH.exec(url.pathname + url.search);
    if (!match) return route.fallback();
    const [, municipalityIdRaw, serviceType, resource] = match;
    const row = mock.rows.find(
      (candidate) =>
        candidate.municipality_id === Number(municipalityIdRaw) &&
        candidate.service_type === serviceType,
    );
    if (!row) {
      return failWith(route, { status: 404, code: 'MUNICIPALITY_NOT_FOUND' });
    }

    if (resource === 'fare' && request.method() === 'GET') {
      const versions = currentFareVersions(row).map((version) => ({
        id: version.municipality_fare_id,
        version,
      }));
      const { slice, next } = paginate(
        versions.map((entry) => ({ ...entry.version, id: entry.id })),
        url.searchParams,
      );
      return fulfillJson(
        route,
        200,
        MunicipalityFareHistory.parse({
          server_time: NOW,
          current: row.fare,
          versions: slice.map(({ id: _id, ...version }) => version),
          next_before: next,
        }),
      );
    }

    if (resource === 'fare' && request.method() === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>;
      mock.fareBodies.push(body);
      const queued = farePutFailures.shift();
      if (queued) return failWith(route, queued);
      if (!row.fare || body.version !== row.fare.municipality_fare_id) {
        return failWith(route, {
          status: 409,
          code: 'SETTINGS_CONFLICT',
          message: 'Conflicto de versión',
          extra: {
            current_version: row.fare?.municipality_fare_id ?? 1,
            current_author_name: 'Luis Gómez',
          },
        });
      }
      const created = fare({
        ...row.fare,
        municipality_fare_id: row.fare.municipality_fare_id + 1,
        base_fare: body.base_fare as number,
        night_surcharge_pct: body.night_surcharge_pct as number,
        holiday_surcharge_pct: body.holiday_surcharge_pct as number,
        is_official: body.is_official as boolean,
        official_reference: (body.official_reference as string | null | undefined) ?? null,
        origin: 'platform_edit',
        origin_company_name: null,
        valid_from: new Date().toISOString(),
        created_by: AUTHOR,
      });
      const versions = currentFareVersions(row);
      row.fare = created;
      mock.fareVersions.set(key(row.municipality_id, row.service_type), [created, ...versions]);
      return fulfillJson(route, 200, created);
    }

    if (resource === 'operational-params' && request.method() === 'GET') {
      const versions = currentParamVersions(row).map((version) => ({
        ...version,
        id: version.operational_params_id ?? 0,
      }));
      const { slice, next } = paginate(versions, url.searchParams);
      return fulfillJson(
        route,
        200,
        MunicipalityOperationalParamsHistory.parse({
          server_time: NOW,
          current: row.operational_params,
          versions: slice.map(({ id: _id, ...version }) => version),
          next_before: next,
        }),
      );
    }

    const body = request.postDataJSON() as Record<string, unknown>;
    mock.paramBodies.push(body);
    const queued = paramsPutFailures.shift();
    if (queued) return failWith(route, queued);
    const currentId = row.operational_params.operational_params_id;
    if (body.version !== currentId) {
      return failWith(route, {
        status: 409,
        code: 'SETTINGS_CONFLICT',
        message: 'Conflicto de versión',
        extra: { current_version: currentId ?? 1, current_author_name: 'Luis Gómez' },
      });
    }
    const { version: _version, ...values } = body;
    const created = params({
      ...row.operational_params,
      ...values,
      operational_params_id: (currentId ?? 20) + 1,
      platform_default_keys: [],
      origin: 'platform_edit',
      origin_company_name: null,
      valid_from: new Date().toISOString(),
      created_by: AUTHOR,
    });
    const versions = currentParamVersions(row);
    row.operational_params = created;
    mock.paramVersions.set(key(row.municipality_id, row.service_type), [created, ...versions]);
    return fulfillJson(route, 200, created);
  });

  return mock;
}

export function commission(overrides: Partial<CompanyCommission> = {}): CompanyCommission {
  return CompanyCommission.parse({
    company_commission_id: 31,
    company_id: 1,
    commission_pct: 8,
    origin: 'company_approval',
    valid_from: NOW,
    valid_to: null,
    created_by: AUTHOR,
    ...overrides,
  });
}

export function commissionRow(
  overrides: Partial<PlatformCommissionRow> = {},
): PlatformCommissionRow {
  return PlatformCommissionRow.parse({
    company_id: 1,
    legal_name: 'Cooperativa Norte de Transporte',
    display_name: 'Cooperativa Norte',
    municipality_id: 1,
    municipality_name: 'Villa Norte',
    commission: commission(),
    ...overrides,
  });
}

export interface CommissionMock {
  rows: PlatformCommissionRow[];
  putBodies: Record<string, unknown>[];
  history: Map<number, CompanyCommission[]>;
  failList: (failure: QueuedFailure | null) => void;
  failNextPut: (failure: QueuedFailure) => void;
  setRows: (rows: PlatformCommissionRow[]) => void;
}

export async function mockCommissions(
  page: Page,
  initial: PlatformCommissionRow[] = [
    commissionRow(),
    commissionRow({
      company_id: 2,
      legal_name: 'Transportes del Sur',
      display_name: 'Transportes del Sur',
      municipality_id: 2,
      municipality_name: 'Puerto Sur',
      commission: null,
    }),
  ],
): Promise<CommissionMock> {
  let listFailure: QueuedFailure | null = null;
  const putFailures: QueuedFailure[] = [];
  const mock: CommissionMock = {
    rows: structuredClone(initial),
    putBodies: [],
    history: new Map(),
    failList: (failure) => {
      listFailure = failure;
    },
    failNextPut: (failure) => putFailures.push(failure),
    setRows: (rows) => {
      mock.rows = structuredClone(rows);
    },
  };

  await page.route(/\/platform\/commissions(\?.*)?$/, async (route) => {
    if (!isApiCall(route)) return route.fallback();
    if (listFailure) return failWith(route, listFailure);
    return fulfillJson(
      route,
      200,
      PlatformCommissionListResponse.parse({ server_time: NOW, rows: mock.rows }),
    );
  });

  await page.route(/\/platform\/companies\/(\d+)\/commission(\?.*)?$/, async (route) => {
    if (!isApiCall(route)) return route.fallback();
    const request = route.request();
    const url = new URL(request.url());
    const companyId = Number(/companies\/(\d+)\//.exec(url.pathname)?.[1]);
    const row = mock.rows.find((candidate) => candidate.company_id === companyId);
    if (!row) return failWith(route, { status: 404, code: 'COMPANY_NOT_FOUND' });

    if (request.method() === 'GET') {
      const versions = mock.history.get(companyId) ?? (row.commission ? [row.commission] : []);
      return fulfillJson(
        route,
        200,
        CompanyCommissionHistory.parse({
          server_time: NOW,
          current: row.commission,
          versions,
          next_before: null,
        }),
      );
    }

    const body = request.postDataJSON() as Record<string, unknown>;
    mock.putBodies.push(body);
    const queued = putFailures.shift();
    if (queued) return failWith(route, queued);
    const currentId = row.commission?.company_commission_id ?? null;
    if (body.version !== currentId) {
      return failWith(route, {
        status: 409,
        code: 'SETTINGS_CONFLICT',
        message: 'Conflicto de versión',
        extra: { current_version: currentId ?? 1, current_author_name: 'Luis Gómez' },
      });
    }
    const created = commission({
      company_commission_id: (currentId ?? 40) + 1,
      company_id: companyId,
      commission_pct: body.commission_pct as number,
      origin: 'platform_edit',
      valid_from: new Date().toISOString(),
    });
    mock.history.set(companyId, [
      created,
      ...(mock.history.get(companyId) ?? (row.commission ? [row.commission] : [])),
    ]);
    row.commission = created;
    return fulfillJson(route, 200, created);
  });

  return mock;
}

export function companyRow(overrides: Partial<PlatformCompanyRow> = {}): PlatformCompanyRow {
  return PlatformCompanyRow.parse({
    company_id: 7,
    legal_name: 'Taxis Horizonte S.A.S.',
    tax_id: '900123456',
    status: 'pending',
    municipality_id: 1,
    municipality_name: 'Villa Norte',
    municipality_already_covered: true,
    municipality_dane_code: '05001',
    municipality_coverage_active: true,
    display_name: 'Taxis Horizonte',
    service_types: ['taxi'],
    coverage_pending_since: null,
    vehicle_count: 12,
    contact_email: 'contacto@horizonte.test',
    submitted_at: NOW,
    ...overrides,
  });
}

export const COMPANY_ROWS: PlatformCompanyRow[] = [
  companyRow(),
  companyRow({
    company_id: 8,
    legal_name: 'Movilidad del Puerto',
    tax_id: '900654321',
    municipality_id: 2,
    municipality_name: 'Puerto Sur',
    municipality_already_covered: false,
    municipality_coverage_active: false,
    coverage_pending_since: '2026-09-20T10:00:00.000Z',
    display_name: 'Movilidad del Puerto',
    vehicle_count: null,
  }),
];

export function companyDetail(
  overrides: Partial<PlatformCompanyDetail> = {},
): PlatformCompanyDetail {
  const row = companyRow(overrides);
  return PlatformCompanyDetail.parse({
    ...row,
    server_time: NOW,
    legal_form: 'cooperative',
    municipality_department: 'Antioquia',
    municipality_active_company_name: null,
    public_name: 'Taxis Horizonte',
    municipality_active_companies: [
      { company_id: 1, legal_name: 'Cooperativa Norte de Transporte' },
      { company_id: 2, legal_name: 'Transportes del Sur' },
    ],
    municipality_fares: [{ service_type: 'taxi', fare: fare() }],
    commission: null,
    contact_first_name: 'Marta',
    contact_last_name: 'Rojas',
    contact_phone: '3001234567',
    documents: [],
    reviews: [],
    ...overrides,
  });
}

export interface CompaniesMock {
  listQueries: URLSearchParams[];
  approveBodies: Record<string, unknown>[];
  failApprove: (failure: QueuedFailure) => void;
  setDetail: (detail: PlatformCompanyDetail) => void;
  setRows: (rows: PlatformCompanyRow[]) => void;
}

export async function mockCompanies(
  page: Page,
  rows: PlatformCompanyRow[] = COMPANY_ROWS,
  detail: PlatformCompanyDetail = companyDetail(),
  coverageActiveOnApprove = true,
): Promise<CompaniesMock> {
  let currentRows = [...rows];
  let currentDetail = detail;
  const approveFailures: QueuedFailure[] = [];
  const mock: CompaniesMock = {
    listQueries: [],
    approveBodies: [],
    failApprove: (failure) => approveFailures.push(failure),
    setDetail: (next) => {
      currentDetail = next;
    },
    setRows: (next) => {
      currentRows = [...next];
    },
  };

  await page.route(/\/platform\/companies(\?.*)?$/, async (route) => {
    if (!isApiCall(route)) return route.fallback();
    const url = new URL(route.request().url());
    mock.listQueries.push(url.searchParams);
    const municipalityId = url.searchParams.get('municipality_id');
    const filtered = municipalityId
      ? currentRows.filter((row) => row.municipality_id === Number(municipalityId))
      : currentRows;
    return fulfillJson(
      route,
      200,
      PlatformCompanyListResponse.parse({
        server_time: NOW,
        pending_count: filtered.filter((row) => row.status === 'pending').length,
        rows: filtered,
      }),
    );
  });

  await page.route(/\/platform\/companies\/\d+$/, async (route) => {
    if (!isApiCall(route)) return route.fallback();
    return fulfillJson(route, 200, currentDetail);
  });

  await page.route(/\/platform\/companies\/\d+\/approve$/, async (route) => {
    mock.approveBodies.push(route.request().postDataJSON() as Record<string, unknown>);
    const queued = approveFailures.shift();
    if (queued) return failWith(route, queued);
    return fulfillJson(
      route,
      200,
      CompanyDecisionResponse.parse({
        company_id: currentDetail.company_id,
        status: 'active',
        decision: 'approved',
        decided_at: NOW,
        acknowledged_routing_limitation: false,
        municipality_coverage_active: coverageActiveOnApprove,
        notification: { channel: 'email', to: 'contacto@horizonte.test', delivery: 'sent' },
        provisioning: null,
      }),
    );
  });

  return mock;
}

export function catalogRow(
  overrides: Partial<AffiliationMunicipality> = {},
): AffiliationMunicipality {
  return AffiliationMunicipality.parse({
    municipality_id: 1,
    dane_code: '05001',
    department_code: '05',
    name: 'Villa Norte',
    department: 'Antioquia',
    already_covered: false,
    has_active_companies: false,
    coverage_active: true,
    ...overrides,
  });
}

export const CATALOG_ROWS: AffiliationMunicipality[] = [
  catalogRow({
    municipality_id: 1,
    name: 'Villa Norte',
    has_active_companies: true,
    already_covered: true,
  }),
  catalogRow({ municipality_id: 2, dane_code: '05002', name: 'Nariño' }),
  catalogRow({
    municipality_id: 3,
    dane_code: '05003',
    name: 'Santa Rosa de Osos',
    coverage_active: false,
  }),
  catalogRow({ municipality_id: 4, dane_code: '05004', name: 'Medellín' }),
  catalogRow({
    municipality_id: 5,
    dane_code: '13001',
    department_code: '13',
    department: 'Bolívar',
    name: 'Puerto Sur',
    coverage_active: false,
  }),
  catalogRow({
    municipality_id: 6,
    dane_code: '11001',
    department_code: '11',
    department: 'Bogotá, D.C.',
    name: 'Bogotá, D.C.',
  }),
];

export interface CatalogMock {
  requests: number;
  submitted: Record<string, unknown>[];
  failCatalog: (failure: QueuedFailure | null) => void;
  failNextSubmit: (failure: QueuedFailure) => void;
  setRows: (rows: AffiliationMunicipality[]) => void;
  setActiveServices: (services: string[]) => void;
  setSource: (override: Partial<CatalogSource>) => void;
}

type CatalogSource = AffiliationMunicipalityListResponse['source'];

const DEFAULT_CATALOG_SOURCE: CatalogSource = {
  name: 'DIVIPOLA — DANE',
  cut_date: '2025-06-30',
  attribution: 'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co',
  license: 'Creative Commons Atribución-CompartirIgual 4.0 Internacional (CC BY-SA 4.0)',
};

export async function mockCatalog(
  page: Page,
  initial: AffiliationMunicipality[] = CATALOG_ROWS,
): Promise<CatalogMock> {
  let rows = [...initial];
  let activeServices = ['taxi'];
  let source: CatalogSource = DEFAULT_CATALOG_SOURCE;
  let catalogFailure: QueuedFailure | null = null;
  const submitFailures: QueuedFailure[] = [];
  const mock: CatalogMock = {
    requests: 0,
    submitted: [],
    failCatalog: (failure) => {
      catalogFailure = failure;
    },
    failNextSubmit: (failure) => submitFailures.push(failure),
    setRows: (next) => {
      rows = [...next];
    },
    setActiveServices: (services) => {
      activeServices = services;
    },
    setSource: (override) => {
      source = { ...DEFAULT_CATALOG_SOURCE, ...override };
    },
  };

  await page.route(/\/affiliation\/municipalities(\?.*)?$/, async (route) => {
    if (!isApiCall(route)) return route.fallback();
    mock.requests += 1;
    if (catalogFailure) return failWith(route, catalogFailure);
    return fulfillJson(
      route,
      200,
      AffiliationMunicipalityListResponse.parse({
        rows,
        source,
        active_service_types: activeServices,
      }),
    );
  });

  await page.route(/\/affiliation\/documents(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    return fulfillJson(
      route,
      200,
      UploadedDocument.parse({
        storage_key: `staging/2026/10/08/${Math.random().toString(16).slice(2)}.pdf`,
        file_name: 'documento.pdf',
        content_type: 'application/pdf',
        size_bytes: 1024,
        uploaded_at: NOW,
      }),
    );
  });

  await page.route(/\/affiliation\/applications(\?.*)?$/, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    mock.submitted.push(route.request().postDataJSON() as Record<string, unknown>);
    const queued = submitFailures.shift();
    if (queued) return failWith(route, queued);
    return fulfillJson(
      route,
      201,
      AffiliationApplicationCreated.parse({
        company_id: 99,
        legal_name: 'Empresa de prueba',
        tax_id: '900111222',
        status: 'pending',
        municipality_name: 'Villa Norte',
        contact_email: 'contacto@empresa.test',
        submitted_at: NOW,
      }),
    );
  });

  return mock;
}

export async function mockAdminSettings(
  page: Page,
  overrides: Partial<ConsoleSettings> = {},
  options: { forbidden?: boolean; failure?: QueuedFailure } = {},
): Promise<void> {
  await seedSession(page, 'admin');
  await page.route(/\/admin\/company-profile$/, async (route) => {
    if (!isApiCall(route)) return route.fallback();
    return fulfillJson(
      route,
      200,
      CompanyProfile.parse({
        company_id: 1,
        tax_id: '900000001',
        status: 'active',
        municipality_coverage_active: true,
        display_name: 'Cooperativa Norte',
        service_types: ['taxi'],
      }),
    );
  });
  await page.route(/\/admin\/settings$/, async (route) => {
    if (!isApiCall(route)) return route.fallback();
    if (options.failure) return failWith(route, options.failure);
    if (options.forbidden) {
      return fulfillJson(route, 403, {
        code: 'SETTINGS_MANAGED_BY_PLATFORM',
        message: 'La tarifa y los parámetros los administra VoyYa para todo el municipio.',
      });
    }
    return fulfillJson(
      route,
      200,
      ConsoleSettings.parse({
        version: 'mf:11|op:21',
        base_fare: 8000,
        night_surcharge_pct: 25,
        holiday_surcharge_pct: 25,
        commission_pct: 8,
        search_radius_km: 5,
        expansion_radius_km: 8,
        acceptance_timeout_sec: 30,
        updated_at: NOW,
        read_only: true,
        service_type: 'taxi',
        fare_is_official: false,
        fare_official_reference: null,
        fare_valid_from: NOW,
        max_auto_retries: 3,
        tiebreak_window_hours: 2,
        location_stale_min: 10,
        avg_speed_kmh: 25,
        cancellation_window_min: 5,
        no_show_grace_min: 5,
        ...overrides,
      }),
    );
  });
}
