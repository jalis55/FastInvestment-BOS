import React, { useEffect, useState } from 'react';
import API from '@/api/axios';

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

    const [projectList, setProjectList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await API.get('/api/stock/project/list/');
                setProjectList(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching projects:', err);
                setError('Failed to load projects. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    return (
        <div>
            <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                <div className="bg-gray-300 px-6 py-4">
                    <h2 className="text-xl font-semibold text-black">Project List</h2>
                </div>
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
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
                                <tr key={project.id || index} className="bg-white border-b">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {project.project_id}
                                    </td>
                                    <td className="px-6 py-4">{project.project_title}</td>
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
                                                    <p className="text-xs text-gray-500">By {project.created_by.email}</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-medium text-red-800">
                                                        Closed: {formatDate(project.project_closing_dt)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">By {project.closed_by?.email || null}</p>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-center">
                                    No projects found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProjectList;