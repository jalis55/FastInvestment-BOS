import { useState } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import API from "@/api/axios";
import Swal from "sweetalert2";
import { checkProjectStatus } from "../../utils/checkProjectStatus.js";
import { SearchBar } from "@/components/ui/search-bar";

const FinancialAdvisor = () => {
    const [searchId, setSearchId] = useState('');
    const [customers, setCustomers] = useState([]);
    const [projectId, setProjectId] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [commPercentage, setComPercentage] = useState(0);
    const [loading, setLoading] = useState(false);

    const searchProject = async (e) => {
        e.preventDefault();

        if (!searchId.trim()) {
            Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter a project ID!' });
            return;
        }

        try {

            const isActive = await checkProjectStatus(searchId);
            if (!isActive) return;


            setProjectId(searchId);
            getCustomers();
        } catch (error) {
            console.error("Error fetching project data:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
        }
    };

    const getCustomers = async () => {
        try {
            const response = await API.get(`/api/admin/customers/`);
            setCustomers(response.data);
        } catch (error) {
            console.error("Error fetching customers:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
        }
    };

    const handleInvestorChange = (e) => {
        const custId = parseInt(e.target.value, 10);
        const customer = customers.find(cust => cust.id === custId);
        setSelectedCustomer(customer || null);

    };



    const handleSubmit = async (e) => {
        e.preventDefault();

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
            const response = await API.post(`/api/stock/add/financial/advisor/`, data);

            if (response.status == 201) {
                const mailData = {
                    email: selectedCustomer.email,
                    subject: "Project Opening",
                    message: `You have added as Financial Advisor on ${response.data.project_id} and commison percentage is:${commPercentage}`,
                };
                // await API.post("/api/mail/send-email/", mailData);

            }


            Swal.fire({ icon: 'success', title: 'Advisor Added', text: 'Financial Advisor has been successfully added!' });

            setSelectedCustomer(null);

            setSearchId('');
            document.getElementById('advisorDropdown').value = '';
        } catch (error) {
            console.error("Error adding investment:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <BannerTitle title="Add Financial Advisor" />
            <div className="mx-auto mb-8 max-w-3xl page-card">
            <form className="max-w-lg" onSubmit={searchProject}>
                <SearchBar
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        placeholder="Search Project"
                        aria-label="Search project"
                        required
                        action={
                            <button
                                type="submit"
                                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Search
                            </button>
                        }
                    />
            </form>
            </div>
            {customers.length > 0 && (
                <div className="mx-auto max-w-2xl page-card">
                    <div className="mb-6">
                        <h2 className="section-heading">Advisor Assignment</h2>
                        <p className="section-copy">Select an advisor and define the commission percentage for this project.</p>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="countries" className="field-label">Select Advisor</label>
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
