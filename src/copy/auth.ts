export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  ACCOUNT_SUSPENDED:
    'Esta cuenta está suspendida. Comunícate con quien administra la consola en tu empresa.',
  STAFF_WITHOUT_COMPANY:
    'Tu usuario no está vinculado a ninguna empresa. Pide que lo vinculen antes de volver a intentarlo.',
};

export const LOGIN_COPY = {
  eyebrow: 'Consola de operación',
  lede: 'Ingresa con el correo y la contraseña que te entregó tu empresa.',
  help: '¿No puedes entrar? Comunícate con quien administra la consola en tu empresa.',
} as const;
