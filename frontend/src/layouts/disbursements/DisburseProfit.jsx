import React, { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../api';
import BannerTitle from '../../components/BannerTitle';
import DateRangeForm from '../../components/DateRangeForm';

const DisburseProfit = () => {
    const [searchId, setSearchId] = useState('');
    const [fromDt, setFromDt] = useState('');
    const [toDate, setToDate] = useState('');
    const [recvableData, setRecvableData] = useState([]);
    const [profitData, setProfitData] = useState([]);
    const [selectedInvestors, setSelectedInvestors] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const searchProject = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await api.get(`/api/stock/acc-recvable-details/`, {
                params:{
                    project_id:searchId,
                    from_dt:fromDt,
                    to_dt:toDate,
                    disburse_st:0
                }
            });

            if (response.data.length === 0) {
                Swal.fire("No Data", "No data found for the given criteria", "warning");
                return;
            }

            setRecvableData(response.data);
            calculateProfit(response.data);
        } catch (error) {
            console.error("Error fetching data:", error.response?.data || error.message);
            Swal.fire("Error", "Failed to fetch project details", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const calculateProfit = (data) => {
        const investorSummary = data.reduce((acc, investor) => {
            const { id, email } = investor.investor;
            const gainLose = parseFloat(investor.gain_lose);

            if (!acc[id]) {
                acc[id] = { id, email, profit: 0, loss: 0, total_profit: 0 };
            }

            if (gainLose >= 0) {
                acc[id].profit += gainLose;
            } else {
                acc[id].loss += Math.abs(gainLose);
            }

            acc[id].total_profit = parseFloat((acc[id].profit - acc[id].loss).toFixed(2));
            return acc;
        }, {});

        setProfitData(Object.values(investorSummary));
    };

    const disburseProfit = async () => {
        const isSpecificSelection = selectedInvestors.length > 0;
        const transactionData = profitData
            .filter(user => isSpecificSelection ? selectedInvestors.includes(user.id) : true)
            .map(user => ({
                user: user.id,
                amount: Number(user.total_profit).toFixed(2),
                transaction_type: "deposit",
                trans_mode: "cash",
                narration: `Deposit ${Number(user.total_profit).toFixed(2)} as profit`
            }));

        const userIds = isSpecificSelection ? transactionData.map(transaction => transaction.user) : [];
        const updateData = {
            project: searchId,
            from_dt: fromDt,
            to_dt: toDate,
            user_ids: userIds.length > 0 ? userIds : undefined
        };

        try {
            const [transactionResult, updateResult] = await Promise.allSettled([
                api.post(`/api/acc/user/create-transaction/`, transactionData),
                api.put(`/api/stock/update-acc-recvable/`, updateData)
            ]);

            if (transactionResult.status === "fulfilled" && updateResult.status === "fulfilled") {
                Swal.fire("Success", "All transactions processed!", "success");
                setProfitData([]);
                setSelectedInvestors([]);
            } else {
                const errors = [];
                if (transactionResult.status === "rejected") {
                    errors.push(`Transaction Error: ${transactionResult.reason}`);
                }
                if (updateResult.status === "rejected") {
                    errors.push(`Update Error: ${updateResult.reason}`);
                }
                Swal.fire("Error", errors.join("\n"), "error");
            }
        } catch (error) {
            Swal.fire("Error", `Unexpected Error: ${error.message}`, "error");
        }
    };

    const handleSelectInvestor = (id) => {
        setSelectedInvestors(prev =>
            prev.includes(id) ? prev.filter(investorId => investorId !== id) : [...prev, id]
        );
    };

    // Filter profitData to show only rows with positive total_profit
    const filteredProfitData = profitData.filter(item => item.total_profit > 0);

    return (
        <div className="container mx-auto p-4">
            <BannerTitle title="Disburse Profit" />
            <form className="max-w-md mx-auto p-4 bg-white shadow-md rounded-lg" onSubmit={searchProject}>
                <div className="mb-4">
                    <input
                        type="search"
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Search Project"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                    />
                </div>
                <div className="flex space-x-4 mb-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">From Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg"
                            value={fromDt}
                            onChange={(e) => setFromDt(e.target.value)}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700">To Date</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border rounded-lg"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                    type="submit"
                    disabled={isLoading}
                >
                    {isLoading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {filteredProfitData.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-xl font-semibold mb-4">Disburse Payments</h4>


                    <div className="overflow-hidden ">
                        <table className="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-700">
                            <thead class="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="p-4">
                                        <div class="flex items-center">
                                            {/* <input id="checkbox-all" type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                                                <label for="checkbox-all" class="sr-only">checkbox</label> */}
                                        </div>
                                    </th>
                                    <th scope="col" className="py-3 px-6 text-xs font-medium tracking-wider text-left text-gray-700 uppercase dark:text-gray-400">
                                        Investor
                                    </th>
                                    <th scope="col" className="py-3 px-6 text-xs font-medium tracking-wider text-left text-gray-700 uppercase dark:text-gray-400">
                                        Profit
                                    </th>
                                    <th scope="col" className="py-3 px-6 text-xs font-medium tracking-wider text-left text-gray-700 uppercase dark:text-gray-400">
                                        Loss
                                    </th>
                                    <th scope="col" className="py-3 px-6 text-xs font-medium tracking-wider text-left text-gray-700 uppercase dark:text-gray-400">
                                        Total Profit
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                                {filteredProfitData.map((item, index) => (
                                    <tr className="hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <td className="p-4 w-4">
                                            <div className="flex items-center">
                                                <input id="checkbox-table-1"
                                                    checked={selectedInvestors.includes(item.id)}
                                                    onChange={() => handleSelectInvestor(item.id)}
                                                    type="checkbox" class="w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
                                                <label for="checkbox-table-1" className="sr-only">checkbox</label>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">{item.email}</td>
                                        <td className="py-4 px-6 text-sm font-medium text-gray-500 whitespace-nowrap dark:text-white">{item.profit.toFixed(2)}</td>
                                        <td className="py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">{item.loss.toFixed(2)}</td>
                                        <td className="py-4 px-6 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">{item.total_profit.toFixed(2)}</td>

                                    </tr>
                                ))}


                            </tbody>
                        </table>
                        <div className="mt-4">
                            <button
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                onClick={disburseProfit}
                            >
                                Disburse
                            </button>
                        </div>
                    </div>
                    <div />
                </div>
            )}
        </div>
    );
};

export default DisburseProfit;