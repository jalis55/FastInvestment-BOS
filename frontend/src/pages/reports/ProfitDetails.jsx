import { useRef, useState } from 'react';
import API from '@/api/axios';
import { ProjectSearch } from '@/components/ui/project-search';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import BannerTitle from '@/components/BannerTitle';

const money = (value) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(Number(value));
const types = { trade_profit: 'Trade profit', cash_dividend: 'Cash dividend', share_dividend: 'Bonus shares' };
const statuses = { disbursed: 'Disbursed', undisbursed: 'Awaiting disbursement', added_to_holdings: 'Added to project holdings' };

export default function ProfitDetails() {
  const [searchId, setSearchId] = useState('');
  const [searchedId, setSearchedId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lock = useRef(false);
  const load = async (id) => {
    if (lock.current || !id.trim()) return;
    lock.current = true;
    setSearchedId(id.trim()); setData(null); setError(null); setLoading(true);
    try {
      const response = await API.get('/api/stock/profit/report/', { params: { project_id: id.trim() } });
      setData(response.data);
    } catch (failure) { setError(failure); }
    finally { lock.current = false; setLoading(false); }
  };
  const search = (event) => { event.preventDefault(); load(searchId); };
  const visible = data?.projects || [];
  const personal = data?.scope === 'investor';
  return <div>
    <BannerTitle title="Profit Details" description={personal ? 'Your cash profit payouts and bonus shares received by projects you invest in.' : 'Review trade profits, cash dividends, and bonus shares together by project.'} />
    <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)} onSubmit={search} loading={loading} />
    {!searchedId && <SurfaceCard className="max-w-3xl py-12 text-center"><h2 className="text-lg font-semibold text-slate-900">Find a project to view its profit details</h2><p className="mt-2 text-sm text-slate-500">Search by project ID to see its cash profits, dividends, and bonus shares.</p></SurfaceCard>}
    {searchedId && <QueryState loadingLabel={`Loading project ${searchedId}…`} loadingDescription="Preparing cash profits, dividends, and bonus shares." loading={loading} error={error} onRetry={() => load(searchedId)} empty={!visible.length} emptyTitle={`No profit or bonus shares found for project ${searchedId}`} emptyDescription="Check the project ID. Records appear here when profits or dividends are recorded for a project you can access.">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Metric label={personal ? 'Your cash profit paid' : 'Cash profit earned'} value={money(visible.reduce((sum, p) => sum + Number(p.cash_profit), 0))} />
        <Metric label="Project bonus shares received" value={visible.reduce((sum, p) => sum + p.bonus_shares, 0)} />
        <Metric label="Profit and bonus records" value={visible.reduce((sum, p) => sum + p.records.length, 0)} />
      </div>
      <p className="mb-6 text-sm text-slate-500">Bonus shares belong to project holdings and carry no cash payout. Quantities are shown separately from BDT totals.{personal && ' Cash amounts below are your allocations; bonus quantities are for the whole project.'}</p>
      {visible.map((project) => <SurfaceCard key={project.project} className="mb-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Project {project.project}</h2><p className="mt-1 text-sm text-slate-500">{project.project_title}</p></div><div className="text-sm text-slate-600"><p>{personal ? 'Your cash profit' : 'Cash profit'}: <strong>{money(project.cash_profit)}</strong></p><p className="mt-1">Project bonus shares: <strong>{project.bonus_shares}</strong></p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Date', 'Instrument', 'Type', personal ? 'Your cash profit (BDT)' : 'Cash profit (BDT)', 'Bonus shares', 'Status'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{project.records.map((record) => <tr key={record.id} className="border-b border-slate-100"><td className="px-4 py-4 whitespace-nowrap">{record.date}</td><td className="px-4 py-4 font-medium">{record.instrument || '—'}</td><td className="px-4 py-4">{types[record.type]}</td><td className="px-4 py-4 tabular-nums">{record.amount == null ? '—' : money(record.amount)}</td><td className="px-4 py-4 tabular-nums">{record.qty ?? '—'}</td><td className="px-4 py-4">{statuses[record.status]}</td></tr>)}</tbody></table></div>
      </SurfaceCard>)}
    </QueryState>}
  </div>;
}

function Metric({ label, value }) {
  return <SurfaceCard><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p></SurfaceCard>;
}
