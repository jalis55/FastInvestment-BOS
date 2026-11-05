import { ProjectSearch } from '@/components/ui/project-search';
import { getApiError } from '@/api/errors';
import { useApiQuery } from '@/hooks/use-api-query';
import { QueryState } from '@/components/ui/query-state';
import { useState } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";
import { checkProjectStatus } from "../../utils/checkProjectStatus.js";

const AddInvestments = () => {
    const [searchId, setSearchId] = useState('');
    const [projectId, setProjectId] = useState('');
    const customersQuery = useApiQuery('/api/admin/customers/', { enabled: !!projectId });
    const customers = customersQuery.data;
    const [projectBalance, setProjectBalance] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const balanceQuery = useApiQuery(selectedCustomer ? `/api/acc/user/${selectedCustomer.id}/balance/` : null, { staleTime: 0 });
    const selectedCustomerBal = balanceQuery.loading || balanceQuery.refreshing || balanceQuery.error ? 0 : Number(balanceQuery.data.balance || 0);
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

        if (loading || !selectedCustomer || customersQuery.loading || customersQuery.error || balanceQuery.loading || balanceQuery.refreshing || balanceQuery.error) return;
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
            {selectedCustomer && <QueryState loading={balanceQuery.loading} error={balanceQuery.error} onRetry={balanceQuery.refetch}><span /></QueryState>}
            {Boolean(projectId) && <QueryState loading={customersQuery.loading} error={customersQuery.error} onRetry={customersQuery.refetch}><span /></QueryState>}
            <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)} onSubmit={searchProject} loading={searching} />
            {customers.length > 0 && (
                <div className="page-card max-w-2xl mx-auto space-y-6">
                    <div className="border p-4 flex justify-between items-center mb-4">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white">Project Id: {projectId}</h6>
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white">Balance: {projectBalance} BDT</h6>
                    </div>

                    <p>Add Investment</p>

                    <div className="mb-4">
                        <label htmlFor="investorDropdown" className="field-label">Select Investor</label>
                        <select
                            id="investorDropdown"
                            value={selectedCustomer ? selectedCustomer.id : ""}
                            onChange={handleInvestorChange}
                            className="field-select"
                        >
                            <option>Select Investor</option>
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
                                <label htmlFor="bal" className="field-label">Available Balance</label>
                                <input
                                    type="number"
                                    id="bal"
                                    value={selectedCustomerBal}
                                    aria-describedby="balance-helper"
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
                            {selectedCustomerBal > 0 &&
                                <div className="flex justify-center">
                                    <button
                                        type="submit"
                                        className="primary-button"
                                        disabled={loading}
                                    >
                                        {loading ? <ButtonSpinner /> : 'Submit'}
                                    </button>
                                </div>
                            }
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default AddInvestments;