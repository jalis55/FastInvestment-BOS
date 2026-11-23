import Swal from 'sweetalert2';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
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

    async function editCommission(project) {
        const result = await Swal.fire({
            title: 'Edit trade commission',
            text: `${project.project_title} · Minimum 10.00 BDT per trade`,
            input: 'number',
            inputLabel: 'Commission rate (%)',
            inputValue: Number(project.trade_commission_rate),
            inputAttributes: { min: '0', max: '100', step: '0.0001' },
            inputValidator: (value) => {
                if (!/^\d+(\.\d{1,4})?$/.test(value) || Number(value) > 100) {
                    return 'Enter a percentage from 0 to 100 with up to four decimal places.';
                }
            },
            showCancelButton: true,
            confirmButtonText: 'Save rate',
        });
        if (!result.isConfirmed) return;

        try {
            await API.patch(`/api/stock/project/commission/${encodeURIComponent(project.project_id)}/`, {
                trade_commission_rate: result.value,
            });
            await refetch();
            Swal.fire({ icon: 'success', title: 'Commission updated', text: 'The new rate applies to future trades.' });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Could not update commission', text: getApiError(error) });
        }
    }

    if (loading || error || !projectList.length) return <><BannerTitle title='Project List' /><QueryState loading={loading} error={error} onRetry={refetch} empty={!projectList.length} /></>;

  return (
        <div>
            <BannerTitle title="Project List" description="Review open and closed projects with operational ownership details." />
            <SurfaceCard tone="compact" className="p-0">
                <div className="overflow-x-auto">
                <table role="table" className="responsive-table w-full text-sm text-left text-gray-500">
                    <thead role="rowgroup" className="bg-slate-50 text-xs uppercase text-slate-600">
                        <tr role="row">
                            <th role="columnheader" className="px-6 py-3">Project Id</th>
                            <th role="columnheader" className="px-6 py-3">Project Title</th>
                            <th role="columnheader" className="px-6 py-3">Project Status</th>
                            <th role="columnheader" className="px-6 py-3">Trade commission</th>
                            <th role="columnheader" className="px-6 py-3">Details</th>

                        </tr>
                    </thead>
                    <tbody role="rowgroup">
                        {projectList.length > 0 ? (
                            projectList.map((project, index) => (
                                <tr role="row" key={project.project_id || index} className="border-b border-slate-200 bg-white">
                                    <td role="cell" data-mobile-label="Project ID" className="px-6 py-4 font-medium text-gray-900">
                                        <div>
                                            {project.project_id}
                                        </div>
                                    </td>
                                    <td role="rowheader" data-mobile-heading className="px-6 py-4 text-slate-700">{project.project_title}</td>
                                    <td role="cell" data-mobile-label="Status" className="px-6 py-4">
                                        <div>
                                            <span className={`px-2 py-1 rounded text-xs ${project.project_active_status ?
                                                'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800'
                                                }`}>
                                                {project.project_active_status ? 'Active' : 'Closed'}
                                            </span>
                                        </div>
                                    </td>
                                    <td role="cell" data-mobile-label="Trade commission" className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <span className="font-medium text-slate-900">{Number(project.trade_commission_rate)}%</span>
                                            <button
                                                type="button"
                                                className="ml-2 inline-flex min-h-11 items-center px-2 text-sm font-medium text-blue-700 hover:underline xl:ml-3 xl:min-h-0 xl:px-0"
                                                aria-label={`Edit trade commission for ${project.project_title}`}
                                                onClick={() => editCommission(project)}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </td>
                                    <td role="cell" className="px-6 py-4">
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
                            <tr role="row">
                                <td role="cell" colSpan={5} className="px-6 py-8">
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
