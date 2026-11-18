import { useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageIntro } from '@/components/ui/page-intro';
import { ProjectPicker } from '@/components/ui/project-search';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useApiQuery } from '@/hooks/use-api-query';
import { bdtCents, formatBdtCents } from '@/utils/format-bdt';

function InvestmentBreakdown({ projectId, contributions }) {
  const rows = contributions.map((row) => ({
    ...row,
    amountCents: bdtCents(row.contribute_amount),
  })).sort((left, right) => {
    if (left.amountCents === right.amountCents) return left.investor.name.localeCompare(right.investor.name);
    return left.amountCents > right.amountCents ? -1 : 1;
  });
  const investmentTotal = rows.reduce((sum, row) => sum + row.amountCents, 0n);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Project {projectId}</h2>
      </div>
      <dl className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-2xl bg-slate-900 p-5 text-white">
          <dt className="text-sm font-medium text-slate-300">Total project investment</dt>
          <dd className="mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums">{formatBdtCents(investmentTotal)}</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <dt className="text-sm font-medium text-slate-600">Investors</dt>
          <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{rows.length}</dd>
        </div>
      </dl>
      <SurfaceCard className="overflow-hidden !p-0">
        {rows.length ? (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Investor contributions">
            <table className="w-full min-w-[22rem] text-left text-sm">
              <caption className="sr-only">Investor contributions for project {projectId}</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium sm:px-6">Investor</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Total investment</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium sm:px-6">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ investor, amountCents, contribution_percentage }) => (
                  <tr key={investor.id} className="hover:bg-slate-50/70">
                    <th scope="row" className="min-w-0 px-4 py-3 text-left font-medium text-slate-900 sm:px-6">
                      <span className="block break-words">{investor.name || investor.email}</span>
                      {investor.name && <span className="block break-all text-xs font-normal text-slate-500">{investor.email}</span>}
                    </th>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-slate-900">{formatBdtCents(amountCents)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-700 sm:px-6">{contribution_percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-slate-600">No investor contributions have been recorded for this project.</p>
        )}
      </SurfaceCard>
    </div>
  );
}

export default function ProjectInvestmentSummary() {
  const [projectId, setProjectId] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const url = selectedProject ? `/api/stock/investor/contrib/percent/${encodeURIComponent(selectedProject)}/` : null;
  const { data: contributions, loading, error, refetch } = useApiQuery(url);

  function loadSummary(event) {
    event.preventDefault();
    const id = projectId.trim();
    if (!id) return;
    if (id === selectedProject) refetch();
    else setSelectedProject(id);
  }

  return (
    <div className="space-y-6">
      <PageIntro as="h1" title="Project Investment Summary" description="Review total capital and each investor’s share of a project." />
      <SurfaceCard className="relative z-20">
        <form className="grid max-w-xl gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start" onSubmit={loadSummary} aria-label="Choose a project for the investment summary">
          <ProjectPicker
            value={projectId}
            onChange={(event) => {
              setProjectId(event.target.value);
              setSelectedProject('');
            }}
            includeClosed
            emptyHint="Choose an open or closed project, or enter its ID."
          />
          <Button type="submit" className="justify-self-start sm:mt-7 sm:h-[52px]" disabled={!projectId.trim() || loading}>
            <Search aria-hidden="true" /> View summary
          </Button>
        </form>
      </SurfaceCard>
      {selectedProject && (
        <QueryState loading={loading} error={error} onRetry={refetch} loadingLabel="Loading project investments…">
          <InvestmentBreakdown projectId={selectedProject} contributions={contributions} />
        </QueryState>
      )}
    </div>
  );
}
