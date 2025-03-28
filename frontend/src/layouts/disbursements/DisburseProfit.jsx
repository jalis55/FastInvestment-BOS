import React, { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api';
import BannerTitle from '../../components/BannerTitle';

const DisburseProfit = () => {
    const [formData, setFormData] = useState({
        searchId: '',
        fromDt: '',
        toDate: ''
    });
    const [projectId, setProjectId] = useState('');
    const [advCommission, setAdvCommission] = useState([]);
    const [invProfit, setInvProfit] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const searchProject = async (e) => {
        e.preventDefault();
        if (!formData.searchId.trim()) {
            Swal.fire("Error", "Project ID is required", "error");
            return;
        }

        setIsLoading(true);
        try {
            const profits = await api.get(`/api/stock/project-total-profit/`, {
                params: {
                    project_id: formData.searchId,
                    from_dt: formData.fromDt,
                    to_dt: formData.toDate,
                    disburse_st: 0
                }
            });

            if (profits.data.length === 0) {
                setIsDataLoaded(false);
                Swal.fire("No Data", "No data found for the given criteria", "warning");
                return;
            }

            const advisors = await api.get(`api/stock/fin-advisor-commission/${formData.searchId}/`);
            const investors = await api.get(`api/stock/investor-contrib-percent/${formData.searchId}/`);
            
            setProjectId(formData.searchId);
            processDisburseData(profits.data, advisors.data, investors.data);
            setIsDataLoaded(true);

        } catch (error) {
            
            console.error("Error fetching data:", error.response?.data || error.message);
            Swal.fire("Error", "Failed to fetch project details", "error");
            
        } finally {
            setIsLoading(false);
        }
    };

    const processDisburseData = (profits, advisors, investors) => {
        const advisorsProfit = [];
        const investorsProfit = [];

        profits.forEach((profit) => {
            let remainingProfit = parseFloat(profit.amount);

            // First calculate and deduct advisor commissions
            advisors.forEach((advisor) => {
                const comPercentage = parseFloat(advisor.com_percentage);
                const comAmt = (remainingProfit * comPercentage) / 100;
                
                advisorsProfit.push({
                    project: formData.searchId,
                    trade: profit.trade,
                    advisor: advisor.advisor.id,
                    advisor_email: advisor.advisor.email,
                    com_percentage: comPercentage,
                    amount: comAmt.toFixed(2)
                });

                remainingProfit -= comAmt;
            });

            // Then distribute remaining profit to investors
            investors.forEach((investor) => {
                const percentage = parseFloat(investor.contribution_percentage);
                const profitAmt = (remainingProfit * percentage) / 100;
                
                investorsProfit.push({
                    project: formData.searchId,
                    trade: profit.trade,
                    investor: investor.investor.id,
                    investor_email: investor.investor.email,
                    contribute_amount: investor.contribute_amount,
                    contribute_percentage: percentage,
                    profit_amount: profitAmt.toFixed(2)
                });
            });
        });

        setAdvCommission(advisorsProfit);
        setInvProfit(investorsProfit);
    };

    const handleDisburse = async () => {
        if (!isDataLoaded) return;

        try {
            setIsLoading(true);
            // Prepare data for API
            const disbursementData = {
                project_id: projectId,
                from_date: formData.fromDt,
                to_date: formData.toDate,
                advisor_commissions: advCommission,
                investor_profits: invProfit
            };

            const response = await api.post('/api/stock/disburse-profits/', disbursementData);
            Swal.fire("Success", "Profits disbursed successfully", "success");
            
            // Reset form
            setFormData({ searchId: '', fromDt: '', toDate: '' });
            setAdvCommission([]);
            setInvProfit([]);
            setIsDataLoaded(false);
        } catch (error) {
            console.error("Error disbursing profits:", error);
            Swal.fire("Error", "Failed to disburse profits", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <BannerTitle title="Disburse Profit" />
            
            {/* Search Form */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <form onSubmit={searchProject}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
                            <input
                                type="text"
                                name="searchId"
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Enter Project ID"
                                value={formData.searchId}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                            <input
                                type="date"
                                name="fromDt"
                                className="w-full px-3 py-2 border rounded-lg"
                                value={formData.fromDt}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                            <input
                                type="date"
                                name="toDate"
                                className="w-full px-3 py-2 border rounded-lg"
                                value={formData.toDate}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* Results Section */}
            {isDataLoaded && (
                <div className="space-y-6">
                    {/* Advisor Commissions */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b">
                            <h2 className="text-lg font-semibold">Financial Advisor Commissions</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Advisor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission %</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {advCommission.map((advCom, index) => (
                                        <tr key={`advisor-${index}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{advCom.advisor_email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{advCom.trade}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{advCom.com_percentage}%</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${advCom.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Investor Profits */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b">
                            <h2 className="text-lg font-semibold">Investor Profit Distribution</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Investor</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trade ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contribution</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contribution %</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invProfit.map((investor, index) => (
                                        <tr key={`investor-${index}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{investor.investor_email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{investor.trade}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${investor.contribute_amount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{investor.contribute_percentage}%</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${investor.profit_amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Disburse Button */}
                    <div className="flex justify-start">
                        <button
                            onClick={handleDisburse}
                            className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : 'Disburse Profits'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisburseProfit;