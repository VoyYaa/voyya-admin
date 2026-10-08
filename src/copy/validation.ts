import { z } from 'zod';

export const VALIDATION_COPY = {
  required: 'Este campo es obligatorio.',
  invalid: 'El valor no es válido.',
  invalidEmail: 'Escribe un correo válido.',
  invalidNumber: 'Escribe un número válido.',
  invalidFormat: 'El formato no es válido.',
  invalidDate: 'Escribe una fecha válida.',
  chooseOption: 'Elige una opción de la lista.',
  minLength: (min: number): string => `Debe tener al menos ${min} caracteres.`,
  maxLength: (max: number): string => `Debe tener máximo ${max} caracteres.`,
  minValue: (min: number | bigint): string => `Debe ser mayor o igual a ${min}.`,
  maxValue: (max: number | bigint): string => `Debe ser menor o igual a ${max}.`,
  integer: 'Debe ser un número entero.',
  multipleOf: (step: number | bigint): string => `Debe ser múltiplo de ${step}.`,
} as const;

function messageForSmallest(issue: z.ZodTooSmallIssue): string {
  if (issue.type === 'string') {
    return issue.minimum === 1 || issue.minimum === 1n
      ? VALIDATION_COPY.required
      : VALIDATION_COPY.minLength(Number(issue.minimum));
  }
  if (issue.type === 'array' || issue.type === 'set') return VALIDATION_COPY.required;
  return VALIDATION_COPY.minValue(issue.minimum);
}

function messageForLargest(issue: z.ZodTooBigIssue): string {
  if (issue.type === 'string') return VALIDATION_COPY.maxLength(Number(issue.maximum));
  return VALIDATION_COPY.maxValue(issue.maximum);
}

function messageForInvalidType(issue: z.ZodInvalidTypeIssue): string {
  if (issue.received === 'undefined' || issue.received === 'null') return VALIDATION_COPY.required;
  if (issue.received === 'nan' || issue.expected === 'number') return VALIDATION_COPY.invalidNumber;
  return VALIDATION_COPY.invalid;
}

function messageForInvalidString(issue: z.ZodInvalidStringIssue): string {
  if (issue.validation === 'email') return VALIDATION_COPY.invalidEmail;
  if (issue.validation === 'datetime' || issue.validation === 'date') {
    return VALIDATION_COPY.invalidDate;
  }
  return VALIDATION_COPY.invalidFormat;
}

function messageFor(issue: z.ZodIssueOptionalMessage): string | null {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return messageForInvalidType(issue);
    case z.ZodIssueCode.too_small:
      return messageForSmallest(issue);
    case z.ZodIssueCode.too_big:
      return messageForLargest(issue);
    case z.ZodIssueCode.invalid_string:
      return messageForInvalidString(issue);
    case z.ZodIssueCode.invalid_enum_value:
    case z.ZodIssueCode.invalid_literal:
      return VALIDATION_COPY.chooseOption;
    case z.ZodIssueCode.not_multiple_of:
      return VALIDATION_COPY.multipleOf(issue.multipleOf);
    default:
      return null;
  }
}

export const spanishZodErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type && issue.expected === 'integer') {
    return { message: VALIDATION_COPY.integer };
  }
  return { message: messageFor(issue) ?? ctx.defaultError };
};
