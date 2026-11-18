import { LoadingState } from '@/components/ui/loading-state';
import React, { useState, useCallback, useMemo } from 'react';
import BannerTitle from '@/components/BannerTitle';
import API from '@/api/axios';
import { useApiQuery } from '@/hooks/use-api-query';
import Swal from 'sweetalert2';
import { ProjectSearch } from '@/components/ui/project-search';
import { SurfaceCard } from '@/components/ui/surface-card';

const currency = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' });
const money = (value) => currency.format(Number(value) || 0);

const ProjectDetails = () => {
    /* -------------------------------------------------
     * State
     * ------------------------------------------------- */
    const [searchId, setSearchId] = useState('');
    const projectQuery = useApiQuery('/api/stock/profit/allocation-report/?projects_only=true');
    const [projectBalance, setProjectBalance] = useState(null);
    const [instruments, setInstruments] = useState([]);
    const [loadingProject, setLoadingProject] = useState(false);
    const [loadingInstruments, setLoadingInstruments] = useState(false);
    const [priceSnapshot, setPriceSnapshot] = useState(null);
    const [priceError, setPriceError] = useState(false);
    const [instrumentsError, setInstrumentsError] = useState(false);

    /* -------------------------------------------------
     * Helpers
     * ------------------------------------------------- */
    const toast = useCallback((icon, title, text) => {
        Swal.fire({ icon, title, text });
    }, []);

    const fetchSellable = useCallback(async (pid) => {
        const { data } = await API.get(`/api/stock/sellable/instruments/${encodeURIComponent(pid)}/`);
        return data ?? [];
    }, []);

    const fetchClosePrices = useCallback(async () => {
        try {
            const { data } = await API.get('/api/stock/instruments/close/price/');
            return data;
        } catch {
            return null;
        }
    }, []);

    /* -------------------------------------------------
     * Search handler
     * ------------------------------------------------- */
    const searchProject = useCallback(
        async (e, projectId) => {
            e.preventDefault();
            const id = projectId || searchId.trim();
            if (!id) return toast('warning', 'Input Required', 'Please enter a project ID.');

            setProjectBalance(null);
            setInstruments([]);
            setPriceSnapshot(null);
            setPriceError(false);
            setInstrumentsError(false);
            setLoadingProject(true);
            let balanceLoaded = false;
            try {
                const { data: balance } = await API.get(`/api/stock/project/balance/details/${encodeURIComponent(id)}/`);
                if (!balance.project_id) {
                    toast('error', 'Invalid Response', 'Project ID not found.');
                    return;
                }

                setProjectBalance(balance);
                balanceLoaded = true;
                setLoadingProject(false); // project loaded

                // now load instruments
                setLoadingInstruments(true);
                const [instrumentsData, snapshot] = await Promise.all([
                    fetchSellable(balance.project_id), fetchClosePrices(),
                ]);
                setInstruments(instrumentsData);
                setPriceSnapshot(snapshot);
                setPriceError(!snapshot);
            } catch (err) {
                if (balanceLoaded) setInstrumentsError(true);
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
            const rawPrice = priceSnapshot?.prices?.[item.instrument?.name?.toUpperCase()];
            const price = rawPrice == null ? null : Number(rawPrice);

            const totalCost = Number(item.total_cost ?? qty * cost);
            const marketValue = price == null ? null : qty * price;
            const gainLoss = marketValue == null ? null : marketValue - totalCost;

            return {
                name: item.instrument?.name || 'N/A',
                qty,
                cost,
                totalCost,
                price,
                marketValue,
                gainLoss,
            };
        });
    }, [instruments, priceSnapshot]);

    /* -------------------------------------------------
     * Render
     * ------------------------------------------------- */
    return (
        <div>
            <BannerTitle title="Project Details" />
            <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)}
                onSubmit={searchProject} loading={loadingProject || loadingInstruments}
                options={projectQuery.data.projects ?? []} includeClosed emptyHint="Choose a project or enter its ID." />
            {projectQuery.error && (
                <p role="alert" className="mb-4 text-sm text-slate-600">
                    Project list unavailable. <button type="button" onClick={projectQuery.refetch} className="font-medium text-blue-700 underline">Retry</button>
                </p>
            )}
            {loadingProject && <LoadingState label="Loading project…" description="Preparing balances and investment totals." />}

            { /* Balance Card - show as soon as project is found */}
            {projectBalance && (
                <SurfaceCard className="mb-8">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-xl font-semibold text-slate-900">{projectBalance.project_title || `Project ${projectBalance.project_id}`}</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <Metric label="Project ID" value={projectBalance.project_id || 'N/A'} color="text-blue-600" />
                        <Metric
                            label="Total Investment"
                            value={money(projectBalance.total_investment)}
                            color="text-green-600"
                        />
                        <Metric
                            label="Total Buy Amount"
                            value={money(projectBalance.total_buy_amount)}
                            color="text-purple-600"
                        />
                        <Metric
                            label="Total Sell Amount"
                            value={money(projectBalance.total_sell_amount)}
                            color="text-indigo-600"
                        />
                        <Metric
                            label="Available Balance"
                            value={money(projectBalance.available_balance)}
                            color="text-sky-600"
                        />

                        <Metric
                            label="Accrued Profit"
                            value={money(projectBalance.accrued_profit)}
                            color="text-teal-800"
                        />

                    </div>
                </SurfaceCard>
            )}
            {projectBalance &&  (
                <>
                    {loadingInstruments ? (
                        <LoadingState label="Loading holdings and market prices…" description="Calculating current values for this project." />
                    ) : instrumentsError ? (
                        <div role="alert" className="page-card border-red-200 text-sm text-red-700">Holdings could not be loaded. Search the project again to retry.</div>
                    ) : rows.length ? (
                        <section className="table-shell overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-4">
                                <h2 className="text-lg font-semibold text-slate-900">Current holdings</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {priceSnapshot ? `AmarStock reference prices fetched ${priceSnapshot.fetched_on}${priceSnapshot.stale ? ' · previous snapshot' : ''}. A dash means no price is available for that instrument.` : 'Market prices unavailable. Cost values are still shown.'}
                                </p>
                            </div>
                            {priceSnapshot?.stale && <p role="status" className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">Today’s price refresh failed. Showing the last available snapshot.</p>}
                            {priceError && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">Market prices could not be loaded. Market value and gain/loss are unavailable.</p>}
                            <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
                                    {rows.map((r, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 bg-white">
                                            <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{r.name}</th>
                                            <td className="px-6 py-4">{r.qty}</td>
                                            <td className="px-6 py-4 tabular-nums">{money(r.cost)}</td>
                                            <td className="px-6 py-4 tabular-nums">{money(r.totalCost)}</td>
                                            <td className="px-6 py-4 tabular-nums">{r.price == null ? '—' : money(r.price)}</td>
                                            <td className="px-6 py-4 tabular-nums">{r.marketValue == null ? '—' : money(r.marketValue)}</td>
                                            <td className={`px-6 py-4 font-semibold tabular-nums ${r.gainLoss == null ? 'text-slate-400' : r.gainLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{r.gainLoss == null ? '—' : money(r.gainLoss)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table></div>
                        </section>
                    ) : (
                        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500 shadow-sm">
                            No instruments found
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
    <div className="metric-card-soft">
        <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
        <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
);

export default ProjectDetails;
