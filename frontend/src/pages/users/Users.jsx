import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import { useApiQuery } from '@/hooks/use-api-query';
import { PageIntro } from '@/components/ui/page-intro';
import { QueryState } from '@/components/ui/query-state';
import { SearchBar } from '@/components/ui/search-bar';
import { SurfaceCard } from '@/components/ui/surface-card';
import UserRow from './UserRow';

const columns = ['User', 'Phone', 'Role', 'Status', 'Actions'];
const filterClass = 'field-select min-h-[52px] sm:w-40';

export default function Users() {
    const [searchQuery, setSearchQuery] = useState('');
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const { data: users, loading, error, refetch, refreshing } = useApiQuery('/api/admin/users/');
    const query = searchQuery.trim().toLowerCase();

    const filteredUsers = users.filter((user) =>
        [user.name, user.email, user.phone].some((value) => (value ?? '').toLowerCase().includes(query))
        && (!role || user.is_staff === (role === 'admin'))
        && (!status || user.is_active === (status === 'active'))
    );

    async function changeAccess(user, field) {
        const nextValue = !user[field];
        const name = user.name || user.email;
        const action = field === 'is_staff'
            ? (nextValue ? 'Make admin' : 'Remove admin')
            : (nextValue ? 'Activate' : 'Deactivate');

        const result = await Swal.fire({
            title: `${action}?`,
            text: field === 'is_staff'
                ? `This will ${nextValue ? 'grant' : 'remove'} admin access for ${name}.`
                : `This will ${nextValue ? 'restore' : 'disable'} account access for ${name}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: action,
            focusCancel: true,
        });
        if (!result.isConfirmed) return;

        setSaving(true);
        try {
            await API.patch(`/api/admin/users/${user.id}/`, { [field]: nextValue });
            await refetch();
            Swal.fire({ icon: 'success', title: 'User updated', text: `Access for ${name} was updated.` });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Could not update user', text: getApiError(error) });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex h-full flex-col">
            <PageIntro
                className="shrink-0"
                as="h1"
                title="Users"
                actions={(
                    <Link to="/user-registration" className="primary-button gap-2 md:!w-auto">
                        <UserPlus aria-hidden="true" className="size-4" />
                        Register user
                    </Link>
                )}
            />

            <SurfaceCard className="flex min-h-0 flex-col !p-4 sm:!p-6">
                <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
                    <SearchBar
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by name, email, or phone"
                        aria-label="Search by name, email, or phone"
                        className="min-w-0 flex-1"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <select className={filterClass} aria-label="Filter by role" value={role} onChange={(event) => setRole(event.target.value)}>
                            <option value="">All roles</option>
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                        </select>
                        <select className={filterClass} aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
                            <option value="">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                {!loading && !error && (
                    <p role="status" className="mb-3 shrink-0 text-sm text-slate-600">
                        Showing {filteredUsers.length} of {users.length} {users.length === 1 ? 'user' : 'users'}
                    </p>
                )}

                <QueryState
                    loading={loading}
                    error={error}
                    onRetry={refetch}
                    loadingLabel="Loading users…"
                    empty={filteredUsers.length === 0}
                    emptyTitle={users.length ? 'No matching users' : 'No registered users'}
                    emptyDescription={users.length ? 'Try a different search or clear a filter.' : 'Use Register user to create an account.'}
                >
                    <div role="region" aria-label="User list" tabIndex={0}
                        className="relative min-h-24 overflow-y-auto overscroll-y-contain rounded-2xl border border-slate-200 bg-white [scrollbar-gutter:stable] focus-visible:outline-2 focus-visible:outline-blue-500"
                        onScroll={(event) => event.currentTarget.querySelector('[popover]:popover-open')?.hidePopover()}>
                        <table role="table" aria-label="Registered users" className="block w-full text-left lg:table">
                            <thead role="rowgroup" className="sr-only lg:not-sr-only lg:sticky lg:top-0 lg:z-10 lg:table-header-group">
                                <tr role="row" className="bg-slate-50 text-xs font-semibold text-slate-600">
                                    {columns.map((column) => (
                                        <th role="columnheader" scope="col" key={column} className={`px-5 py-3 first:rounded-tl-2xl last:rounded-tr-2xl ${column === 'Actions' ? 'text-right' : ''}`}>
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody role="rowgroup" className="block divide-y divide-slate-100 lg:table-row-group">
                                {filteredUsers.map((user) => <UserRow key={user.id} user={user} busy={saving || refreshing} onChangeAccess={changeAccess} />)}
                            </tbody>
                        </table>
                    </div>
                </QueryState>
            </SurfaceCard>
        </div>
    );
}
