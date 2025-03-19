import { useState, useEffect } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import api from "../../api.js";
import Swal from "sweetalert2";

const Transaction = () => {

    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [amount, setAmount] = useState('');
    const [transactionType, setTransactionType] = useState('');
    const [transMode, setTransMode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get('/api/admin/customers/')
            .then((response) => setUsers(response.data))
            .catch((error) => console.error('Error fetching users:', error));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Ensure a user is selected
        if (!selectedUser) {
            setStatusMessage('Please select a user.');
            return;
        }

        // Check if the amount is less than 1000
        if (parseFloat(amount) < 1000) {
            await Swal.fire({
                title: 'Invalid Amount',
                text: 'The amount must be at least 1000.',
                icon: 'warning',
                confirmButtonText: 'OK',
            });
            return; // Prevent further execution
        }

        // Show confirmation dialog
        const confirmResult = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to ${transactionType === "deposit" ? "deposit" : "withdraw"} BDT${amount} .`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, proceed!'
        });

        // If confirmed, proceed with the API call
        if (confirmResult.isConfirmed) {
            const transactionData = {
                user: selectedUser,
                amount: parseFloat(amount),
                transaction_type: transactionType,
                trans_mode: transMode,
            };

            api.post('/api/acc/user/create-transaction/', transactionData)
                .then((res) => {
                    setAmount('');
                    setSelectedUser('');
                    setTransMode('');
                    setTransactionType('');
                    setStatusMessage("Transaction Successful");
                    Swal.fire({
                        title: 'Success!',
                        text: 'Transaction has been created successfully.',
                        icon: 'success'
                    });
                })
                .catch((error) => {
                    setStatusMessage('Failed to create transaction');
                    Swal.fire({
                        title: 'Error!',
                        text: 'Failed to create transaction. Please try again.',
                        icon: 'error'
                    });
                });
        }
    };

    return (
        <div>
            <BannerTitle title={"Transaction"} />
            <form className="max-w-md mx-auto space-y-6" onSubmit={handleSubmit}>
                <div className="mb-2">
                    <label htmlFor="instDropdown" className="block text-sm font-medium text-gray-900 dark:text-white">Select Customer</label>
                    <select
                        id="userSelect"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">

                        <option>Select Customer</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                ({user.email})--{user.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mb-2">
                    <label htmlFor="website-admin" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Amount</label>
                    <div className="flex">
                        <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                            {/* Money Icon */}
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                            </svg>
                        </span>
                        <input type="text"
                            id='amountInput'
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="rounded-none rounded-e-lg bg-gray-50 border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="amount" />
                    </div>
                </div>
                <div className="mb-2">
                    <label htmlFor="instDropdown" className="block text-sm font-medium text-gray-900 dark:text-white">Select Instrument</label>
                    <select
                        id="transactionTypeSelect"
                        value={transactionType}
                        onChange={(e) => setTransactionType(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" >

                        <option value="">Select transaction type</option>
                        <option value="deposit">Deposit</option>
                        <option value="payment">Withdraw</option>

                    </select>
                </div>
                <div className="mb-2">
                    <label htmlFor="instDropdown" className="block text-sm font-medium text-gray-900 dark:text-white">Select Instrument</label>
                    <select
                        id="transModeSelect"
                        value={transMode}
                        onChange={(e) => setTransMode(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" >

                        <option value="">Select a transaction mode</option>
                        <option value="cash">Cash</option>
                        <option value="bank">Bank</option>

                    </select>
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

            </form>
        </div>
    )
}

export default Transaction
