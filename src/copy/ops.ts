export const START_BLOCKED_COPY = {
  label: 'Inicio bloqueado por código',
  attempts: (failed: number, max: number): string => `${failed} de ${max} intentos fallidos`,
  noticeTitle: 'Inicio bloqueado por código',
  noticeBody: (max: number): string =>
    `El conductor se equivocó ${max} veces al escribir el código de inicio. Este viaje no puede iniciar. Llama al conductor: puede llamar al pasajero, declarar que no se presentó o cancelar.`,
  attemptsNotice: (failed: number, max: number): string =>
    `${failed} intentos fallidos de ${max} al escribir el código de inicio.`,
  attemptsRow: 'Intentos fallidos',
  attemptsRowValue: (failed: number, max: number): string => `${failed} de ${max}`,
  blockedAtRow: 'Bloqueado',
  noCodeNote: 'Por seguridad, el código no se muestra en la consola.',
  timeline: 'Inicio bloqueado por código',
  startedTimeline: 'Viaje iniciado',
  viewAriaSuffix: ', inicio bloqueado por código',
} as const;
