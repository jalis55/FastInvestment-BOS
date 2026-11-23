import { useState } from 'react';
import API from '@/api/axios';
import { getApiError } from '@/api/errors';
import ButtonSpinner from '@/components/ButtonSpinner';
import { QueryState } from '@/components/ui/query-state';
import { SurfaceCard } from '@/components/ui/surface-card';
import menu from '@/constants/menu';
import { useApiQuery } from '@/hooks/use-api-query';

function MenuAccessForm({ endpoint, available, initialAccess }) {
    const [access, setAccess] = useState(initialAccess);
    const [savedAccess, setSavedAccess] = useState(initialAccess);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const availableSet = new Set(available);
    const dirty = JSON.stringify(access) !== JSON.stringify(savedAccess);

    async function save(event) {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const { data } = await API.put(endpoint, { allowed_menus: access });
            setAccess(data.allowed_menus);
            setSavedAccess(data.allowed_menus);
            setMessage({ text: 'Menu access saved.' });
        } catch (error) {
            setMessage({ error: true, text: getApiError(error) });
        } finally {
            setSaving(false);
        }
    }

    function toggle(url, checked) {
        const selected = new Set(access);
        if (checked) selected.add(url);
        else selected.delete(url);
        setAccess(available.filter((route) => selected.has(route)));
    }

    return (
        <form onSubmit={save} className="mt-4 space-y-4">
            <fieldset disabled={saving} className="min-w-0 space-y-4">
                <label className="flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-medium text-slate-900">
                    <input type="checkbox" className="size-4 accent-blue-700" checked={access === null}
                        onChange={(event) => setAccess(event.target.checked ? null : [...available])} />
                    Use role defaults
                </label>
                <fieldset disabled={access === null} className="grid min-w-0 gap-3 sm:grid-cols-2 disabled:opacity-65">
                    <legend className="sr-only">Available menus</legend>
                    {menu.map((group) => {
                        const items = (group.children ?? [group]).filter((item) => availableSet.has(item.url));
                        if (!items.length) return null;
                        return (
                            <fieldset key={group.menuName} className="min-w-0 rounded-xl border border-slate-200 px-3 pb-2">
                                <legend className="px-1 text-xs font-semibold text-slate-600">{group.children ? group.menuName : 'Workspace'}</legend>
                                {items.map((item) => (
                                    <label key={item.url} className="flex min-h-11 items-center gap-3 text-sm text-slate-800">
                                        <input type="checkbox" className="size-4 shrink-0 accent-blue-700"
                                            checked={access === null || access.includes(item.url)}
                                            onChange={(event) => toggle(item.url, event.target.checked)} />
                                        {item.menuName}
                                    </label>
                                ))}
                            </fieldset>
                        );
                    })}
                </fieldset>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {message && <p role={message.error ? 'alert' : 'status'} className={message.error ? 'text-sm text-red-700' : 'text-sm text-emerald-700'}>{message.text}</p>}
                    <button type="submit" disabled={!dirty || saving} className="primary-button ml-auto sm:w-auto">
                        {saving ? <ButtonSpinner label="Saving menu access…" /> : 'Save menu access'}
                    </button>
                </div>
            </fieldset>
        </form>
    );
}

export default function UserMenuAccess({ endpoint }) {
    const { data, loading, error, refetch } = useApiQuery(endpoint);

    return (
        <SurfaceCard className="!p-4 sm:!p-6">
            <h2 className="section-heading">Menu access</h2>
            <p className="section-copy">Choose which pages this user can open. Dashboard and My profile are always available. The sidebar updates the next time the user reloads the app.</p>
            <QueryState loading={loading} error={error} onRetry={refetch} loadingLabel="Loading menu access…">
                {data.available_menus && (
                    <MenuAccessForm endpoint={endpoint} available={data.available_menus} initialAccess={data.allowed_menus} />
                )}
            </QueryState>
        </SurfaceCard>
    );
}
