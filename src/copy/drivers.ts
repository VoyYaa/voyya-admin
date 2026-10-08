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
