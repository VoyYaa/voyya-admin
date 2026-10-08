export const SUSPEND_DRIVER_COPY = {
  action: 'Suspender conductor',
  actionBusy: 'Suspendiendo…',
  dialogTitle: '¿Suspender a este conductor?',
  dialogConfirm: 'Suspender conductor',
  dialogCancel: 'Cancelar',
  dialogBody: (fullName: string): string =>
    `${fullName} quedará suspendido: se cerrarán sus sesiones y no podrá iniciar sesión ni tomar turno.`,
  success: (fullName: string): string => `${fullName} quedó suspendido y se cerraron sus sesiones.`,
  activeTrip: 'No se puede suspender mientras tiene un viaje en curso. Inténtalo cuando termine.',
  alreadySuspended: 'Este conductor ya está suspendido.',
  offline: 'Sin conexión · no se puede suspender ahora.',
  notFound: 'Este conductor ya no existe en tu empresa.',
  generic: 'No pudimos suspender al conductor. Intenta de nuevo.',
} as const;

export const NEW_DRIVER_COPY = {
  eyebrow: 'Flota',
  title: 'Registrar conductor',
  back: '← Volver a Conductores',
  sections: ['Datos personales', 'Vehículo', 'Documentos'],
  railLabel: 'Secciones del registro',
  credentialsTitle: 'Credenciales automáticas.',
  credentialsBody:
    'Al guardar, el conductor recibe por SMS su usuario (la cédula) y un PIN temporal de 4 dígitos.',
  documentsHint: 'PDF o foto · máx. 5 MB',
  documentsExpiry: 'La fecha de vencimiento es obligatoria para los 4 documentos.',
  summaryTitle: 'Revisa estos campos antes de guardar:',
  quotaLoadError: 'No pudimos cargar el cupo de flota.',
} as const;

export const TRIP_DETAIL_COPY = {
  addressRemoved: 'Dirección eliminada por política de retención.',
} as const;

export const PIN_COPY = {
  column: 'PIN',
  resend: 'Reenviar PIN',
  resending: 'Reenviando…',
  resendAria: (fullName: string): string => `Reenviar PIN a ${fullName}`,
  dialogTitle: 'Reenviar PIN',
  dialogBody: (fullName: string): string =>
    `Reenviar el PIN reemplaza el actual de ${fullName} y cierra sus sesiones. Tendrá que crear un PIN nuevo.`,
  dialogConfirm: 'Reenviar PIN',
  dialogCancel: 'Cancelar',
  success: (expiresAt: string): string => `PIN reenviado. Vence el ${expiresAt}.`,
  smsFailed: 'No se pudo enviar el PIN. El PIN anterior ya no sirve; vuelve a intentarlo.',
  offline: 'Sin conexión: no se reenvió el PIN.',
  generic: 'No pudimos reenviar el PIN. Intenta de nuevo.',
  notFound: 'Este conductor ya no existe en tu empresa.',
  retry: 'Reintentar',
  sectionLabel: 'PIN de acceso',
  temporaryPending: (expiresAt: string | null): string =>
    expiresAt ? `Aún no crea su PIN. Vence el ${expiresAt}.` : 'Aún no crea su PIN.',
  expiredInfo: 'El PIN temporal venció. Reenvía uno nuevo para que pueda ingresar.',
  notDeliveredInfo: 'El SMS con el PIN no llegó. Reenvíalo para que pueda ingresar.',
  personalInfo: 'Ya creó su PIN personal.',
} as const;
