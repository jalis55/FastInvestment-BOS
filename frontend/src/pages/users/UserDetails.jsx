import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { KeyRound, Pencil, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import { useAuth } from '@/auth/use-auth';
import { useApiQuery } from '@/hooks/use-api-query';
import { PageIntro } from '@/components/ui/page-intro';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import DownloadNidScan from './DownloadNidScan';
import ProfileField from './ProfileField';
import ProfilePhotoPicker from './ProfilePhotoPicker';

const sexLabels = { M: 'Male', F: 'Female', O: 'Other' };
const profileEndpoint = '/api/user-profile/';
const profileFormId = 'edit-my-profile';
const editableFields = ['name', 'email', 'phone', 'sex', 'dob'];
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50';

async function changePassword() {
    const result = await Swal.fire({
        title: 'Change password',
        html: `
            <div class="grid gap-4 text-left">
                <div>
                    <label class="field-label" for="current-password">Current password</label>
                    <input class="field-input" id="current-password" type="password" autocomplete="current-password">
                </div>
                <div>
                    <label class="field-label" for="new-password">New password</label>
                    <input class="field-input" id="new-password" type="password" autocomplete="new-password">
                </div>
                <div>
                    <label class="field-label" for="confirm-password">Confirm new password</label>
                    <input class="field-input" id="confirm-password" type="password" autocomplete="new-password">
                </div>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'Change password',
        focusConfirm: false,
        showLoaderOnConfirm: true,
        allowOutsideClick: () => !Swal.isLoading(),
        allowEscapeKey: () => !Swal.isLoading(),
        didOpen: (popup) => popup.querySelector('#current-password').focus(),
        preConfirm: async () => {
            const popup = Swal.getPopup();
            const currentPassword = popup.querySelector('#current-password').value;
            const newPassword = popup.querySelector('#new-password').value;
            const confirmation = popup.querySelector('#confirm-password').value;
            if (!currentPassword || !newPassword || !confirmation) {
                Swal.showValidationMessage('Fill in all three password fields.');
                return false;
            }
            if (newPassword !== confirmation) {
                Swal.showValidationMessage('The new passwords do not match.');
                return false;
            }

            try {
                await API.post(`${profileEndpoint}password/`, {
                    current_password: currentPassword,
                    new_password: newPassword,
                });
                return true;
            } catch (error) {
                Swal.showValidationMessage('Could not change your password.');
                Swal.getValidationMessage().textContent = getApiError(error, 'Could not change your password.');
                return false;
            }
        },
    });
    if (result.isConfirmed) {
        Swal.fire({ icon: 'success', title: 'Password changed', text: 'Use your new password the next time you sign in.' });
    }
}

function ProfileEditor({ user, onSave, onCancel, saving, setSaving }) {
    async function saveProfile(event) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        for (const name of editableFields) {
            if (data.get(name) === (user[name] ?? '')) data.delete(name);
        }
        if (data.get('nid') === user.nid) data.delete('nid');
        if (data.get('nid_scan_copy').size > 2 * 1024 * 1024) {
            Swal.fire({ icon: 'error', title: 'NID scan is too large', text: 'Choose a file up to 2 MB.' });
            return;
        }
        for (const name of ['profile_image', 'nid_scan_copy']) {
            if (!data.get(name).name) data.delete(name);
        }
        if (data.keys().next().done) {
            onCancel();
            return;
        }

        setSaving(true);
        try {
            const { data: profile } = await API.patch(profileEndpoint, data);
            onSave(profile);
            Swal.fire({ icon: 'success', title: 'Profile updated', text: 'Your changes were saved.' });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Could not update profile', text: getApiError(error) });
        } finally {
            setSaving(false);
        }
    }

    return (
        <form id={profileFormId} onSubmit={saveProfile}>
            <fieldset disabled={saving} className="min-w-0">
                <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField name="name" label="Full name" defaultValue={user.name} maxLength={255} required />
                    <ProfileField name="email" label="Email address" type="email" defaultValue={user.email} maxLength={254} required />
                    <ProfileField name="phone" label="Phone number" type="tel" defaultValue={user.phone ?? ''} maxLength={20} />
                    <ProfileField name="dob" label="Date of birth" type="date" defaultValue={user.dob ?? ''} />
                    <ProfileField name="sex" label="Sex">
                        <select id="sex" name="sex" className="field-select" defaultValue={user.sex ?? ''}>
                            <option value="">Unspecified</option>
                            {Object.entries(sexLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </ProfileField>
                </div>

                <fieldset className="mt-6 min-w-0 border-t border-slate-200 pt-4">
                    <legend className="pr-3 text-sm font-semibold text-slate-900">National ID</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <ProfileField name="nid" label="NID number" defaultValue={user.nid} inputMode="numeric" pattern="[0-9]{1,17}" maxLength={17} />
                        <div className="min-w-0">
                            <ProfileField name="nid_scan_copy" label={user.has_nid_scan ? 'Replace NID scan copy' : 'NID scan copy'} type="file" accept=".pdf,.jpg,.jpeg,.png" hint="PDF, JPG, or PNG up to 2 MB." />
                            {user.has_nid_scan && <DownloadNidScan endpoint={profileEndpoint} />}
                        </div>
                    </div>
                </fieldset>

                <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                    <button type="button" className={secondaryButton} onClick={onCancel}>Cancel</button>
                    <button type="submit" className="primary-button !w-auto gap-2">
                        <Save aria-hidden="true" className="size-4" />
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </fieldset>
        </form>
    );
}

export default function UserDetails() {
    const { userData, setUserData } = useAuth();
    const { data: user, loading, error, refetch } = useApiQuery(profileEndpoint, { enabled: Boolean(userData) });
    const [editing, setEditing] = useState(false);
    const [photoVersion, setPhotoVersion] = useState(0);
    const [saving, setSaving] = useState(false);

    function closeEditor() {
        setPhotoVersion((version) => version + 1);
        setEditing(false);
    }

    function applyProfile(profile) {
        const updates = Object.fromEntries([...editableFields, 'profile_image'].map((field) => [field, profile[field]]));
        setUserData((current) => current?.id === profile.id ? { ...current, ...updates } : current);
        closeEditor();
    }

    return (
        <SurfaceCard className="mx-auto w-full max-w-4xl !p-4 sm:!p-6">
            <PageIntro
                as="h1"
                title="My profile"
                actions={!loading && !error && !editing && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className={secondaryButton} onClick={() => setEditing(true)}>
                            <Pencil aria-hidden="true" className="size-4" />
                            Edit profile
                        </button>
                        <button type="button" className={secondaryButton} onClick={changePassword}>
                            <KeyRound aria-hidden="true" className="size-4" />
                            Change password
                        </button>
                    </div>
                )}
            />

            <QueryState loading={loading} error={error} onRetry={refetch} loadingLabel="Loading profile…">
                {user.id && (
                    <>
                        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <ProfilePhotoPicker
                                key={photoVersion}
                                src={user.profile_image}
                                disabled={saving}
                                form={profileFormId}
                                onSelect={() => setEditing(true)}
                            />
                            <div className="min-w-0">
                                <p className="break-words font-semibold text-slate-900">{user.name}</p>
                                <p className="break-words text-sm text-slate-600">{user.email}</p>
                            </div>
                        </div>
                        {editing ? (
                            <ProfileEditor key={user.id} user={user} onSave={applyProfile} onCancel={closeEditor} saving={saving} setSaving={setSaving} />
                        ) : (
                            <dl className="grid gap-3 sm:grid-cols-2">
                                {[
                                    ['Phone number', user.phone],
                                    ['Date of birth', user.dob ? format(parseISO(user.dob), 'PPP') : null],
                                    ['Sex', sexLabels[user.sex]],
                                    ['NID number', user.nid],
                                ].map(([label, value]) => (
                                    <div key={label} className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3">
                                        <dt className="text-sm text-slate-600">{label}</dt>
                                        <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value || 'Not provided'}</dd>
                                    </div>
                                ))}
                                <div className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3">
                                    <dt className="text-sm text-slate-600">NID scan copy</dt>
                                    <dd className="break-words text-sm font-medium text-slate-900">
                                        {user.has_nid_scan ? <DownloadNidScan endpoint={profileEndpoint} /> : <span className="mt-1 block">Not provided</span>}
                                    </dd>
                                </div>
                            </dl>
                        )}
                    </>
                )}
            </QueryState>
        </SurfaceCard>
    );
}
