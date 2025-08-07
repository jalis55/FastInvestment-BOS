import { useState, useEffect } from "react";
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import BannerTitle from '../../components/BannerTitle';
import API from "@/api/axios";
import Swal from "sweetalert2";
import { parseISO, format } from 'date-fns';
import "./PendingPayments.css";

const PendingPayments = () => {
    const [pendingPaymentList, setPendingPaymentList] = useState([]);

    useEffect(() => {
        getPendingPaymentList();
    }, []);

    const getPendingPaymentList = async () => {
        try {
            const response = await API.get('/api/acc/user/pending-payments/');
            console.log(response.data);
            setPendingPaymentList(response.data);
        } catch (error) {
            console.error("Error fetching payments:", error);
        }
    };

    const handleApproval = async (paymentId, status) => {
        try {
            const response = await API.patch(`/api/acc/user/approve-transaction/${paymentId}/`, { status });
            if (response.status === 200) {
                setPendingPaymentList(prevList => prevList.filter(payment => payment.id !== paymentId));
                Swal.fire("Success!", `Transaction ${status} successfully.`, "success");
            }
        } catch (error) {
            const errorMessage = error.response?.data?.detail || "Failed to update transaction.";
            console.error("Error:", errorMessage);
            Swal.fire("Error", errorMessage, "error");
        }
    };

    const confirmAction = (paymentId, status) => {
        Swal.fire({
            title: `Are you sure you want to ${status} this transaction?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: status === 'approved' ? '#28a745' : '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: `Yes, ${status}!`,
        }).then((result) => {
            if (result.isConfirmed) {
                handleApproval(paymentId, status);
            }
        });
    };

    return (
        <div className="p-4">
            <BannerTitle title="Pending Payments" />
            <div className="overflow-x-auto">
                {pendingPaymentList.length === 0 ? (
                    <h1 className="text-center text-gray-600 p-5">No Pending Payments</h1>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse bg-white text-left text-sm text-gray-500">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-900">User</th>
                                    <th className="px-4 py-3 font-medium text-gray-900">Amount</th>
                                    <th className="px-4 py-3 font-medium text-gray-900">Issued by</th>
                                    <th className="px-4 py-3 font-medium text-gray-900">Issue Date</th>
                                    <th className="px-4 py-3 font-medium text-gray-900 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                                {pendingPaymentList.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="flex gap-3 px-4 py-3 font-normal text-gray-900">
                                            <div className="relative h-10 w-10">
                                                <img
                                                    className="h-full w-full rounded-full object-cover"
                                                    src={payment.user.profile_image || "https://e7.pngegg.com/pngimages/84/165/png-clipart-united-states-avatar-organization-information-user-avatar-service-computer-wallpaper-thumbnail.png"}
                                                    alt={payment.user.name}
                                                />
                                            </div>
                                            <div className="text-sm">
                                                <div className="font-medium text-gray-700">{payment.user.email}</div>
                                                <div className="text-gray-400">{payment.user.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">${payment.amount}</td>
                                        <td className="px-4 py-3">{payment.issued_by.email}</td>
                                        <td className="px-4 py-3">
                                            {format(parseISO(payment.issued_date), 'MMMM dd, yyyy')}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-4">
                                                <button
                                                    title="Approve"
                                                    onClick={() => confirmAction(payment.id, 'approved')}
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    <CheckCircleIcon size={20} />
                                                </button>
                                                <button
                                                    title="Cancel"
                                                    onClick={() => confirmAction(payment.id, 'declined')}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <XCircleIcon size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingPayments;