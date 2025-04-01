"use client"

import { useState,useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle, Calendar, ChevronDown, Download, Filter } from "lucide-react";
import { format } from "date-fns";
import api from "../../api.js";
import Swal from "sweetalert2";


// Sample transaction data
// const transactionData = [
//   {
//     amount: "1000.00",
//     transaction_type: "deposit",
//     narration: "Deposit of 1000.00 is completed",
//     issued_date: "2025-03-30T10:09:46.264805Z",
//     status: "completed",
//   },
//   {
//     amount: "500.00",
//     transaction_type: "payment",
//     narration: "Payment for project: 44",
//     issued_date: "2025-03-30T10:11:06.192979Z",
//     status: "completed",
//   },
//   {
//     amount: "28.63",
//     transaction_type: "deposit",
//     narration: "Profit bonus 28.63 from Project 44",
//     issued_date: "2025-03-30T10:17:01.160076Z",
//     status: "completed",
//   },
//   {
//     amount: "7.49",
//     transaction_type: "deposit",
//     narration: "Profit bonus 7.49 from Project 44",
//     issued_date: "2025-03-30T10:21:41.548339Z",
//     status: "completed",
//   },
//   {
//     amount: "216.01",
//     transaction_type: "deposit",
//     narration: "Deposit amount 216.01 from Project 44 as project return",
//     issued_date: "2025-03-30T10:24:40.129114Z",
//     status: "completed",
//   },
//   {
//     amount: "1000.00",
//     transaction_type: "deposit",
//     narration: "Deposit of 1000.00 is completed",
//     issued_date: "2025-04-01T05:32:11.344525Z",
//     status: "completed",
//   },
//   {
//     amount: "752.13",
//     transaction_type: "payment",
//     narration: "Payment for project: 58843204",
//     issued_date: "2025-04-01T05:37:14.798565Z",
//     status: "completed",
//   },
//   {
//     amount: "686.55",
//     transaction_type: "deposit",
//     narration: "Profit bonus 686.55 from Project 58843204",
//     issued_date: "2025-04-01T05:49:07.893718Z",
//     status: "completed",
//   },
//   {
//     amount: "848.54",
//     transaction_type: "deposit",
//     narration: "Deposit amount 848.54 from Project 58843204 as project return",
//     issued_date: "2025-04-01T05:50:44.029537Z",
//     status: "completed",
//   },
// ]

 const TransactionHistory=()=> {
  const [filterType, setFilterType] = useState("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [transactionData,setTranstionData]=useState([]);


  //Get transtion details
  useEffect(() => {
    const fetchData = async () => {
        try {

            const response = await api.get(`/api/acc/user/transaction-details/`);
            setTranstionData(response.data);

        } catch (error) {
            console.error("Error fetching project data:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
        }
    };
  
    fetchData();
  }, []);
  // Calculate summary statistics
  const totalDeposits = transactionData
    .filter((t) => t.transaction_type === "deposit")
    .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)

  const totalPayments = transactionData
    .filter((t) => t.transaction_type === "payment")
    .reduce((sum, t) => sum + Number.parseFloat(t.amount), 0)

  const balance = totalDeposits - totalPayments

  // Filter transactions based on selected type
  const filteredTransactions =
    filterType === "all" ? transactionData : transactionData.filter((t) => t.transaction_type === filterType)

  // Sort transactions by date (newest first)
  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(b.issued_date).getTime() - new Date(a.issued_date).getTime(),
  )

  const handleFilterChange = (type) => {
    setFilterType(type)
    setIsDropdownOpen(false)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Transaction History</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="pb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Deposits</h3>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold text-emerald-600">${totalDeposits.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="pb-2">
            <h3 className="text-sm font-medium text-gray-500">Total Withdraw</h3>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold text-rose-600">${totalPayments.toFixed(2)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="pb-2">
            <h3 className="text-sm font-medium text-gray-500">Current Balance</h3>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-2 relative">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Filter:</span>

          {/* Custom dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between w-[180px] px-3 py-2 text-sm bg-white border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filterType === "all" ? "All Transactions" : filterType === "deposit" ? "Deposits Only" : "Payments Only"}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                <ul className="py-1">
                  <li
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${filterType === "all" ? "bg-gray-100" : ""}`}
                    onClick={() => handleFilterChange("all")}
                  >
                    All Transactions
                  </li>
                  <li
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${filterType === "deposit" ? "bg-gray-100" : ""}`}
                    onClick={() => handleFilterChange("deposit")}
                  >
                    Deposits Only
                  </li>
                  <li
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${filterType === "payment" ? "bg-gray-100" : ""}`}
                    onClick={() => handleFilterChange("payment")}
                  >
                    Withdraw Only
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        {sortedTransactions.map((transaction, index) => (
          <div key={index} className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="p-4 md:p-6 flex items-center gap-4 flex-1">
                <div
                  className={`rounded-full p-2 ${
                    transaction.transaction_type === "deposit"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {transaction.transaction_type === "deposit" ? (
                    <ArrowDownCircle className="h-6 w-6" />
                  ) : (
                    <ArrowUpCircle className="h-6 w-6" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="font-medium">{transaction.narration}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(transaction.issued_date), "MMM d, yyyy • h:mm a")}
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full border capitalize">
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 md:p-6 md:border-l text-right ${
                  transaction.transaction_type === "deposit" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                <div className="text-lg font-bold">
                  {transaction.transaction_type === "deposit" ? "+" : "-"}${transaction.amount}
                </div>
                <div className="text-xs text-gray-500 uppercase mt-1">{transaction.transaction_type=='payment'?'withdraw':'deposit'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination (simplified) */}
      <div className="mt-8 flex justify-center">
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
          Load More <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
};

export default TransactionHistory;

