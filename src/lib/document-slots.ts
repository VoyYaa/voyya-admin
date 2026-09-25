import { DOCUMENT_ALLOWED_CONTENT_TYPES, DOCUMENT_MAX_BYTES } from '@voyyaa/shared';
import { DOCUMENT_UPLOAD_ERROR_MESSAGES } from '../copy/affiliation';

export interface DocumentSlot {
  fileName: string | null;
  storageKey: string | null;
  issuedAt: string;
  expiresAt: string;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  errorMessage: string | null;
}

export function createInitialDocumentSlot(): DocumentSlot {
  return {
    fileName: null,
    storageKey: null,
    issuedAt: '',
    expiresAt: '',
    status: 'idle',
    errorMessage: null,
  };
}

export function validateDocumentFileClientSide(file: File): string | null {
  if (!(DOCUMENT_ALLOWED_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return DOCUMENT_UPLOAD_ERROR_MESSAGES.DOCUMENT_TYPE_NOT_ALLOWED ?? null;
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    return DOCUMENT_UPLOAD_ERROR_MESSAGES.DOCUMENT_TOO_LARGE ?? null;
  }
  return null;
}
