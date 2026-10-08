import { useCallback, useState, type JSX, type ReactNode } from 'react';
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
import { StateGlyph } from '../components/brand/StateGlyph';
import { Button } from '../components/ui/Button';
import { buttonClassName } from '../components/ui/button-styles';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Field } from '../components/ui/Field';
import { CoveragePendingBadge } from '../components/ui/CoveragePendingBadge';
import { Notice } from '../components/ui/Notice';
import { OfficialBadge } from '../components/ui/OfficialBadge';
import { ProgressRail } from '../components/ui/ProgressRail';
import { StatusDot } from '../components/ui/StatusDot';
import { ErrorPanel, SkeletonBlock } from '../components/ui/TableStates';
import { Timeline } from '../components/ui/Timeline';
import { PLATFORM_DECISION_ERROR_MESSAGES } from '../copy/affiliation';
import { COVERAGE_COPY, PLATFORM_COMPANIES_COPY } from '../copy/coverage';
import { serviceLabel, serviceLabels } from '../copy/service';
import { useAsync } from '../hooks/useAsync';
import { useNetworkOnline } from '../hooks/useNetworkOnline';
import { commissionError, parseDraftNumber, validateConfigNumber } from '../lib/service-config';
import { COMMISSION_RANGE, formatFieldValue } from '../lib/service-config-fields';
import {
  COMPANY_DECISION_LABELS,
  COMPANY_DOCUMENT_TYPE_LABELS,
  COMPANY_LEGAL_FORM_LABELS,
  COMPANY_STATUS_LABELS,
  COMPANY_STATUS_TONES,
  DOCUMENT_VERIFICATION_LABELS,
} from '../lib/status-maps';
import { formatLongDate as formatDate } from '../lib/time';
import { useToastStore, type ToastMessage } from '../state/toast-store';

type DecisionMode = 'none' | 'approve' | 'request-documents' | 'reject';

interface DecidedOutcome {
  message: string;
  tone?: ToastMessage['tone'];
}

export function PlatformCompanyDetailPage(): JSX.Element {
  const params = useParams<{ companyId: string }>();
  const companyId = Number(params.companyId);
  const navigate = useNavigate();
  const online = useNetworkOnline();
  const pushToast = useToastStore((s) => s.pushToast);

  const fetcher = useCallback(() => getPlatformCompanyDetail(companyId), [companyId]);
  const { data, status, isInitialLoading, refetch } = useAsync(fetcher, Number.isFinite(companyId));

  const [mode, setMode] = useState<DecisionMode>('none');
  const [actionInFlight, setActionInFlight] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const onDecided = useCallback(
    ({ message, tone = 'success' }: DecidedOutcome, delivery: 'sent' | 'failed') => {
      setMode('none');
      setActionError(null);
      if (delivery === 'sent') {
        pushToast(tone, message);
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

  if (isInitialLoading) {
    return (
      <div role="status" aria-label="Cargando solicitud" className="mx-auto max-w-6xl px-6 py-8">
        <ProgressRail className="mb-6" />
        <SkeletonBlock className="mb-2 h-3 w-40" />
        <SkeletonBlock className="mb-8 h-8 w-1/2" />
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-10" />
          ))}
        </div>
        <SkeletonBlock className="mt-8 h-48" />
      </div>
    );
  }

  if (status === 'error' && !data) {
    return (
      <ErrorPanel
        title="No pudimos cargar la solicitud."
        onRetry={refetch}
        variant={online ? 'error' : 'offline'}
      />
    );
  }

  if (!data) return <></>;

  return (
    <div className="pb-16">
      <header className="mx-auto flex max-w-6xl items-start gap-4 px-6 pt-8">
        <Link
          to="/platform/companies"
          aria-label="Volver a Empresas"
          className={buttonClassName('ghost', 'md', 'w-tap px-0')}
        >
          <span aria-hidden="true">←</span>
        </Link>
        <div className="flex-1">
          <p className="text-small text-text-muted">
            Solicitud recibida el {formatDate(data.submitted_at)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-display text-text">{data.legal_name}</h1>
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
        <div className="mx-auto mt-4 max-w-6xl px-6">
          <Notice tone="info" role="alert" leading={<StateGlyph glyph="offline" size={28} />}>
            Sin conexión · no se pueden tomar decisiones ahora.
          </Notice>
        </div>
      )}

      <section aria-label="Datos de la empresa" className="mx-auto mt-6 max-w-6xl px-6">
        <p className="vy-eyebrow mb-3">Datos</p>
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <InfoField
            label={PLATFORM_COMPANIES_COPY.detailFleet}
            value={
              data.vehicle_count
                ? String(data.vehicle_count)
                : PLATFORM_COMPANIES_COPY.unlimitedFleet
            }
          />
          <InfoField
            label={PLATFORM_COMPANIES_COPY.detailLegalForm}
            value={
              COMPANY_LEGAL_FORM_LABELS[data.legal_form as CompanyLegalForm] ?? data.legal_form
            }
          />
          <InfoField
            label={PLATFORM_COMPANIES_COPY.detailContact}
            value={data.contact_email ?? '—'}
          />
          <InfoField
            label={PLATFORM_COMPANIES_COPY.detailMunicipality}
            value={`${data.municipality_name}, ${data.municipality_department}`}
            extra={!data.municipality_coverage_active ? <CoveragePendingBadge /> : undefined}
          />
          <InfoField
            label={PLATFORM_COMPANIES_COPY.detailService}
            value={serviceLabels(data.service_types)}
          />
          <InfoField
            label={PLATFORM_COMPANIES_COPY.detailPublicName}
            value={data.public_name ?? PLATFORM_COMPANIES_COPY.detailPublicNameFallback}
            muted={data.public_name === null}
          />
          {data.commission && (
            <InfoField
              label={PLATFORM_COMPANIES_COPY.detailCommission}
              value={formatFieldValue('pct', data.commission.commission_pct)}
              extra={
                <Link to="/platform/commissions" className={buttonClassName('ghost')}>
                  {PLATFORM_COMPANIES_COPY.editCommission}
                </Link>
              }
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {!data.municipality_coverage_active && (
            <Notice tone="info" role="note">
              <p className="font-bold">{COVERAGE_COPY.approveNotice}</p>
              <p className="mt-1 text-small">{COVERAGE_COPY.approveNoticeNote}</p>
              {data.coverage_pending_since && (
                <p className="mt-1 text-small">
                  {COVERAGE_COPY.pendingSince(formatDate(data.coverage_pending_since))}
                </p>
              )}
            </Notice>
          )}
          {data.municipality_active_companies.length > 0 && (
            <Notice tone="info" role="note">
              <p className="font-bold">
                {PLATFORM_COMPANIES_COPY.otherCompanies(data.municipality_active_companies.length)}
              </p>
              <ul className="mt-1 list-disc pl-5 text-body">
                {data.municipality_active_companies.map((company) => (
                  <li key={company.company_id}>{company.legal_name}</li>
                ))}
              </ul>
            </Notice>
          )}
        </div>
      </section>

      <section aria-label="Documentos legales" className="mx-auto mt-8 max-w-6xl px-6">
        <div className="flex items-baseline justify-between">
          <p className="vy-eyebrow">Documentos legales</p>
          <span className="text-small text-text-muted">
            {data.documents.filter((d) => d.verification === 'verified').length} de{' '}
            {data.documents.length} verificados
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-2">
          {data.documents.map((doc) => (
            <div
              key={doc.company_document_id}
              className={`flex items-center gap-3 rounded-item border p-3 ${
                doc.verification === 'rejected'
                  ? 'border-amber bg-amber/10'
                  : doc.verification === 'verified'
                    ? 'border-success/50 bg-success-tint dark:bg-success/15'
                    : 'border-border-control bg-surface'
              }`}
            >
              <div className="flex-1">
                <p className="text-body font-bold text-text">
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
                className={buttonClassName('ghost')}
              >
                Descargar
              </a>
            </div>
          ))}
        </div>
      </section>

      {data.reviews.length > 0 && (
        <section aria-label="Historial de decisiones" className="mx-auto mt-8 max-w-6xl px-6">
          <p className="vy-eyebrow mb-3">Historial de decisiones</p>
          <div className="border-t border-border pt-4">
            <Timeline
              items={data.reviews.map((review) => ({
                id: review.company_review_id,
                label: COMPANY_DECISION_LABELS[review.decision],
                timestamp: null,
                done: true,
                detail: (
                  <>
                    <p className="text-body text-text">
                      {review.reviewer_name} · {formatDate(review.decided_at)}
                    </p>
                    {review.note && <p className="text-small text-text-muted">{review.note}</p>}
                  </>
                ),
              }))}
            />
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => void onResend()}
                disabled={!online}
                loading={resendState === 'sending'}
              >
                {resendState === 'sending' ? 'Reenviando…' : 'Reenviar aviso'}
              </Button>
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
          </div>
        </section>
      )}

      <section aria-label="Decisión" className="mt-10 border-y border-border bg-bg-shell py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6">
          <p className="vy-eyebrow">Decisión</p>

          {data.status !== 'pending' ? (
            <p className="text-body text-text-muted">
              Esta solicitud ya fue {COMPANY_STATUS_LABELS[data.status].toLowerCase()}. No hay más
              decisiones por tomar.
            </p>
          ) : (
            <>
              {actionError && (
                <Notice tone="danger" role="alert">
                  {actionError}
                </Notice>
              )}

              {mode === 'none' && (
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setMode('approve')} disabled={!online}>
                    Aprobar empresa
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setMode('request-documents')}
                    disabled={!online}
                  >
                    Pedir documento faltante
                  </Button>
                  <Button variant="danger" onClick={() => setMode('reject')} disabled={!online}>
                    Rechazar solicitud
                  </Button>
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
        </div>
      </section>
    </div>
  );
}

function InfoField({
  label,
  value,
  extra,
  muted = false,
}: {
  label: string;
  value: string;
  extra?: ReactNode;
  muted?: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-eyebrow uppercase text-text-muted">{label}</span>
      <span
        className={`text-body ${muted ? 'font-normal text-text-muted' : 'font-bold text-text'}`}
      >
        {value}
      </span>
      {extra}
    </div>
  );
}

function mapDecisionError(error: unknown, serviceName = ''): string {
  if (isNetworkError(error)) return PLATFORM_COMPANIES_COPY.connectionLost;
  const code = domainErrorCode(error);
  if (code === 'SERVICE_NOT_AVAILABLE') return PLATFORM_COMPANIES_COPY.serviceInactive(serviceName);
  if (code) {
    const mapped = PLATFORM_DECISION_ERROR_MESSAGES[code];
    if (mapped) return mapped;
  }
  return PLATFORM_COMPANIES_COPY.decisionFailed;
}

interface DecisionPanelProps {
  companyId: number;
  actionInFlight: boolean;
  setActionInFlight: (v: boolean) => void;
  setActionError: (v: string | null) => void;
  onCancel: () => void;
  onDecided: (outcome: DecidedOutcome, delivery: 'sent' | 'failed') => void;
}

interface ApprovePanelProps extends DecisionPanelProps {
  detail: PlatformCompanyDetail;
}

function baseFareError(raw: string): string | null {
  if (raw.trim().length === 0) return null;
  return validateConfigNumber('base_fare', raw);
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
  const [commission, setCommission] = useState('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fares = detail.service_types.map((serviceType) => ({
    serviceType,
    fare:
      detail.municipality_fares.find((entry) => entry.service_type === serviceType)?.fare ?? null,
  }));
  const needsInitialFare = fares.some((entry) => entry.fare === null);
  const existingFares = fares.filter((entry) => entry.fare !== null);
  const serviceNames = serviceLabels(detail.service_types);

  const fareMessage = baseFareError(baseFare);
  const commissionMessage = commission.trim().length === 0 ? null : commissionError(commission);
  const fareReady = !needsInitialFare || (baseFare.trim().length > 0 && fareMessage === null);
  const commissionReady = commission.trim().length > 0 && commissionMessage === null;
  const canSubmit = fareReady && commissionReady;

  const onConfirm = async (): Promise<void> => {
    const commissionPct = parseDraftNumber(commission);
    if (commissionPct === null) return;
    setActionInFlight(true);
    setActionError(null);
    try {
      const baseFareNumber = parseDraftNumber(baseFare);
      const dto: ApproveCompanyDTO = {
        initial_fare:
          needsInitialFare && baseFareNumber !== null ? { base_fare: baseFareNumber } : undefined,
        commission_pct: commissionPct,
        note: note.trim().length > 0 ? note.trim() : undefined,
      };
      const result = await approveCompany(companyId, dto);
      setConfirmOpen(false);
      onDecided(
        result.municipality_coverage_active
          ? { message: PLATFORM_COMPANIES_COPY.approvedToast }
          : {
              message: COVERAGE_COPY.approvedToast(detail.municipality_name),
              tone: 'info',
            },
        result.notification.delivery,
      );
    } catch (error) {
      setConfirmOpen(false);
      setActionError(mapDecisionError(error, serviceNames));
    } finally {
      setActionInFlight(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      {needsInitialFare ? (
        <Field
          label={PLATFORM_COMPANIES_COPY.initialFareLabel}
          htmlFor="approve-base-fare"
          hint={PLATFORM_COMPANIES_COPY.noFareHint}
          error={fareMessage ?? undefined}
        >
          {(control) => (
            <input
              type="number"
              inputMode="numeric"
              min={1000}
              max={1_000_000}
              step={500}
              value={baseFare}
              onChange={(event) => setBaseFare(event.target.value)}
              onWheel={(event) => event.currentTarget.blur()}
              className="vy-input text-numeric"
              {...control}
            />
          )}
        </Field>
      ) : null}

      {existingFares.map(({ serviceType, fare }) =>
        fare ? (
          <div
            key={serviceType}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-border py-3"
          >
            <span className="text-body font-bold text-text">
              {PLATFORM_COMPANIES_COPY.existingFare} · {serviceLabel(serviceType)}
            </span>
            <span className="text-numeric text-body text-text">
              {formatFieldValue('cop', fare.base_fare)}
            </span>
            <OfficialBadge official={fare.is_official} />
            <Link
              to={`/platform/rates/${fare.municipality_id}/${serviceType}`}
              className={buttonClassName('ghost')}
            >
              {PLATFORM_COMPANIES_COPY.viewFare}
            </Link>
            <span className="w-full text-small text-text-muted">
              {PLATFORM_COMPANIES_COPY.existingFareNote}
            </span>
          </div>
        ) : null,
      )}

      <Field
        label={PLATFORM_COMPANIES_COPY.commissionLabel}
        htmlFor="approve-commission"
        hint={`${PLATFORM_COMPANIES_COPY.commissionHint} ${PLATFORM_COMPANIES_COPY.commissionRange(COMMISSION_RANGE.min, COMMISSION_RANGE.max)}`}
        error={commissionMessage ?? undefined}
      >
        {(control) => (
          <input
            type="number"
            inputMode="decimal"
            min={COMMISSION_RANGE.min}
            max={COMMISSION_RANGE.max}
            step={COMMISSION_RANGE.step}
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
            onWheel={(event) => event.currentTarget.blur()}
            className="vy-input w-40 text-numeric"
            {...control}
          />
        )}
      </Field>

      <Field
        label="Nota para la empresa"
        htmlFor="approve-note"
        hint="Se envía por correo al contacto registrado."
      >
        {(control) => (
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="vy-input py-2"
            {...control}
          />
        )}
      </Field>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit} className="flex-1">
          Aprobar empresa
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Confirmar aprobación?"
        confirmLabel={actionInFlight ? 'Aprobando…' : 'Aprobar empresa'}
        cancelLabel="Seguir revisando"
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirmOpen(false)}
        confirmDisabled={actionInFlight}
        confirming={actionInFlight}
      >
        <div className="flex flex-col gap-2">
          <p>
            Aprobar habilita a <strong>{detail.legal_name}</strong>{' '}
            {PLATFORM_COMPANIES_COPY.approveService(serviceNames)}
          </p>
          {!detail.municipality_coverage_active && (
            <p>{PLATFORM_COMPANIES_COPY.approveNoCoverage(detail.municipality_name)}</p>
          )}
          {detail.municipality_active_companies.length > 0 && (
            <p>
              {PLATFORM_COMPANIES_COPY.sharesWith(
                detail.municipality_name,
                detail.municipality_active_companies.length,
              )}
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}

function RequestDocumentsPanel({
  companyId,
  actionInFlight,
  setActionInFlight,
  setActionError,
  onCancel,
  onDecided,
}: DecisionPanelProps): JSX.Element {
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
      onDecided({ message: 'Le pedimos el documento a la empresa.' }, result.notification.delivery);
    } catch (error) {
      setActionError(mapDecisionError(error));
    } finally {
      setActionInFlight(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-eyebrow uppercase text-text-muted">Documentos a pedir</legend>
        {REQUIRED_COMPANY_DOCUMENT_TYPES.map((type) => (
          <label
            key={type}
            className="flex min-h-tap items-center gap-2.5 rounded-xs px-2 hover:bg-bg"
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

      <Field label="Nota para la empresa" htmlFor="request-note">
        {(control) => (
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Explica qué falta o por qué se rechazó."
            className="vy-input py-2"
            {...control}
          />
        )}
      </Field>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button
          variant="secondary"
          onClick={() => void onSubmit()}
          disabled={!canSubmit}
          loading={actionInFlight}
          className="flex-1"
        >
          {actionInFlight ? 'Enviando…' : 'Pedir documento'}
        </Button>
      </div>
    </div>
  );
}

function RejectPanel({
  companyId,
  actionInFlight,
  setActionInFlight,
  setActionError,
  onCancel,
  onDecided,
}: DecisionPanelProps): JSX.Element {
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canSubmit = note.trim().length >= 10;

  const onConfirm = async (): Promise<void> => {
    setActionInFlight(true);
    setActionError(null);
    try {
      const result = await rejectCompany(companyId, { note: note.trim() });
      setConfirmOpen(false);
      onDecided({ message: 'Solicitud rechazada.' }, result.notification.delivery);
    } catch (error) {
      setConfirmOpen(false);
      setActionError(mapDecisionError(error));
    } finally {
      setActionInFlight(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Field
        label="Motivo del rechazo"
        htmlFor="reject-note"
        hint="Se envía por correo al contacto registrado."
      >
        {(control) => (
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="vy-input py-2"
            {...control}
          />
        )}
      </Field>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={() => setConfirmOpen(true)}
          disabled={!canSubmit}
          className="flex-1"
        >
          Rechazar solicitud
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Confirmar rechazo?"
        confirmLabel={actionInFlight ? 'Rechazando…' : 'Rechazar solicitud'}
        cancelLabel="Seguir revisando"
        onConfirm={() => void onConfirm()}
        onCancel={() => setConfirmOpen(false)}
        confirmDisabled={actionInFlight}
        confirmTone="danger"
        confirming={actionInFlight}
      >
        <p>Esta empresa no podrá registrar conductores ni recibir solicitudes de viaje.</p>
      </ConfirmDialog>
    </div>
  );
}
