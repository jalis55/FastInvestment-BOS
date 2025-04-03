"use client"
import { useState, useEffect } from "react";
import BannerTitle from "../../components/BannerTitle";
import api from "../../api.js";

export default function TradeDetailsPage() {
  const [trades, setTrades] = useState([])
  const [filteredTrades, setFilteredTrades] = useState([])
  const [selectedProject, setSelectedProject] = useState("all")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedInstrument, setSelectedInstrument] = useState("all")
  const [sortConfig, setSortConfig] = useState({ key: "trade_date", direction: "desc" })

  useEffect(() => {
    // In a real app, this would be a fetch call to an API
    
    const getTradeData=async ()=>{
      const response = await api.get(`api/stock/trade/details/`);
      setTrades(response.data)
      setFilteredTrades(response.data);
    }
    getTradeData();

  }, [])

  useEffect(() => {
    let result = [...trades]

    // Filter by project
    if (selectedProject !== "all") {
      result = result.filter((trade) => trade.project === selectedProject)
    }

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

    setFilteredTrades(result)
  }, [trades, selectedProject, selectedType, selectedInstrument, sortConfig])

  const getUniqueProjects = () => {
    return [...new Set(trades.map((trade) => trade.project))]
  }

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
      currency: "USD",
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

  return (
    <div className="min-h-screen bg-gray-50">
      <BannerTitle titile="Trade Details" />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Total Buy Value</h2>
            <p className="text-3xl font-bold text-teal-600">{totals.buy}</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Total Sell Value</h2>
            <p className="text-3xl font-bold text-rose-600">{totals.sell}</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Net Position</h2>
            <p
              className={`text-3xl font-bold ${Number.parseFloat(totals.net.replace(/[^0-9.-]+/g, "")) >= 0 ? "text-teal-600" : "text-rose-600"}`}
            >
              {totals.net}
            </p>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                id="project-filter"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="all">All Projects</option>
                {getUniqueProjects().map((project) => (
                  <option key={project} value={project}>
                    {project}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                id="type-filter"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>

            <div>
              <label htmlFor="instrument-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Instrument
              </label>
              <select
                id="instrument-filter"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
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
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("project")}
                  >
                    Project {getSortIndicator("project")}
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
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trade.trade_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.project}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trade.instrument.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          trade.trns_type === "buy" ? "bg-teal-100 text-teal-800" : "bg-rose-100 text-rose-800"
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
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{filteredTrades.length}</span> trades
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

