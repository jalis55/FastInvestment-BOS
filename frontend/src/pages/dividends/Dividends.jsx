import { useRef, useState } from 'react';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import BannerTitle from '@/components/BannerTitle';
import DividendPanel from '@/components/DividendPanel';
import { ProjectSearch } from '@/components/ui/project-search';
import { SurfaceCard } from '@/components/ui/surface-card';

export default function Dividends() {
  const [searchId, setSearchId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);
  const search = async (event) => {
    event.preventDefault();
    if (lock.current || !searchId.trim()) return;
    lock.current = true;
    setLoading(true); setError(''); setProjectId('');
    try {
      const { data } = await API.get(`/api/stock/project/status/${encodeURIComponent(searchId.trim())}/`);
      if (!data.project_active_status) setError('This project is closed. Dividends can only be recorded for an active project.');
      else setProjectId(data.project_id);
    } catch (failure) { setError(getApiError(failure)); }
    finally { lock.current = false; setLoading(false); }
  };
  return <div>
    <BannerTitle title="Dividend" description="Record cash dividends or bonus shares for a project’s current holdings." />
    <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)} onSubmit={search} loading={loading} />
    {error && <div role="alert" className="page-card border-red-200 text-sm text-red-700">{error}</div>}
    {projectId ? <div><p className="mb-4 text-sm font-semibold text-slate-700">Project {projectId}</p><DividendPanel key={`${projectId}-${revision}`} projectId={projectId} onRecorded={() => setRevision((value) => value + 1)} /></div> : !loading && !error && <SurfaceCard className="text-center text-sm text-slate-500">Search for a project to view its dividends and available instruments.</SurfaceCard>}
  </div>;
}
