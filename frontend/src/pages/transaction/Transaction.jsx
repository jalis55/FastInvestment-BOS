import { useApiQuery } from '@/hooks/use-api-query';
import { QueryState } from '@/components/ui/query-state';
import { getApiError } from '@/api/errors';
import { useState } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";

const Transaction = () => {

    const { data: users, loading: usersLoading, error: usersError, refetch: retryUsers } = useApiQuery('/api/admin/customers/');
    const [selectedUser, setSelectedUser] = useState('');
    const [amount, setAmount] = useState('');
    const [transactionType, setTransactionType] = useState('');
    const [transMode, setTransMode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const balanceQuery = useApiQuery(selectedUser && transactionType === 'payment' ? `/api/acc/user/${selectedUser}/balance/` : null, { staleTime: 0 });
    const availableWithdrawBal = balanceQuery.error || balanceQuery.loading || balanceQuery.refreshing ? 0 : Number(balanceQuery.data.balance || 0);

    const handleTransactionType = (type) => setTransactionType(type);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;
        setStatusMessage('');
        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || !transactionType || !transMode) {
            setStatusMessage('Choose a transaction type and mode, and enter a valid positive amount.');
            return;
        }
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

        // Check if the amount is less than 1000
        if (transactionType === 'payment' && amount > availableWithdrawBal) {
            await Swal.fire({
                title: 'Invalid Amount',
                text: 'Available Balance Exceeds',
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
            try {
                setLoading(true);
                await API.post('/api/acc/user/create-transaction/', transactionData);
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
                


            } catch (error) {
                setStatusMessage('Failed to create transaction');
                Swal.fire({
                    title: 'Error!',
                    text: getApiError(error),
                    icon: 'error'
                });
            }
            setLoading(false);
        }
    };

    return (
        <div>
            <BannerTitle title={"Transaction"} />
            <div className="mx-auto max-w-2xl page-card">
                <div className="mb-6">
                    <h2 className="section-heading">Create Transaction</h2>
                    <p className="section-copy">Select a customer, choose the transaction type, and submit the amount.</p>
                </div>
            <QueryState loading={usersLoading} error={usersError} onRetry={retryUsers}><span /></QueryState>
            {selectedUser && transactionType === 'payment' && <QueryState loading={balanceQuery.loading} error={balanceQuery.error} onRetry={balanceQuery.refetch}><span /></QueryState>}
            {statusMessage && <p role="status" className="mb-4 text-sm text-slate-700">{statusMessage}</p>}
            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="mb-2">
                    <label htmlFor="userSelect" className="field-label">Select Customer</label>
                    <select
                        id="userSelect"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="field-select">

                        <option value="">Select Customer</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                ({user.email})--{user.name}
                            </option>
                        ))}
                    </select>
                </div>
                {selectedUser && (
                    <>
                        <div className="mb-2">
                            <label htmlFor="transactionTypeSelect" className="field-label">Select Transaction Type</label>
                            <select
                                id="transactionTypeSelect"
                                value={transactionType}
                                onChange={(e) => handleTransactionType(e.target.value)}
                                className="field-select" >

                                <option value="">Select transaction type</option>
                                <option value="deposit">Deposit</option>
                                <option value="payment">Withdraw</option>

                            </select>
                        </div>
                        {transactionType === 'payment' &&
                            <div className="mb-2">
                                <label htmlFor="amountInput-1" className="field-label">Available Balance</label>
                                <div className="flex">
                                    <span className="inline-flex items-center rounded-s-xl border border-e-0 border-slate-300 bg-slate-200 px-3 text-sm text-slate-700">
                                        {/* Money Icon */}
                                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                                        </svg>
                                    </span>
                                    <input type="text"
                                        id="amountInput-1"
                                        value={availableWithdrawBal}
                                        className="field-input"
                                        disabled />
                                </div>
                            </div>
                        }

                        <div className="mb-2">
                            <label htmlFor="amountInput" className="field-label">Amount</label>
                            <div className="flex">
                                <span className="inline-flex items-center rounded-s-xl border border-e-0 border-slate-300 bg-slate-200 px-3 text-sm text-slate-700">
                                    {/* Money Icon */}
                                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                                    </svg>
                                </span>
                                <input type="text"
                                    id='amountInput'
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="field-input" placeholder="amount" />
                            </div>
                        </div>
                        <div className="mb-2">
                            <label htmlFor="transModeSelect" className="field-label">Select Transaction Mode</label>
                            <select
                                id="transModeSelect"
                                value={transMode}
                                onChange={(e) => setTransMode(e.target.value)}
                                className="field-select" >

                                <option value="">Select transaction mode</option>
                                <option value="cash">Cash</option>
                                <option value="bank">Bank</option>

                            </select>
                        </div>

                        <div className="flex justify-center">
                            <button
                                type="submit"
                                className="primary-button"
                                disabled={loading || usersLoading || !!usersError || balanceQuery.loading || balanceQuery.refreshing || !!balanceQuery.error}
                            >
                                {loading ? <ButtonSpinner /> : 'Submit'}
                            </button>
                        </div>
                    </>
                )}


            </form>
            </div>
        </div>
    )
}

export default Transaction
