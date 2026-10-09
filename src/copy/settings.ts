export const SETTINGS_COPY = {
  eyebrow: 'Configuración',
  title: 'Parámetros',
  serviceLine: (service: string, municipality: string): string =>
    `Servicio: ${service} · Municipio: ${municipality}`,
  serviceOnly: (service: string): string => `Servicio: ${service}`,
  loading: 'Cargando parámetros',
  error: 'No pudimos cargar los parámetros.',
  offline: 'Sin conexión · los datos pueden estar desactualizados.',
  emptyTitle: 'Tu municipio aún no tiene una tarifa definida.',
  emptyBody: 'VoyYa la carga al habilitar el servicio.',
  readOnlyTitle: 'Estos valores los define VoyYa para todo el municipio.',
  readOnlyBody: (municipality: string): string =>
    `Son los mismos para todas las empresas que operan en ${municipality}, por eso aquí puedes consultarlos pero no cambiarlos.`,
  readOnlyBodyGeneric:
    'Son los mismos para todas las empresas que operan en tu municipio, por eso aquí puedes consultarlos pero no cambiarlos.',
  readOnlyAsk: 'Si crees que alguno debe cambiar, díselo a tu contacto en VoyYa.',
  unofficialNotice: (municipality: string): string =>
    `La tarifa es provisional. Todavía no se ha cargado la tarifa oficial de la Alcaldía de ${municipality}.`,
  unofficialNoticeGeneric:
    'La tarifa es provisional. Todavía no se ha cargado la tarifa oficial de la Alcaldía.',
  fareSection: 'Tarifa del municipio',
  fareSectionNote: 'La define VoyYa, igual para todas las empresas del municipio.',
  reference: (reference: string): string => `Referencia: ${reference}`,
  effectiveSince: (date: string): string => `Vigente desde el ${date}`,
  commissionSection: 'Comisión de tu empresa',
  commissionLabel: 'Comisión por viaje',
  commissionNote: 'La fija VoyYa para tu empresa.',
  assignmentSection: 'Parámetros de asignación',
  assignmentNote: 'Los define VoyYa para todo el municipio.',
  passengerSection: 'Reglas para el pasajero',
  passengerNote: 'Los define VoyYa para todo el municipio.',
} as const;
