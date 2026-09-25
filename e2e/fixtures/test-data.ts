export function e2eSeed(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;
}

export function e2eLegalName(seed: string): string {
  return `E2E Playwright ${seed}`;
}

export function e2eTaxId(seed: string): string {
  return `900${seed.slice(-6)}`;
}

export function e2ePhone(seed: string): string {
  return `3${seed.slice(-9).padStart(9, '0')}`;
}

export function e2eNationalId(seed: string): string {
  return `999${seed.slice(-9)}`;
}

export function e2ePlate(seed: string): string {
  return `ZZZ${seed.slice(-3)}`;
}

export function e2eEmail(seed: string): string {
  return `e2e-playwright-${seed}@voyya-admin-tests.invalid`;
}

const MINIMAL_PDF_BUFFER = Buffer.from('%PDF-1.4\n%%EOF', 'utf-8');

export function pdfFile(name: string): { name: string; mimeType: string; buffer: Buffer } {
  return { name, mimeType: 'application/pdf', buffer: MINIMAL_PDF_BUFFER };
}
