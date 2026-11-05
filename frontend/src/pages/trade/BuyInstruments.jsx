import { ProjectSearch } from '@/components/ui/project-search';
import { getApiError } from '@/api/errors';
import { useApiQuery } from '@/hooks/use-api-query';
import { QueryState } from '@/components/ui/query-state';
import { useState } from "react";
import BannerTitle from "@/components/BannerTitle.jsx";
import ButtonSpinner from "@/components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";
import { checkProjectStatus } from "../../utils/checkProjectStatus.js";

const COMMISSION_RATE = 0.004;
const MINIMUM_COMMISSION = 10;

const BuyInstruments = () => {
    const [searchId, setSearchId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [availableBalance, setAvailableBalance] = useState(0);
    const instrumentsQuery = useApiQuery('/api/stock/instruments/', { enabled: !!projectId && availableBalance > 0, staleTime: 300000 });
    const instruments = instrumentsQuery.data;
    const [selectedInstrument, setSelectedInstrument] = useState('');
    const [qty, setQty] = useState('');
    const [unitPrice, setUnitPrice] = useState('');

    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    // Fetch Project Balance
    const searchProject = async (e) => {
        e.preventDefault();
        if (searching || loading) return;

        if (!searchId.trim()) {
            Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter a project ID!' });
            return;
        }

        setSearching(true);
        setProjectId('');
        setSelectedInstrument('');
        setQty('');
        setUnitPrice('');
        setAvailableBalance(0);
        try {
            const isActive = await checkProjectStatus(searchId);
            if (!isActive) return;

            const response = await API.get(`/api/stock/project/balance/details/${searchId}/`);
            setProjectId(response.data.project_id);
            const availableBal = parseFloat(response.data.available_balance);
            setAvailableBalance(availableBal);

            if (availableBal <= 0) {
                Swal.fire({ icon: 'error', title: 'Insufficient Balance', text: "You don't have enough balance to buy." });
            }
        } catch (error) {
            console.error("Error fetching project data:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: getApiError(error) });
            setProjectId('');
            setAvailableBalance(0);
        } finally {
            setSearching(false);
        }
    };
    const parsedQty = Number.parseInt(qty, 10) || 0;
    const parsedUnitPrice = Number.parseFloat(unitPrice) || 0;
    const subtotal = parsedQty * parsedUnitPrice;
    const calculatedCommission = subtotal * COMMISSION_RATE;
    const totalCommission = subtotal > 0 ? Math.max(calculatedCommission, MINIMUM_COMMISSION) : 0;
    const totalCost = subtotal + totalCommission;

    // Validate inputs
    const validateInputs = () => {
        if (loading || instrumentsQuery.loading || instrumentsQuery.error) return false;
        if (!selectedInstrument) {
            Swal.fire({ icon: 'warning', title: 'Selection Required', text: 'Please select an instrument.' });
            return false;
        }

        if (isNaN(parsedQty) || parsedQty <= 0) {
            Swal.fire({ icon: 'warning', title: 'Invalid Quantity', text: 'Quantity must be a positive number.' });
            return false;
        }

        if (isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
            Swal.fire({ icon: 'warning', title: 'Invalid Unit Price', text: 'Unit Price must be a positive number.' });
            return false;
        }

        if (totalCost > availableBalance) {
            Swal.fire({ icon: 'error', title: 'Insufficient Funds', text: 'Your balance is not enough to complete this purchase.' });
            return false;
        }

        return true;
    };

    // Handle Instrument Purchase Submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateInputs()) {
            return;
        }


        setLoading(true);

        const tradeData = {
            project: projectId,
            instrument: selectedInstrument,
            qty: parseInt(qty),
            unit_price: parseFloat(unitPrice),
            trns_type: 'buy',

        };

        try {
            await API.post('/api/stock/create/trade/', tradeData);

            setAvailableBalance((prevBalance) => prevBalance - totalCost);
       
            Swal.fire({ icon: 'success', title: 'Success', text: 'Instrument purchase successful!' });

            // Reset Form
            setSelectedInstrument('');
            setQty('');
            setUnitPrice('');

            document.getElementById('instDropdown').value = '';
        } catch (error) {
            console.error("Error purchasing instrument:", error);
            Swal.fire({ icon: 'error', title: 'Purchase Failed', text: getApiError(error) });
        } finally {
            setLoading(false);
        }
    };



    return (
        <div>
            <BannerTitle title="Buy Instrument" />
            {projectId && <QueryState loading={instrumentsQuery.loading} error={instrumentsQuery.error} onRetry={instrumentsQuery.refetch}><span /></QueryState>}

            {/* Search Form */}
            <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)} onSubmit={searchProject} loading={searching || loading} />
            {projectId && availableBalance>0 &&
                <>

                    <form className="page-card max-w-2xl mx-auto space-y-6" onSubmit={handleSubmit}>
                        <div className="border p-4 flex justify-between items-center mb-4">
                            <h6 className="text-sm font-medium text-gray-900 dark:text-white">Project Id: {projectId}</h6>
                            <h6 className="text-sm font-medium text-gray-900 dark:text-white">Balance: {availableBalance.toFixed(2)} BDT</h6>
                        </div>
                        {/* Instrument Dropdown */}
                        <div className="mb-4">
                            <label htmlFor="instDropdown" className="field-label">Select Instrument</label>
                            <select
                                id="instDropdown"
                                value={selectedInstrument}
                                onChange={(e) => setSelectedInstrument(e.target.value)}
                                className="field-select"
                            >
                                <option>Select Instrument</option>
                                {instruments.map((instrument) => (
                                    <option key={instrument.id} value={instrument.id}>
                                        {instrument.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Quantity Input */}
                        <div className="mb-4">
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

                        {/* Unit Price Input */}
                        <div className="mb-4">
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
                        <div className="mb-4">
                            <label htmlFor="comm" className="field-label">Commission</label>
                            <input
                                type="number"
                                id="comm"
                                value={totalCommission.toFixed(2)}

                                min="0"
                                step="0.01"
                                aria-describedby="commission-helper"
                                className="field-input"
                                readOnly={true}
                            />
                            <p id="commission-helper" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Commission is 0.4% of trade value with a minimum of 10.00 BDT.
                            </p>
                        </div>

                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                            Total payable: {subtotal.toFixed(2)} + {totalCommission.toFixed(2)} = <span className="font-semibold">{totalCost.toFixed(2)} BDT</span>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                className="primary-button"
                                disabled={loading}
                            >
                                {loading ? <ButtonSpinner /> : 'Submit'}
                            </button>
                        </div>
                    </form>
                </>}
            {/* Instrument Selection Form */}

        </div>
    )
}

export default BuyInstruments;
