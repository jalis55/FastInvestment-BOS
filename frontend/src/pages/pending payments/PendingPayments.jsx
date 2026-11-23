import { useApiQuery } from '@/hooks/use-api-query';
import { QueryState } from '@/components/ui/query-state';
import { getApiError } from '@/api/errors';
import { useState } from "react";
import { CheckCircleIcon, XCircleIcon } from 'lucide-react';
import BannerTitle from '../../components/BannerTitle';
import API from "@/api/axios";
import Swal from "sweetalert2";
import { parseISO, format } from 'date-fns';
import "./PendingPayments.css";

const PendingPayments = () => {
    const { data: pendingPaymentList, loading, error, refetch } = useApiQuery('/api/acc/user/pending-payments/');
    const [busy, setBusy] = useState(false);

    const handleApproval = async (paymentId, status) => {
        if (busy) return;
        setBusy(true);
        try {
            const response = await API.patch(`/api/acc/user/approve-transaction/${paymentId}/`, { status });
            if (response.status === 200) {
                Swal.fire("Success!", `Transaction ${status} successfully.`, "success");
            }
        } catch (error) {
            const errorMessage = getApiError(error);
            console.error("Error:", errorMessage);
            Swal.fire("Error", errorMessage, "error");
        } finally { setBusy(false); }
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
            <QueryState loading={loading} error={error} onRetry={refetch} empty={!pendingPaymentList.length} emptyTitle="No pending payments">
            <div className="table-shell overflow-x-auto">
                {pendingPaymentList.length === 0 ? (
                    <p className="text-center text-gray-600 p-5">No Pending Payments</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table role="table" className="responsive-table min-w-full border-collapse bg-white text-left text-sm text-gray-500">
                            <thead role="rowgroup" className="bg-gray-50">
                                <tr role="row">
                                    <th role="columnheader" className="px-4 py-3 font-medium text-gray-900">User</th>
                                    <th role="columnheader" className="px-4 py-3 font-medium text-gray-900">Amount</th>
                                    <th role="columnheader" className="px-4 py-3 font-medium text-gray-900">Issued by</th>
                                    <th role="columnheader" className="px-4 py-3 font-medium text-gray-900">Issue Date</th>
                                    <th role="columnheader" className="px-4 py-3 font-medium text-gray-900 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody role="rowgroup" className="divide-y divide-gray-100 border-t border-gray-100">
                                {pendingPaymentList.map((payment) => (
                                    <tr role="row" key={payment.id} className="hover:bg-gray-50">
                                        <td role="rowheader" data-mobile-heading className="px-4 py-3 font-normal text-gray-900">
                                            <div className="flex items-center gap-3">
                                                <div className="relative size-10 shrink-0">
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
                                            </div>
                                        </td>
                                        <td role="cell" data-mobile-label="Amount" className="px-4 py-3"><div>${payment.amount}</div></td>
                                        <td role="cell" data-mobile-label="Issued by" className="px-4 py-3"><div>{payment.issued_by.email}</div></td>
                                        <td role="cell" data-mobile-label="Issue date" className="px-4 py-3">
                                            <div>
                                                {format(parseISO(payment.issued_date), 'MMMM dd, yyyy')}
                                            </div>
                                        </td>
                                        <td role="cell" className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-4">
                                                <button
                                                    disabled={busy}
                                                    aria-label="Approve payment"
                                                    title="Approve"
                                                    onClick={() => confirmAction(payment.id, 'approved')}
                                                    className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                >
                                                    <CheckCircleIcon size={20} />
                                                </button>
                                                <button
                                                    disabled={busy}
                                                    aria-label="Decline payment"
                                                    title="Cancel"
                                                    onClick={() => confirmAction(payment.id, 'declined')}
                                                    className="grid size-11 place-items-center rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100"
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
            </QueryState>
        </div>
    );
};

export default PendingPayments;
