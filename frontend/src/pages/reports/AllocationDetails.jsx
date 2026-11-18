import { useState } from 'react';
import { Search } from 'lucide-react';
import AllocationBreakdown from '@/components/AllocationBreakdown';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { PageIntro } from '@/components/ui/page-intro';
import { ProjectPicker } from '@/components/ui/project-search';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useApiQuery } from '@/hooks/use-api-query';

const endpoint = '/api/stock/profit/allocation-report/';
const currency = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', currencyDisplay: 'code' });

function AllocationResults({ report, projectId, status, setStatus }) {
  const pending = report.pending[0];
  const disbursed = report.disbursed[0];
  const groups = [
    { status: 'pending', project: pending },
    { status: 'disbursed', project: disbursed },
  ].filter((group) => group.project && (status === 'all' || status === group.status));
  const investorRows = groups.flatMap(({ project, status }) => project.investor_rows.map((row) => ({ ...row, status })));
  const advisorRows = groups.flatMap(({ project, status }) => project.advisor_rows.map((row) => ({ ...row, status })));
  const totals = (role) => groups.reduce((sum, { project }) => sum + Math.round(Number(project[`${role}_total`]) * 100), 0) / 100;
  const project = pending ?? disbursed;

  return (
    <section className="space-y-4">
      <SurfaceCard tone="compact" className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900">{project?.project_title ?? `Project ${projectId}`}</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>Investor profit <strong className="text-slate-900">{currency.format(totals('investor'))}</strong></span>
            <span>Advisor commission <strong className="text-slate-900">{currency.format(totals('advisor'))}</strong></span>
          </p>
        </div>
        <Field htmlFor="allocation-status" label="Status" className="min-w-36">
          <select className="field-select py-2" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="disbursed">Disbursed</option>
          </select>
        </Field>
      </SurfaceCard>
      {groups.some((group) => group.status === 'pending') && (
        <p className="text-sm text-slate-600">Pending amounts are estimates based on current contributions and advisor rates.</p>
      )}
      {investorRows.length || advisorRows.length ? (
        <AllocationBreakdown
          key={status}
          investorRows={investorRows}
          advisorRows={advisorRows}
          showStatus
          showDisbursementDate={Boolean(disbursed) && status !== 'pending'}
        />
      ) : (
        <EmptyState title="No allocations found" description="No allocations match this status and earnings period." />
      )}
    </section>
  );
}

export default function AllocationDetails() {
  const [filters, setFilters] = useState({ projectId: '', from: '', to: '' });
  const [search, setSearch] = useState(null);
  const [status, setStatus] = useState('all');
  const projectQuery = useApiQuery(`${endpoint}?projects_only=true`);
  const { data: report, loading, error, refetch } = useApiQuery(search?.url);

  function changeFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function loadReport(event) {
    event.preventDefault();
    const projectId = filters.projectId.trim();
    if (!projectId) return;

    const params = new URLSearchParams({
      status: 'all',
      project_id: projectId,
      from_dt: filters.from,
      to_dt: filters.to,
    });
    const url = `${endpoint}?${params}`;
    setStatus('all');
    if (url === search?.url) refetch();
    else setSearch({ projectId, url });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageIntro
        as="h1"
        title="Allocation Details"
        description={projectQuery.data.scope === 'personal'
          ? 'Review your investor profits and advisor commissions for a project.'
          : 'Review investor profits and advisor commissions for a project.'}
      />
      <SurfaceCard className="relative z-20">
        <form onSubmit={loadReport} className="space-y-4" aria-label="Search allocation details">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <ProjectPicker
              value={filters.projectId}
              onChange={(event) => changeFilter('projectId', event.target.value)}
              options={projectQuery.data.projects ?? []}
              includeClosed
              emptyHint="Choose a project or enter its ID."
            />
            <Field htmlFor="allocation-from" label="From date">
              <input
                type="date"
                className="field-input"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(event) => changeFilter('from', event.target.value)}
                required
              />
            </Field>
            <Field htmlFor="allocation-to" label="Through date">
              <input
                type="date"
                className="field-input"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(event) => changeFilter('to', event.target.value)}
                required
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {projectQuery.error ? (
              <Button type="button" variant="link" onClick={projectQuery.refetch}>Project list unavailable. Retry</Button>
            ) : <p className="text-xs text-slate-600">The date range applies to when earnings were recorded.</p>}
            <Button type="submit" disabled={loading || !filters.projectId.trim()}>
              <Search size={16} aria-hidden="true" /> Search
            </Button>
          </div>
        </form>
      </SurfaceCard>

      {search && (
        <QueryState loading={loading} error={error} onRetry={refetch} loadingLabel="Loading allocations…">
          {report.status === 'all' && (
            <AllocationResults report={report} projectId={search.projectId} status={status} setStatus={setStatus} />
          )}
        </QueryState>
      )}
    </div>
  );
}
