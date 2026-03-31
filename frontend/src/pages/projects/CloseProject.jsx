import { useState } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";
import { checkProjectStatus } from "../../utils/checkProjectStatus.js";
import { SearchBar } from "@/components/ui/search-bar";


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

      const response = await API.get(`/api/stock/project/balance/details/${searchId}/`);
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
      const sellInst = await API.get(
        `/api/stock/sellable/instruments/${projectFinDetails.project_id}/`
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
      const profits = await API.get(`/api/stock/project/total/profit/`, {
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
          project_id:projectFinDetails.project_id,
          total_investment: projectFinDetails.total_investment,
          total_buy: projectFinDetails.total_buy_amount,
          total_sell: projectFinDetails.total_sell_amount,
          total_sell_profit: projectFinDetails.accrued_profit,
          closing_balance: projectFinDetails.available_balance,
        }
        // console.log(projectFinDetails.available_balance)

          await API.patch(`/api/stock/close/project/${projectFinDetails.project_id}/`, proData)
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
      <div className="mx-auto mb-8 max-w-3xl page-card">
      <form className="max-w-lg" onSubmit={searchProject}>
        <SearchBar
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Search Project"
            aria-label="Search project"
            required
            action={
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <ButtonSpinner /> : 'Search'}
              </button>
            }
          />
      </form>
      </div>

      {projectFinDetails && (
          <div className="mx-auto max-w-3xl page-card">
            <div className="px-2">
              <h2 className="section-heading">Project ID: {projectFinDetails.project_id}</h2>
              <div className="mt-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Investment:</span>
                  <span className="font-medium text-slate-900">&#2547; {projectFinDetails.total_investment}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-slate-600">Total Buy Amount:</span>
                  <span className="font-medium text-slate-900">&#2547; {projectFinDetails.total_buy_amount}</span>
                </div>


                <div className="flex justify-between mt-2">
                  <span className="text-slate-600">Total Sell Amount:</span>
                  <span className="font-medium text-slate-900">&#2547; {projectFinDetails.total_sell_amount}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-slate-600">Accrued Profit:</span>
                  <span className="font-medium text-slate-900">&#2547; {projectFinDetails.accrued_profit}</span>
                </div>

                <hr className="my-4 border-t border-slate-200" />

                <div className="flex justify-between mt-2">
                  <span className="font-semibold text-slate-700">Closing Balance:</span>
                  <span className="font-bold text-slate-900">&#2547; {projectFinDetails.available_balance}</span>
                </div>
              </div>
            </div>
            <button
              onClick={closeProject}
              className="danger-button mt-6"
            >
              Close Project
            </button>
          </div>
      )}
    </div>
  )
}

export default CloseProject;
