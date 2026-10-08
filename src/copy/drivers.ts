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
