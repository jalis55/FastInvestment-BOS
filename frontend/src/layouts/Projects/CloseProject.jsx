import { useState } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import api from "../../api.js";
import Swal from "sweetalert2";
import { checkProjectStatus } from "../../utils/checkProjectStatus.js";
import { parse } from "papaparse";


const CloseProject = () => {

  const [searchId, setSearchId] = useState('');
  const [projectFinDetails, setProjectFinDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  const searchProject = async (e) => {
    e.preventDefault();

    if (!searchId.trim()) {
      Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter a project ID!' });
      return;
    }

    try {
      setLoading(true);

      const isActive = await checkProjectStatus(searchId);
      if (!isActive) return;

      const response = await api.get(`/api/stock/project-balance-details/${searchId}/`);
      setProjectFinDetails(response.data);
    } catch (error) {
      console.error("Error fetching project data:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to fetch project details.'
      });
      setProjectFinDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateClosingBalance = () => {
    if (!projectFinDetails) return 0;
    const { available_balance, total_sell_amount, accrued_profit } = projectFinDetails;
    const closingBal = parseFloat(available_balance) + (parseFloat(total_sell_amount) - parseFloat(accrued_profit));
    return closingBal;
  };
  const calculateGainLose = () => {
    if (!projectFinDetails) return 0;
    const { total_buy_amount, total_sell_amount } = projectFinDetails;
    const gainLose = parseFloat(total_sell_amount) - parseFloat(total_buy_amount);
    return gainLose.toFixed(2);
  }

  const closeProject = async () => {
    try {
      // Check for sellable instruments
      const sellInst = await api.get(
        `/api/stock/sellable-instruments/${projectFinDetails.project_id}/`
      );

      if (sellInst.data.length !== 0) {
        Swal.fire({
          icon: 'info',
          title: 'Saleable Instruments Exist',
          text: 'You must sell all instruments before closing this project',
          confirmButtonText: 'OK'
        });
        return;
      }

      // Check for undisbursed profits
      const profits = await api.get(`/api/stock/project-total-profit/`, {
        params: {
          project_id: projectFinDetails.project_id,
          is_disbursed: 0
        }
      });

      if (profits.data.length !== 0) {
        Swal.fire({
          icon: 'info',
          title: 'Undisbursed Profits',
          text: 'You must disburse all profits before closing this project',
          confirmButtonText: 'OK'
        });
        return;
      }

      // Confirmation dialog
      const result = await Swal.fire({
        title: 'Confirm Project Closure',
        text: `Are you sure you want to permanently close Project ${projectFinDetails.project_id}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, close project',
        cancelButtonText: 'Cancel',
        reverseButtons: true
      });

      if (result.isConfirmed) {
        //prepare api data
        const proData = {
          project_id: projectFinDetails.project_id,
          total_investment: projectFinDetails.total_investment,
          total_buy: projectFinDetails.total_buy_amount,
          total_sell: projectFinDetails.total_sell_amount,
          total_sell_profit: projectFinDetails.accrued_profit,
          gain_or_loss: calculateGainLose(),
          closing_balance: calculateClosingBalance(),
        }

        const investors = await api.get(`/api/stock/investor-contrib-percent/${projectFinDetails.project_id}/`);
        const investorsDetails = investors.data;

        const transactionData = [];
        let closingBal = parseFloat(calculateClosingBalance()).toFixed(2);

        investorsDetails.forEach((investor) => {

          const percentage = parseFloat(investor.contribution_percentage).toFixed(2);

          const amt = ((parseFloat(closingBal) * percentage) / 100);
          transactionData.push(
            {
              user: investor.investor.id,
              amount: amt.toFixed(2),
              transaction_type: "deposit",
              trans_mode: `Project Return:${projectFinDetails.project_id}`,
              narration: `Deposit amount ${amt.toFixed(2)} from Project ${projectFinDetails.project_id} as project return`
            }
          )
          closingBal -= amt;
        });






        await Promise.all([
          api.put('/api/stock/close-project/', proData),
          api.post('/api/acc/user/create-transaction/', transactionData),
        ]);

        // On success
        Swal.fire({
          icon: 'success',
          title: 'Project Closed',
          text: `Project ${projectFinDetails.project_id} has been successfully closed`,
          confirmButtonText: 'OK'
        }).then(() => {
          // Reset form and state after successful closure
          setSearchId('');
          setProjectFinDetails(null);
        });
      }
    } catch (error) {
      console.error('Error closing project:', error);
      Swal.fire({
        icon: 'error',
        title: 'Closure Failed',
        text: error.response?.data?.message || 'Failed to close project',
        confirmButtonText: 'OK'
      });
    }
  };

  return (
    <div>
      <BannerTitle title="Close Project" />
      <form className="max-w-lg mx-auto mb-8" onSubmit={searchProject}>
        <div className="relative">
          <label htmlFor="default-search" className="sr-only">Search</label>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
          </div>
          <input
            type="search"
            id="default-search"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="block w-full p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Search Project"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2.5 bottom-2.5 bg-blue-700 text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50"
          >
            {loading ? <ButtonSpinner /> : 'Search'}
          </button>
        </div>
      </form>

      {projectFinDetails && (
        <>
          <div className="max-w-lg mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800">Project ID: {projectFinDetails.project_id}</h2>
              <div className="mt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Investment:</span>
                  <span className="text-gray-800 font-medium">&#2547; {projectFinDetails.total_investment}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-600">Total Buy Amount:</span>
                  <span className="text-gray-800 font-medium">&#2547; {projectFinDetails.total_buy_amount}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <hr className="my-4 border-t border-gray-300" />
                  <span className="text-gray-600">Available Balance:</span>
                  <span className="text-gray-800 font-medium">&#2547; {projectFinDetails.available_balance}</span>
                </div>



                <div className="flex justify-between mt-2">
                  <span className="text-gray-600">Total Sell Amount:</span>
                  <span className="text-gray-800 font-medium">&#2547; {projectFinDetails.total_sell_amount}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-600">Accrued Profit:</span>
                  <span className="text-gray-800 font-medium">&#2547; {projectFinDetails.accrued_profit}</span>
                </div>

                <hr className="my-4 border-t border-gray-300" />

                <div className="flex justify-between mt-2">
                  <span className="text-gray-600 font-semibold">Closing Balance:</span>
                  <span className="text-gray-800 font-bold">&#2547; {calculateClosingBalance().toFixed(2)}</span>
                </div>
              </div>
            </div>
            <button
              onClick={closeProject}
              className="w-full bg-red-900 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors"
            >
              Close Project
            </button>
          </div>

        </>
      )}
    </div>
  )
}

export default CloseProject;