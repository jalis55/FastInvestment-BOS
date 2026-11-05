import { useApiQuery } from '@/hooks/use-api-query';
import { QueryState } from '@/components/ui/query-state';
import { useState, useMemo } from "react";
import BannerTitle from "../../components/BannerTitle";
import { ProjectSearch } from '@/components/ui/project-search';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Search } from 'lucide-react';

export default function TradeDetailsPage() {
  const [projectId, setProjectId] = useState("")
  const [searchedProject, setSearchedProject] = useState("")
  const url = searchedProject ? `/api/stock/trade/details/?project_id=${encodeURIComponent(searchedProject)}` : null;
  const { data: trades, loading, error, refetch } = useApiQuery(url, { enabled: Boolean(searchedProject) });
  const [selectedType, setSelectedType] = useState("all")
  const [selectedInstrument, setSelectedInstrument] = useState("all")
  const [sortConfig, setSortConfig] = useState({ key: "trade_date", direction: "desc" })

  const filteredTrades = useMemo(() => {
    let result = [...trades]

    // Filter by transaction type
    if (selectedType !== "all") {
      result = result.filter((trade) => trade.trns_type === selectedType)
    }

    // Filter by instrument
    if (selectedInstrument !== "all") {
      result = result.filter((trade) => trade.instrument.name === selectedInstrument)
    }

    // Sort the data
    result.sort((a, b) => {
      if (sortConfig.key === "trade_date") {
        return sortConfig.direction === "asc"
          ? new Date(a.trade_date) - new Date(b.trade_date)
          : new Date(b.trade_date) - new Date(a.trade_date)
      }

      if (
        sortConfig.key === "qty" ||
        sortConfig.key === "unit_price" ||
        sortConfig.key === "total_commission" ||
        sortConfig.key === "actual_unit_price"
      ) {
        return sortConfig.direction === "asc"
          ? Number.parseFloat(a[sortConfig.key]) - Number.parseFloat(b[sortConfig.key])
          : Number.parseFloat(b[sortConfig.key]) - Number.parseFloat(a[sortConfig.key])
      }

      return sortConfig.direction === "asc"
        ? a[sortConfig.key].localeCompare(b[sortConfig.key])
        : b[sortConfig.key].localeCompare(a[sortConfig.key])
    })

    return result
  }, [trades, selectedType, selectedInstrument, sortConfig])

  const getUniqueInstruments = () => {
    return [...new Set(trades.map((trade) => trade.instrument.name))]
  }

  const handleSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null
    return sortConfig.direction === "asc" ? "↑" : "↓"
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const calculateTotalValue = (qty, price) => {
    return formatCurrency(qty * Number.parseFloat(price))
  }

  const getTotalsByType = () => {
    const buyTotal = filteredTrades
      .filter((trade) => trade.trns_type === "buy")
      .reduce((sum, trade) => sum + trade.qty * Number.parseFloat(trade.actual_unit_price), 0)

    const sellTotal = filteredTrades
      .filter((trade) => trade.trns_type === "sell")
      .reduce((sum, trade) => sum + trade.qty * Number.parseFloat(trade.actual_unit_price), 0)

    return {
      buy: formatCurrency(buyTotal),
      sell: formatCurrency(sellTotal),
      net: formatCurrency(sellTotal - buyTotal),
    }
  }

  const totals = getTotalsByType()

  const searchProject = (event) => {
    event.preventDefault();
    const id = projectId.trim();
    if (!id) return;
    setSelectedType('all');
    setSelectedInstrument('all');
    if (id === searchedProject) refetch();
    else setSearchedProject(id);
  }

  const changeProject = (event) => {
    setProjectId(event.target.value);
    setSearchedProject('');
    setSelectedType('all');
    setSelectedInstrument('all');
  }

  return (
    <div>
      <BannerTitle title="Trade Details" description="Search a project to review its trades, values, and instruments." />
      <ProjectSearch value={projectId} onChange={changeProject} onSubmit={searchProject} loading={loading} />

      {!searchedProject && <SurfaceCard className="mx-auto max-w-3xl py-14 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Search size={22} aria-hidden="true" /></span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Find a project to view its trades</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Enter a project ID or choose one from the list, then select Search.</p>
      </SurfaceCard>}

      {searchedProject && <QueryState loading={loading} error={error} onRetry={refetch} empty={!trades.length}
        emptyTitle="No trades found" emptyDescription={`Project ${searchedProject} has no trade records.`}>
        <main className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Project trade report</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Project {searchedProject}</h2></div>
            <p className="text-sm text-slate-500">{trades.length} {trades.length === 1 ? 'trade' : 'trades'} found</p>
          </div>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="metric-card-soft">
            <h2 className="text-sm font-medium text-slate-500 mb-2">Buy value</h2>
            <p className="text-2xl font-bold text-blue-700">{totals.buy}</p>
          </div>

          <div className="metric-card-soft">
            <h2 className="text-sm font-medium text-slate-500 mb-2">Sell value</h2>
            <p className="text-2xl font-bold text-emerald-700">{totals.sell}</p>
          </div>

          <div className="metric-card-soft">
            <h2 className="text-sm font-medium text-slate-500 mb-2">Net trade value</h2>
            <p
              className={`text-2xl font-bold ${Number.parseFloat(totals.net.replace(/[^0-9.-]+/g, "")) >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {totals.net}
            </p>
          </div>
        </div>
        {/* Filters */}
          <div className="page-card-tight">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Filter trade history</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type-filter" className="field-label">
                Transaction Type
              </label>
              <select
                id="type-filter"
                className="field-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>

            <div>
              <label htmlFor="instrument-filter" className="field-label">
                Instrument
              </label>
              <select
                id="instrument-filter"
                className="field-select"
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
              >
                <option value="all">All Instruments</option>
                {getUniqueInstruments().map((instrument) => (
                  <option key={instrument} value={instrument}>
                    {instrument}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>



        {/* Trades Table */}
        <div className="table-shell overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="font-semibold text-slate-900">Trade history</h3>
            <p className="mt-1 text-sm text-slate-500">Showing {filteredTrades.length} of {trades.length} trades</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[860px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("trade_date")}
                  >
                    Date {getSortIndicator("trade_date")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Instrument
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("trns_type")}
                  >
                    Type {getSortIndicator("trns_type")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("qty")}
                  >
                    Quantity {getSortIndicator("qty")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("unit_price")}
                  >
                    Unit Price {getSortIndicator("unit_price")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("total_commission")}
                  >
                    Commission {getSortIndicator("total_commission")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("actual_unit_price")}
                  >
                    Actual Price {getSortIndicator("actual_unit_price")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trade.trade_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.instrument.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trade.trns_type === "buy" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {trade.trns_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.qty}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trade.unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trade.total_commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trade.actual_unit_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={trade.trns_type === "buy" ? "text-teal-600" : "text-rose-600"}>
                        {calculateTotalValue(trade.qty, trade.actual_unit_price)}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filteredTrades.length && <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">No trades match these filters.</td></tr>}
              </tbody>
            </table>
          </div>

        </div>
      </main></QueryState>}
    </div>
  )
}
