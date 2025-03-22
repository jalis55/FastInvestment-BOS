import { useState, useCallback } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import api from "../../api.js";
import Swal from "sweetalert2";

const SellInstruments = () => {
  const [searchId, setSearchId] = useState('');
  const [instruments, setInstruments] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [loading, setLoading] = useState(false);

  // Search for project and fetch instruments
  const searchProject = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) {
      Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter a project ID!' });
      return;
    }
    try {
      const response = await api.get(`/api/stock/sellable-instruments/${searchId}/`);
      
      if (response.data.length === 0) {
        Swal.fire({ icon: 'info', title: 'No Saleable Instrument', text: 'No available instruments for this project.' });
        return;
      }
      setInstruments(response.data);
      
      setProjectId(searchId);
      setSearchId('');
      setSelectedInstrument(null);
    } catch (error) {
      console.error("Error fetching project data:", error);
      Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
    }
  };

  const getTotalCom = () => {
    return parseFloat((qty * unitPrice * 0.4) / 100).toFixed(2);
  }

  // Handle instrument selection
  const handleInstrumentChange = useCallback((e) => {
    const instrumentId = parseInt(e.target.value, 10);
    const instrument = instruments.find(inst => inst.instrument.id === instrumentId);
    setSelectedInstrument(instrument || null);
    
    setQty('');
    setUnitPrice('');
  }, [instruments]);

  // validation check
  const validateInputs = () => {
    // Validation checks
    if (!selectedInstrument) {
      Swal.fire({ icon: 'warning', title: 'Selection Required', text: 'Please select an instrument.' });
      return;
    }
    if (!qty || isNaN(qty) || qty <= 0 || qty > selectedInstrument.available_quantity) {
      Swal.fire({ icon: 'warning', title: 'Invalid Quantity', text: 'Enter a valid quantity within the available range.' });
      return;
    }
    if (!unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid Price', text: 'Enter a valid unit price.' });
      return;
    }
    return true;
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    const tradeData = {
      project: projectId,
      instrument: selectedInstrument.instrument.id,
      qty: parseInt(qty, 10),
      unit_price: parseFloat(unitPrice),
      trns_type: 'sell'
    };
   

    try {
      // Step 1: Create the trade
      const response = await api.post('/api/stock/create-trade/', tradeData);
     

      // Step 2: Handle account receivable
      await handleAccountReceivable(response.data);

      // If both steps succeed, show success message and update UI
      Swal.fire({ icon: 'success', title: 'Success', text: 'Instrument sold successfully!' });

      // Update instruments list
      setInstruments(prevInstruments =>
        prevInstruments
          .map(inst => inst.instrument.id === selectedInstrument.instrument.id
            ? { ...inst, available_quantity: inst.available_quantity - qty }
            : inst
          )
          .filter(inst => inst.available_quantity > 0)
      );

      // Reset form fields
      setSelectedInstrument(null);
      setQty('');
      setUnitPrice('');

      document.getElementById('instDropdown').value = '';
    } catch (error) {
      console.error("Error in transaction:", error);
      Swal.fire({ icon: 'error', title: 'Transaction Failed', text: error.response?.data?.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle account receivable logic
  const handleAccountReceivable = async (data) => {
    try {
      const { id: trdId, project: proId, qty, unit_price, instrument: instrumentId } = data;
      const totalCommission = getTotalCom();
      const sellAmt = qty * unit_price - totalCommission;
      const instrument = instruments.find(inst => inst.instrument.id === instrumentId);

      if (!instrument) {
        throw new Error("Instrument not found in list.");
      }

      const buyAmt = qty * instrument.average_buy_unit_price;
      const investorContributions = await getInvestorContrib();
      const disbursement = [];

      if (buyAmt < sellAmt) {
        const advisors = await getFinAdvisor();
        const gain = sellAmt - buyAmt;
        let totalAdvisorCommission = 0;

        advisors.forEach(advisor => {
          const commission = (gain * advisor.com_percentage) / 100;
          totalAdvisorCommission += commission;
          disbursement.push({
            project: proId,
            trade: trdId,
            investor: advisor.advisor.id,
            contribute_amount: 0,
            percentage: advisor.com_percentage,
            gain_lose: commission.toFixed(2),
            is_advisor: 1
          });
        });

        let remainingGain = gain - totalAdvisorCommission;
        investorContributions.forEach(investor => {
          const investorShare = (remainingGain * investor.contribution_percentage) / 100;

          disbursement.push({
            project: proId,
            investor: investor.investor,
            trade: trdId,
            contribute_amount: investor.contribute_amount,
            percentage: investor.contribution_percentage,
            gain_lose: investorShare.toFixed(2),
            is_advisor: 0
          });
        });
      } else {
        const loss = sellAmt - buyAmt;
        investorContributions.forEach(investor => {
          const investorShare = (loss * investor.contribution_percentage) / 100;
          
          disbursement.push({
            project: proId,
            investor: investor.investor.toString(),
            trade: trdId,
            contribute_amount: investor.contribute_amount,
            percentage: investor.contribution_percentage,
            gain_lose: investorShare.toFixed(2),
            is_advisor: false
          });
        });
      }

      // Process gain/loss
      await processGainLose(disbursement);
      console.log("Gain/Loss Processed Successfully for all Advisors and Investors");
    } catch (error) {
      console.error("Error in handleAccountReceivable:", error);
      throw error; // Propagate the error to handleSubmit
    }
  };

  // Fetch financial advisors
  const getFinAdvisor = async () => {
    const response = await api.get(`/api/stock/fin-advisor-commission/${projectId}/`);
    return response.data;
  };

  const getInvestorContrib = async () => {
    try {
      const response = await api.get(`/api/stock/investor-contrib-percent/${projectId}/`);
      
      return response.data;
    } catch (error) {
      console.error("Error fetching investor contributions:", error);
    }
  };

  // Process gain/loss
  const processGainLose = async (obj) => {
    
    await api.post('/api/stock/create-acc-recvable/', obj);
  };

  return (
    <div>
      <BannerTitle title="Sell Instrument" />
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
            className="absolute right-2.5 bottom-2.5 bg-blue-700 text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            Search
          </button>
        </div>
      </form>
      {projectId && instruments.length > 0 && (
        <form className="max-w-md mx-auto space-y-6" onSubmit={handleSubmit}>
          <div className="border p-4 flex justify-between items-center mb-4">
            <h6 className="text-sm font-medium text-gray-900 dark:text-white">Project Id: {projectId}</h6>
          </div>

          {/* Instrument Dropdown */}
          <div className="mb-2">
            <label htmlFor="instDropdown" className="block text-sm font-medium text-gray-900 dark:text-white">Select Instrument</label>
            <select
              id="instDropdown"
              value={selectedInstrument?.instrument.id || ''}
              onChange={handleInstrumentChange}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            >
              <option value="">Select Instrument</option>
              {instruments.map((instrument) => (
                <option key={instrument.instrument.id} value={instrument.instrument.id}>
                  {instrument.instrument.name}
                </option>
              ))}
            </select>
          </div>

          {/* Show the remaining fields only if an instrument is selected */}
          {selectedInstrument && (
            <>
              <div className="mb-2">
                <label htmlFor="qty" className="block text-sm font-medium text-gray-900 dark:text-white">Available Quantity</label>
                <input
                  type="number"
                  value={selectedInstrument.available_quantity}
                  disabled
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                />
              </div>

              {/* Quantity Input */}
              <div className="mb-2">
                <label htmlFor="qty" className="block text-sm font-medium text-gray-900 dark:text-white">Quantity</label>
                <input
                  type="number"
                  id="qty"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  aria-describedby="quantity-helper"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Enter Quantity"
                />
              </div>

              <div className="mb-2">
                <label htmlFor="unit-price" className="block text-sm font-medium text-gray-900 dark:text-white">Unit Price</label>
                <input
                  type="number"
                  id="unit-price"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  min="0.01"
                  step="0.01"
                  aria-describedby="unit-price-helper"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Enter Unit Price"
                />
              </div>

              {/* Commission Input */}
              <div className="mb-2">
                <label htmlFor="comm" className="block text-sm font-medium text-gray-900 dark:text-white">Commission</label>
                <input
                  type="number"
                  id="comm"
                  value={((qty * unitPrice * .4) / 100).toFixed(2)}
                  min="0"
                  step="0.01"
                  aria-describedby="commission-helper"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Enter Commission Amount"
                  readOnly={true}
                />
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="w-full bg-blue-700 text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                  disabled={loading}
                >
                  {loading ? <ButtonSpinner /> : 'Submit'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
};

export default SellInstruments;