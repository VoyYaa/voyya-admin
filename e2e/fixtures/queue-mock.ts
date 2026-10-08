import type { Page, Route } from '@playwright/test';

type MockStatus =
  'pending_assignment' | 'assigned' | 'driver_en_route' | 'in_progress' | 'completed' | 'no_driver';

interface MockRow {
  id: number;
  status: MockStatus;
  minutesAgo: number;
  passenger: string;
  pickup: string;
  dropoff: string;
  driver: { id: number; name: string; plate: string } | null;
}

const MOCK_ROWS: MockRow[] = [
  {
    id: 9001,
    status: 'pending_assignment',
    minutesAgo: 2,
    passenger: 'Laura Restrepo',
    pickup: 'Parque Principal',
    dropoff: 'Hospital San Juan de Dios',
    driver: null,
  },
  {
    id: 9002,
    status: 'driver_en_route',
    minutesAgo: 6,
    passenger: 'Mateo Ospina',
    pickup: 'Terminal de Transporte',
    dropoff: 'Barrio El Centro',
    driver: { id: 1, name: 'Conductor1 Yarumal', plate: 'ABC101' },
  },
  {
    id: 9003,
    status: 'in_progress',
    minutesAgo: 14,
    passenger: 'Camila Zapata',
    pickup: 'Plaza de Mercado',
    dropoff: 'Colegio Departamental',
    driver: { id: 2, name: 'Conductor2 Yarumal', plate: 'ABC102' },
  },
  {
    id: 9004,
    status: 'completed',
    minutesAgo: 25,
    passenger: 'Andrés Henao',
    pickup: 'Calle 20 #24-10',
    dropoff: 'Parque Principal',
    driver: { id: 3, name: 'Conductor3 Yarumal', plate: 'ABC103' },
  },
  {
    id: 9005,
    status: 'no_driver',
    minutesAgo: 31,
    passenger: 'Sofía Gómez',
    pickup: 'Vereda La Cruz',
    dropoff: 'Parque Principal',
    driver: null,
  },
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

export async function mockQueueRows(
  page: Page,
  purgedDetailIds: readonly number[] = [],
): Promise<void> {
  await page.route(/\/ops\/trip-requests(\?|$)/, async (route) => {
    if (route.request().resourceType() !== 'fetch') {
      await route.continue();
      return;
    }
    await jsonResponse(route, {
      server_time: new Date().toISOString(),
      rows: MOCK_ROWS.map((row) => ({
        trip_request_id: row.id,
        status: row.status,
        requested_at: isoMinutesAgo(row.minutesAgo),
        status_since: isoMinutesAgo(Math.max(row.minutesAgo - 1, 0)),
        passenger_name: row.passenger,
        pickup_address: row.pickup,
        dropoff_address: row.dropoff,
        fare_total: 8000,
        driver: row.driver
          ? { driver_id: row.driver.id, name: row.driver.name, plate: row.driver.plate }
          : null,
      })),
    });
  });

  await page.route(/\/ops\/trip-requests\/\d+$/, async (route) => {
    if (route.request().resourceType() !== 'fetch') {
      await route.continue();
      return;
    }
    const id = Number(/(\d+)$/.exec(route.request().url())?.[1]);
    const row = MOCK_ROWS.find((candidate) => candidate.id === id) ?? MOCK_ROWS[0];
    if (!row) {
      await route.continue();
      return;
    }
    await jsonResponse(route, {
      server_time: new Date().toISOString(),
      trip_request_id: row.id,
      status: row.status,
      status_since: isoMinutesAgo(Math.max(row.minutesAgo - 1, 0)),
      pickup_address: purgedDetailIds.includes(row.id) ? null : row.pickup,
      dropoff_address: purgedDetailIds.includes(row.id) ? null : row.dropoff,
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
      driver: row.driver
        ? { driver_id: row.driver.id, name: row.driver.name, plate: row.driver.plate }
        : null,
      timeline: {
        requested_at: isoMinutesAgo(row.minutesAgo),
        assigned_at: row.driver ? isoMinutesAgo(row.minutesAgo - 1) : null,
        arrived_at: null,
        finished_at: null,
      },
      cash_collected_at: null,
    });
  });
}
