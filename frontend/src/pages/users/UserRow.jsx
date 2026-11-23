import { useId, useRef } from 'react';
import { Eye, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserImage from './UserImage';

const actionButton = 'block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus-visible:bg-slate-100';
const iconButton = 'grid size-9 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500';

export default function UserRow({ user, busy, onChangeAccess }) {
    const name = user.name || 'Unnamed user';

    const actionsId = useId();
    const triggerRef = useRef(null);
    const popoverRef = useRef(null);

    function positionActions(event) {
        if (event.newState !== 'open') return;
        const trigger = triggerRef.current.getBoundingClientRect();
        const popover = event.currentTarget;
        const { offsetWidth, offsetHeight } = popover;
        const below = trigger.bottom + 8;
        const above = trigger.top - offsetHeight - 8;
        popover.style.left = `${Math.max(8, trigger.right - offsetWidth)}px`;
        popover.style.top = `${below + offsetHeight <= window.innerHeight - 8 ? below : Math.max(8, above)}px`;
    }

    function selectAction(field) {
        popoverRef.current.hidePopover();
        triggerRef.current.focus();
        onChangeAccess(user, field);
    }

    return (
        <tr role="row" className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-3 px-4 py-4 lg:table-row lg:hover:bg-slate-50/70">
            <td role="cell" className="col-span-2 min-w-0 lg:px-5 lg:py-3">
                <div className="flex items-center gap-3">
                    <UserImage src={user.profile_image} loading="lazy" />
                    <div className="min-w-0">
                        <div className="break-words font-medium text-slate-900">{name}</div>
                        <div className="break-words text-sm text-slate-500">{user.email}</div>
                    </div>
                </div>
            </td>
            <td role="cell" className="col-start-1 row-start-2 min-w-0 break-words text-sm text-slate-600 lg:px-5 lg:py-3">
                <span className="sr-only lg:hidden">Phone </span>{user.phone || '—'}
            </td>
            <td role="cell" className="col-start-2 row-start-2 lg:px-5 lg:py-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${user.is_staff ? 'bg-blue-50 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>
                    {user.is_staff ? 'Admin' : 'User'}
                </span>
            </td>
            <td role="cell" className="col-start-3 row-start-2 lg:px-5 lg:py-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${user.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                    {user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td role="cell" className="col-start-3 row-start-1 justify-self-end lg:px-5 lg:py-3">
                <div className="flex justify-end gap-1.5">
                    <Link to={`/users/${user.id}`} className={iconButton} aria-label={`View details for ${name}`} title="View user details">
                        <Eye aria-hidden="true" className="size-4" />
                    </Link>
                    <button type="button" ref={triggerRef} popoverTarget={actionsId}
                        aria-label={`Actions for ${name}`} className={iconButton}>
                        <MoreHorizontal aria-hidden="true" className="size-5" />
                    </button>
                    <div id={actionsId} ref={popoverRef} popover="auto" onToggle={positionActions}
                        className="fixed inset-auto m-0 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        <button type="button" disabled={busy} className={actionButton} onClick={() => selectAction('is_active')}>
                            {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" disabled={busy} className={actionButton} onClick={() => selectAction('is_staff')}>
                            {user.is_staff ? 'Remove admin' : 'Make admin'}
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );
}
