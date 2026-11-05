import { ProjectSearch } from '@/components/ui/project-search';
import { getApiError } from '@/api/errors';
import { useState, useCallback } from "react";
import BannerTitle from "@/components/BannerTitle.jsx";
import ButtonSpinner from "@/components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";

import { checkProjectStatus } from '@/utils/checkProjectStatus';

const COMMISSION_RATE = 0.004;
const MINIMUM_COMMISSION = 10;

const SellInstruments = () => {
  const [searchId, setSearchId] = useState('');
  const [instruments, setInstruments] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Search for project and fetch instruments
  const searchProject = async (e) => {
    e.preventDefault();
    if (searching || loading) return;
    if (!searchId.trim()) {
      Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter a project ID!' });
      return;
    }
    setSearching(true);
    setProjectId('');
    setSelectedInstrument(null);
    setQty('');
    setUnitPrice('');
    setInstruments([]);
    try {
      const isActive = await checkProjectStatus(searchId);
      if (!isActive) return;
      const response = await API.get(`/api/stock/sellable/instruments/${searchId}/`);

      if (response.data.length === 0) {
        Swal.fire({ icon: 'info', title: 'No Saleable Instrument', text: 'No available instruments for this project.' });
        return;
      }
      setInstruments(response.data);
      setProjectId(searchId);
      setSelectedInstrument(null);
    } catch (error) {
      console.error("Error fetching project data:", error);
      Swal.fire({
        icon: 'error',
        title: 'API Error',
        text: getApiError(error)
      });
    } finally {
      setSearching(false);
    }
  };

  const parsedQty = Number.parseInt(qty, 10) || 0;
  const parsedUnitPrice = Number.parseFloat(unitPrice) || 0;
  const grossAmount = parsedQty * parsedUnitPrice;
  const calculatedCommission = grossAmount * COMMISSION_RATE;
  const totalCommission = grossAmount > 0 ? Math.max(calculatedCommission, MINIMUM_COMMISSION) : 0;
  const netReceivable = grossAmount - totalCommission;

  // Handle instrument selection
  const handleInstrumentChange = useCallback((e) => {
    const instrumentId = parseInt(e.target.value, 10);
    const instrument = instruments.find(inst => inst.instrument.id === instrumentId);
    setSelectedInstrument(instrument || null);
    setQty('');
    setUnitPrice('');
  }, [instruments]);

  // Validation check
  const validateInputs = () => {
    if (!selectedInstrument) {
      Swal.fire({ icon: 'warning', title: 'Selection Required', text: 'Please select an instrument.' });
      return false;
    }
    if (!qty || isNaN(qty) || qty <= 0 || qty > selectedInstrument.available_quantity) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Quantity',
        text: `Enter a valid quantity (1-${selectedInstrument.available_quantity}).`
      });
      return false;
    }
    if (!unitPrice || isNaN(unitPrice) || unitPrice <= 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid Price', text: 'Enter a valid unit price.' });
      return false;
    }
    return true;
  };


  // Handle account receivable logic
  const prepareAccountReceivableData = async (data) => {
    try {
      const { id: trdId, project: proId, qty, unit_price, instrument: instrumentId } = data;
      const sellAmt = qty * unit_price - totalCommission;
      const instrument = instruments.find(inst => inst.instrument.id === instrumentId);

      if (!instrument) {
        throw new Error("Instrument not found in list.");
      }

      const buyAmt = qty * instrument.average_buy_unit_price;

      const gain=sellAmt-buyAmt;

      const gainDetails={
        project:proId,
        trade:trdId,
        gain_lose:gain.toFixed(2)
      }

      return gainDetails;
    } catch (error) {
      console.error("Error in prepareAccountReceivableData:", error);
      throw error;
    }
  };

  // Handle form submission with transaction management
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

    let tradeId = null;

    try {
      // Step 1: Create the trade
      const tradeResponse = await API.post('/api/stock/create/trade/', tradeData);
      tradeId = tradeResponse.data.id;

      // Step 2: Prepare account receivable data
      const data = await prepareAccountReceivableData(tradeResponse.data);
  

      try {
        // Step 3: Add financial advisor commission if applicable
        if (data.gain_lose > 0) {
          await API.post('api/stock/add/profit/', {
            project:data.project,
            trade:data.trade,
            amount:data.gain_lose
          });
        }

        // Step 4: Create account receivable
        await API.post('/api/stock/create/acc/recvable/', data);

        // Success - update UI
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

        // Reset form
        setSelectedInstrument(null);
        setQty('');
        setUnitPrice('');
        document.getElementById('instDropdown').value = '';
      } catch (error) {
        // Rollback trade if subsequent steps fail
        if (tradeId) {
          await API.delete(`/api/stock/delete/trade/${tradeId}/`);
        }
        throw error;
      }
    } catch (error) {
      console.error("Transaction error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Transaction Failed',
        text: getApiError(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BannerTitle title="Sell Instrument" />
      <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)} onSubmit={searchProject} loading={searching || loading} />
      {projectId && instruments.length > 0 && (
        <form className="page-card max-w-2xl mx-auto space-y-6" onSubmit={handleSubmit}>
          <div className="border p-4 flex justify-between items-center mb-4">
            <h6 className="text-sm font-medium text-gray-900 dark:text-white">Project Id: {projectId}</h6>
          </div>

          {/* Instrument Dropdown */}
          <div className="mb-2">
            <label htmlFor="instDropdown" className="field-label">Select Instrument</label>
            <select
              id="instDropdown"
              value={selectedInstrument?.instrument.id || ''}
              onChange={handleInstrumentChange}
              className="field-select"
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
                <label htmlFor="sellinstruments-field-1" className="field-label">Available Quantity</label>
                <input id="sellinstruments-field-1"
                  type="number"
                  value={selectedInstrument.available_quantity}
                  disabled
                  className="field-input"
                />
              </div>

              {/* Quantity Input */}
              <div className="mb-2">
                <label htmlFor="qty" className="field-label">Quantity</label>
                <input
                  type="number"
                  id="qty"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  aria-describedby="quantity-helper"
                  className="field-input"
                  placeholder="Enter Quantity"
                />
              </div>

              <div className="mb-2">
                <label htmlFor="unit-price" className="field-label">Unit Price</label>
                <input
                  type="number"
                  id="unit-price"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  min="0.01"
                  step="0.01"
                  aria-describedby="unit-price-helper"
                  className="field-input"
                  placeholder="Enter Unit Price"
                />
              </div>

              {/* Commission Input */}
              <div className="mb-2">
                <label htmlFor="comm" className="field-label">Commission</label>
                <input
                  type="number"
                  id="comm"
                  value={totalCommission.toFixed(2)}
                  min="0"
                  step="0.01"
                  aria-describedby="commission-helper"
                  className="field-input"
                  placeholder="Enter Commission Amount"
                  readOnly={true}
                />
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                Net receivable: {grossAmount.toFixed(2)} - {totalCommission.toFixed(2)} = <span className="font-semibold">{netReceivable.toFixed(2)} BDT</span>
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="primary-button"
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
