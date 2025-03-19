import { useState } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import api from "../../api.js";
import Swal from "sweetalert2";

const AddInvestments = () => {
    const [searchId, setSearchId] = useState('');
    const [customers, setCustomers] = useState([]);
    const [projectId, setProjectId] = useState(0);
    const [projectBalance, setProjectBalance] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedCustomerBal, setSelectedCustomerBal] = useState(0);
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(false);

    const searchProject = async (e) => {
        e.preventDefault();

        if (!searchId.trim()) {
            Swal.fire({ icon: 'warning', title: 'Input Required', text: 'Please enter a project ID!' });
            return;
        }

        try {
            const response = await api.get(`/api/stock/project-balance/${searchId}/`);
            console.log("Project Balance Response:", response.data); // Debugging log
            setProjectId(response.data.project_id);
            setProjectBalance(response.data.available_balance);
            getCustomers();
        } catch (error) {
            console.error("Error fetching project data:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
        }
    };

    const getCustomers = async () => {
        try {
            const response = await api.get(`/api/admin/customers/`);
            console.log("Customers Response:", response.data); // Debugging log
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
        if (custId) {
            getCustomerBalance(custId);
        }
    };

    const getCustomerBalance = async (id) => {
        try {
            const response = await api.get(`/api/acc/user/${id}/balance/`);
            console.log("Customer Balance Response:", response.data); // Debugging log
            setSelectedCustomerBal(response.data.balance);
        } catch (error) {
            console.error("Error fetching customer balance:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!amount || amount <= 0) {
            Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid amount greater than 0.' });
            return;
        }

        if (parseFloat(amount) > parseFloat(selectedCustomerBal)) {
            console.log(selectedCustomerBal - amount);
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
            const response = await api.post(`/api/stock/add-investment/`, data);
            if(response.status==201){
                                const mailData = {
                                    email: selectedCustomer.email,
                                    subject: "Project Opening",
                                    message: `You have added bdt ${amount} as an investment on Project :${projectId}`,
                                };
                                await api.post("/api/mail/send-email/", mailData);
            }
            Swal.fire({ icon: 'success', title: 'Investment Added', text: 'Investment has been successfully added!' });
            setProjectBalance((prevBal)=>parseFloat(prevBal)+parseFloat(amount));
            // Reset form after successful submission
            setAmount(0);
            setSelectedCustomer(null);
            setSelectedCustomerBal(0);
            setSearchId('');

            document.getElementById('investorDropdown').value = '';

        } catch (error) {
            console.error("Error adding investment:", error);
            Swal.fire({ icon: 'error', title: 'API Error', text: error.response?.data?.message || 'Something went wrong.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <BannerTitle title="Add Investment" />
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
            {customers.length > 0 && (
                <div className="max-w-md mx-auto space-y-6">
                    <div className="border p-4 flex justify-between items-center mb-4">
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white">Project Id: {projectId}</h6>
                        <h6 className="text-sm font-medium text-gray-900 dark:text-white">Balance: {projectBalance} BDT</h6>
                    </div>

                    <p>Add Investment</p>

                    <div className="mb-4">
                        <label htmlFor="countries" className="block text-sm font-medium text-gray-900 dark:text-white">Select Investor</label>
                        <select
                            id="investorDropdown"
                            value={selectedCustomer ? selectedCustomer.id : ""}
                            onChange={handleInvestorChange}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
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
                                <label htmlFor="comm" className="block text-sm font-medium text-gray-900 dark:text-white">Available Balance</label>
                                <input
                                    type="number"
                                    id="bal"
                                    value={selectedCustomerBal}
                                    aria-describedby="balance-helper"
                                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                    disabled
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-900 dark:text-white">Amount</label>
                                <input
                                    type="number"
                                    id="amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min="0"
                                    step="0.01"
                                    aria-describedby="amount-helper"
                                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                    placeholder="Enter Amount"
                                />
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
                    )}
                </div>
            )}
        </div>
    );
};

export default AddInvestments;