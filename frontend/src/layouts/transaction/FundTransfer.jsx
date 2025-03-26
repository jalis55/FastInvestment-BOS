import { useState, useEffect } from "react";
import BannerTitle from "../../components/BannerTitle";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import api from "../../api.js";
import Swal from "sweetalert2";


const FundTransfer = () => {

    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [fromUser, setFromUser] = useState("");
    const [fromUserBal, setFormUserBal] = useState(0);
    const [toUser, setToUser] = useState("");
    const [amount, setAmount] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        api
            .get("/api/admin/customers/")
            .then((response) => setUsers(response.data))
            .catch((error) => console.error("Error fetching users:", error));
    }, []);

    const getUserName = (userId) => {
        const user = users.find((user) => user.id === Number(userId));
        return user ? user.name : 'Unknown User';
    };

    const handleFromUser = async (userId) => {
        const response = await api.get(`/api/acc/user/${userId}/balance/`);
        setFromUser(userId);
        setFormUserBal(Number(response.data.balance))

    }

    const handleSubmit = async (e) => {
        e.preventDefault();

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
        // Check if the amount is less than 100
        if (parseFloat(amount) > parseFloat(fromUserBal)) {
            await Swal.fire({
                title: 'Invalid Amount',
                text: 'Available balance exceed',
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
                const response = await api.post('/api/acc/user/fund-transfer/', fundTransferData);
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
                    text: error.response.data.error,
                    icon: 'error'
                });

            }
        }
    };
    return (
        <div>
            <BannerTitle title={"Fund Transfer"} />
            <form className="max-w-md mx-auto space-y-6" onSubmit={handleSubmit}>

                <div className="mb-2">
                    <label htmlFor="instDropdown" className="block text-sm font-medium text-gray-900 dark:text-white">From</label>
                    <select
                        id="userSelect"
                        value={fromUser}
                        onChange={(e) => handleFromUser(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">

                        <option>Select User</option>
                        {users
                            .filter((user) => user.id !== Number(toUser))
                            .map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                    </select>
                </div>
                {fromUser && (
                    <div className="mb-2">
                        <label htmlFor="website-admin" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Balance</label>
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
                                className="rounded-none rounded-e-lg bg-gray-50 border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                disabled />
                        </div>
                    </div>
                )}
                {fromUser && fromUserBal && (

                    <>
                        <div className="mb-2">
                            <label htmlFor="instDropdown" className="block text-sm font-medium text-gray-900 dark:text-white">Select Customer</label>
                            <select
                                id="userSelect"
                                value={toUser}
                                onChange={(e) => setToUser(e.target.value)}
                                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">

                                <option>Select User</option>
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
                            <label htmlFor="website-admin" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Amount</label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                                    {/* Money Icon */}
                                    <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm1 17.93V20h-2v-1.07c-1.163-.14-2.227-.56-3.07-1.2l1.07-1.6c.69.49 1.5.8 2.35.8 1.66 0 3-1.34 3-3s-1.34-3-3-3c-.85 0-1.66.31-2.35.8l-1.07-1.6c.843-.64 1.907-1.06 3.07-1.2V4h2v1.07c1.163.14 2.227.56 3.07 1.2l-1.07 1.6c-.69-.49-1.5-.8-2.35-.8-1.66 0-3 1.34-3 3s1.34 3 3 3c.85 0 1.66-.31 2.35-.8l1.07 1.6c-.843.64-1.907 1.06-3.07 1.2z" />
                                    </svg>
                                </span>
                                <input type="text"
                                    id='amountInput'
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    className="rounded-none rounded-e-lg bg-gray-50 border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="amount" />
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <button
                                type="submit"
                                className="w-full bg-blue-700 text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                                disabled={loading}
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
