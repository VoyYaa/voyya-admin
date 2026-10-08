export const COMMON_COPY = {
  retry: 'Reintentar',
  loading: 'Cargando…',
  stillLoading: 'Sigue cargando…',
  refreshing: 'Actualizando',
  close: 'Cerrar',
  cancel: 'Cancelar',
  back: 'Volver',
  empty: 'Sin datos',
  offlineNotice: 'Sin conexión',
  uploading: 'Subiendo…',
  skipToContent: 'Saltar al contenido principal',
} as const;

export const SESSION_COPY = {
  loading: 'Cargando sesión…',
  timeoutTitle: 'No pudimos iniciar tu sesión',
  timeoutBody: 'La consola tardó demasiado en responder. Reintenta o vuelve a ingresar.',
  timeoutLogin: 'Ir a iniciar sesión',
} as const;

export const THEME_COPY = {
  label: 'Tema',
  options: { system: 'Según el sistema', light: 'Claro', dark: 'Oscuro' },
} as const;

export const STAT_COPY = {
  searching: 'Buscando',
  enRoute: 'En camino',
  inProgress: 'En viaje',
  completed: 'Completadas recientes',
  ariaLabel: 'Resumen de la cola por estado',
} as const;

export const STEP_COPY = {
  applicationSteps: ['Datos', 'Documentos', 'Revisión'],
  railLabel: 'Pasos de la solicitud',
  current: 'paso actual',
  done: 'completado',
} as const;
