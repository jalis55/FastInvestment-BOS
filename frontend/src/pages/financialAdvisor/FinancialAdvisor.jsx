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

const FinancialAdvisor = () => {
    const [searchId, setSearchId] = useState('');
    const [projectId, setProjectId] = useState('');
    const customersQuery = useApiQuery('/api/admin/customers/', { enabled: !!projectId });
    const customers = customersQuery.data;
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [commPercentage, setComPercentage] = useState(0);
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


            setProjectId(searchId);
        } catch (error) {
            console.error("Error fetching project data:", error);
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

        if (loading || !selectedCustomer || customersQuery.loading || customersQuery.error) return;
        if (!commPercentage || commPercentage <= 0) {
            Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid amount greater than 0.' });
            return;
        }


        setLoading(true);

        const data = {
            project: projectId,
            advisor: selectedCustomer.id,
            com_percentage: parseFloat(commPercentage),
        };


        try {
            await API.post(`/api/stock/add/financial/advisor/`, data);




            Swal.fire({ icon: 'success', title: 'Advisor Added', text: 'Financial Advisor has been successfully added!' });

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
            <BannerTitle title="Add Financial Advisor" />
            {Boolean(projectId) && <QueryState loading={customersQuery.loading} error={customersQuery.error} onRetry={customersQuery.refetch}><span /></QueryState>}
            <ProjectSearch value={searchId} onChange={(event) => setSearchId(event.target.value)} onSubmit={searchProject} loading={searching} />
            {customers.length > 0 && (
                <div className="mx-auto max-w-2xl page-card">
                    <div className="mb-6">
                        <h2 className="section-heading">Advisor Assignment</h2>
                        <p className="section-copy">Select an advisor and define the commission percentage for this project.</p>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="advisorDropdown" className="field-label">Select Advisor</label>
                        <select
                            id="advisorDropdown"
                            value={selectedCustomer ? selectedCustomer.id : ""}
                            onChange={handleInvestorChange}
                            className="field-select"
                        >
                            <option>Select Advisor</option>
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
                                <label htmlFor="amount" className="field-label">Commission Percentage</label>
                                <input
                                    type="number"
                                    id="amount"
                                    value={commPercentage}
                                    onChange={(e) => setComPercentage(e.target.value)}
                                    min="0"
                                    step="0.01"
                                    aria-describedby="amount-helper"
                                    className="field-input"
                                    placeholder="Enter Amount"
                                />
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
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}

export default FinancialAdvisor;
