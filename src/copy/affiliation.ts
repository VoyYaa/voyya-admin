import type { AffiliationErrorCode } from '@voyyaa/shared';

const DOCUMENT_TYPE_NOT_ALLOWED_MESSAGE = 'Formato no permitido. Usa PDF, JPG o PNG.';
const DOCUMENT_TOO_LARGE_MESSAGE = 'El archivo supera el tamaño máximo de 5 MB.';

export const DOCUMENT_UPLOAD_ERROR_MESSAGES: Record<string, string> = {
  DOCUMENT_TYPE_NOT_ALLOWED: DOCUMENT_TYPE_NOT_ALLOWED_MESSAGE,
  DOCUMENT_TOO_LARGE: DOCUMENT_TOO_LARGE_MESSAGE,
};

export const AFFILIATION_ERROR_MESSAGES: Record<
  AffiliationErrorCode | 'DOCUMENT_STORAGE_UNAVAILABLE',
  string
> = {
  TAX_ID_TAKEN: 'Ya existe una empresa registrada con este NIT en VoyYa.',
  APPLICATION_IN_REVIEW:
    'Ya existe una solicitud en revisión con este NIT. Te avisaremos por correo en cuanto la resolvamos.',
  APPLICATION_NOT_PENDING:
    'Esta solicitud ya no está en revisión — puede que ya haya sido resuelta. Revisa el correo que te enviamos.',
  CONTACT_PHONE_TAKEN:
    'Ya existe una cuenta de VoyYa con ese teléfono de contacto. Si es tuya, escríbenos para vincularla a tu empresa.',
  CONTACT_EMAIL_TAKEN:
    'Ya existe una cuenta de VoyYa con ese correo de contacto. Si es tuyo, escríbenos para vincularlo a tu empresa.',
  MUNICIPALITY_NOT_FOUND: 'Este municipio ya no está disponible. Elige otro de la lista.',
  DOCUMENTS_INCOMPLETE: 'Faltan documentos obligatorios por cargar.',
  DOCUMENT_TOO_LARGE: DOCUMENT_TOO_LARGE_MESSAGE,
  DOCUMENT_TYPE_NOT_ALLOWED: DOCUMENT_TYPE_NOT_ALLOWED_MESSAGE,
  DOCUMENT_NOT_FOUND: 'Uno de los documentos cargados ya no está disponible. Vuelve a subirlo.',
  AFFILIATION_LINK_INVALID: 'Este enlace no es válido.',
  AFFILIATION_LINK_EXPIRED: 'Este enlace venció.',
  DOCUMENT_STORAGE_UNAVAILABLE:
    'No pudimos guardar tu documento en este momento. Inténtalo de nuevo en unos minutos.',
  SERVICE_NOT_AVAILABLE: 'Ese servicio no está disponible por ahora.',
};

export const AFFILIATION_CONFLICT_FIELD_MAP: Partial<
  Record<
    AffiliationErrorCode,
    {
      field: 'contact_phone' | 'contact_email' | 'tax_id' | 'municipality_id' | 'service_types';
      message: string;
    }
  >
> = {
  CONTACT_PHONE_TAKEN: {
    field: 'contact_phone',
    message: AFFILIATION_ERROR_MESSAGES.CONTACT_PHONE_TAKEN,
  },
  CONTACT_EMAIL_TAKEN: {
    field: 'contact_email',
    message: AFFILIATION_ERROR_MESSAGES.CONTACT_EMAIL_TAKEN,
  },
  TAX_ID_TAKEN: { field: 'tax_id', message: AFFILIATION_ERROR_MESSAGES.TAX_ID_TAKEN },
  APPLICATION_IN_REVIEW: {
    field: 'tax_id',
    message: AFFILIATION_ERROR_MESSAGES.APPLICATION_IN_REVIEW,
  },
  MUNICIPALITY_NOT_FOUND: {
    field: 'municipality_id',
    message: AFFILIATION_ERROR_MESSAGES.MUNICIPALITY_NOT_FOUND,
  },
  SERVICE_NOT_AVAILABLE: {
    field: 'service_types',
    message: AFFILIATION_ERROR_MESSAGES.SERVICE_NOT_AVAILABLE,
  },
};

export const AFFILIATION_LINK_ERROR_COPY: Record<
  'missing' | 'malformed' | 'expired',
  { title: string; body: string }
> = {
  missing: {
    title: 'Este enlace no tiene la información necesaria.',
    body: 'Verifica que copiaste la dirección completa del correo, incluido lo que sigue después de "token=". Si el problema sigue, escríbenos.',
  },
  malformed: {
    title: 'Este enlace no es válido.',
    body: 'Puede que se haya copiado incompleto. Vuelve al correo que te enviamos y usa el enlace tal como aparece, sin modificarlo.',
  },
  expired: {
    title: 'Este enlace venció.',
    body: 'Los enlaces para volver a cargar documentos son válidos por 14 días. Escríbenos y te enviamos uno nuevo.',
  },
};

export const AFFILIATION_DOCUMENTS_RELOAD_COPY = {
  eyebrow: 'Afiliación de empresas',
  title: 'Actualiza tus documentos',
  lede:
    'Revisamos tu solicitud y te pedimos volver a cargar alguno de tus documentos. Revisa el correo ' +
    'que te enviamos para ver cuál — puedes subir el que corresponda o los que necesites.',
  allSaved: 'Actualizaste tus documentos. El equipo de VoyYa los revisará de nuevo.',
} as const;

export const AFFILIATION_FORM_COPY = {
  eyebrow: 'Afiliación de empresas',
  title: 'Afilia tu empresa de taxis a VoyYa',
  lede:
    'Cuéntanos de tu empresa, elige tu municipio y carga tus documentos. Te avisamos por correo ' +
    'cuando revisemos tu solicitud.',
  documentsHint: 'PDF o foto · máx. 5 MB por archivo',
  successTitle: '¡Listo! Recibimos tu solicitud.',
  successBody: (email: string): string =>
    `Te escribiremos a ${email} en cuanto la revisemos. Guarda este correo, ahí llegará la respuesta.`,
} as const;

export const PRIVACY_CONSENT_COPY = {
  label:
    'He leído y acepto el tratamiento de mis datos personales conforme a la Política de ' +
    'Tratamiento de Datos de VoyYa (Ley 1581 de 2012).',
  linkText: 'Política de Tratamiento de Datos',
  required: 'Debes aceptar el tratamiento de datos personales para enviar la solicitud.',
} as const;

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

export const PLATFORM_EMPTY_COPY: Record<'pending' | 'other', { title: string }> = {
  pending: { title: 'No hay solicitudes pendientes.' },
  other: { title: 'No hay empresas con este estado.' },
};

export const AFFILIATION_SUCCESS_COPY = {
  nextStepsTitle: 'Qué sigue',
  nextSteps: [
    'Revisamos los datos y los documentos de tu empresa.',
    'Te escribimos al correo de contacto con la respuesta.',
    'Si aprobamos tu solicitud, podrás registrar a tus conductores.',
  ],
} as const;

export const AFFILIATION_FIELDS_COPY = {
  companySection: 'Datos de la empresa',
  contactSection: 'Representante de contacto',
  documentsSection: 'Documentos legales',
  consentSection: 'Tratamiento de datos',
  chooseOption: 'Elige una opción',
  submit: 'Enviar solicitud',
  submitting: 'Enviando…',
  offline: 'Sin conexión · no se puede enviar la solicitud ahora.',
} as const;

export const COMPANY_NAMES_COPY = {
  legalName: 'Razón social',
  publicName: 'Nombre público (opcional)',
  publicNameHint:
    'Es el nombre con el que te verán los pasajeros. Si lo dejas vacío, usamos tu razón social.',
  publicNamePreview: (name: string): string => `Así te verán los pasajeros: ${name}`,
  publicNameInvalid: 'Escribe entre 2 y 60 caracteres, sin símbolos invisibles ni de control.',
} as const;

export const SERVICE_DECLARATION_COPY = {
  legend: 'Servicio que ofreces',
  onlyOne: (service: string): string => `Por ahora VoyYa ofrece solo ${service.toLowerCase()}.`,
  required: 'Elige al menos un servicio.',
  unavailable: 'Ese servicio no está disponible por ahora.',
} as const;

export const MUNICIPALITY_FIELD_COPY = {
  departmentLabel: 'Departamento',
  departmentPlaceholder: 'Elige un departamento',
  departmentRequired: 'Elige tu departamento.',
  label: 'Municipio',
  placeholder: 'Escribe tu municipio',
  placeholderNoDepartment: 'Primero elige un departamento',
  hintNoDepartment: 'Elige un departamento para ver sus municipios.',
  hint: (department: string): string => `Municipios de ${department}. Escribe para buscar.`,
  listLabel: (department: string): string => `Municipios de ${department}`,
  clearLabel: 'Borrar municipio',
  existingCompaniesNote:
    'En este municipio ya operan otras empresas. Tu solicitud se revisa igual.',
  noCoverageNotice:
    'Aún no hay cobertura en este municipio. Si tu empresa es aprobada, la cobertura se habilita después de la aprobación.',
  noCoverageShort: 'Aún no hay cobertura en este municipio.',
  coveredNotice: 'VoyYa revisará tu solicitud antes de aprobar a tu empresa.',
  departmentChangedNotice: 'Cambiaste de departamento. Elige de nuevo tu municipio.',
  departmentChosenAnnouncement: (department: string, count: number): string =>
    `Departamento elegido: ${department}. Ahora puedes elegir tu municipio. ${
      count === 1 ? '1 municipio disponible.' : `${count} municipios disponibles.`
    }`,
  departmentClearedAnnouncement: 'Departamento sin elegir. El municipio queda deshabilitado.',
  listOpenedAnnouncement: (count: number, department: string): string =>
    `${count} municipios en ${department}. Usa las flechas arriba y abajo para recorrerlos.`,
  resultsCount: (count: number): string =>
    count === 1
      ? '1 municipio encontrado.'
      : `${count} municipios encontrados. Usa las flechas arriba y abajo para recorrerlos.`,
  noResults: (department: string): string =>
    `No encontramos ese municipio en ${department}. Revisa cómo lo escribiste o si elegiste el departamento correcto.`,
  noResultsAnnouncement: (department: string): string =>
    `No encontramos ese municipio en ${department}.`,
  selectedAnnouncement: (name: string, notes: readonly string[]): string =>
    [`Municipio elegido: ${name}.`, ...notes].join(' '),
  clearedAnnouncement: 'Municipio borrado.',
  loading: 'Cargando municipios…',
  loadingSlow: 'Sigue cargando. Puede tardar si tu conexión es lenta.',
  loadError: 'No pudimos cargar los municipios.',
  offline: 'Sin conexión. Cuando vuelva, cargamos los municipios solos.',
  emptyCatalog: 'Por ahora no hay municipios para elegir. Vuelve a intentarlo en unos minutos.',
  required: 'Elige tu municipio de la lista.',
  sourceFallbackAttribution: 'Fuente: DIVIPOLA (DANE, www.dane.gov.co)',
  sourceFallbackLicense: 'CC BY-SA 4.0',
  sourceLicenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.es',
  sourceLead: (attribution: string): string =>
    `${attribution.trim().replace(/\.$/, '')}, adaptado. Licencia `,
  sourceTail: (cutDate: string): string => `. Corte ${cutDate}.`,
  sourceNewTab: '(se abre en una pestaña nueva)',
} as const;
