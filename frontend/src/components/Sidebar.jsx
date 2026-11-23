import { forwardRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, ChartNoAxesCombined, ChevronDown, CircleUserRound, LogOut, X } from 'lucide-react';
import ButtonSpinner from '@/components/ButtonSpinner';
import { getApiError } from '@/api/errors';
import menu from '@/constants/menu';
import { cn } from '@/utils/cn';
import { useAuth } from '@/auth/use-auth';

const Sidebar = forwardRef(({ collapsed, isMobile, onClose, onNavigate }, ref) => {
  const { user, userData, hasRole, logout } = useAuth();
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState({});
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const compact = collapsed && !isMobile;
  const items = menu.filter((item) => hasRole(item.roles)).map((item) => ({
    ...item,
    children: item.children?.filter((child) => hasRole(child.roles)),
  })).filter((item) => !item.children || item.children.length);

  if (!user) return null;

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
    } catch (error) {
      setLogoutError(getApiError(error));
    } finally {
      setLoggingOut(false);
    }
  };

  const renderLink = (item, nested = false) => (
    <NavLink key={item.url} to={item.url} end={item.url === '/'} onClick={onNavigate}
      title={compact ? item.menuName : undefined} aria-label={compact ? item.menuName : undefined}
      className={({ isActive }) => cn(
        'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
        compact ? 'mx-auto size-11 justify-center px-0' : nested && 'ml-5 pl-4',
        isActive ? 'bg-cyan-300/10 text-cyan-200 ring-1 ring-inset ring-cyan-300/20' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-100',
      )}>
      {({ isActive }) => <>
        {isActive && <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-cyan-300" />}
        <item.icon size={nested && !compact ? 16 : 19} strokeWidth={1.7} className="shrink-0" aria-hidden="true" />
        {!compact && <span className="flex-1 truncate">{item.menuName}</span>}
        {isActive && !compact && <span aria-hidden="true" className="size-1.5 rounded-full bg-cyan-300" />}
      </>}
    </NavLink>
  );

  return <aside ref={ref} id="main-sidebar" aria-label="Main navigation" role={isMobile && !collapsed ? "dialog" : undefined} aria-modal={isMobile && !collapsed ? true : undefined} inert={isMobile && collapsed ? true : undefined}
    className={cn('fixed inset-y-0 left-0 z-[100] flex h-dvh flex-col border-r border-slate-800 bg-[#101a2b] text-slate-100 shadow-[8px_0_40px_rgba(15,23,42,0.08)] transition-[width,transform] duration-300 motion-reduce:transition-none',
      compact ? 'w-[76px]' : isMobile ? 'w-[min(320px,calc(100vw-48px))]' : 'w-[264px]', isMobile && collapsed ? '-translate-x-full' : 'translate-x-0')}>
    <div className={cn('flex h-[88px] shrink-0 items-center gap-3 border-b border-white/[0.06]', compact ? 'justify-center px-2' : 'px-5')}>
      <NavLink to="/" onClick={onNavigate} aria-label="Fast Investment dashboard" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-300 text-slate-950 shadow-[0_4px_20px_rgba(103,232,249,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <ChartNoAxesCombined size={23} strokeWidth={2} aria-hidden="true" />
      </NavLink>
      {!compact && <div className="min-w-0 flex-1"><p className="text-sm font-semibold tracking-tight text-white">Fast Investment<span className="text-cyan-300">.</span></p><p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Backoffice workspace</p></div>}
      {isMobile && <button type="button" onClick={onClose} aria-label="Close navigation" className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>}
    </div>

    <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-5 pt-6 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
      {!compact && <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>}
      <div className="space-y-1">
        {items.map((item, index) => {
          if (!item.children) return <div key={item.menuName} className={cn(index > 0 && 'pt-1')}>{renderLink(item)}</div>;
          const active = item.children.some((child) => child.url === pathname);
          const open = openGroups[item.menuName] ?? active;
          const groupId = `sidebar-${item.menuName.toLowerCase().replaceAll(' ', '-')}`;
          if (compact) return <div key={item.menuName} className="my-2 space-y-1 border-t border-white/[0.06] pt-2">{item.children.map((child) => renderLink(child))}</div>;
          return <div key={item.menuName} className="py-1">
            <button type="button" aria-expanded={open} aria-controls={groupId}
              onClick={() => setOpenGroups((previous) => ({ ...previous, [item.menuName]: !open }))}
              className={cn('flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300', active ? 'text-slate-100' : 'text-slate-400')}>
              <item.icon size={19} strokeWidth={1.7} aria-hidden="true" /><span className="flex-1 text-left">{item.menuName}</span>
              <ChevronDown size={14} aria-hidden="true" className={cn('text-slate-500 transition-transform motion-reduce:transition-none', open && 'rotate-180')} />
            </button>
            <div id={groupId} hidden={!open} className="relative mt-1 space-y-1 before:absolute before:inset-y-1 before:left-[21px] before:w-px before:bg-slate-800">{item.children.map((child) => renderLink(child, true))}</div>
          </div>;
        })}
      </div>
    </nav>

    <div className={cn('shrink-0 space-y-1 border-t border-white/[0.06] p-3', compact && 'px-2')}>
      <NavLink to="/user-details" onClick={onNavigate} title={compact ? 'My profile' : undefined} aria-label="My profile"
        className={cn('flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300', compact && 'justify-center')}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300"><CircleUserRound size={20} strokeWidth={1.5} aria-hidden="true" /></span>
        {!compact && <><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-100">{userData?.name || 'My account'}</p><p className="mt-1 text-[11px] text-slate-500">{user.is_super_admin ? 'Super administrator' : user.is_admin ? 'Administrator' : 'Investor'}</p></div><ArrowUpRight size={15} className="text-slate-500" aria-hidden="true" /></>}
      </NavLink>
      <button type="button" onClick={handleLogout} disabled={loggingOut}
        aria-label={loggingOut ? 'Signing out' : 'Logout'} title={compact ? 'Logout' : undefined}
        className={cn(
          'flex min-h-11 w-full items-center gap-3 rounded-xl text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-wait',
          compact ? 'justify-center' : 'px-3',
        )}>
        {loggingOut ? <ButtonSpinner label="Signing out…" /> : <>
          <LogOut size={19} aria-hidden="true" />
          {!compact && <span>Logout</span>}
        </>}
      </button>
      {logoutError && (
        <p role="alert" className={cn('rounded-lg bg-red-950 p-2 text-xs text-red-100',
          compact && 'absolute bottom-3 left-full z-10 ml-2 w-48')}>
          {logoutError}
        </p>
      )}
    </div>
  </aside>;
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;
