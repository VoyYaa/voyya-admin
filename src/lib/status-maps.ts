import type { DriverStatus, TripStatus } from '@voyyaa/shared';

export type StatusTone = 'success' | 'brand' | 'danger' | 'neutral';

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  pending_assignment: 'Buscando conductor',
  assigned: 'Conductor en camino',
  driver_en_route: 'Conductor en camino',
  in_progress: 'En curso',
  no_driver: 'Sin conductor disponible',
  expired: 'Expiró sin asignar',
  completed: 'Completado',
  cancelled_by_passenger: 'Cancelado',
  cancelled_by_driver: 'Cancelado',
  no_show: 'No show',
};

export const TRIP_STATUS_TONES: Record<TripStatus, StatusTone> = {
  pending_assignment: 'brand',
  assigned: 'brand',
  driver_en_route: 'brand',
  in_progress: 'success',
  no_driver: 'danger',
  expired: 'danger',
  completed: 'success',
  cancelled_by_passenger: 'neutral',
  cancelled_by_driver: 'neutral',
  no_show: 'neutral',
};

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  available: 'Disponible',
  on_trip: 'En viaje',
  off_shift: 'Fuera de turno',
  inactive: 'Inactivo',
  suspended: 'Suspendido',
  documents_blocked: 'Documentos vencidos',
};

export const DRIVER_STATUS_TONES: Record<DriverStatus, StatusTone> = {
  available: 'success',
  on_trip: 'brand',
  off_shift: 'neutral',
  inactive: 'neutral',
  suspended: 'danger',
  documents_blocked: 'danger',
};

export const QUEUE_FILTER_LABELS: Record<
  'all' | 'pending' | 'assigned' | 'in_progress' | 'no_driver',
  string
> = {
  all: 'Todas',
  pending: 'Pendientes',
  assigned: 'Asignadas',
  in_progress: 'En curso',
  no_driver: 'Sin conductor',
};
