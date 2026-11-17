import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CircleDollarSign, Info, LoaderCircle, LockKeyhole, Search } from 'lucide-react';
import Swal from 'sweetalert2';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import BannerTitle from '@/components/BannerTitle';
import { ProjectSearch } from '@/components/ui/project-search';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Button } from '@/components/ui/button';

const currency = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' });
const money = (value) => currency.format(Number(value));
const sum = (rows) => rows.reduce((amount, row) => amount + Number(row.amount), 0);

async function loadReview(id) {
  const project = encodeURIComponent(id);
  const [balance, status, holdings, paid, unpaid, investors, projects] = await Promise.all([
    API.get(`/api/stock/project/balance/details/${project}/`),
    API.get(`/api/stock/project/status/${project}/`),
    API.get(`/api/stock/sellable/instruments/${project}/`),
    API.get('/api/stock/project/total/profit/', { params: { project_id: id, is_disbursed: 1 } }),
    API.get('/api/stock/project/total/profit/', { params: { project_id: id, is_disbursed: 0 } }),
    API.get(`/api/stock/investor/contrib/percent/${project}/`),
    API.get('/api/stock/project/list/'),
  ]);
  return {
    balance: balance.data, active: status.data.project_active_status,
    holdings: holdings.data, paid: sum(paid.data), unpaid: sum(unpaid.data),
    unpaidCount: unpaid.data.length, investors: investors.data,
    project: projects.data.find((item) => item.project_id === id),
  };
}

function AmountRow({ label, value, detail, sign, strong = false }) {
  return <div className="flex items-start justify-between gap-5 py-4">
    <div><dt className={strong ? 'font-semibold text-slate-950' : 'font-medium text-slate-600'}>{label}</dt>{detail && <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{detail}</p>}</div>
    <dd className={`shrink-0 text-right font-semibold tabular-nums text-slate-900 ${strong ? 'text-xl' : ''}`}>{sign && <span className="mr-1 text-slate-400">{sign}</span>}{money(value)}</dd>
  </div>;
}

function Readiness({ ready, title, detail, href, action }) {
  return <li className="flex gap-3 py-4">
    <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{ready ? <Check size={14} aria-hidden="true" /> : <Info size={14} aria-hidden="true" />}</span>
    <div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>{!ready && href && <Link className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline underline-offset-4" to={href}>{action}<ArrowRight size={13} aria-hidden="true" /></Link>}</div>
  </li>;
}

export default function CloseProject() {
  const [searchId, setSearchId] = useState('');
  const [review, setReview] = useState(null);
  const [completed, setCompleted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submitLock = useRef(false);
  const busy = loading || submitting;

  const searchProject = async (event) => {
    event.preventDefault();
    const id = searchId.trim();
    if (!id || busy) return;
    setLoading(true); setError(''); setReview(null); setCompleted(null);
    try { setReview(await loadReview(id)); }
    catch (failure) { setError(getApiError(failure)); }
    finally { setLoading(false); }
  };

  const closeProject = async () => {
    if (!review || submitLock.current) return;
    submitLock.current = true; setSubmitting(true); setError('');
    try {
      // Refresh the review before confirming a financial return.
      const current = await loadReview(review.balance.project_id);
      setReview(current);
      if (!current.active || current.holdings.length || current.unpaidCount || !current.investors.length) return;
      if (JSON.stringify(current) !== JSON.stringify(review)) {
        setError('Project details changed. Review the updated amounts before closing.');
        return;
      }
      const confirmation = await Swal.fire({
        title: 'Close project and return capital?',
        text: `Return ${money(current.balance.available_balance)} to ${current.investors.length} investors in project ${current.balance.project_id}. Profit of ${money(current.paid)} has already been disbursed and will not be paid again. The project will be marked closed.`,
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Confirm closure & return capital',
        cancelButtonText: 'Keep reviewing', confirmButtonColor: '#0f172a', reverseButtons: true,
      });
      if (!confirmation.isConfirmed) return;
      const balance = current.balance;
      await API.patch(`/api/stock/close/project/${balance.project_id}/`, {
        total_investment: balance.total_investment, total_buy: balance.total_buy_amount,
        total_sell: balance.total_sell_amount, total_sell_profit: balance.accrued_profit,
        closing_balance: balance.available_balance,
      });
      setCompleted(current); setReview(null); setSearchId('');
    } catch (failure) {
      setError(getApiError(failure));
      setReview(null); // Require a fresh review after an uncertain write outcome.
    } finally { submitLock.current = false; setSubmitting(false); }
  };

  const balance = review?.balance;
  const ready = review?.active && !review.holdings.length && !review.unpaidCount && review.investors.length > 0;
  const beforeProfit = balance ? Number(balance.total_investment) - Number(balance.total_buy_amount) + Number(balance.total_sell_amount) : 0;

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <BannerTitle title="Close a project" description="Review the money, check that profit payouts are complete, then return the remaining capital to investors." />
    <ol aria-label="Project closure progress" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
      {['Choose project', 'Review & reconcile', 'Return capital & close'].map((label, index) => <li key={label} aria-current={index === (completed ? 2 : review ? 1 : 0) ? 'step' : undefined} className="flex items-center gap-2"><span className={`flex size-6 items-center justify-center rounded-full ${index <= (completed ? 2 : review ? 1 : 0) ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{index + 1}</span>{label}</li>)}
    </ol>
    <ProjectSearch value={searchId} onChange={(event) => { setSearchId(event.target.value); setReview(null); setError(''); }} onSubmit={searchProject} loading={busy} />
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</p>}
    {loading && <div role="status" className="page-card flex items-center justify-center gap-3 text-sm text-slate-600"><LoaderCircle size={20} className="animate-spin" aria-hidden="true" />Loading balances, payouts, and closure checks…</div>}
    {completed && <SurfaceCard className="border-emerald-200 bg-emerald-50/50 text-center">
      <Check className="mx-auto size-10 text-emerald-600" aria-hidden="true" />
      <h2 className="mt-4 text-xl font-semibold text-slate-900">Project closed. Capital returned.</h2>
      <p className="mt-2 text-sm text-slate-600">{money(completed.balance.available_balance)} returned to {completed.investors.length} investors in project {completed.balance.project_id}.</p>
      <p className="mt-2 text-sm text-slate-500">The {money(completed.paid)} previously disbursed profit was excluded from this return.</p>
      <Link to="/project-list" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">View project list<ArrowRight size={16} aria-hidden="true" /></Link>
    </SurfaceCard>}
    {!review && !completed && !loading && <SurfaceCard className="py-14 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Search size={22} aria-hidden="true" /></span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Start with a project</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Choose a project above to review its trades, profit payouts, and the amount investors will receive at closure.</p>
    </SurfaceCard>}
    {review && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Project {balance.project_id}</p><h2 className="mt-1 text-xl font-semibold text-slate-950">{review.project?.project_title || 'Project closure review'}</h2></div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{!review.active ? 'Already closed' : ready ? 'Ready for closure' : 'Action needed'}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="!mb-0"><p className="text-sm font-medium text-slate-500">Investor capital contributed</p><p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{money(balance.total_investment)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Funding from {review.investors.length} investors.</p></SurfaceCard>
        <SurfaceCard className="!mb-0"><p className="text-sm font-medium text-slate-500">Profit already disbursed</p><p className="mt-3 text-2xl font-semibold tabular-nums text-blue-700">{money(review.paid)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Paid to investors and advisors. Excluded from the capital return.</p></SurfaceCard>
        <SurfaceCard className="!mb-0"><p className="text-sm font-medium text-slate-500">Profit still to disburse</p><p className={`mt-3 text-2xl font-semibold tabular-nums ${review.unpaidCount ? 'text-amber-700' : 'text-emerald-700'}`}>{money(review.unpaid)}</p><p className="mt-2 text-xs leading-5 text-slate-500">{review.unpaidCount ? 'Disburse this profit before closing.' : 'All recorded profit has been disbursed.'}</p></SurfaceCard>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SurfaceCard className="!mb-0">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CircleDollarSign size={21} aria-hidden="true" /></span><div><h3 className="font-semibold text-slate-950">Where the closing amount comes from</h3><p className="mt-1 text-sm leading-6 text-slate-500">Follow the project money from investment to the final return.</p></div></div>
            <dl className="mt-5 divide-y divide-slate-100 text-sm">
              <AmountRow label="Investor contributions" value={balance.total_investment} />
              <AmountRow label="Share purchases" value={balance.total_buy_amount} sign="−" detail="Purchase costs include trading commissions." />
              <AmountRow label="Share sale proceeds" value={balance.total_sell_amount} sign="+" detail="After selling commissions. This amount already includes profits from the sales." />
              <AmountRow label="Cash before profit payouts" value={beforeProfit} strong />
              <AmountRow label="Profit already disbursed" value={review.paid} sign="−" detail="Deducted because this money has already gone to recipient accounts." />
              {review.unpaidCount > 0 && <AmountRow label="Profit reserved for disbursement" value={review.unpaid} sign="−" detail="Reserved separately. Complete this payout before returning capital." />}
            </dl>
            <div className="mt-3 rounded-2xl bg-slate-950 p-5 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-medium text-slate-300">Capital to return at closure</span><span className="text-3xl font-semibold tabular-nums">{money(balance.available_balance)}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">Includes unspent investment cash and the remaining proceeds from sold shares. Trading losses reduce this amount.</p></div>
            <div className="mt-4 flex gap-2 rounded-xl bg-blue-50 p-4 text-xs leading-6 text-blue-900"><Info size={16} className="mt-1 shrink-0" aria-hidden="true" /><p><strong>Profit is not paid twice.</strong> Sale proceeds include the profit. We subtract disbursed profit above; closure returns only the remaining capital.</p></div>
          </SurfaceCard>
          <SurfaceCard className="!mb-0 overflow-hidden">
            <h3 className="font-semibold text-slate-950">Who receives the capital?</h3><p className="mt-1 text-sm leading-6 text-slate-500">The closing balance is shared by investment contribution. Profit payouts are separate.</p>
            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[470px] text-left text-sm"><caption className="sr-only">Estimated investor capital returns</caption><thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="pb-3 font-medium">Investor</th><th className="pb-3 text-right font-medium">Invested</th><th className="pb-3 text-right font-medium">Share</th><th className="pb-3 text-right font-medium">Capital return</th></tr></thead><tbody className="divide-y divide-slate-100">{review.investors.map((row) => <tr key={row.investor.id}><th scope="row" className="py-4 pr-4 font-medium text-slate-900">{row.investor.name}<span className="mt-1 block text-xs font-normal text-slate-500">{row.investor.email}</span></th><td className="py-4 text-right tabular-nums text-slate-600">{money(row.contribute_amount)}</td><td className="py-4 pl-3 text-right tabular-nums text-slate-600">{row.contribution_percentage}%</td><td className="py-4 pl-3 text-right font-semibold tabular-nums text-slate-900">{money(Number(balance.available_balance) * Number(row.contribution_percentage) / 100)}</td></tr>)}</tbody></table></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Preview uses current contribution percentages; final amounts are recorded when the project closes.</p>
          </SurfaceCard>
        </div>
        <SurfaceCard className="!mb-0 xl:sticky xl:top-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Before you close</p><h3 className="mt-2 text-lg font-semibold text-slate-950">Closure checks</h3>
          <ul className="mt-3 divide-y divide-slate-100">
            <Readiness ready={review.active} title={review.active ? 'Project is active' : 'Project is already closed'} detail={review.active ? 'Available to review and close.' : 'No further capital return can be submitted here.'} />
            <Readiness ready={!review.holdings.length} title={!review.holdings.length ? 'All shares sold' : 'Shares still held'} detail={!review.holdings.length ? 'No remaining holdings in this project.' : `${review.holdings.reduce((amount, row) => amount + Number(row.available_quantity), 0)} shares remain. Sell all holdings first.`} href="/sell-instruments" action="Go to sell instruments" />
            <Readiness ready={!review.unpaidCount} title={!review.unpaidCount ? 'Profit disbursement complete' : 'Profit payout required'} detail={!review.unpaidCount ? `${money(review.paid)} already disbursed. Nothing remains unpaid.` : `${money(review.unpaid)} still needs to be disbursed.`} href="/disburse-profit" action="Go to profit disbursement" />
            <Readiness ready={review.investors.length > 0} title={review.investors.length ? 'Investor returns identified' : 'No investor contributions'} detail={review.investors.length ? `${review.investors.length} investors will share ${money(balance.available_balance)}.` : 'Add investor contributions before closing.'} />
          </ul>
          <div className="mt-5 border-t border-slate-200 pt-5"><p className="text-sm font-semibold text-slate-900">What happens next?</p><p className="mt-2 text-xs leading-6 text-slate-500">Closing credits capital returns to investor accounts and marks this project closed. You will review the total once more before confirming.</p><Button onClick={closeProject} disabled={!ready || busy} className="mt-5 h-auto min-h-12 w-full whitespace-normal rounded-xl bg-slate-950 px-3 py-3 text-white hover:bg-slate-800">{submitting ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}{submitting ? 'Rechecking project…' : 'Review closure & return capital'}</Button>{!ready && <p className="mt-3 text-xs leading-5 text-amber-800">Complete the checks above, then search again to refresh this review.</p>}</div>
        </SurfaceCard>
      </div>
    </>}
  </div>;
}
