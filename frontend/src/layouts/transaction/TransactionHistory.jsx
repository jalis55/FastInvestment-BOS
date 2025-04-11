"use client"

import { useState, useEffect, useMemo } from "react";
import { ArrowDownCircle, ArrowUpCircle, Calendar, ChevronDown, Download, Filter } from "lucide-react";
import { format, parseISO, eachMonthOfInterval, subMonths } from "date-fns";
import api from "../../api.js";
import Swal from "sweetalert2";
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import BannerTitle from "../../components/BannerTitle.jsx";

const TransactionHistory = () => {
  const [filterType, setFilterType] = useState("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filterDate, setFilterDate] = useState(null);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const transactionsPerPage = 10;

  // Fetch all transactions once on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/api/acc/user/transaction-details/`);
        setAllTransactions(response.data || []);
      } catch (error) {
        console.error("Error fetching transaction data:", error);
        Swal.fire({
          icon: 'error',
          title: 'API Error',
          text: error.response?.data?.message || 'Something went wrong.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures this runs only once

  // Calculate available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set();
    allTransactions.forEach(t => {
      if (t?.issued_date) {
        const date = new Date(t.issued_date);
        months.add(format(date, 'yyyy-MM-01'));
      }
    });
    return Array.from(months)
      .map(date => new Date(date))
      .sort((a, b) => b - a);
  }, [allTransactions]);

  // Calculate statistics
  const { totalDeposits, totalPayments, balance, openingBalance } = useMemo(() => {
    let deposits = 0;
    let payments = 0;
    let firstDeposit = 0;

    const depositTransactions = allTransactions
      .filter(t => t?.transaction_type === "deposit")
      .sort((a, b) => new Date(a?.issued_date) - new Date(b?.issued_date));

    if (depositTransactions.length > 0) {
      firstDeposit = parseFloat(depositTransactions[0]?.amount || 0);
    }

    allTransactions.forEach(t => {
      const amount = parseFloat(t?.amount || 0);
      if (t?.transaction_type === "deposit") deposits += amount;
      if (t?.transaction_type === "payment") payments += amount;
    });

    return {
      totalDeposits: deposits,
      totalPayments: payments,
      balance: deposits - payments,
      openingBalance: firstDeposit
    };
  }, [allTransactions]);

  // Filter and paginate transactions
  const displayedTransactions = useMemo(() => {
    let filtered = [...allTransactions];

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(t => t?.transaction_type === filterType);
    }

    // Apply date filter
    if (filterDate) {
      const monthStart = format(filterDate, 'yyyy-MM-01');
      const monthEnd = format(filterDate, 'yyyy-MM-31');
      filtered = filtered.filter(t => {
        const date = t?.issued_date;
        return date >= monthStart && date <= monthEnd;
      });
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b?.issued_date) - new Date(a?.issued_date));

    // Paginate
    const startIndex = (page - 1) * transactionsPerPage;
    return filtered.slice(0, startIndex + transactionsPerPage);
  }, [allTransactions, filterType, filterDate, page]);

  // Check if there are more items to load
  const hasMore = useMemo(() => {
    let filtered = [...allTransactions];

    if (filterType !== "all") {
      filtered = filtered.filter(t => t?.transaction_type === filterType);
    }

    if (filterDate) {
      const monthStart = format(filterDate, 'yyyy-MM-01');
      const monthEnd = format(filterDate, 'yyyy-MM-31');
      filtered = filtered.filter(t => {
        const date = t?.issued_date;
        return date >= monthStart && date <= monthEnd;
      });
    }

    return filtered.length > displayedTransactions.length;
  }, [allTransactions, filterType, filterDate, displayedTransactions.length]);

  const handleFilterChange = (type) => {
    setFilterType(type);
    setIsDropdownOpen(false);
    setPage(1);
  };

  const handleMonthSelect = (date) => {
    setFilterDate(date);
    setIsDateDropdownOpen(false);
    setPage(1);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const clearDateFilter = () => {
    setFilterDate(null);
    setPage(1);
  };

  const downloadCSV = () => {
    if (allTransactions.length === 0) {
      Swal.fire("No Data", "No data available to download", "warning");
      return;
    }

    const csvData = allTransactions.map(item => ({
      "Narration": item.narration,
      "Transaction type": item.transaction_type === 'payment' ? 'withdraw' : 'deposit',
      "Amount": item.amount,
      "Date": item.issued_date
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "Transaction history.csv");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
     <BannerTitle title="Transaction History" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="pb-2">
            <h3 className="text-sm font-medium text-gray-500">Opening Balance</h3>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold text-blue-600">${openingBalance.toFixed(2)}</div>
          </div>
        </div>

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 relative">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filter:</span>

            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between w-[180px] px-3 py-2 text-sm bg-white border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {filterType === "all" ? "All Transactions" : filterType === "deposit" ? "Deposits Only" : "Withdrawals Only"}
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
                      Withdrawals Only
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
  <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
  
  <div className="relative w-full sm:w-auto">
    <button
      onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
      className="flex items-center justify-between w-full min-w-[180px] px-3 py-2 text-sm bg-white border rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
    >
      <span className="truncate">
        {filterDate ? format(filterDate, 'MMM yyyy') : 'All Months'}
      </span>
      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isDateDropdownOpen ? 'transform rotate-180' : ''}`} />
    </button>

    {isDateDropdownOpen && (
      <div className="absolute z-10 left-0 right-0 sm:right-auto w-full sm:w-[180px] mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
        <ul className="py-1">
          <li
            className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${!filterDate ? "bg-gray-100 font-medium" : ""}`}
            onClick={() => {
              clearDateFilter();
              setIsDateDropdownOpen(false);
            }}
          >
            All Months
          </li>
          {availableMonths.map((month, index) => (
            <li
              key={index}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                filterDate && format(filterDate, 'yyyy-MM') === format(month, 'yyyy-MM') 
                  ? "bg-gray-100 font-medium" 
                  : ""
              }`}
              onClick={() => {
                handleMonthSelect(month);
                setIsDateDropdownOpen(false);
              }}
            >
              {format(month, 'MMM yyyy')}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
</div>



        </div>

        <button
          onClick={downloadCSV}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Transactions List */}
      <div className="space-y-4">
        {displayedTransactions.length > 0 ? (
          displayedTransactions.map((transaction, index) => (
            <div key={index} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="p-4 md:p-6 flex items-center gap-4 flex-1">
                  <div
                    className={`rounded-full p-2 ${transaction?.transaction_type === "deposit"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-rose-100 text-rose-600"
                      }`}
                  >
                    {transaction?.transaction_type === "deposit" ? (
                      <ArrowDownCircle className="h-6 w-6" />
                    ) : (
                      <ArrowUpCircle className="h-6 w-6" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-medium">{transaction?.narration}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(transaction?.issued_date), "MMM d, yyyy • h:mm a")}
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full border capitalize">
                        {transaction?.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 md:p-6 md:border-l text-right ${transaction?.transaction_type === "deposit" ? "text-emerald-600" : "text-rose-600"
                    }`}
                >
                  <div className="text-lg font-bold">
                    {transaction?.transaction_type === "deposit" ? "+" : "-"}${transaction?.amount}
                  </div>
                  <div className="text-xs text-gray-500 uppercase mt-1">
                    {transaction?.transaction_type === 'payment' ? 'withdraw' : 'deposit'}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
            <p className="text-gray-500">No transactions found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {hasMore && displayedTransactions.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Loading...' : 'Load More'} <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;