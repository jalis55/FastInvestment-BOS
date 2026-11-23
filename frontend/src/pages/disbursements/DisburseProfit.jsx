import ButtonSpinner from '@/components/ButtonSpinner';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BadgeCheck, CalendarRange, Check, CircleDollarSign, Eye, Users, Wallet } from 'lucide-react';
import Swal from 'sweetalert2';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import BannerTitle from '@/components/BannerTitle';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { ProjectPicker } from '@/components/ui/project-search';
import { SurfaceCard } from '@/components/ui/surface-card';
import { cn } from '@/lib/utils';

const money = (amount) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(amount);
const dateLabel = (date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

function parsePayoutCents(value, totalCents) {
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 && cents <= totalCents ? cents : null;
}

function RecipientDestinations({ recipients, selectedIds, onSelect, onApply, projectActive, disabled }) {
  const [destination, setDestination] = useState('wallet');
  const [draftAmounts, setDraftAmounts] = useState({});
  const selectAll = useRef(null);
  const allSelected = recipients.length > 0 && selectedIds.size === recipients.length;
  const selectedRecipients = recipients.filter(({ user }) => selectedIds.has(user.id));

  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selectedIds.size > 0 && !allSelected;
  }, [allSelected, selectedIds.size]);

  function changeSelection(userId, checked) {
    const next = new Set(selectedIds);
    if (checked) next.add(userId);
    else next.delete(userId);
    onSelect(next);
  }

  function amountFor(recipient) {
    return draftAmounts[recipient.user.id] ?? (recipient.totalCents / 100).toFixed(2);
  }

  const hasInvalidAmounts = selectedRecipients.some((recipient) =>
    parsePayoutCents(amountFor(recipient), recipient.totalCents) === null);

  function applyDestination() {
    const nextPlan = {};
    for (const recipient of selectedRecipients) {
      const amount = parsePayoutCents(amountFor(recipient), recipient.totalCents);
      if (amount === null) return;
      nextPlan[recipient.user.id] = destination === 'investment' ? amount : recipient.totalCents - amount;
    }
    onApply(nextPlan);
  }

  if (!recipients.length) {
    return <EmptyState title="No payable recipients" description="There are no positive payouts for this period." />;
  }

  return (
    <section className="table-shell">
      <div className="space-y-4 px-6 py-5">
        <div>
          <h2 className="font-semibold text-slate-900">Payouts by recipient</h2>
          <p className="mt-1 text-xs text-slate-500">
            {projectActive
              ? 'Apply an amount to the selected destination. The rest goes to the other destination.'
              : 'This project is closed. Payouts go to wallet balances.'}
          </p>
        </div>
        {projectActive && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-44">
              <label htmlFor="batch-destination" className="field-label">Send to</label>
              <select
                id="batch-destination"
                className="field-select py-2"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                disabled={disabled}
              >
                <option value="wallet">Wallet balance</option>
                <option value="investment">Reinvest in project</option>
              </select>
            </div>
            <Button type="button" onClick={applyDestination} disabled={disabled || !selectedIds.size || hasInvalidAmounts}>
              Apply to selected
            </Button>
            <span className="self-center text-xs text-slate-600" role="status">{selectedIds.size} selected</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table role="table" className="responsive-table w-full text-left text-sm">
          <thead role="rowgroup" data-mobile-controls className="border-y border-slate-100 bg-slate-50 text-xs text-slate-500">
            <tr role="row">
              {projectActive && (
                <th role="columnheader" data-mobile-control scope="col" className="px-4 py-3">
                  <label className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap font-medium xl:min-h-0">
                    <input
                      ref={selectAll}
                      type="checkbox"
                      className="size-4 accent-blue-600"
                      checked={allSelected}
                      onChange={(event) => onSelect(new Set(event.target.checked ? recipients.map(({ user }) => user.id) : []))}
                      disabled={disabled}
                    />
                    Select all
                  </label>
                </th>
              )}
              <th role="columnheader" scope="col" className="px-4 py-3 font-medium">Recipient</th>
              <th role="columnheader" scope="col" className="px-4 py-3 text-right font-medium">Total payout</th>
              {projectActive && <th role="columnheader" scope="col" className="px-4 py-3 font-medium">Amount to disburse</th>}
              <th role="columnheader" scope="col" className="px-4 py-3 font-medium">Planned payout</th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="divide-y divide-slate-100">
            {recipients.map((recipient) => {
              const { user, totalCents, reinvestCents, walletCents } = recipient;
              const label = user.name || user.email;
              const selected = selectedIds.has(user.id);
              const amount = amountFor(recipient);
              const invalid = selected && parsePayoutCents(amount, totalCents) === null;

              return (
                <tr role="row" key={user.id}>
                  {projectActive && (
                    <td role="cell" className="px-4 py-4">
                      <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600 xl:min-h-0">
                        <input
                          type="checkbox"
                          className="size-4 accent-blue-600"
                          aria-label={`Select ${label}`}
                          checked={selected}
                          onChange={(event) => changeSelection(user.id, event.target.checked)}
                          disabled={disabled}
                        />
                        <span aria-hidden="true" className="xl:hidden">Select recipient</span>
                      </label>
                    </td>
                  )}
                  <td role="rowheader" data-mobile-heading className="px-4 py-4">
                    <p className="font-medium text-slate-800">{label}</p>
                    {user.name && <p className="mt-1 break-all text-xs text-slate-500">{user.email}</p>}
                  </td>
                  <td role="cell" data-mobile-label="Total payout" className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums text-slate-900">
                      <div>
                        {money(totalCents / 100)}
                      </div>
                  </td>
                  {projectActive && (
                    <td role="cell" data-mobile-label="Amount to disburse" className="min-w-36 px-4 py-4">
                        <div>
                          <input
                            type="number"
                            inputMode="decimal"
                            aria-label={`Amount to disburse for ${label} in BDT`}
                            aria-invalid={invalid}
                            aria-describedby={invalid ? `payout-error-${user.id}` : undefined}
                            className="field-input min-w-24 py-2 disabled:opacity-60"
                            value={amount}
                            onChange={(event) => setDraftAmounts((previous) => ({ ...previous, [user.id]: event.target.value }))}
                            min="0.01"
                            max={(totalCents / 100).toFixed(2)}
                            step="0.01"
                            disabled={disabled || !selected}
                          />
                          {invalid && <p id={`payout-error-${user.id}`} className="mt-1 text-xs text-red-700">Enter a positive amount up to the total payout.</p>}
                        </div>
                    </td>
                  )}
                  <td role="cell" data-mobile-label="Planned payout" className="space-y-1 whitespace-nowrap px-4 py-4 text-xs tabular-nums text-slate-700">
                      <div>
                        {walletCents > 0 && <p>Wallet {money(walletCents / 100)}</p>}
                        {reinvestCents > 0 && <p>Project {money(reinvestCents / 100)}</p>}
                      </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function DisburseProfit() {
  const [criteria, setCriteria] = useState({ projectId: '', from: '', to: '' });
  const [review, setReview] = useState(null);
  const [completed, setCompleted] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reinvestmentPlan, setReinvestmentPlan] = useState({});
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const previewLock = useRef(false);
  const submitLock = useRef(false);
  const busy = previewing || submitting;
  const plannedPayouts = (review?.recipients ?? []).map((recipient) => {
    const totalCents = Math.round(recipient.total * 100);
    const reinvestCents = reinvestmentPlan[recipient.user.id] ?? 0;
    return { ...recipient, totalCents, reinvestCents, walletCents: totalCents - reinvestCents };
  });
  const reinvestedTotal = plannedPayouts.reduce((total, payout) => total + payout.reinvestCents, 0) / 100;
  const walletTotal = review ? review.advisorTotal + review.investorTotal - reinvestedTotal : 0;

  function applyPayoutPlan(changes) {
    setReinvestmentPlan((previous) => ({ ...previous, ...changes }));
    setSelectedIds(new Set());
  }

  const change = (key, value) => {
    if (busy) return;
    setCriteria((previous) => ({ ...previous, [key]: value }));
    setReview(null); setCompleted(null); setEmpty(false); setError(null); setValidation('');
  };

  const preview = async (event) => {
    event?.preventDefault();
    if (previewLock.current || submitLock.current) return;
    if (!criteria.projectId.trim() || !criteria.from || !criteria.to) {
      setValidation('Select a project and both dates to preview the distribution.'); return;
    }
    if (criteria.from > criteria.to) { setValidation('The end date must be on or after the start date.'); return; }
    previewLock.current = true; setPreviewing(true); setReview(null); setCompleted(null); setEmpty(false); setError(null); setValidation('');
    setReinvestmentPlan({});
    setSelectedIds(new Set());
    const snapshot = { ...criteria, projectId: criteria.projectId.trim() };
    try {
      const { data } = await API.get('/api/stock/profit/disburse/', { params: {
        project_id: snapshot.projectId, from_dt: snapshot.from, to_dt: snapshot.to,
      } });
      if (!data.profit_count) { setEmpty(true); return; }
      const recipients = data.recipients.map((recipient) => ({
        ...recipient,
        total: Number(recipient.advisor_amount) + Number(recipient.investor_amount),
      })).filter((recipient) => recipient.total > 0);
      setReview({
        criteria: snapshot,
        recipients,
        projectActive: data.project_active,
        gross: data.gross,
        tradeCount: data.profit_count,
        advisorTotal: data.recipients.reduce((sum, recipient) => sum + Number(recipient.advisor_amount), 0),
        investorTotal: data.recipients.reduce((sum, recipient) => sum + Number(recipient.investor_amount), 0),
        recipientCount: recipients.length,
      });
    } catch (failure) { setError(failure); }
    finally { setPreviewing(false); previewLock.current = false; }
  };

  const disburse = async () => {
    if (!review || submitLock.current || previewLock.current || !review.recipientCount || selectedIds.size > 0) return;
    submitLock.current = true; setSubmitting(true); setError(null);
    try {
      const confirmation = await Swal.fire({
        title: 'Confirm profit disbursement',
        text: `Disburse profits for project ${review.criteria.projectId}? The preview sends ${money(walletTotal)} to wallet balances and reinvests ${money(reinvestedTotal)} in this project.`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'Confirm disbursement', cancelButtonText: 'Keep reviewing', confirmButtonColor: '#0f172a',
      });
      if (!confirmation.isConfirmed) return;
      const { data } = await API.post('/api/stock/profit/disburse/', {
        project_id: review.criteria.projectId, from_dt: review.criteria.from, to_dt: review.criteria.to,
        reinvest_recipient_ids: plannedPayouts.filter((payout) => payout.walletCents === 0).map((payout) => payout.user.id),
        reinvest_splits: plannedPayouts.filter((payout) => payout.reinvestCents > 0 && payout.walletCents > 0).map((payout) => ({
          recipient_id: payout.user.id,
          amount: (payout.reinvestCents / 100).toFixed(2),
        })),
      });
      setCompleted({ criteria: review.criteria, walletTotal: data.wallet_total, reinvestedTotal: data.reinvested_total }); setReview(null);
    } catch (failure) {
      // Require a fresh preview after an uncertain write outcome before another attempt.
      setReview(null); setError(failure);
    } finally { setSubmitting(false); submitLock.current = false; }
  };

  return <div className="space-y-6">
    <BannerTitle title="Disbursement" description="Review project earnings, advisor commissions, and investor allocations before disbursing." />
    <ol aria-label="Disbursement progress" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium">
      {['Select period', 'Review allocation', 'Disburse profits'].map((label, index) => {
        const step = completed ? 3 : review ? 1 : 0;
        return <li key={label} className={cn('flex items-center gap-2', index <= step ? 'text-slate-800' : 'text-slate-400')}><span className={cn('flex size-6 items-center justify-center rounded-full text-[11px]', index < step ? 'bg-emerald-100 text-emerald-700' : index === step ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400')}>{index < step ? <Check size={13} aria-hidden="true" /> : index + 1}</span>{label}{index < 2 && <ArrowRight size={13} className="ml-2 text-slate-300" aria-hidden="true" />}</li>;
      })}
    </ol>

    <SurfaceCard className="relative z-20 p-0">
      <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CalendarRange size={20} aria-hidden="true" /></span><div><h2 className="font-semibold text-slate-900">Choose a distribution period</h2><p className="mt-1 text-sm text-slate-500">Undistributed trade profits and cash dividends received in this date range are included.</p></div></div>
      <form onSubmit={preview} className="p-6" aria-label="Profit distribution criteria" aria-busy={previewing}>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <ProjectPicker value={criteria.projectId} onChange={(event) => change('projectId', event.target.value)} disabled={busy} />
          <Field htmlFor="profit-from" label="From date"><input id="profit-from" type="date" className="field-input min-h-[52px]" value={criteria.from} onChange={(event) => change('from', event.target.value)} disabled={busy} required /></Field>
          <Field htmlFor="profit-to" label="To date"><input id="profit-to" type="date" className="field-input min-h-[52px]" min={criteria.from || undefined} value={criteria.to} onChange={(event) => change('to', event.target.value)} disabled={busy} required /></Field>
        </div>
        {validation && <p role="alert" className="mt-4 text-sm text-red-700">{validation}</p>}
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Both dates are included in the selected period.</p><Button type="submit" disabled={busy} className="h-11 rounded-xl px-5">{previewing ? <ButtonSpinner label="Preparing preview…" /> : <><Eye size={16} aria-hidden="true" />Preview distribution</>}</Button></div>
      </form>
    </SurfaceCard>

    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{getApiError(error)}</p><p className="mt-2 text-xs">If you attempted a disbursement, review the latest records before trying again.</p></div>}
    {empty && <EmptyState title="No profits to distribute" description="No undistributed profits were found for this project and period. Choose another date range to review." />}
    {completed && <SurfaceCard className="flex items-start gap-4 border-emerald-200 bg-emerald-50/80"><BadgeCheck size={28} className="shrink-0 text-emerald-600" aria-hidden="true" /><div><h2 className="font-semibold text-emerald-950">Disbursement completed</h2><p className="mt-2 text-sm text-emerald-800">For project {completed.criteria.projectId}, {money(completed.walletTotal)} went to wallet balances and {money(completed.reinvestedTotal)} was reinvested.</p></div></SurfaceCard>}

    {review && <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">{[
          { label: 'Eligible profit', value: money(review.gross), detail: `${review.tradeCount} profit record${review.tradeCount === 1 ? '' : 's'}`, icon: CircleDollarSign },
          { label: 'Advisor commissions', value: money(review.advisorTotal), detail: 'Allocated before investor shares', icon: Wallet },
          { label: 'Investor allocations', value: money(review.investorTotal), detail: 'Based on contribution percentage', icon: Users },
        ].map((metric) => <SurfaceCard key={metric.label} tone="compact"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{metric.label}</p><metric.icon size={16} className="text-slate-400" aria-hidden="true" /></div><p className="break-words text-xl font-semibold tracking-tight text-slate-900 tabular-nums">{metric.value}</p><p className="mt-2 text-[11px] text-slate-500">{metric.detail}</p></SurfaceCard>)}</div>
        <RecipientDestinations
          recipients={plannedPayouts}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onApply={applyPayoutPlan}
          projectActive={review.projectActive}
          disabled={busy}
        />
      </div>
      <SurfaceCard className="border-slate-800 bg-slate-900 text-white xl:sticky xl:top-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Distribution summary</p><h2 className="mt-3 text-lg font-semibold">Project {review.criteria.projectId}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{dateLabel(review.criteria.from)} – {dateLabel(review.criteria.to)}</p>
        <dl className="my-6 space-y-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-400">Recipients</dt><dd className="font-medium">{review.recipientCount}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Wallet balances</dt><dd className="tabular-nums">{money(walletTotal)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Reinvested</dt><dd className="tabular-nums">{money(reinvestedTotal)}</dd></div><div className="border-t border-white/10 pt-4"><dt className="text-xs text-slate-400">Total preview allocation</dt><dd className="mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums">{money(review.advisorTotal + review.investorTotal)}</dd></div></dl>
        <Button onClick={disburse} disabled={busy || !review.recipientCount || selectedIds.size > 0} className="h-11 w-full rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200">{submitting ? <ButtonSpinner label="Disbursing profits…" /> : <><ArrowRight size={16} aria-hidden="true" />Disburse profits</>}</Button><p className="mt-3 text-[11px] leading-5 text-slate-400">{selectedIds.size > 0 ? 'Apply or clear the selection before disbursing.' : 'You’ll confirm before proceeding. Final amounts are calculated when profits are disbursed.'}</p>
      </SurfaceCard>
    </div>}

    {!review && !completed && !empty && !previewing && !error && <div className="rounded-3xl border border-dashed border-slate-300 bg-white/40 px-6 py-14 text-center"><span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400"><CircleDollarSign size={24} strokeWidth={1.5} aria-hidden="true" /></span><h2 className="font-semibold text-slate-700">Your distribution preview will appear here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Choose a project and period to see eligible earnings and how they will be allocated.</p></div>}
  </div>;
}
