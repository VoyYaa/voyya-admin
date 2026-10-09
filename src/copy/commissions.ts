export const COMMISSIONS_COPY = {
  eyebrow: 'Plataforma',
  nav: 'Comisiones',
  title: 'Comisiones',
  subtitle: (count: number): string =>
    `${count} ${count === 1 ? 'empresa habilitada' : 'empresas habilitadas'}`,
  columns: {
    company: 'Empresa',
    municipality: 'Municipio',
    commission: 'Comisión',
    validFrom: 'Vigente desde',
    changedBy: 'Cambió',
    actions: 'Acciones',
  },
  noCommission: 'Sin comisión',
  edit: 'Editar',
  editAria: (company: string): string => `Editar la comisión de ${company}`,
  loading: 'Cargando comisiones',
  empty: 'Aún no hay empresas habilitadas.',
  error: 'No pudimos cargar las comisiones.',
  offline: 'Sin conexión · la lista puede estar desactualizada.',
  drawerTitle: (company: string): string => `Comisión de ${company}`,
  current: (pct: string, since: string | null): string =>
    since ? `Comisión actual: ${pct} · vigente desde el ${since}` : `Comisión actual: ${pct}`,
  noCurrent: 'Esta empresa todavía no tiene comisión.',
  field: 'Comisión por viaje (%)',
  hint: 'Es lo que la empresa paga a VoyYa por cada viaje.',
  range: (min: number, max: number): string => `Va de ${min} a ${max} %.`,
  scope:
    'Aplica a los viajes que se acepten desde ahora. Los viajes ya aceptados conservan la comisión con la que se aceptaron.',
  cancel: 'Cancelar',
  review: 'Revisar y guardar',
  confirmTitle: (company: string): string => `¿Cambiar la comisión de ${company}?`,
  confirmBody: (company: string, from: string, to: string): string =>
    `${company}: ${from} → ${to}. Aplica a los viajes que se acepten desde ahora.`,
  save: 'Guardar comisión',
  keepEditing: 'Seguir editando',
  saved: (company: string): string => `Comisión de ${company} actualizada.`,
  saveFailed: 'No pudimos guardar la comisión. Inténtalo de nuevo.',
  offlineSave: 'Sin conexión · no se puede guardar ahora.',
  outOfRange: (min: number, max: number): string =>
    `Este valor está fuera del rango permitido (${min} a ${max} %).`,
  conflict: (version: number, author: string | null): string =>
    `Alguien más cambió esta comisión mientras editabas (versión ${version}${author ? `, por ${author}` : ''}). Revisa el valor actual y vuelve a guardar.`,
  history: 'Historial',
  originMigrated: 'Migrada de la configuración anterior',
  originCompanyApproval: 'Fijada al aprobar la empresa',
} as const;
