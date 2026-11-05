import { useApiQuery } from '@/hooks/use-api-query';
import { QueryState } from '@/components/ui/query-state';

import BannerTitle from '@/components/BannerTitle';
import { EmptyState } from '@/components/ui/empty-state';
import { SurfaceCard } from '@/components/ui/surface-card';

const ProjectList = () => {

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    };

  const { data: projectList, loading, error, refetch } = useApiQuery('/api/stock/project/list/');

    if (loading || error || !projectList.length) return <><BannerTitle title='Project List' /><QueryState loading={loading} error={error} onRetry={refetch} empty={!projectList.length} /></>;

  return (
        <div>
            <BannerTitle title="Project List" description="Review open and closed projects with operational ownership details." />
            <SurfaceCard tone="compact" className="p-0">
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                        <tr>
                            <th className="px-6 py-3">Project Id</th>
                            <th className="px-6 py-3">Project Title</th>
                            <th className="px-6 py-3">Project Status</th>
                            <th className="px-6 py-3">Details</th>

                        </tr>
                    </thead>
                    <tbody>
                        {projectList.length > 0 ? (
                            projectList.map((project, index) => (
                                <tr key={project.project_id || index} className="border-b border-slate-200 bg-white">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {project.project_id}
                                    </td>
                                    <td className="px-6 py-4 text-slate-700">{project.project_title}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${project.project_active_status ?
                                            'bg-green-100 text-green-800' :
                                            'bg-red-100 text-red-800'
                                            }`}>
                                            {project.project_active_status ? 'Active' : 'Closed'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            {project.project_active_status ? (
                                                <>
                                                    <p className="text-sm font-medium text-green-800">
                                                        Opened: {formatDate(project.project_opening_dt)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">By {project.created_by?.email || '—'}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-medium text-red-800">
                                                        Closed: {formatDate(project.project_closing_dt)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">By {project.closed_by?.email || null}</p>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-8">
                                    <EmptyState
                                        title="No projects found"
                                        description="Projects will appear here once they have been created."
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </SurfaceCard>
        </div>
    );
};

export default ProjectList;
