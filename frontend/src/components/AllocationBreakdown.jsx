import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

const currency = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2 });
const money = (value) => currency.format(value);
const disbursementDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });
const groups = [['investors', 'Investors'], ['advisors', 'Advisors']];

function DistributionTable({ rows, investor, showDisbursementDate, showStatus }) {
  if (!rows.length) return <EmptyState title={investor ? 'No investor allocations' : 'No advisor commissions'} description={investor ? 'There are no investor allocations for this period.' : 'This project has no advisor commissions for this period.'} className="border-0 shadow-none" />;
  return <div className="overflow-x-auto"><table role="table" className="responsive-table w-full text-left text-sm">
    <caption className="sr-only">{investor ? 'Investor profit allocations' : 'Financial advisor commissions'}</caption>
    <thead role="rowgroup" className="border-y border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><tr role="row">
      <th role="columnheader" scope="col" className="px-6 py-3">{investor ? 'Investor' : 'Advisor'}</th><th role="columnheader" scope="col" className="px-4 py-3">Trade / Dividend</th>
      {showDisbursementDate && <th role="columnheader" scope="col" className="px-4 py-3">Disbursed</th>}
      {investor && <th role="columnheader" scope="col" className="px-4 py-3 text-right">Contribution</th>}
      <th role="columnheader" scope="col" className="px-4 py-3 text-right">{investor ? 'Share' : 'Rate'}</th><th role="columnheader" scope="col" className="px-6 py-3 text-right">Allocation</th>
      {showStatus && <th role="columnheader" scope="col" className="px-4 py-3">Status</th>}
    </tr></thead>
    <tbody role="rowgroup" className="divide-y divide-slate-100">{rows.map((row, index) => <tr role="row" key={row.id ?? `${row.trade}-${row.user.id}-${index}`} className="hover:bg-slate-50/60">
      <td role="rowheader" data-mobile-heading className="px-6 py-4"><p className="whitespace-nowrap font-medium text-slate-800">{row.user.name || row.user.email}</p><p className="mt-1 text-xs text-slate-500">{row.user.email}</p></td>
      <td role="cell" data-mobile-label="Trade / Dividend" className="px-4 py-4 font-mono text-xs text-slate-500"><div><span title={row.trade}>{row.trade.startsWith('Dividend ') || row.trade.length <= 8 ? row.trade : `${row.trade.slice(0, 8)}…`}</span></div></td>
      {showDisbursementDate && <td role="cell" data-mobile-label="Disbursed" className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
          <div>
            {row.disbursed_at ? <time dateTime={row.disbursed_at}>{disbursementDate.format(new Date(row.disbursed_at))}</time> : '—'}
          </div>
      </td>}
      {investor && <td role="cell" data-mobile-label="Contribution" className="whitespace-nowrap px-4 py-4 text-right tabular-nums text-slate-600"><div>{money(row.contribution)}</div></td>}
      <td role="cell" data-mobile-label={investor ? 'Share' : 'Rate'} className="px-4 py-4 text-right tabular-nums text-slate-500"><div>{row.percentage.toFixed(2)}%</div></td>
      <td role="cell" data-mobile-label="Allocation" className="whitespace-nowrap px-6 py-4 text-right font-semibold tabular-nums text-slate-900"><div>{money(row.amount)}</div></td>
      {showStatus && <td role="cell" data-mobile-label="Status" className="px-4 py-4">
          <div>
            <span className={cn('rounded-full px-2 py-1 text-xs font-medium', row.status === 'disbursed' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
              {row.status === 'disbursed' ? 'Disbursed' : 'Pending'}
            </span>
          </div>
      </td>}
    </tr>)}</tbody>
  </table></div>;
}

export default function AllocationBreakdown({ investorRows, advisorRows, showDisbursementDate = false, showStatus = false }) {
  const [view, setView] = useState(investorRows.length || !advisorRows.length ? 'investors' : 'advisors');
  const showInvestors = view === 'investors';

  return (
    <section className="table-shell">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <h2 className="font-semibold text-slate-900">Allocation breakdown</h2>
        <div role="group" aria-label="Allocation type" className="flex rounded-xl bg-slate-100 p-1">
          {groups.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                view === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-200',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <DistributionTable rows={showInvestors ? investorRows : advisorRows} investor={showInvestors} showDisbursementDate={showDisbursementDate} showStatus={showStatus} />
    </section>
  );
}
