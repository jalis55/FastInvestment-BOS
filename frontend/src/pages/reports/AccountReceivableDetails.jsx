import React, { useState } from 'react';
import API from '@/api/axios';
import Swal from 'sweetalert2';
import BannerTitle from '../../components/BannerTitle';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProjectPicker } from '@/components/ui/project-search';
import { SurfaceCard } from '@/components/ui/surface-card';
import { Button } from '@/components/ui/button';

const AccountReceivableDetails = () => {
  const [searchId, setSearchId] = useState('');
  const [fromDt, setFromDt] = useState('');
  const [toDate, setToDate] = useState('');
  const [recvableData, setRecvableData] = useState([]);
  const [searching, setSearching] = useState(false);
  const [reportProjectId, setReportProjectId] = useState('');

  const searchProject = async (e) => {
    e.preventDefault();
    setRecvableData([]);
    setSearching(true);
    try {
      const response = await API.get(`/api/stock/acc/recvable/details/`, {
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
      setReportProjectId(searchId.trim());
    } catch (error) {
      console.error("Error fetching data:", error.response?.data || error.message);
      Swal.fire("Error", "Failed to fetch project details", "error");
    } finally {
      setSearching(false);
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
    doc.text(`Project Id: ${reportProjectId}`, 20, 22.5);
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
      <SurfaceCard className="relative z-20 mx-auto max-w-4xl">
      <form onSubmit={searchProject} aria-label="Find account receivables" aria-busy={searching}>
        <div className="space-y-6">
          <ProjectPicker value={searchId} onChange={(e) => { setSearchId(e.target.value); setRecvableData([]); }} disabled={searching} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="accountreceivabledetails-field-2" className="field-label">From Date</label>
              <input id="accountreceivabledetails-field-2"
                type="date"
                className="field-input"
                value={fromDt}
                onChange={(e) => { setFromDt(e.target.value); setRecvableData([]); }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="accountreceivabledetails-field-3" className="field-label">To Date</label>
              <input id="accountreceivabledetails-field-3"
                type="date"
                className="field-input"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setRecvableData([]); }}
              />
            </div>
          </div>

          <Button type="submit" disabled={searching || !searchId.trim()}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>
      </form>
      </SurfaceCard>
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
