import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/use-auth';
import { ProjectSearch } from '@/components/ui/project-search';
import { getApiError } from '@/api/errors';
import { useApiQuery } from '@/hooks/use-api-query';
import { useState } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";
import { checkProjectStatus } from "../../utils/checkProjectStatus.js";

const AddInvestments = () => {
    const { user } = useAuth();
    const [searchId, setSearchId] = useState('');
    const [projectId, setProjectId] = useState('');
    const customersQuery = useApiQuery('/api/admin/customers/', { enabled: !!projectId });
    const customers = customersQuery.data;
    const [projectBalance, setProjectBalance] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const balanceQuery = useApiQuery(selectedCustomer ? `/api/acc/user/${selectedCustomer.id}/balance/` : null, { staleTime: 0 });
    const balancePending = balanceQuery.loading || balanceQuery.refreshing;
    const balanceUnavailable = balancePending || !!balanceQuery.error;
    const selectedCustomerBal = balanceUnavailable ? null : Number(balanceQuery.data.balance || 0);
    const noInvestors = !customersQuery.loading && !customersQuery.error && customers.length === 0;
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    const searchProject = async (e) => {
        e.preventDefault();
        if (searching) return;

        if (!searchId.trim()) {
            Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter a project ID!' });
            return;
        }

        setSearching(true);
        setProjectId('');
        setSelectedCustomer(null);
        setAmount(0);
        try {

            const isActive = await checkProjectStatus(searchId);
            if (!isActive) return;

            const response = await API.get(`/api/stock/project/balance/details/${searchId}/`);
            setProjectId(response.data.project_id);
            setProjectBalance(response.data.available_balance);
        } catch (error) {

            Swal.fire({ icon: 'error', title: 'API Error', text: getApiError(error) });
        } finally {
            setSearching(false);
        }
    };

    const handleInvestorChange = (e) => {
        const custId = parseInt(e.target.value, 10);
        const customer = customers.find(cust => cust.id === custId);
        setSelectedCustomer(customer || null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading || !selectedCustomer || customersQuery.loading || customersQuery.error || balanceUnavailable) return;
        if (!amount || amount <= 0) {
            Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid amount greater than 0.' });
            return;
        }

        if (parseFloat(amount) > parseFloat(selectedCustomerBal)) {

            Swal.fire({ icon: 'warning', title: 'Insufficient Balance', text: 'Amount exceeds available balance.' });
            return;
        }

        setLoading(true);

        const data = {
            project: projectId,
            investor: selectedCustomer.id,
            amount: parseFloat(amount),
        };

        try {
            await API.post(`/api/stock/add/investment/`, data);

            Swal.fire({ icon: 'success', title: 'Investment Added', text: 'Investment has been successfully added!' });
            setProjectBalance((prevBal) => parseFloat(prevBal) + parseFloat(amount));
            // Reset form after successful submission
            setAmount(0);
            setSelectedCustomer(null);
            setSearchId('');

        } catch (error) {
            console.error("Error adding investment:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: getApiError(error) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <BannerTitle title="Add Investment" />
            <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)} onSubmit={searchProject} loading={searching} />
            {projectId && noInvestors && (
                <div role="alert" className="page-card mx-auto max-w-2xl border-amber-200 bg-amber-50">
                    <h2 className="font-semibold text-amber-950">No investors available</h2>
                    <p className="mt-2 text-sm text-amber-900">This database has no customer accounts. Register an investor and deposit funds into their account before adding an investment to project {projectId}.</p>
                    {user?.is_super_admin ? <Link to="/user-registration" className="primary-button mt-4 inline-flex">Register investor</Link> : <p className="mt-3 text-sm text-amber-900">Ask a super administrator to register an investor.</p>}
                </div>
            )}
            {projectId && !noInvestors && (
                <div className="page-card max-w-2xl mx-auto space-y-6">
                    <div className="border p-4 flex justify-between items-center mb-4">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white">Project Id: {projectId}</h6>
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white">Balance: {projectBalance} BDT</h6>
                    </div>

                    <p>Add Investment</p>

                    <div className="mb-4">
                        <div className="flex items-baseline justify-between gap-2">
                            <label htmlFor="investorDropdown" className="field-label">Select Investor</label>
                            {customersQuery.loading && <span role="status" className="text-sm text-slate-500">Loading investors…</span>}
                            {customersQuery.error && (
                                <span role="alert" className="text-sm text-red-700">
                                    Investors unavailable. <button type="button" onClick={customersQuery.refetch} className="underline">Retry</button>
                                </span>
                            )}
                        </div>
                        <select
                            id="investorDropdown"
                            value={selectedCustomer ? selectedCustomer.id : ""}
                            onChange={handleInvestorChange}
                            className="field-select"
                            disabled={customersQuery.loading || !!customersQuery.error}
                        >
                            <option value="">Select Investor</option>
                            {customers.map((customer) => (
                                <option key={customer.id} value={customer.id}>
                                    {customer.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {selectedCustomer && (
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <div className="flex items-baseline justify-between gap-2">
                                    <label htmlFor="bal" className="field-label">Available Balance</label>
                                    {balancePending && <span role="status" className="text-sm text-slate-500">Loading balance…</span>}
                                    {balanceQuery.error && (
                                        <span role="alert" className="text-sm text-red-700">
                                            Balance unavailable. <button type="button" onClick={balanceQuery.refetch} className="underline">Retry</button>
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    id="bal"
                                    value={selectedCustomerBal ?? ''}
                                    className="field-input"
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="amount" className="field-label">Amount</label>
                                <input
                                    type="number"
                                    id="amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="0"
                                    step="0.01"
                                    aria-describedby="amount-helper"
                                    className="field-input"
                                    placeholder="Enter Amount"
                                />
                            </div>
                            {!balanceUnavailable && selectedCustomerBal <= 0 && (
                                <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">This investor has no available balance. Deposit funds into their account before adding an investment.</p>
                            )}
                            {!balanceUnavailable && selectedCustomerBal > 0 && Number(amount) > selectedCustomerBal && (
                                <p role="alert" className="mb-4 text-sm text-red-700">The investment amount exceeds the investor’s available balance of {selectedCustomerBal.toFixed(2)} BDT.</p>
                            )}
                                <div className="flex justify-center">
                                    <button
                                        type="submit"
                                        className="primary-button"
                                        disabled={loading || balanceUnavailable || selectedCustomerBal <= 0 || Number(amount) <= 0 || Number(amount) > selectedCustomerBal}
                                    >
                                        {loading ? <ButtonSpinner /> : 'Submit'}
                                    </button>
                                </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default AddInvestments;
