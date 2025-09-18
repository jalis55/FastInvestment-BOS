
import React, { useState } from 'react'
import BannerTitle from '@/components/BannerTitle';
import API from "@/api/axios";
import Swal from "sweetalert2";
import Spinner from '@/components/Spinner';


const ProjectDetails = () => {
    const [searchId, setSearchId] = useState('');
    const [projectBalanceDetails, setProjectBalanceDetails] = useState({});
    const [instruments, setInstruments] = useState([]);
    const [projectId, setProjectId] = useState(null);
    const [loading, setLoading] = useState(false);

    // Search for project and fetch instruments
    const searchProject = async (e) => {
        e.preventDefault();

        if (!searchId.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Input Required',
                text: 'Please enter a project ID!'
            });
            return;
        }

        setLoading(true);
        try {
            // Fetch project balance details
            const response = await API.get(`/api/stock/project/balance/details/${searchId}/`);

            if (response.data.project_id) {
                setProjectBalanceDetails(response.data);
                setProjectId(response.data.project_id);
                setSearchId('');

                const instrumentsData = await getSellAbleInstruments(response.data.project_id);

                // Always set instruments, even if empty array


                const closePriceData = await getInstrumentClosePrice();


                // Use instrumentsData (the current variable) instead of instruments (state)
                const updatedInstruments = instrumentsData.map(item => ({
                    ...item,
                    latest_price: closePriceData[item.instrument?.name] || 0
                }));


                setInstruments(updatedInstruments);

            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid Response',
                    text: 'Project ID not found in the response.'
                });
            }

        } catch (error) {
            console.error('API Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'API Error',
                text: error.response?.data?.detail || error.response?.data?.message || 'Something went wrong. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const getSellAbleInstruments = async (project_id) => {
        try {
            const response = await API.get(`/api/stock/sellable/instruments/${project_id}/`);
            return response.data;
        } catch (error) {
            console.error("Error fetching instruments:", error);
            return []; // Return empty array on error
        }
    };

    const getInstrumentClosePrice = async () => {
        try {
            const response = await API.get('/api/stock/instruments/close/price/');
            return response.data;
        } catch (error) {
            console.error("Error fetching close prices:", error);
            return {}; // Return empty object instead of undefined
        }
    };

    return (
        <div>
            <BannerTitle title="Project Details" />
            <form className="max-w-lg mx-auto mb-8" onSubmit={searchProject}>
                <div className="relative">
                    <label htmlFor="default-search" className="sr-only">Search</label>
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                    </div>
                    <input
                        type="search"
                        id="default-search"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        placeholder="Search Project"
                        required
                    />
                    <button
                        type="submit"
                        className="absolute right-2.5 bottom-2.5 bg-blue-700 text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                    >
                        Search
                    </button>
                </div>
            </form>
            {/* fin details */}
            {projectId ? (
                <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-100 overflow-hidden">
                    <div className="bg-gray-300 px-6 py-4">
                        <h2 className="text-xl font-semibold text-black">Project Balance Overview</h2>
                    </div>

                    <div className="p-6">
                        {/* Main metrics row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                                <div className="text-sm font-medium text-gray-500 mb-1">Project ID</div>
                                <div className="text-xl font-bold text-blue-600">{projectBalanceDetails.project_id || 'N/A'}</div>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                                <div className="text-sm font-medium text-gray-500 mb-1">Total Investment</div>
                                <div className="text-xl font-bold text-green-600">
                                    ${projectBalanceDetails.total_investment ? Number(projectBalanceDetails.total_investment).toLocaleString() : '0.00'}
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                                <div className="text-sm font-medium text-gray-500 mb-1">Total Buy Amount</div>
                                <div className="text-xl font-bold text-purple-600">
                                    ${projectBalanceDetails.total_buy_amount ? Number(projectBalanceDetails.total_buy_amount).toLocaleString() : '0.00'}
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
                                <div className="text-sm font-medium text-gray-500 mb-1">Total Sell Amount</div>
                                <div className="text-xl font-bold text-indigo-600">
                                    ${projectBalanceDetails.total_sell_amount ? Number(projectBalanceDetails.total_sell_amount).toLocaleString() : '0.00'}
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            )
                : ""}

            {loading && (
                <div>

                    <div className="text-center py-8"><Spinner /></div>
                </div>
            )}
            {projectId && (
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">
                                    Instrument Name
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    QTY
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Cost Rate
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Total Cost
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Market Price
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Market Value
                                </th>
                                <th scope="col" className="px-6 py-3">
                                    Unrealize Gain/Loss
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {instruments.length > 0 ? (
                                instruments.map((item, index) => (
                                    <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {item.instrument?.name || 'N/A'}
                                        </th>
                                        <td className="px-6 py-4">
                                            {item.available_quantity || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            ${parseFloat(item.average_buy_unit_price || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            ${((item.available_quantity || 0) *
                                                (parseFloat(item.average_buy_unit_price) || 0)).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4">
                                            ${(item.instrument?.latest_price || 0)
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            ${(item.available_quantity || 0) *
                                                (parseFloat(item.instrument?.latest_price) || 0).toFixed(2)
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            ${
                                                ((item.available_quantity || 0) *
                                                    (parseFloat(item.instrument?.latest_price) || 0).toFixed(2)) -
                                                (
                                                    ((item.available_quantity || 0) *
                                                        (parseFloat(item.average_buy_unit_price) || 0)).toFixed(2)
                                                )

                                            }
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="px-6 py-4 text-center">
                                        No instruments found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}




        </div>
    )
}

export default ProjectDetails
