import { useState } from "react";
import BannerTitle from "@/components/BannerTitle.jsx";
import ButtonSpinner from "@/components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";
import { checkProjectStatus } from "../../utils/checkProjectStatus.js";


const BuyInstruments = () => {
    const [searchId, setSearchId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [availableBalance, setAvailableBalance] = useState(0);
    const [instruments, setInstruments] = useState([]);
    const [selectedInstrument, setSelectedInstrument] = useState('');
    const [qty, setQty] = useState('');
    const [unitPrice, setUnitPrice] = useState('');

    const [loading, setLoading] = useState(false);

    // Fetch Project Balance
    const searchProject = async (e) => {
        e.preventDefault();

        if (!searchId.trim()) {
            Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter a project ID!' });
            return;
        }

        try {
            const isActive = await checkProjectStatus(searchId);
            if (!isActive) return;

            const response = await API.get(`/api/stock/project/balance/details/${searchId}/`);
            setProjectId(response.data.project_id);
            const availableBal = parseFloat(response.data.available_balance);
            setAvailableBalance(availableBal);

            if (availableBal > 0 && instruments.length === 0) {
                fetchInstruments();

            } else if (availableBal <= 0) {
                Swal.fire({ icon: 'error', title: 'Insufficient Balance', text: "You don't have enough balance to buy." });
            }
        } catch (error) {
            console.error("Error fetching project data:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
            setInstruments([]);
            setProjectId('');
            setAvailableBalance(0);
        }
    };
    //fetch instruments

    const fetchInstruments = async () => {
        try {
            const response = await API.get(`/api/stock/instruments/`);
            setInstruments(response.data);
        } catch (error) {
            console.error("Error fetching instruments:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load instruments.' });
        }
    };

    const getTotalCom = () => {
        const comm = ((qty * unitPrice * 0.4) / 100).toFixed(2)
        return Number(comm)
    }

    // Validate inputs
    const validateInputs = () => {
        const parsedQty = parseInt(qty);
        const parsedUnitPrice = parseFloat(unitPrice);


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

        const totalCommission = getTotalCom();
        const totalCost = (parsedQty * unitPrice) + totalCommission;

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

            setAvailableBalance((prevBalance) => {
                const totalCommission = getTotalCom();
                const buyAmt = (parseInt(qty) * parseFloat(unitPrice)) + totalCommission;
                return prevBalance - buyAmt;
            });

            Swal.fire({ icon: 'success', title: 'Success', text: 'Instrument purchase successful!' });

            // Reset Form
            setSelectedInstrument('');
            setQty('');
            setUnitPrice('');

            document.getElementById('instDropdown').value = '';
        } catch (error) {
            console.error("Error purchasing instrument:", error);
            Swal.fire({ icon: 'error', title: 'Purchase Failed', text: error.response?.data?.message || 'Transaction failed.' });
        } finally {
            setLoading(false);
        }
    };



    return (
        <div>
            <BannerTitle title="Buy Instrument" />

            {/* Search Form */}
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
            {projectId && availableBalance>0 &&
                <>

                    <form className="max-w-md mx-auto space-y-6" onSubmit={handleSubmit}>
                        <div className="border p-4 flex justify-between items-center mb-4">
                            <h6 className="text-sm font-medium text-gray-900 dark:text-white">Project Id: {projectId}</h6>
                            <h6 className="text-sm font-medium text-gray-900 dark:text-white">Balance: {availableBalance.toFixed(2)} BDT</h6>
                        </div>
                        {/* Instrument Dropdown */}
                        <div className="mb-4">
                            <label htmlFor="countries" className="block text-sm font-medium text-gray-900 dark:text-white">Select Instrument</label>
                            <select
                                id="instDropdown"
                                value={selectedInstrument}
                                onChange={(e) => setSelectedInstrument(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
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

                        {/* Unit Price Input */}
                        <div className="mb-4">
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
                        <div className="mb-4">
                            <label htmlFor="comm" className="block text-sm font-medium text-gray-900 dark:text-white">Commission</label>
                            <input
                                type="number"
                                id="comm"
                                value={((qty * unitPrice * .4) / 100).toFixed(2)}

                                min="0"
                                step="0.01"
                                aria-describedby="commission-helper"
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                readOnly={true}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                className="w-full bg-blue-700 text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
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
