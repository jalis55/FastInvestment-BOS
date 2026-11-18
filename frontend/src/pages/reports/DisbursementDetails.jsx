import { useState } from 'react';
import { Search } from 'lucide-react';

import AllocationBreakdown from '@/components/AllocationBreakdown';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PageIntro } from '@/components/ui/page-intro';
import { ProjectPicker } from '@/components/ui/project-search';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useApiQuery } from '@/hooks/use-api-query';

const currency = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', currencyDisplay: 'code' });
const money = (cents) => currency.format(cents / 100);

function groupAllocations(investorRows, advisorRows) {
  const recipients = new Map();
  for (const [role, rows] of [['investor', investorRows], ['advisor', advisorRows]]) {
    for (const row of rows) {
      if (!recipients.has(row.user.id)) {
        recipients.set(row.user.id, {
          user: row.user,
          investor: { cents: 0, rates: new Set() },
          advisor: { cents: 0, rates: new Set() },
        });
      }
      const allocation = recipients.get(row.user.id)[role];
      allocation.cents += Math.round(Number(row.amount) * 100);
      allocation.rates.add(Number(row.percentage));
    }
  }
  return [...recipients.values()].map((row) => ({
    ...row,
    total: row.investor.cents + row.advisor.cents,
  })).sort((a, b) => b.total - a.total || a.user.name.localeCompare(b.user.name));
}

function RateAmount({ allocation }) {
  if (!allocation.rates.size) return '—';
  const rates = [...allocation.rates].sort((a, b) => a - b);
  const first = rates[0].toFixed(2);
  const last = rates.at(-1).toFixed(2);

  return (
    <>
      <span className="block font-medium text-slate-900">{money(allocation.cents)}</span>
      <span className="block text-xs text-slate-500">{first === last ? `${first}%` : `${first}%–${last}%`}</span>
    </>
  );
}

function DisbursementSummary({ report }) {
  const recipients = groupAllocations(report.investor_rows, report.advisor_rows);
  const investorTotal = recipients.reduce((sum, row) => sum + row.investor.cents, 0);
  const advisorTotal = recipients.reduce((sum, row) => sum + row.advisor.cents, 0);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">{report.project_title}</h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total allocated', cents: investorTotal + advisorTotal },
          { label: 'Investor profit', cents: investorTotal },
          { label: 'Advisor commission', cents: advisorTotal },
        ].map(({ label, cents }, index) => (
          <div key={label} className={index === 0 ? 'rounded-2xl bg-slate-900 p-4 text-white' : 'rounded-2xl border border-slate-200 bg-white p-4 text-slate-900'}>
            <dt className="text-sm opacity-80">{label}</dt>
            <dd className="mt-2 text-xl font-semibold tabular-nums">{money(cents)}</dd>
          </div>
        ))}
      </dl>
      <SurfaceCard className="overflow-hidden !p-0">
        <div className="px-5 py-4 sm:px-6">
          <h3 className="font-semibold text-slate-900">Disbursement by recipient</h3>
          <p className="mt-1 text-xs text-slate-600">Amounts and percentages come from recorded allocations.</p>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Recorded allocations by recipient">
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50 text-xs text-slate-600">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">Recipient</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Investor profit / share</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Advisor commission / rate</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Total allocation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recipients.map(({ user, investor, advisor, total }) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <th scope="row" className="px-5 py-3 text-left font-medium text-slate-900">
                    <span className="block">{user.name || user.email}</span>
                    {user.name && <span className="block break-all text-xs font-normal text-slate-500">{user.email}</span>}
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500"><RateAmount allocation={investor} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500"><RateAmount allocation={advisor} /></td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-slate-900">{money(total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
      <AllocationBreakdown investorRows={report.investor_rows} advisorRows={report.advisor_rows} showDisbursementDate />
    </div>
  );
}

export default function DisbursementDetails() {
  const [filters, setFilters] = useState({ project: '', from: '', to: '' });
  const [url, setUrl] = useState(null);
  const { data: report, loading, error, refetch } = useApiQuery(url);

  function changeFilter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setUrl(null);
  }

  function loadReport(event) {
    event.preventDefault();
    const projectId = filters.project.trim();
    if (!projectId) return;
    const params = new URLSearchParams();
    if (filters.from) params.set('from_dt', filters.from);
    if (filters.to) params.set('to_dt', filters.to);
    const nextUrl = `/api/stock/profit/disbursement-details/${encodeURIComponent(projectId)}/${params.size ? `?${params}` : ''}`;
    if (nextUrl === url) refetch();
    else setUrl(nextUrl);
  }

  return (
    <div className="space-y-6">
      <PageIntro as="h1" title="Disbursement Details" description="Review recorded investor profits and advisor commissions by project." />
      <SurfaceCard className="relative z-20">
        <form onSubmit={loadReport} className="space-y-4" aria-label="Filter disbursement details">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <ProjectPicker
              value={filters.project}
              onChange={(event) => changeFilter('project', event.target.value)}
              includeClosed
              emptyHint="Choose an open or closed project, or enter its ID."
            />
            <Field htmlFor="disbursement-from" label="Disbursed from">
              <input type="date" className="field-input" value={filters.from} max={filters.to || undefined} onChange={(event) => changeFilter('from', event.target.value)} />
            </Field>
            <Field htmlFor="disbursement-to" label="Disbursed through">
              <input type="date" className="field-input" value={filters.to} min={filters.from || undefined} onChange={(event) => changeFilter('to', event.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={loading || !filters.project.trim()}>
              <Search aria-hidden="true" /> View disbursements
            </Button>
          </div>
        </form>
      </SurfaceCard>
      {url && (
        <QueryState
          loading={loading}
          error={error}
          onRetry={refetch}
          loadingLabel="Loading disbursements…"
          empty={!report.investor_rows?.length && !report.advisor_rows?.length}
          emptyTitle="No recorded disbursements"
          emptyDescription="No disbursements were found for this project and date range."
        >
          <DisbursementSummary key={url} report={report} />
        </QueryState>
      )}
    </div>
  );
}
