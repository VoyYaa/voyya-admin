import type {
  CompanyDecision,
  CompanyDocumentType,
  CompanyLegalForm,
  CompanyStatus,
  DocumentVerificationStatus,
  DriverDocumentType,
  DriverStatus,
  TripStatus,
} from '@voyyaa/shared';

export type StatusTone = 'success' | 'brand' | 'danger' | 'neutral';

export const TONE_DOT_CLASS: Record<StatusTone, string> = {
  success: 'bg-success',
  brand: 'bg-amber',
  danger: 'bg-danger',
  neutral: 'bg-status-neutral',
};

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

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  pending: 'Pendiente',
  active: 'Habilitada',
  suspended: 'Suspendida',
  rejected: 'Rechazada',
};

export const COMPANY_STATUS_TONES: Record<CompanyStatus, StatusTone> = {
  pending: 'brand',
  active: 'success',
  suspended: 'danger',
  rejected: 'neutral',
};

export const COMPANY_LEGAL_FORM_LABELS: Record<CompanyLegalForm, string> = {
  cooperative: 'Cooperativa',
  corporation: 'Sociedad',
  sole_proprietorship: 'Persona natural',
  other: 'Otra',
};

export const COMPANY_DOCUMENT_TYPE_LABELS: Record<CompanyDocumentType, string> = {
  chamber_of_commerce: 'Cámara de comercio',
  tax_registry: 'RUT',
  transport_authorization: 'Habilitación Min. Transporte',
  liability_insurance: 'Póliza de responsabilidad civil',
};

export const DRIVER_DOCUMENT_TYPE_LABELS: Record<DriverDocumentType, string> = {
  license: 'Licencia de conducción',
  soat: 'SOAT',
  vehicle_inspection: 'Revisión técnico-mecánica',
  operation_card: 'Tarjeta de operación',
};

export const DOCUMENT_VERIFICATION_LABELS: Record<DocumentVerificationStatus, string> = {
  pending: 'Pendiente de revisión',
  verified: 'Verificado',
  rejected: 'Rechazado',
};

export const COMPANY_DECISION_LABELS: Record<CompanyDecision, string> = {
  approved: 'Aprobada',
  documents_requested: 'Documento solicitado',
  rejected: 'Rechazada',
  credentials_reissued: 'Credenciales reenviadas',
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
