export const SUSPEND_DRIVER_COPY = {
  action: 'Suspender conductor',
  actionBusy: 'Suspendiendo…',
  dialogTitle: '¿Suspender a este conductor?',
  dialogConfirm: 'Suspender conductor',
  dialogCancel: 'Cancelar',
  dialogBody: (fullName: string): string => `Se cerrarán las sesiones activas de ${fullName}.`,
  success: (fullName: string): string => `Se cerraron las sesiones de ${fullName}.`,
  alreadySuspended: 'Este conductor ya está suspendido.',
  offline: 'Sin conexión · no se puede suspender ahora.',
  notFound: 'Este conductor ya no existe en tu empresa.',
  generic: 'No pudimos suspender al conductor. Intenta de nuevo.',
} as const;
