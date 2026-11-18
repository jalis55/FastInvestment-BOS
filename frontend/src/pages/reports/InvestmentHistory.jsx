import { useState } from 'react';
import { Search } from 'lucide-react';

import { useAuth } from '@/auth/use-auth';
import { Button } from '@/components/ui/button';
import { ProjectPicker } from '@/components/ui/project-search';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useApiQuery } from '@/hooks/use-api-query';
import { bdtCents, formatBdtCents } from '@/utils/format-bdt';

const dateFormat = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' });

function InvestmentLedger({ investments, admin, projectId }) {
  const total = investments.reduce((sum, row) => sum + bdtCents(row.amount), 0n);
  const projectTitle = investments[0]?.project_title || `Project ${projectId}`;

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-900 p-4 text-white sm:p-5">
          <dt className="text-sm font-medium text-slate-300">Total invested</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums">{formatBdtCents(total)}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <dt className="text-sm font-medium text-slate-600">Investment entries</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{investments.length}</dd>
        </div>
      </dl>

      <SurfaceCard className="overflow-hidden !p-0">
        {admin && (
          <div className="px-4 py-4 sm:px-6">
            <h2 className="font-semibold text-slate-900">{projectTitle}</h2>
            {projectTitle !== `Project ${projectId}` && <p className="text-xs text-slate-500">Project {projectId}</p>}
          </div>
        )}

        {investments.length ? (
          <table role="table" aria-label="Investment entries" className="block w-full text-left text-sm md:table">
            <thead role="rowgroup" className="sr-only border-y border-slate-200 bg-slate-50 text-xs text-slate-600 md:not-sr-only md:table-header-group">
              <tr role="row">
                <th role="columnheader" scope="col" className="px-4 py-3 font-medium sm:px-6">Date</th>
                <th role="columnheader" scope="col" className="px-4 py-3 font-medium">{admin ? 'Investor' : 'Project'}</th>
                <th role="columnheader" scope="col" className="px-4 py-3 font-medium">Type</th>
                <th role="columnheader" scope="col" className="px-4 py-3 text-right font-medium sm:px-6">Amount</th>
              </tr>
            </thead>
            <tbody role="rowgroup" className="block divide-y divide-slate-100 md:table-row-group">
              {investments.map((entry) => (
                <tr key={entry.id} role="row" className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 border-slate-100 px-4 py-3 hover:bg-slate-50/70 md:table-row">
                  <td role="cell" className="col-start-1 row-start-3 text-xs text-slate-500 md:px-4 md:py-3 md:pl-6">
                    <time dateTime={entry.created_at}>{dateFormat.format(new Date(entry.created_at))}</time>
                  </td>
                  <th role="rowheader" scope="row" className="col-start-1 row-start-1 font-medium text-slate-900 md:px-4 md:py-3">
                    <span className="block break-words">{admin ? entry.investor.name || entry.investor.email : entry.project_title || `Project ${entry.project}`}</span>
                    {admin ? (
                      entry.investor.name && <span className="block break-all text-xs font-normal text-slate-500">{entry.investor.email}</span>
                    ) : <span className="block text-xs font-normal text-slate-500">{entry.project}</span>}
                  </th>
                  <td role="cell" className="col-start-1 row-start-2 text-xs text-slate-600 md:px-4 md:py-3">
                    <span className={`inline-block rounded-full px-2 py-1 font-medium ${entry.is_reinvestment ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                      {entry.is_reinvestment ? 'Reinvested payout' : 'Contribution'}
                    </span>
                  </td>
                  <td role="cell" className="col-start-2 row-start-1 whitespace-nowrap text-right font-semibold tabular-nums text-slate-900 md:px-4 md:py-3 md:pr-6">
                    {formatBdtCents(bdtCents(entry.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="border-t border-slate-100 px-5 py-10 text-center text-sm text-slate-600">
            {admin ? 'No investments have been recorded for this project.' : 'You don’t have any investment entries yet.'}
          </p>
        )}
      </SurfaceCard>
    </div>
  );
}

export default function InvestmentHistory() {
  const { hasRole } = useAuth();
  const admin = hasRole(['admin']);
  const [projectId, setProjectId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const url = admin
    ? selectedProjectId && `/api/stock/project/investment-history/${encodeURIComponent(selectedProjectId)}/`
    : '/api/stock/investor/investment-details/';
  const { data: investments, loading, error, refetch } = useApiQuery(url);

  function loadProject(event) {
    event.preventDefault();
    const id = projectId.trim();
    if (!id) return;
    if (id === selectedProjectId) refetch();
    else setSelectedProjectId(id);
  }

  return (
    <div className="space-y-5">
      {admin ? (
        <SurfaceCard className="relative z-20">
          <form onSubmit={loadProject} className="grid max-w-xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" aria-label="Select a project for investment history">
            <ProjectPicker
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              includeClosed
              emptyHint="Choose an open or closed project, or enter its ID."
            />
            <Button type="submit" className="justify-self-start sm:mt-7 sm:h-[52px]" disabled={!projectId.trim() || loading}>
              <Search aria-hidden="true" /> View history
            </Button>
          </form>
        </SurfaceCard>
      ) : (
        <p className="text-sm text-slate-600">Your contributions and reinvested payouts across all projects.</p>
      )}

      {url && (
        <QueryState loading={loading} error={error} onRetry={refetch} loadingLabel="Loading investments…">
          <InvestmentLedger investments={investments} admin={admin} projectId={selectedProjectId} />
        </QueryState>
      )}
    </div>
  );
}
