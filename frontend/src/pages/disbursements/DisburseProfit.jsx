import { useRef, useState } from 'react';
import { ArrowRight, BadgeCheck, CalendarRange, Check, CircleDollarSign, Eye, LoaderCircle, Users, Wallet } from 'lucide-react';
import Swal from 'sweetalert2';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import BannerTitle from '@/components/BannerTitle';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { ProjectPicker } from '@/components/ui/project-search';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { cn } from '@/lib/utils';
import { buildProfitDistribution } from '@/utils/profit-distribution';

const money = (amount) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 }).format(amount);
const dateLabel = (date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

function DistributionTable({ rows, investor }) {
  if (!rows.length) return <EmptyState title={investor ? 'No investor allocations' : 'No advisor commissions'} description={investor ? 'There are no investor allocations for this period.' : 'This project has no advisor commissions for this period.'} className="border-0 shadow-none" />;
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm">
    <caption className="sr-only">{investor ? 'Investor profit allocations' : 'Financial advisor commissions'}</caption>
    <thead className="border-y border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><tr>
      <th scope="col" className="px-6 py-3">{investor ? 'Investor' : 'Advisor'}</th><th scope="col" className="px-4 py-3">Trade</th>
      {investor && <th scope="col" className="px-4 py-3 text-right">Contribution</th>}
      <th scope="col" className="px-4 py-3 text-right">{investor ? 'Share' : 'Rate'}</th><th scope="col" className="px-6 py-3 text-right">Allocation</th>
    </tr></thead>
    <tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row.trade}-${row.user.id}-${index}`} className="hover:bg-slate-50/60">
      <td className="px-6 py-4"><p className="whitespace-nowrap font-medium text-slate-800">{row.user.name || row.user.email}</p><p className="mt-1 text-xs text-slate-500">{row.user.email}</p></td>
      <td className="px-4 py-4 font-mono text-xs text-slate-500"><span title={row.trade}>{String(row.trade).slice(0, 8)}…</span></td>
      {investor && <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-slate-600">{money(row.contribution)}</td>}
      <td className="px-4 py-4 text-right tabular-nums text-slate-500">{row.percentage.toFixed(2)}%</td>
      <td className="whitespace-nowrap px-6 py-4 text-right font-semibold tabular-nums text-slate-900">{money(row.amount)}</td>
    </tr>)}</tbody>
  </table></div>;
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
  const [view, setView] = useState('investors');
  const previewLock = useRef(false);
  const submitLock = useRef(false);
  const busy = previewing || submitting;

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
    const snapshot = { ...criteria, projectId: criteria.projectId.trim() };
    try {
      const { data: profits } = await API.get('/api/stock/project/total/profit/', { params: {
        project_id: snapshot.projectId, from_dt: snapshot.from, to_dt: snapshot.to, is_disbursed: 0,
      } });
      if (!profits.length) { setEmpty(true); return; }
      const [advisors, investors] = await Promise.all([
        API.get(`/api/stock/fin/advisor/commission/${snapshot.projectId}/`),
        API.get(`/api/stock/investor/contrib/percent/${snapshot.projectId}/`),
      ]);
      setReview({ ...buildProfitDistribution(profits, advisors.data, investors.data), criteria: snapshot });
      setView('investors');
    } catch (failure) { setError(failure); }
    finally { setPreviewing(false); previewLock.current = false; }
  };

  const disburse = async () => {
    if (!review || submitLock.current || previewLock.current || !review.recipientCount) return;
    submitLock.current = true; setSubmitting(true); setError(null);
    try {
      const confirmation = await Swal.fire({
        title: 'Confirm profit disbursement',
        text: `Disburse profits for project ${review.criteria.projectId} from ${dateLabel(review.criteria.from)} to ${dateLabel(review.criteria.to)}? The preview allocates ${money(review.advisorTotal + review.investorTotal)} across ${review.recipientCount} recipients.`,
        icon: 'question', showCancelButton: true, confirmButtonText: 'Confirm disbursement', cancelButtonText: 'Keep reviewing', confirmButtonColor: '#0f172a',
      });
      if (!confirmation.isConfirmed) return;
      await API.post('/api/stock/profit/disburse/', {
        project_id: review.criteria.projectId, from_dt: review.criteria.from, to_dt: review.criteria.to,
      });
      setCompleted(review); setReview(null);
    } catch (failure) {
      // Require a fresh preview after an uncertain write outcome before another attempt.
      setReview(null); setError(failure);
    } finally { setSubmitting(false); submitLock.current = false; }
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <BannerTitle title="Disburse Profit" description="Review project earnings, advisor commissions, and investor allocations before disbursing." />
    <ol aria-label="Disbursement progress" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium">
      {['Select period', 'Review allocation', 'Disburse profits'].map((label, index) => {
        const step = completed ? 3 : review ? 1 : 0;
        return <li key={label} className={cn('flex items-center gap-2', index <= step ? 'text-slate-800' : 'text-slate-400')}><span className={cn('flex size-6 items-center justify-center rounded-full text-[11px]', index < step ? 'bg-emerald-100 text-emerald-700' : index === step ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400')}>{index < step ? <Check size={13} aria-hidden="true" /> : index + 1}</span>{label}{index < 2 && <ArrowRight size={13} className="ml-2 text-slate-300" aria-hidden="true" />}</li>;
      })}
    </ol>

    <SurfaceCard className="relative z-20 p-0">
      <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CalendarRange size={20} aria-hidden="true" /></span><div><h2 className="font-semibold text-slate-900">Choose a distribution period</h2><p className="mt-1 text-sm text-slate-500">Only undistributed profits from trades in this date range are included.</p></div></div>
      <form onSubmit={preview} className="p-6" aria-label="Profit distribution criteria" aria-busy={previewing}>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <ProjectPicker value={criteria.projectId} onChange={(event) => change('projectId', event.target.value)} disabled={busy} />
          <Field htmlFor="profit-from" label="From date"><input id="profit-from" type="date" className="field-input min-h-[52px]" value={criteria.from} onChange={(event) => change('from', event.target.value)} disabled={busy} required /></Field>
          <Field htmlFor="profit-to" label="To date"><input id="profit-to" type="date" className="field-input min-h-[52px]" min={criteria.from || undefined} value={criteria.to} onChange={(event) => change('to', event.target.value)} disabled={busy} required /></Field>
        </div>
        {validation && <p role="alert" className="mt-4 text-sm text-red-700">{validation}</p>}
        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Both dates are included in the selected period.</p><Button type="submit" disabled={busy} className="h-11 rounded-xl px-5">{previewing ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{previewing ? 'Preparing preview…' : 'Preview distribution'}</Button></div>
      </form>
    </SurfaceCard>

    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p>{getApiError(error)}</p><p className="mt-2 text-xs">If you attempted a disbursement, review the latest records before trying again.</p></div>}
    {previewing && <QueryState loading />}
    {empty && <EmptyState title="No profits to distribute" description="No undistributed profits were found for this project and period. Choose another date range to review." />}
    {completed && <SurfaceCard className="flex items-start gap-4 border-emerald-200 bg-emerald-50/80"><BadgeCheck size={28} className="shrink-0 text-emerald-600" aria-hidden="true" /><div><h2 className="font-semibold text-emerald-950">Disbursement completed</h2><p className="mt-2 text-sm text-emerald-800">Profits for project {completed.criteria.projectId} have been disbursed for {dateLabel(completed.criteria.from)} – {dateLabel(completed.criteria.to)}.</p><p className="mt-2 text-xs text-emerald-700">Choose a new period above to prepare another distribution.</p></div></SurfaceCard>}

    {review && <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">{[
          { label: 'Eligible profit', value: money(review.gross), detail: `${review.tradeCount} profit record${review.tradeCount === 1 ? '' : 's'}`, icon: CircleDollarSign },
          { label: 'Advisor commissions', value: money(review.advisorTotal), detail: 'Allocated before investor shares', icon: Wallet },
          { label: 'Investor allocations', value: money(review.investorTotal), detail: 'Based on contribution percentage', icon: Users },
        ].map((metric) => <SurfaceCard key={metric.label} tone="compact"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-medium text-slate-500">{metric.label}</p><metric.icon size={16} className="text-slate-400" aria-hidden="true" /></div><p className="break-words text-xl font-semibold tracking-tight text-slate-900 tabular-nums">{metric.value}</p><p className="mt-2 text-[11px] text-slate-500">{metric.detail}</p></SurfaceCard>)}</div>
        <div className="table-shell"><div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5"><div><h2 className="font-semibold text-slate-900">Allocation details</h2><p className="mt-1 text-xs text-slate-500">Review individual allocations for each trade.</p></div><div role="group" aria-label="Allocation type" className="flex rounded-xl bg-slate-100 p-1">{[['investors', 'Investors'], ['advisors', 'Advisors']].map(([key, label]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={cn('rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400', view === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900')}>{label}</button>)}</div></div><DistributionTable rows={view === 'investors' ? review.investorRows : review.advisorRows} investor={view === 'investors'} /></div>
      </div>
      <SurfaceCard className="border-slate-800 bg-slate-900 text-white xl:sticky xl:top-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Distribution summary</p><h2 className="mt-3 text-lg font-semibold">Project {review.criteria.projectId}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{dateLabel(review.criteria.from)} – {dateLabel(review.criteria.to)}</p>
        <dl className="my-6 space-y-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-400">Recipients</dt><dd className="font-medium">{review.recipientCount}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Advisors</dt><dd className="tabular-nums">{money(review.advisorTotal)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Investors</dt><dd className="tabular-nums">{money(review.investorTotal)}</dd></div><div className="border-t border-white/10 pt-4"><dt className="text-xs text-slate-400">Total preview allocation</dt><dd className="mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums">{money(review.advisorTotal + review.investorTotal)}</dd></div></dl>
        <Button onClick={disburse} disabled={busy || !review.recipientCount} className="h-11 w-full rounded-xl bg-cyan-300 text-slate-950 hover:bg-cyan-200">{submitting ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}{submitting ? 'Processing…' : 'Disburse profits'}</Button><p className="mt-3 text-[11px] leading-5 text-slate-400">You’ll confirm before proceeding. Final amounts are calculated when profits are disbursed.</p>
      </SurfaceCard>
    </div>}

    {!review && !completed && !empty && !previewing && !error && <div className="rounded-3xl border border-dashed border-slate-300 bg-white/40 px-6 py-14 text-center"><span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400"><CircleDollarSign size={24} strokeWidth={1.5} aria-hidden="true" /></span><h2 className="font-semibold text-slate-700">Your distribution preview will appear here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Choose a project and period to see eligible earnings and how they will be allocated.</p></div>}
  </div>;
}
