import React, { useState, useCallback, useMemo } from 'react';
import BannerTitle from '@/components/BannerTitle';
import API from '@/api/axios';
import Swal from 'sweetalert2';
import Spinner from '@/components/Spinner';

const ProjectDetails = () => {
    /* -------------------------------------------------
     * State
     * ------------------------------------------------- */
    const [searchId, setSearchId] = useState('');
    const [projectBalance, setProjectBalance] = useState(null);
    const [instruments, setInstruments] = useState([]);
    const [loadingProject, setLoadingProject] = useState(false);
    const [loadingInstruments, setLoadingInstruments] = useState(false);

    /* -------------------------------------------------
     * Helpers
     * ------------------------------------------------- */
    const toast = useCallback((icon, title, text) => {
        Swal.fire({ icon, title, text });
    }, []);

    const fetchSellable = useCallback(async (pid) => {
        try {
            const { data } = await API.get(`/api/stock/sellable/instruments/${pid}/`);
            return data ?? [];
        } catch {
            toast('error', 'Fetch Error', 'Unable to load instruments.');
            return [];
        }
    }, [toast]);

    const fetchClosePrices = useCallback(async () => {
        try {
            const { data } = await API.get('/api/stock/instruments/close/price/');
            return data ?? {};
        } catch {
            toast('error', 'Fetch Error', 'Unable to load latest prices.');
            return {};
        }
    }, [toast]);

    /* -------------------------------------------------
     * Search handler
     * ------------------------------------------------- */
    const searchProject = useCallback(
        async (e) => {
            e.preventDefault();
            const id = searchId.trim();
            if (!id) return toast('warning', 'Input Required', 'Please enter a project ID.');

            setLoadingProject(true);
            try {
                const { data: balance } = await API.get(`/api/stock/project/balance/details/${id}/`);
                if (!balance.project_id) {
                    toast('error', 'Invalid Response', 'Project ID not found.');
                    return;
                }

                setProjectBalance(balance);
                setSearchId('');
                setLoadingProject(false); // project loaded

                // now load instruments
                setLoadingInstruments(true);
                const [instrumentsData, closePriceData] = await Promise.all([
                    fetchSellable(balance.project_id),
                    fetchClosePrices(),
                ]);

                const updated = instrumentsData.map((i) => ({
                    ...i,
                    instrument: {
                        ...i.instrument,
                        latest_price: closePriceData[i.instrument?.name] || 0,
                    },
                }));

                setInstruments(updated);
            } catch (err) {
                const msg = err.response?.data?.detail || err.response?.data?.message || 'Something went wrong.';
                toast('error', 'API Error', msg);
            } finally {
                setLoadingProject(false);
                setLoadingInstruments(false);
            }
        },
        [searchId, fetchSellable, fetchClosePrices, toast]
    );

    /* -------------------------------------------------
     * Derived data
     * ------------------------------------------------- */
    const rows = useMemo(() => {
        if (!instruments.length) return [];
        return instruments.map((item) => {
            const qty = Number(item.available_quantity || 0);
            const cost = Number(item.average_buy_unit_price || 0);
            const price = Number(item.instrument?.latest_price || 0);

            const totalCost = qty * cost;
            const marketValue = qty * price;
            const gainLoss = marketValue - totalCost;

            return {
                name: item.instrument?.name || 'N/A',
                qty,
                cost: cost.toFixed(2),
                totalCost: totalCost.toFixed(2),
                price: price.toFixed(2),
                marketValue: marketValue.toFixed(2),
                gainLoss: gainLoss.toFixed(2),
            };
        });
    }, [instruments]);

    /* -------------------------------------------------
     * Render
     * ------------------------------------------------- */
    return (
        <div>
            <BannerTitle title="Project Details" />

            {/* Search */}
            <form className="max-w-lg mx-auto mb-8" onSubmit={searchProject}>
                <div className="relative">
                    <label htmlFor="search" className="sr-only">
                        Search
                    </label>
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg
                            className="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 20 20"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                            />
                        </svg>
                    </div>
                    <input
                        id="search"
                        type="search"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="block w-full p-4 pl-10 text-sm border rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Search Project"
                        required
                    />
                    <button
                        type="submit"
                        className="absolute right-2.5 bottom-2.5 bg-blue-700 text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2"
                    >
                        Search
                    </button>
                </div>
            </form>

            { /* Balance Card - show as soon as project is found */}
            {projectBalance && (
                <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-100 overflow-hidden">
                    <div className="bg-gray-300 px-6 py-4">
                        <h2 className="text-xl font-semibold text-black">Project Balance Overview</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Metric label="Project ID" value={projectBalance.project_id || 'N/A'} color="text-blue-600" />
                        <Metric
                            label="Total Investment"
                            value={`৳${Number(projectBalance.total_investment || 0).toLocaleString()}`}
                            color="text-green-600"
                        />
                        <Metric
                            label="Total Buy Amount"
                            value={`৳${Number(projectBalance.total_buy_amount || 0).toLocaleString()}`}
                            color="text-purple-600"
                        />
                        <Metric
                            label="Total Sell Amount"
                            value={`৳${Number(projectBalance.total_sell_amount || 0).toLocaleString()}`}
                            color="text-indigo-600"
                        />
                        <Metric
                            label="Available Balance"
                            value={`৳${(
                                Number(projectBalance.total_investment || 0) +
                                Number(projectBalance.total_sell_amount || 0) -
                                Number(projectBalance.total_buy_amount || 0)
                            ).toLocaleString()}`}
                            color="text-sky-600"
                        />

                        <Metric
                            label="Accrued Profit"
                            value={`৳${Number(projectBalance.accrued_profit || 0).toLocaleString()}`}
                            color="text-teal-800"
                        />

                    </div>
                </div>
            )}
            {projectBalance && (
                <>
                    {loadingInstruments ? (
                        <div className="text-center">
                            <Spinner />
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                            <div className="bg-gray-300 px-6 py-4">
                                <h2 className="text-xl font-semibold text-black">Instruments Balance Overview</h2>
                            </div>
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">Instrument Name</th>
                                        <th className="px-6 py-3">QTY</th>
                                        <th className="px-6 py-3">Cost Rate</th>
                                        <th className="px-6 py-3">Total Cost</th>
                                        <th className="px-6 py-3">Market Price</th>
                                        <th className="px-6 py-3">Market Value</th>
                                        <th className="px-6 py-3">Unrealized Gain/Loss</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length ? (
                                        rows.map((r, idx) => (
                                            <tr key={idx} className="bg-white border-b">
                                                <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{r.name}</th>
                                                <td className="px-6 py-4">{r.qty}</td>
                                                <td className="px-6 py-4">৳{r.cost}</td>
                                                <td className="px-6 py-4">৳{r.totalCost}</td>
                                                <td className="px-6 py-4">৳{r.price}</td>
                                                <td className="px-6 py-4">৳{r.marketValue}</td>
                                                <td className="px-6 py-4">৳{r.gainLoss}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-4 text-center">
                                                No instruments found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

/* -------------------------------------------------
 * Sub-component
 * ------------------------------------------------- */
const Metric = ({ label, value, color }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-100">
        <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
);

export default ProjectDetails;