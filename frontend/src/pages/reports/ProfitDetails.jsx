import { useState, useMemo,useEffect } from "react";
import { ArrowUpDown, DollarSign, PieChart, TrendingUp } from "lucide-react";
import API from "@/api/axios.js";
import BannerTitle from "../../components/BannerTitle.jsx";

const ProfitDetails = () => {

      const [sortField, setSortField] = useState(null)
      const [sortDirection, setSortDirection] = useState("asc")
      const [selectedProject, setSelectedProject] = useState("all")
      const [profitData,setProfitData]=useState([]);
    
        useEffect(() => {
            const fetchProfitData = async () => {
                try {
                    const response = await API.get('api/stock/investor/profit-details/');
                    console.log(response.data);
                    setProfitData(response.data);
                } catch (error) {
                    console.error("Error fetching profit data:", error);
                }
            }
            fetchProfitData();
        },[])
      // Calculate summary data
      const summaryData = useMemo(() => {
        let totalContribution = 0
        let totalProfit = 0
        const projectCount = new Set()
    
        profitData.forEach((item) => {
          totalContribution += Number.parseFloat(item.contribute_amount)
          totalProfit += Number.parseFloat(item.profit_amount)
          projectCount.add(item.project)
        })
    
        return {
          totalContribution: totalContribution.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          projectCount: projectCount.size,
          roi: ((totalProfit / totalContribution) * 100).toFixed(2),
        }
      }, [profitData])
    
      // Get unique projects for filter
      const projects = useMemo(() => {
        return ["all", ...new Set(profitData.map((item) => item.project))]
      }, [profitData])
    
      // Sort and filter data
      const sortedData = useMemo(() => {
        let filteredData = [...profitData]
    
        if (selectedProject !== "all") {
          filteredData = filteredData.filter((item) => item.project === selectedProject)
        }
    
        if (sortField) {
          filteredData.sort((a, b) => {
            const aValue = Number.parseFloat(a[sortField]) || a[sortField]
            const bValue = Number.parseFloat(b[sortField]) || b[sortField]
    
            if (sortDirection === "asc") {
              return aValue > bValue ? 1 : -1
            } else {
              return aValue < bValue ? 1 : -1
            }
          })
        }
    
        return filteredData
      }, [profitData, sortField, sortDirection, selectedProject])
    
      const handleSort = (field) => {
        if (sortField === field) {
          setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
          setSortField(field)
          setSortDirection("asc")
        }
      }
  return (
<div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BannerTitle title="Profit Details" />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Profit</p>
                <p className="text-2xl font-semibold text-gray-900">${summaryData.totalProfit}</p>
              </div>
            </div>
          </div>


          <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                <PieChart className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Projects</p>
                <p className="text-2xl font-semibold text-gray-900">{summaryData.projectCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Investment Records</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="project-filter" className="text-sm font-medium text-gray-700">
              Filter by Project:
            </label>
            <select
              id="project-filter"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            >
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project === "all" ? "All Projects" : `Project ${project}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("project")}
                  >
                    <div className="flex items-center">
                      Project ID
                      {sortField === "project" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("trade")}
                  >
                    <div className="flex items-center">
                      Trade ID
                      {sortField === "trade" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("contribute_amount")}
                  >
                    <div className="flex items-center">
                      Contribution
                      {sortField === "contribute_amount" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("percentage")}
                  >
                    <div className="flex items-center">
                      Percentage
                      {sortField === "percentage" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("profit_amount")}
                  >
                    <div className="flex items-center">
                      Profit
                      {sortField === "profit_amount" && <ArrowUpDown className="ml-1 h-4 w-4" />}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((item, index) => (
                  <tr key={item.trade} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.project}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="truncate max-w-[120px] inline-block" title={item.trade}>
                        {item.trade.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${Number.parseFloat(item.contribute_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.percentage}%</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      ${Number.parseFloat(item.profit_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Showing {sortedData.length} of {profitData.length} investment records
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProfitDetails;
