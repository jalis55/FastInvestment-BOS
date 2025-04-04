import { React, useEffect, useState } from 'react'
import api from "../../api.js";
import BannerTitle from '../../components/BannerTitle.jsx';

const InvestmentHistory = () => {

  const [investmentData, setInvestmentData] = useState([]);
  useEffect(() => {
    const fetchInvestmentData = async () => {
      try {
        const response = await api.get("/api/stock/investor/investment-details/");
        setInvestmentData(response.data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };

    fetchInvestmentData();
  }, []);

    // Format date to be more readable
    const formatDate = (dateString) => {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    }

  // Format amount as currency
  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculate total amount
  const totalAmount = investmentData.reduce((sum, investment) => {
    return sum + Number.parseFloat(investment.amount)
  }, 0)
  return (
    <div className="overflow-x-auto">
      <BannerTitle title="Investment History" />
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Project ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date & Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {investmentData.map((transaction, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.project}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatAmount(transaction.amount)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(transaction.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t border-gray-200">
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Total</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{formatAmount(totalAmount)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{investmentData.length} transactions</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default InvestmentHistory
