import type { ServiceType } from '@voyyaa/shared';

const SERVICE_TYPE_LABELS: Partial<Record<ServiceType, string>> = {
  taxi: 'Taxi',
};

export const SERVICE_FALLBACK_LABEL = 'Servicio';

export function serviceLabel(serviceType: ServiceType): string {
  return SERVICE_TYPE_LABELS[serviceType] ?? SERVICE_FALLBACK_LABEL;
}

export function serviceLabels(serviceTypes: readonly ServiceType[]): string {
  return serviceTypes.map(serviceLabel).join(', ');
}
