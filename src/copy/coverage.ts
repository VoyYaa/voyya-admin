export const COVERAGE_COPY = {
  pendingBadge: 'Cobertura pendiente',
  pendingSince: (date: string): string => `Cobertura pendiente desde el ${date}`,
  approveNotice:
    'Aprobar la empresa no habilita pedir taxis en este municipio: falta definir el polígono de cobertura.',
  approveNoticeNote: 'Quedará como «Cobertura pendiente» hasta que el equipo de VoyYa lo cargue.',
  approvedToast: (municipality: string): string =>
    `Empresa aprobada · cobertura pendiente en ${municipality}.`,
  noneWaiting: 'Ningún municipio está esperando su cobertura.',
} as const;

export const PLATFORM_COMPANIES_COPY = {
  columns: {
    company: 'Empresa',
    municipality: 'Municipio',
    service: 'Servicio',
    fleet: 'Flota',
    received: 'Recibida',
    status: 'Estado',
    actions: 'Acciones',
  },
  filterByMunicipality: 'Filtrar por municipio',
  allMunicipalities: 'Todos',
  filterByCoverage: 'Filtrar por cobertura',
  coverageFilters: { all: 'Todas', pending: 'Cobertura pendiente' },
  filtersEmpty: 'Ninguna empresa coincide con los filtros.',
  clearFilters: 'Quitar filtros',
  otherCompanies: (count: number): string =>
    `Ya ${count === 1 ? 'opera 1 empresa' : `operan ${count} empresas`} en este municipio:`,
  sharesWith: (municipality: string, count: number): string =>
    `Compartirá ${municipality} con ${count} ${count === 1 ? 'empresa activa' : 'empresas activas'}.`,
  approveService: (service: string): string =>
    `para registrar conductores y recibir viajes de ${service}.`,
  approveNoCoverage: (municipality: string): string =>
    `Aún no recibirá viajes: ${municipality} no tiene cobertura habilitada.`,
  serviceInactive: (service: string): string =>
    `No se puede aprobar: el servicio que declaró (${service}) no está activo.`,
  existingFare: 'Tarifa del municipio',
  existingFareNote: 'No cambia al aprobar.',
  viewFare: 'Ver tarifa',
  noFareHint:
    'El municipio todavía no tiene tarifa. Se crea como «No oficial» y la puedes ajustar en Tarifas.',
  initialFareLabel: 'Tarifa base inicial',
  commissionLabel: 'Comisión de la empresa (%)',
  commissionHint:
    'Es lo que la empresa paga a VoyYa por viaje. La puedes cambiar después en Comisiones.',
  commissionRange: (min: number, max: number): string => `Va de ${min} a ${max} %.`,
  commissionRequired: 'Escribe la comisión de la empresa.',
  fareFieldError: (min: string, max: string): string =>
    `Este valor está fuera del rango permitido (${min} a ${max}).`,
  detailService: 'Servicio',
  detailPublicName: 'Nombre público',
  detailPublicNameFallback: 'Igual que la razón social',
  detailCommission: 'Comisión',
  editCommission: 'Editar comisión',
  detailMunicipality: 'Municipio',
  detailFleet: 'Flota declarada',
  detailLegalForm: 'Forma jurídica',
  detailContact: 'Contacto',
  unlimitedFleet: 'Sin tope',
  fareFor: (service: string): string => `Tarifa de ${service}`,
  noFare: 'Sin tarifa',
  approvedToast: 'Empresa aprobada · ya puede registrar conductores.',
  connectionLost: 'Sin conexión · no se pudo enviar la decisión. Inténtalo de nuevo.',
  decisionFailed: 'No pudimos guardar la decisión. Inténtalo de nuevo.',
} as const;
