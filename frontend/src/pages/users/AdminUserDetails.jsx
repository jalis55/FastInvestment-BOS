import ButtonSpinner from '@/components/ButtonSpinner';
import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import { useApiQuery } from '@/hooks/use-api-query';
import { PageIntro } from '@/components/ui/page-intro';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import ProfileField from './ProfileField';
import UserMenuAccess from './UserMenuAccess';
import DownloadNidScan from './DownloadNidScan';
import ProfilePhotoPicker from './ProfilePhotoPicker';

function EditUserForm({ user, endpoint, refetch }) {
    const [saving, setSaving] = useState(false);
    const [photoVersion, setPhotoVersion] = useState(0);

    async function saveProfile(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const scan = data.get('nid_scan_copy');
        if (scan.size > 2 * 1024 * 1024) {
            Swal.fire({ icon: 'error', title: 'NID scan is too large', text: 'Choose a file up to 2 MB.' });
            return;
        }
        for (const name of ['profile_image', 'nid_scan_copy']) {
            if (!data.get(name).name) data.delete(name);
        }
        if (!data.get('password')) data.delete('password');
        if (data.get('nid') === user.nid) data.delete('nid');

        setSaving(true);
        try {
            await API.patch(endpoint, data);
            for (const name of ['nid_scan_copy', 'password']) {
                form.elements.namedItem(name).value = '';
            }
            await refetch();
            setPhotoVersion((version) => version + 1);
            Swal.fire({ icon: 'success', title: 'User updated', text: 'Profile changes were saved.' });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Could not update user', text: getApiError(error) });
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={saveProfile}>
            <fieldset disabled={saving} className="min-w-0">
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <ProfilePhotoPicker key={photoVersion} src={user.profile_image} disabled={saving} />
                    <div className="min-w-0">
                        <p className="break-words font-semibold text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-600">
                            {user.is_staff ? 'Admin' : 'User'} · {user.is_active ? 'Active' : 'Inactive'}
                        </p>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField name="name" label="Full name" defaultValue={user.name} maxLength={255} required />
                    <ProfileField name="email" label="Email address" type="email" defaultValue={user.email} maxLength={254} required />
                    <ProfileField name="password" label="New password" type="password" autoComplete="new-password" minLength={8} hint="Leave blank to keep the current password." />
                    <ProfileField name="phone" label="Phone number" type="tel" defaultValue={user.phone ?? ''} maxLength={20} />
                    <ProfileField name="dob" label="Date of birth" type="date" defaultValue={user.dob ?? ''} />
                    <ProfileField name="sex" label="Sex">
                        <select id="sex" name="sex" className="field-select" defaultValue={user.sex ?? ''}>
                            <option value="">Unspecified</option>
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                            <option value="O">Other</option>
                        </select>
                    </ProfileField>
                </div>
                <fieldset className="mt-6 min-w-0 border-t border-slate-200 pt-4">
                    <legend className="pr-3 text-sm font-semibold text-slate-900">National ID</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ProfileField name="nid" label="NID number" defaultValue={user.nid} inputMode="numeric" pattern="[0-9]{1,17}" maxLength={17} />
                        <div className="min-w-0">
                            <ProfileField name="nid_scan_copy" label={user.has_nid_scan ? 'Replace NID scan copy' : 'NID scan copy'} type="file" accept=".pdf,.jpg,.jpeg,.png" hint="PDF, JPG, or PNG up to 2 MB." />
                            {user.has_nid_scan && <DownloadNidScan endpoint={endpoint} />}
                        </div>
                    </div>
                </fieldset>
                <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
                    <button type="submit" className="primary-button !w-auto gap-2" disabled={saving}>
                        <Save aria-hidden="true" className="size-4" />
                        {saving ? <ButtonSpinner label="Saving…" /> : 'Save changes'}
                    </button>
                </div>
            </fieldset>
        </form>
    );
}

export default function AdminUserDetails() {
    const { userId } = useParams();
    const endpoint = `/api/admin/users/${userId}/`;
    const { data: user, loading, error, refetch } = useApiQuery(endpoint);

    return (
        <>
            <PageIntro as="h1" title="User details" actions={(
                <Link to="/users" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">
                    <ArrowLeft aria-hidden="true" className="size-4" />
                    Back to users
                </Link>
            )} />
            <QueryState loading={loading} error={error} onRetry={refetch} loadingLabel="Loading user…">
                {user.id && (
                    <div className="max-w-4xl space-y-5">
                        <SurfaceCard className="!p-4 sm:!p-6">
                            <EditUserForm key={user.id} user={user} endpoint={endpoint} refetch={refetch} />
                        </SurfaceCard>
                        <UserMenuAccess key={user.id} endpoint={`${endpoint}menu-access/`} />
                    </div>
                )}
            </QueryState>
        </>
    );
}
