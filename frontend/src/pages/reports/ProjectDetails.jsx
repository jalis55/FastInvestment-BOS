import { LoadingState } from '@/components/ui/loading-state';
import React, { useState, useCallback, useMemo } from 'react';
import BannerTitle from '@/components/BannerTitle';
import API from '@/api/axios';
import { useApiQuery } from '@/hooks/use-api-query';
import Swal from 'sweetalert2';
import { ProjectSearch } from '@/components/ui/project-search';
import { fetchStockChartQuotes } from '@/api/stockchartbd';
import { SurfaceCard } from '@/components/ui/surface-card';

const currency = new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' });
const money = (value) => currency.format(Number(value) || 0);
const holdingMoney = (cents) => cents === null ? '—' : money(cents / 100);

const ProjectDetails = ({ liveQuotes = false }) => {
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
    const [quotes, setQuotes] = useState({});
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
            setQuotes({});
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
                    fetchSellable(balance.project_id), liveQuotes ? null : fetchClosePrices(),
                ]);
                setInstruments(instrumentsData);
                setPriceSnapshot(snapshot);
                if (liveQuotes) {
                    setQuotes(await fetchStockChartQuotes(instrumentsData));
                } else {
                    setPriceError(!snapshot);
                }
            } catch (err) {
                if (balanceLoaded) setInstrumentsError(true);
                const msg = err.response?.data?.detail || err.response?.data?.message || 'Something went wrong.';
                toast('error', 'API Error', msg);
            } finally {
                setLoadingProject(false);
                setLoadingInstruments(false);
            }
        },
        [searchId, fetchSellable, fetchClosePrices, liveQuotes, toast]
    );

    /* -------------------------------------------------
     * Derived data
     * ------------------------------------------------- */
    const rows = useMemo(() => {
        if (!instruments.length) return [];
        return instruments.map((item) => {
            const qty = Number(item.available_quantity || 0);
            const cost = Number(item.average_buy_unit_price || 0);
            const symbol = item.instrument?.name?.toUpperCase();
            const quote = quotes[symbol?.trim()];
            const rawPrice = liveQuotes ? quote?.price : priceSnapshot?.prices?.[symbol];
            const numericPrice = rawPrice == null ? NaN : Number(rawPrice);
            const price = Number.isFinite(numericPrice) ? numericPrice : null;

            const amount = item.total_cost == null || item.total_cost === '' ? NaN : Number(item.total_cost);
            const totalCost = Number.isFinite(amount) ? Math.round(amount * 100) : null;
            const marketValue = price == null ? null : Math.round(qty * price * 100);
            const gainLoss = marketValue === null || totalCost === null ? null : marketValue - totalCost;

            return {
                name: item.instrument?.name || 'N/A',
                qty,
                cost,
                totalCost,
                price,
                quoteDate: quote?.date,
                marketValue,
                gainLoss,
            };
        });
    }, [instruments, liveQuotes, priceSnapshot, quotes]);

    const holdingsUnavailable = loadingInstruments || instrumentsError;
    const totalCost = rows.every((row) => row.totalCost !== null)
        ? rows.reduce((total, row) => total + row.totalCost, 0)
        : null;
    const totalMarketValue = rows.every((row) => row.marketValue !== null)
        ? rows.reduce((total, row) => total + row.marketValue, 0)
        : null;
    const unrealizedGainLoss = totalMarketValue === null || totalCost === null ? null : totalMarketValue - totalCost;

    /* -------------------------------------------------
     * Render
     * ------------------------------------------------- */
    return (
        <div>
            <BannerTitle title={liveQuotes ? "Live Share Update" : "Project Details"} />
            <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)}
                onSubmit={searchProject} loading={loadingProject || loadingInstruments}
                options={projectQuery.data.projects ?? []} includeClosed emptyHint="Choose a project or enter its ID." />
            {projectQuery.error && (
                <p role="alert" className="mb-4 text-sm text-slate-600">
                    Project list unavailable. <button type="button" onClick={projectQuery.refetch} className="font-medium text-blue-700 underline">Retry</button>
                </p>
            )}
            {loadingProject && <LoadingState label="Loading project…" description={liveQuotes ? "Finding the selected project." : "Preparing balances and investment totals."} />}

            { /* Balance Card - show as soon as project is found */}
            {projectBalance && !liveQuotes && (
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

                        <dl aria-busy={loadingInstruments} className="metric-card-soft space-y-2 text-sm">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <dt className="font-medium text-slate-500">Total Cost</dt>
                                <dd className="font-semibold tabular-nums text-slate-900">{holdingMoney(holdingsUnavailable ? null : totalCost)}</dd>
                            </div>
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <dt className="font-medium text-slate-500">Total Market Value</dt>
                                <dd className="font-semibold tabular-nums text-slate-900">{holdingMoney(holdingsUnavailable ? null : totalMarketValue)}</dd>
                            </div>
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <dt className="font-medium text-slate-500">Unrealized Gain/Loss</dt>
                                <dd className={`font-semibold tabular-nums ${holdingsUnavailable || unrealizedGainLoss === null ? 'text-slate-400' : unrealizedGainLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{holdingMoney(holdingsUnavailable ? null : unrealizedGainLoss)}</dd>
                            </div>
                        </dl>
                    </div>
                </SurfaceCard>
            )}
            {projectBalance &&  (
                <>
                    {liveQuotes && (
                        <h2 className="mb-4 text-xl font-semibold text-slate-900">
                            {projectBalance.project_title || `Project ${projectBalance.project_id}`}
                        </h2>
                    )}
                    {loadingInstruments ? (
                        <LoadingState variant="compact" label="Loading holdings and market prices…" />
                    ) : instrumentsError ? (
                        <div role="alert" className="page-card border-red-200 text-sm text-red-700">Holdings could not be loaded. Search the project again to retry.</div>
                    ) : rows.length ? (
                        <section className="table-shell overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-4">
                                <h2 className="text-lg font-semibold text-slate-900">Current holdings</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {liveQuotes ? "Latest available closing quotes from StockChartBD (DSE Intelligence, dsebd.org)." : priceSnapshot ? `AmarStock reference prices fetched ${priceSnapshot.fetched_on}${priceSnapshot.stale ? ' · previous snapshot' : ''}. A dash means no price is available for that instrument.` : 'Market prices unavailable. Cost values are still shown.'}
                                </p>
                            </div>
                            {priceSnapshot?.stale && <p role="status" className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">Today’s price refresh failed. Showing the last available snapshot.</p>}
                            {liveQuotes && rows.some((row) => row.price === null) && (
                                <p role="status" className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">
                                    Quotes are missing for one or more holdings. Market value and gain/loss totals require every quote.
                                </p>
                            )}
                            {priceError && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">Market prices could not be loaded. Market value and gain/loss are unavailable.</p>}
                            <div className="overflow-x-auto"><table role="table" className="responsive-table min-w-[900px] w-full text-left text-sm text-slate-600">
                                <thead role="rowgroup" className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr role="row">
                                        <th role="columnheader" className="px-6 py-3">Instrument Name</th>
                                        <th role="columnheader" className="px-6 py-3">QTY</th>
                                        <th role="columnheader" className="px-6 py-3">Cost Rate</th>
                                        <th role="columnheader" className="px-6 py-3">Cost</th>
                                        <th role="columnheader" className="px-6 py-3">Market Price</th>
                                        <th role="columnheader" className="px-6 py-3">Market Value</th>
                                        <th role="columnheader" className="px-6 py-3">Unrealized Gain/Loss</th>
                                    </tr>
                                </thead>
                                <tbody role="rowgroup">
                                    {rows.map((r, idx) => (
                                        <tr role="row" key={idx} className="border-b border-slate-100 bg-white">
                                            <th role="rowheader" data-mobile-heading className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{r.name}</th>
                                            <td role="cell" data-mobile-label="Quantity" className="px-6 py-4"><div>{r.qty}</div></td>
                                            <td role="cell" data-mobile-label="Cost rate" className="px-6 py-4 tabular-nums"><div>{money(r.cost)}</div></td>
                                            <td role="cell" data-mobile-label="Cost" className="px-6 py-4 tabular-nums"><div>{holdingMoney(r.totalCost)}</div></td>
                                            <td role="cell" data-mobile-label="Market price" className="px-6 py-4 tabular-nums">
                                                <div>
                                                    {r.price == null ? '—' : money(r.price)}
                                                    {r.quoteDate && <time dateTime={r.quoteDate} className="block whitespace-nowrap text-xs text-slate-500">{r.quoteDate}</time>}
                                                </div>
                                            </td>
                                            <td role="cell" data-mobile-label="Market value" className="px-6 py-4 tabular-nums"><div>{holdingMoney(r.marketValue)}</div></td>
                                            <td role="cell" data-mobile-label="Unrealized gain/loss" className={`px-6 py-4 font-semibold tabular-nums ${r.gainLoss == null ? 'text-slate-400' : r.gainLoss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}><div>{holdingMoney(r.gainLoss)}</div></td>
                                        </tr>
                                    ))}
                                </tbody>
                                {liveQuotes && (
                                    <tfoot role="rowgroup" className="bg-slate-50 font-semibold text-slate-900">
                                        <tr role="row">
                                            <th role="rowheader" data-mobile-heading scope="row" colSpan={3} className="px-6 py-4">Totals</th>
                                            <td role="cell" data-mobile-label="Total cost" className="px-6 py-4 tabular-nums"><div>{holdingMoney(totalCost)}</div></td>
                                            <td role="cell" />
                                            <td role="cell" data-mobile-label="Total market value" className="px-6 py-4 tabular-nums"><div>{holdingMoney(totalMarketValue)}</div></td>
                                            <td role="cell" data-mobile-label="Unrealized gain/loss" className="px-6 py-4 tabular-nums"><div>{holdingMoney(unrealizedGainLoss)}</div></td>
                                        </tr>
                                    </tfoot>
                                )}
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
