export const DOCUMENT_UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  DOCUMENT_TYPE_NOT_ALLOWED: 'Formato no permitido. Usa PDF, JPG o PNG.',
  DOCUMENT_TOO_LARGE: 'El archivo supera el tamaño máximo de 5 MB.',
};

export const DRIVER_CREATE_ERROR_MESSAGES: Record<string, string> = {
  DOCUMENT_NOT_FOUND: 'Uno de los archivos subidos ya no está disponible. Vuelve a cargarlo.',
};

export const PLATFORM_DECISION_ERROR_MESSAGES: Record<string, string> = {
  COMPANY_NOT_PENDING: 'Esta solicitud ya fue resuelta por alguien más. Actualizamos la vista.',
  CONTACT_ACCOUNT_CONFLICT:
    'El contacto de esta empresa ya tiene una cuenta en VoyYa con ese correo o teléfono. Resuélvelo antes de aprobar.',
};

export const FLEET_QUOTA_COPY = {
  unlimited: 'Sin tope de flota declarada',
  available: (available: number, declared: number): string =>
    `Queda ${available} cupo${available === 1 ? '' : 's'} de los ${declared} declarados`,
  exhausted: (declared: number): string =>
    `Alcanzaste tu flota declarada de ${declared}; contacta a VoyYa para ampliarla.`,
} as const;

export const ROUTING_LIMITATION_WARNING = (
  municipalityName: string,
  activeCompanyName: string,
): string =>
  `${municipalityName} ya tiene una empresa operando (${activeCompanyName}); aprobar esta empresa no le asignará ninguna solicitud de viaje hasta que exista despacho multi-empresa.`;

export const ROUTING_LIMITATION_ACK_LABEL =
  'Entiendo la limitación y quiero aprobar esta empresa de todas formas.';

export const PLATFORM_EMPTY_COPY: Record<'pending' | 'other', { title: string }> = {
  pending: { title: 'No hay solicitudes pendientes.' },
  other: { title: 'No hay empresas con este estado.' },
};
