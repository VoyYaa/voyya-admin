import { useCallback, useState, type JSX } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  REQUIRED_COMPANY_DOCUMENT_TYPES,
  type ApproveCompanyDTO,
  type CompanyDocumentType,
  type CompanyLegalForm,
  type PlatformCompanyDetail,
} from '@voyyaa/shared';
import {
  approveCompany,
  getPlatformCompanyDetail,
  rejectCompany,
  requestCompanyDocuments,
  resendCompanyNotification,
} from '../api/platform-companies.api';
import { domainErrorCode, isNetworkError } from '../api/errors';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorPanel } from '../components/ui/TableStates';
import { StatusDot } from '../components/ui/StatusDot';
import {
  PLATFORM_DECISION_ERROR_MESSAGES,
  ROUTING_LIMITATION_ACK_LABEL,
  ROUTING_LIMITATION_WARNING,
} from '../copy/affiliation';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import {
  COMPANY_DECISION_LABELS,
  COMPANY_DOCUMENT_TYPE_LABELS,
  COMPANY_LEGAL_FORM_LABELS,
  COMPANY_STATUS_LABELS,
  COMPANY_STATUS_TONES,
  DOCUMENT_VERIFICATION_LABELS,
} from '../lib/status-maps';
import { useToastStore } from '../state/toast-store';

type DecisionMode = 'none' | 'approve' | 'request-documents' | 'reject';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function PlatformCompanyDetailPage(): JSX.Element {
  const params = useParams<{ companyId: string }>();
  const companyId = Number(params.companyId);
  const navigate = useNavigate();
  const online = useNetworkOnline();
  const pushToast = useToastStore((s) => s.pushToast);

  const fetcher = useCallback(() => getPlatformCompanyDetail(companyId), [companyId]);
  const { data, status, refetch } = useAsync(fetcher, Number.isFinite(companyId));

  const [mode, setMode] = useState<DecisionMode>('none');
  const [actionInFlight, setActionInFlight] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const onDecided = useCallback(
    (message: string, delivery: 'sent' | 'failed') => {
      setMode('none');
      setActionError(null);
      if (delivery === 'sent') {
        pushToast('success', message);
      } else {
        pushToast('danger', `${message} No pudimos enviarle el correo · usa "Reenviar aviso".`);
      }
      refetch();
    },
    [pushToast, refetch],
  );

  const onResend = async (): Promise<void> => {
    setResendState('sending');
    try {
      const result = await resendCompanyNotification(companyId);
      setResendState(result.notification.delivery === 'sent' ? 'sent' : 'error');
    } catch {
      setResendState('error');
    }
  };

  if (!Number.isFinite(companyId)) {
    return (
      <ErrorPanel
        title="Identificador de empresa inválido."
        onRetry={() => navigate('/platform/companies')}
      />
    );
  }

  if (status === 'loading' && !data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="h-48 animate-pulse rounded-md bg-bg-shell motion-reduce:animate-none" />
      </div>
    );
  }

  if (status === 'error' && !data) {
    return <ErrorPanel title="No pudimos cargar la solicitud." onRetry={refetch} />;
  }

  if (!data) return <></>;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-16">
      <header className="mb-6 flex items-start gap-4">
        <Link
          to="/platform/companies"
          aria-label="Volver a Empresas"
          className="focus-ring flex h-tap-compact w-tap-compact shrink-0 items-center justify-center rounded-xs border border-border bg-surface"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <div className="flex-1">
          <p className="text-small text-text-muted">
            Solicitud recibida el {formatDate(data.submitted_at)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display font-display text-text">{data.legal_name}</h1>
            <StatusDot
              tone={COMPANY_STATUS_TONES[data.status]}
              label={COMPANY_STATUS_LABELS[data.status]}
            />
          </div>
        </div>
        <p className="text-numeric text-small text-text-muted">
          NIT {data.tax_id} · {data.municipality_name}, {data.municipality_department}
        </p>
      </header>

      {!online && (
        <p
          role="alert"
          className="mb-4 rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
        >
          Sin conexión · no se pueden tomar decisiones ahora.
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="grid grid-cols-2 gap-4 rounded-md border border-border bg-surface p-5 sm:grid-cols-4">
            <InfoField
              label="Flota declarada"
              value={data.vehicle_count ? String(data.vehicle_count) : 'Sin tope'}
            />
            <InfoField
              label="Forma jurídica"
              value={
                COMPANY_LEGAL_FORM_LABELS[data.legal_form as CompanyLegalForm] ?? data.legal_form
              }
            />
            <InfoField
              label="Municipio"
              value={data.municipality_name}
              badge={!data.municipality_already_covered ? 'nuevo' : undefined}
            />
            <InfoField label="Contacto" value={data.contact_email ?? '—'} />
          </section>

          {data.municipality_already_covered && (
            <div role="alert" className="rounded-md border-2 border-amber bg-amber/10 p-4">
              <p className="text-body font-medium text-text">
                Municipio ya cubierto por otra empresa
              </p>
              <p className="mt-1 text-small text-text">
                {ROUTING_LIMITATION_WARNING(
                  data.municipality_name,
                  data.municipality_active_company_name ?? 'otra empresa activa',
                )}
              </p>
            </div>
          )}

          <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-title font-display text-text">Documentos legales</h2>
              <span className="text-small text-text-muted">
                {data.documents.filter((d) => d.verification === 'verified').length} de{' '}
                {data.documents.length} verificados
              </span>
            </div>
            {data.documents.map((doc) => (
              <div
                key={doc.company_document_id}
                className={`flex items-center gap-3 rounded-item border p-3 ${
                  doc.verification === 'rejected'
                    ? 'border-amber bg-amber/10'
                    : doc.verification === 'verified'
                      ? 'border-success/40 bg-success/10'
                      : 'border-border bg-surface-sunken'
                }`}
              >
                <div className="flex-1">
                  <p className="text-body font-medium text-text">
                    {COMPANY_DOCUMENT_TYPE_LABELS[doc.type]}
                  </p>
                  <p className="text-small text-text-muted">
                    {DOCUMENT_VERIFICATION_LABELS[doc.verification]}
                    {doc.review_note ? ` · ${doc.review_note}` : ''}
                    {doc.expires_at ? ` · vence ${doc.expires_at}` : ''}
                  </p>
                </div>
                <a
                  href={doc.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring rounded-sm border border-border-input px-3 py-1.5 text-btn font-display text-text hover:bg-bg-shell"
                >
                  Ver
                </a>
              </div>
            ))}
          </section>

          {data.reviews.length > 0 && (
            <section className="flex flex-col gap-3 rounded-md border border-border bg-surface p-5">
              <h2 className="text-title font-display text-text">Historial de decisiones</h2>
              <ul className="flex flex-col gap-3">
                {data.reviews.map((review) => (
                  <li key={review.company_review_id} className="border-l-2 border-l-border pl-3">
                    <p className="text-body text-text">
                      <span className="font-medium">
                        {COMPANY_DECISION_LABELS[review.decision]}
                      </span>{' '}
                      · {review.reviewer_name} · {formatDate(review.decided_at)}
                    </p>
                    {review.note && <p className="text-small text-text-muted">{review.note}</p>}
                    {review.acknowledged_routing_limitation && (
                      <p className="text-small text-amber-ink dark:text-amber">
                        Se reconoció la limitación de reparto con{' '}
                        {review.municipality_active_company_name}.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <div>
                <button
                  type="button"
                  onClick={() => void onResend()}
                  disabled={resendState === 'sending' || !online}
                  className="focus-ring rounded-sm border border-border px-3 py-1.5 text-btn font-display text-text hover:bg-bg-shell disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendState === 'sending' ? 'Reenviando…' : 'Reenviar aviso'}
                </button>
                {resendState === 'sent' && (
                  <p className="mt-1 text-small text-success-ink dark:text-success-ink-dark">
                    Aviso reenviado.
                  </p>
                )}
                {resendState === 'error' && (
                  <p className="mt-1 text-small text-danger-ink dark:text-danger-ink-dark">
                    No pudimos reenviar el aviso.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>

        <section className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5">
          <h2 className="text-title font-display text-text">Decisión</h2>

          {data.status !== 'pending' ? (
            <p className="text-body text-text-muted">
              Esta solicitud ya fue {COMPANY_STATUS_LABELS[data.status].toLowerCase()}. No hay más
              decisiones por tomar.
            </p>
          ) : (
            <>
              {actionError && (
                <p
                  role="alert"
                  className="rounded-xs bg-danger-tint px-3 py-2 text-body text-danger-ink"
                >
                  {actionError}
                </p>
              )}

              {mode === 'none' && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('approve')}
                    disabled={!online}
                    className="focus-ring h-tap rounded-sm bg-amber px-4 text-btn font-display text-on-brand hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Aprobar empresa
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('request-documents')}
                    disabled={!online}
                    className="focus-ring h-tap rounded-sm border border-border-input bg-surface px-4 text-btn font-display text-text hover:bg-bg-shell disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Pedir documento faltante
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('reject')}
                    disabled={!online}
                    className="focus-ring h-tap rounded-sm border border-danger/40 bg-danger-tint px-4 text-btn font-display text-danger-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Rechazar solicitud
                  </button>
                </div>
              )}

              {mode === 'approve' && (
                <ApprovePanel
                  companyId={companyId}
                  detail={data}
                  actionInFlight={actionInFlight}
                  setActionInFlight={setActionInFlight}
                  setActionError={setActionError}
                  onCancel={() => setMode('none')}
                  onDecided={onDecided}
                />
              )}

              {mode === 'request-documents' && (
                <RequestDocumentsPanel
                  companyId={companyId}
                  actionInFlight={actionInFlight}
                  setActionInFlight={setActionInFlight}
                  setActionError={setActionError}
                  onCancel={() => setMode('none')}
                  onDecided={onDecided}
                />
              )}

              {mode === 'reject' && (
                <RejectPanel
                  companyId={companyId}
                  actionInFlight={actionInFlight}
                  setActionInFlight={setActionInFlight}
                  setActionError={setActionError}
                  onCancel={() => setMode('none')}
                  onDecided={onDecided}
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-eyebrow uppercase text-text-muted">{label}</span>
      <span className="text-body font-medium text-text">
        {value}
        {badge && <span className="ml-1 text-small font-normal text-clay">· {badge}</span>}
      </span>
    </div>
  );
}

function mapDecisionError(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Sin conexión · no se pudo enviar la decisión. Inténtalo de nuevo.';
  }
  const code = domainErrorCode(error);
  if (code) {
    const mapped = PLATFORM_DECISION_ERROR_MESSAGES[code];
    if (mapped) return mapped;
  }
  if (code === 'MUNICIPALITY_ALREADY_COVERED') {
    return 'El municipio ya quedó cubierto por otra empresa mientras revisabas esta solicitud. Actualiza y revisa de nuevo.';
  }
  return 'No pudimos guardar la decisión. Inténtalo de nuevo.';
}

interface ApprovePanelProps {
  companyId: number;
  detail: PlatformCompanyDetail;
  actionInFlight: boolean;
  setActionInFlight: (v: boolean) => void;
  setActionError: (v: string | null) => void;
  onCancel: () => void;
  onDecided: (message: string, delivery: 'sent' | 'failed') => void;
}

function ApprovePanel({
  companyId,
  detail,
  actionInFlight,
  setActionInFlight,
  setActionError,
  onCancel,
  onDecided,
}: ApprovePanelProps): JSX.Element {
  const [baseFare, setBaseFare] = useState('');
  const [note, setNote] = useState('');
  const [ackRouting, setAckRouting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const baseFareNumber = Number(baseFare);
  const baseFareValid =
    baseFare.trim().length > 0 &&
    Number.isInteger(baseFareNumber) &&
    baseFareNumber >= 1000 &&
    baseFareNumber <= 1_000_000;
  const routingOk = !detail.municipality_already_covered || ackRouting;
  const canSubmit = baseFareValid && routingOk;

  const onConfirm = async (): Promise<void> => {
    setActionInFlight(true);
    setActionError(null);
    try {
      const dto: ApproveCompanyDTO = {
        initial_fare: { base_fare: baseFareNumber },
        note: note.trim().length > 0 ? note.trim() : undefined,
        acknowledge_routing_limitation: ackRouting ? true : undefined,
      };
      const result = await approveCompany(companyId, dto);
      setConfirmOpen(false);
      onDecided('Empresa aprobada · ya puede registrar conductores.', result.notification.delivery);
    } catch (error) {
      setConfirmOpen(false);
      setActionError(mapDecisionError(error));
    } finally {
      setActionInFlight(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="approve-base-fare" className="text-eyebrow uppercase text-text-muted">
          Tarifa base inicial
        </label>
        <input
          id="approve-base-fare"
          type="number"
          inputMode="numeric"
          min={1000}
          max={1_000_000}
          step={500}
          value={baseFare}
          onChange={(event) => setBaseFare(event.target.value)}
          className="focus-ring w-full rounded-xs border border-border-input bg-surface px-3 py-2 text-numeric text-text outline-none"
        />
        <p className="text-small text-text-muted">
          Obligatoria: ninguna empresa activa sale de aquí sin tarifa configurada.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="approve-note" className="text-eyebrow uppercase text-text-muted">
          Nota para la empresa
        </label>
        <textarea
          id="approve-note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
        />
        <p className="text-small text-text-muted">Se envía por correo al contacto registrado.</p>
      </div>

      {detail.municipality_already_covered && (
        <label className="flex min-h-tap items-center gap-2.5 rounded-xs border border-amber/40 bg-amber/5 px-3 py-2">
          <input
            type="checkbox"
            checked={ackRouting}
            onChange={(event) => setAckRouting(event.target.checked)}
            className="focus-ring h-5 w-5 shrink-0"
          />
          <span className="text-body text-text">{ROUTING_LIMITATION_ACK_LABEL}</span>
        </label>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring h-tap flex-1 rounded-sm border border-border px-4 text-btn font-display text-text hover:bg-bg-shell"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!canSubmit}
          className="focus-ring h-tap flex-1 rounded-sm bg-amber px-4 text-btn font-display text-on-brand hover:bg-amber-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          Aprobar empresa
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Confirmar aprobación?"
        confirmLabel={actionInFlight ? 'Aprobando…' : 'Aprobar empresa'}
        cancelLabel="Seguir revisando"
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirmOpen(false)}
        confirmDisabled={actionInFlight}
      >
        <p>
          Aprobar habilita a <strong>{detail.legal_name}</strong> para crear conductores
          {!detail.municipality_already_covered &&
            ' y abre ' + detail.municipality_name + ' como municipio de cobertura'}
          .
        </p>
      </ConfirmDialog>
    </div>
  );
}

interface RequestDocumentsPanelProps {
  companyId: number;
  actionInFlight: boolean;
  setActionInFlight: (v: boolean) => void;
  setActionError: (v: string | null) => void;
  onCancel: () => void;
  onDecided: (message: string, delivery: 'sent' | 'failed') => void;
}

function RequestDocumentsPanel({
  companyId,
  actionInFlight,
  setActionInFlight,
  setActionError,
  onCancel,
  onDecided,
}: RequestDocumentsPanelProps): JSX.Element {
  const [selected, setSelected] = useState<CompanyDocumentType[]>([]);
  const [note, setNote] = useState('');

  const canSubmit = selected.length > 0 && note.trim().length >= 10;

  const toggle = (type: CompanyDocumentType): void => {
    setSelected((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    );
  };

  const onSubmit = async (): Promise<void> => {
    setActionInFlight(true);
    setActionError(null);
    try {
      const result = await requestCompanyDocuments(companyId, {
        document_types: selected,
        note: note.trim(),
      });
      onDecided('Le pedimos el documento a la empresa.', result.notification.delivery);
    } catch (error) {
      setActionError(mapDecisionError(error));
    } finally {
      setActionInFlight(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-eyebrow uppercase text-text-muted">Documentos a pedir</legend>
        {REQUIRED_COMPANY_DOCUMENT_TYPES.map((type) => (
          <label
            key={type}
            className="flex min-h-tap items-center gap-2.5 rounded-xs px-2 hover:bg-bg-shell"
          >
            <input
              type="checkbox"
              checked={selected.includes(type)}
              onChange={() => toggle(type)}
              className="focus-ring h-5 w-5 shrink-0"
            />
            <span className="text-body text-text">{COMPANY_DOCUMENT_TYPE_LABELS[type]}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="request-note" className="text-eyebrow uppercase text-text-muted">
          Nota para la empresa
        </label>
        <textarea
          id="request-note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Explica qué falta o por qué se rechazó."
          className="rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring h-tap flex-1 rounded-sm border border-border px-4 text-btn font-display text-text hover:bg-bg-shell"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={!canSubmit || actionInFlight}
          className="focus-ring h-tap flex-1 rounded-sm border border-border-input bg-surface px-4 text-btn font-display text-text hover:bg-bg-shell disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionInFlight ? 'Enviando…' : 'Pedir documento'}
        </button>
      </div>
    </div>
  );
}

interface RejectPanelProps {
  companyId: number;
  actionInFlight: boolean;
  setActionInFlight: (v: boolean) => void;
  setActionError: (v: string | null) => void;
  onCancel: () => void;
  onDecided: (message: string, delivery: 'sent' | 'failed') => void;
}

function RejectPanel({
  companyId,
  actionInFlight,
  setActionInFlight,
  setActionError,
  onCancel,
  onDecided,
}: RejectPanelProps): JSX.Element {
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canSubmit = note.trim().length >= 10;

  const onConfirm = async (): Promise<void> => {
    setActionInFlight(true);
    setActionError(null);
    try {
      const result = await rejectCompany(companyId, { note: note.trim() });
      setConfirmOpen(false);
      onDecided('Solicitud rechazada.', result.notification.delivery);
    } catch (error) {
      setConfirmOpen(false);
      setActionError(mapDecisionError(error));
    } finally {
      setActionInFlight(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reject-note" className="text-eyebrow uppercase text-text-muted">
          Motivo del rechazo
        </label>
        <textarea
          id="reject-note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="rounded-xs border border-border-input bg-surface px-3 py-2 text-body text-text outline-none"
        />
        <p className="text-small text-text-muted">Se envía por correo al contacto registrado.</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring h-tap flex-1 rounded-sm border border-border px-4 text-btn font-display text-text hover:bg-bg-shell"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!canSubmit}
          className="focus-ring h-tap flex-1 rounded-sm border border-danger/40 bg-danger-tint px-4 text-btn font-display text-danger-ink hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Rechazar solicitud
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Confirmar rechazo?"
        confirmLabel={actionInFlight ? 'Rechazando…' : 'Rechazar solicitud'}
        cancelLabel="Seguir revisando"
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirmOpen(false)}
        confirmDisabled={actionInFlight}
      >
        <p>Esta empresa no podrá registrar conductores ni recibir solicitudes de viaje.</p>
      </ConfirmDialog>
    </div>
  );
}
