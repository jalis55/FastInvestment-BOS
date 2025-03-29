import React, { useState } from 'react';
import api from '../../api';
import Swal from 'sweetalert2';
import BannerTitle from '../../components/BannerTitle';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AccountReceivableDetails = () => {
  const [searchId, setSearchId] = useState('');
  const [fromDt, setFromDt] = useState('');
  const [toDate, setToDate] = useState('');
  const [recvableData, setRecvableData] = useState([]);

  const searchProject = async (e) => {
    e.preventDefault();
    try {
      const response = await api.get(`/api/stock/acc-recvable-details/`, {
        params: {
          project_id: searchId,
          from_dt: fromDt,
          to_dt: toDate
        }

      });

      if (response.data.length === 0) {
        Swal.fire("No Data", "No data found for the given criteria", "warning");
      }

      setRecvableData(response.data);
    } catch (error) {
      console.error("Error fetching data:", error.response?.data || error.message);
      Swal.fire("Error", "Failed to fetch project details", "error");
    }
  };

  const downloadCSV = () => {
    if (recvableData.length === 0) {
      Swal.fire("No Data", "No data available to download", "warning");
      return;
    }

    const csvData = recvableData.map(item => ({
      Instrument: item.trade.instrument.name,
      Sell_Qty: item.trade.qty,
      Unit_Price: item.trade.actual_unit_price,
      Trade_Date: item.trade.trade_date,
      Gain_Loss: item.gain_lose
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "account_receivable_report.csv");
  };

  const handlePDF = (isDownload = true) => {
    if (recvableData.length === 0) {
        Swal.fire("No Data", "No data available to download", "warning");
        return;
    }

    const doc = new jsPDF();

    // Add header
    doc.setFontSize(12);
    doc.text("FAST LOGO", 20, 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor('#99a32f');
    doc.text("FAST INVESTMENT LIMITED", 105, 10, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Report Title: Account receivable report', 20, 18);
    doc.text(`Project Id: ${searchId}`, 20, 22.5);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 200, 22.5, { align: "right" });

    // Prepare table data
    const tableData = recvableData.map(item => [
        item.trade.instrument.name,
        item.trade.qty,
        item.trade.actual_unit_price,
        item.trade.trade_date,
        item.gain_lose
    ]);

    // Use autoTable directly
    autoTable(doc, {
        head: [["Instrument", "Sell Qty", "Unit Price", "Trade Date", "Gain/Loss"]],
        body: tableData,
        startY: 25,
        theme: "grid",
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        headStyles: {
            fontSize: 8,
            fillColor: false,
            textColor: [0, 0, 0]
        },
        styles: {
            lineColor: [0, 0, 0],
            fontSize: 8,
        }
    });

    // Save or preview the PDF
    if (isDownload) {
        doc.save("account_receivable_report.pdf");
    } else {
        window.open(doc.output("bloburl"), "_blank");
    }
};
  return (
    <>
    <BannerTitle title="Account Receivable Details"/>
      <form className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg" onSubmit={searchProject}>
        <div className="space-y-6">
          <div className="form-group">
            <input
              type="search"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search Project"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={fromDt}
                onChange={(e) => setFromDt(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </div>
      </form>
      {recvableData.length > 0 && (
        <div className="mt-6 flex space-x-4 justify-center">
          <button
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            onClick={downloadCSV}
          >
            Download CSV
          </button>
          <button
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={() => handlePDF(true)}
          >
            Download PDF
          </button>
          <button
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => handlePDF(false)}
          >
            Preview
          </button>
        </div>
      )}
    </>
  );
}

export default AccountReceivableDetails;
