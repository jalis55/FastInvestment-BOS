import { useApiQuery } from '@/hooks/use-api-query';
import { QueryState } from '@/components/ui/query-state';
import { getApiError } from '@/api/errors';
import { useState } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";


const FundTransfer = () => {

    const [loading, setLoading] = useState(false);
    const { data: users, loading: usersLoading, error: usersError, refetch: retryUsers } = useApiQuery('/api/admin/customers/');
    const [fromUser, setFromUser] = useState("");
    const balanceQuery = useApiQuery(fromUser ? `/api/acc/user/${fromUser}/balance/` : null, { staleTime: 0 });
    const fromUserBal = balanceQuery.error || balanceQuery.loading || balanceQuery.refreshing ? 0 : Number(balanceQuery.data.balance || 0);
    const [toUser, setToUser] = useState("");
    const [amount, setAmount] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    const getUserName = (userId) => {
        const user = users.find((user) => user.id === Number(userId));
        return user ? user.name : 'Unknown User';
    };

    const handleFromUser = (userId) => { setFromUser(userId); setStatusMessage(''); };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;
        setStatusMessage('');
        if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || fromUser === toUser) {
            setStatusMessage('Select two different users and enter a valid positive amount.');
            return;
        }
        // Check if both users are selected
        if (!fromUser) {
            setStatusMessage('Please select a "From" user.');
            return;
        }
        if (!toUser) {
            setStatusMessage('Please select a "To" user.');
            return;
        }

        // Check if the amount is less than 100
        if (parseFloat(amount) < 100) {
            await Swal.fire({
                title: 'Invalid Amount',
                text: 'The amount must be at least 100.',
                icon: 'warning',
                confirmButtonText: 'OK',
            });
            return; // Prevent further execution
        }
        // Check if the amount is less than available balance
        if (parseFloat(amount) > parseFloat(fromUserBal)) {
            await Swal.fire({
                title: 'Invalid Amount',
                text: 'Available balance exceeds',
                icon: 'warning',
                confirmButtonText: 'OK',
            });
            return; // Prevent further execution
        }

        // Show confirmation dialog
        const confirmResult = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to transfer BDT:${amount} from: ${getUserName(fromUser)} To: ${getUserName(toUser)}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, proceed!'
        });

        // If confirmed, proceed with the API call
        if (confirmResult.isConfirmed) {
            const fundTransferData = {
                transfer_from: fromUser,
                transfer_to: toUser,
                amount: parseFloat(amount),
            };

            try {
                setLoading(true);
                await API.post('/api/acc/user/fund-transfer/', fundTransferData);

                Swal.fire({
                    title: 'Success!',
                    text: 'Transaction has been created successfully.',
                    icon: 'success'
                });

                setFromUser('');
                setToUser('');
                setAmount('');

            } catch (error) {
                setStatusMessage('Failed to create transaction');
                Swal.fire({
                    title: 'Error!',
                    text: getApiError(error),
                    icon: 'error'
                });

            } finally {
                setLoading(false);
            }
        }
    };
    return (
        <div>
            <BannerTitle title={"Fund Transfer"} />
            <QueryState loading={usersLoading} error={usersError} onRetry={retryUsers}><span /></QueryState>
            {fromUser && <QueryState loading={balanceQuery.loading} error={balanceQuery.error} onRetry={balanceQuery.refetch}><span /></QueryState>}
            {statusMessage && <p role="status" className="mb-4 text-sm text-slate-700">{statusMessage}</p>}
            <form className="page-card max-w-2xl mx-auto space-y-6" onSubmit={handleSubmit}>

                <div className="mb-2">
                    <label htmlFor="from-user" className="field-label">From</label>
                    <select
                        id="from-user"
                        value={fromUser}
                        onChange={(e) => handleFromUser(e.target.value)}
                        className="field-select">

                        <option value="">Select User</option>
                        {users
                            .filter((user) => user.id !== Number(toUser))
                            .map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                    </select>
                </div>
                {fromUser && fromUserBal>0 ? (
                    <div className="mb-2">
                        <label htmlFor="amountInput" className="field-label">Balance</label>
                        <div className="flex">
                            <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                                {/* Money Icon */}
                                <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm1 17.93V20h-2v-1.07c-1.163-.14-2.227-.56-3.07-1.2l1.07-1.6c.69.49 1.5.8 2.35.8 1.66 0 3-1.34 3-3s-1.34-3-3-3c-.85 0-1.66.31-2.35.8l-1.07-1.6c.843-.64 1.907-1.06 3.07-1.2V4h2v1.07c1.163.14 2.227.56 3.07 1.2l-1.07 1.6c-.69-.49-1.5-.8-2.35-.8-1.66 0-3 1.34-3 3s1.34 3 3 3c.85 0 1.66-.31 2.35-.8l1.07 1.6c-.843.64-1.907 1.06-3.07 1.2z" />
                                </svg>
                            </span>
                            <input type="text"
                                id='amountInput'
                                value={fromUserBal}
                                className="field-input"
                                disabled />
                        </div>
                    </div>
                ): 
                <p className="text-sm text-slate-500">{fromUser ? "No available balance." : "Select a source account to view its balance."}</p>
                }
                {fromUser && fromUserBal>0 && (

                    <>
                        <div className="mb-2">
                            <label htmlFor="to-user" className="field-label">Select Customer</label>
                            <select
                                id="to-user"
                                value={toUser}
                                onChange={(e) => setToUser(e.target.value)}
                                className="field-select">

                                <option value="">Select User</option>
                                {users
                                    .filter((user) => user.id !== Number(fromUser))
                                    .map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="mb-2">
                            <label htmlFor="amountInput-1" className="field-label">Amount</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                                    {/* Money Icon */}
                                    <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm1 17.93V20h-2v-1.07c-1.163-.14-2.227-.56-3.07-1.2l1.07-1.6c.69.49 1.5.8 2.35.8 1.66 0 3-1.34 3-3s-1.34-3-3-3c-.85 0-1.66.31-2.35.8l-1.07-1.6c.843-.64 1.907-1.06 3.07-1.2V4h2v1.07c1.163.14 2.227.56 3.07 1.2l-1.07 1.6c-.69-.49-1.5-.8-2.35-.8-1.66 0-3 1.34-3 3s1.34 3 3 3c.85 0 1.66-.31 2.35-.8l1.07 1.6c-.843.64-1.907 1.06-3.07 1.2z" />
                                    </svg>
                                </span>
                                <input type="text"
                                    id="amountInput-1"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="field-input" placeholder="amount" />
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                className="primary-button"
                                disabled={loading || usersLoading || !!usersError || balanceQuery.loading || balanceQuery.refreshing || !!balanceQuery.error}
                            >
                                {loading ? <ButtonSpinner /> : 'Transfer'}
                            </button>
                        </div>
                    </>
                )}

            </form>
        </div>
    )
}

export default FundTransfer;
