import { Bell, ChevronsLeft, Menu } from "lucide-react";
import PropTypes from "prop-types";
import { useMatches } from "react-router-dom";

const Header = ({ collapsed, setCollapsed, isMobile, menuButtonRef }) => {
    const pageTitle = useMatches().at(-1)?.handle?.pageTitle;

    return (
        <header className="relative z-10 flex h-16 items-center justify-between gap-x-2 border-b border-[#b8cbe4] bg-linear-to-r from-[#e8eff8] to-[#dde9f8] px-3 sm:px-5 lg:h-[72px]">
            <div className="flex min-w-0 flex-1 items-center gap-x-2 sm:gap-x-4">
                <button
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-blue-200/80 bg-white/55 text-blue-900 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    ref={menuButtonRef}
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={isMobile ? "Open navigation" : "Toggle sidebar"}
                    aria-expanded={!collapsed}
                    aria-controls="main-sidebar"
                >
                    {isMobile ? <Menu size={22} aria-hidden="true" /> : <ChevronsLeft aria-hidden="true" className={collapsed ? "rotate-180" : undefined} />}
                </button>
                <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:text-xs sm:tracking-[0.2em]">
                        Operations Center
                    </p>
                    {pageTitle && <h1 className="truncate text-sm font-semibold text-slate-900 sm:text-base" title={pageTitle}>{pageTitle}</h1>}
                </div>
            </div>

            <button
                type="button"
                className="flex size-11 items-center justify-center rounded-2xl border border-blue-200/80 bg-white/55 text-blue-900 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                aria-label="Notifications"
            >
                <Bell size={20} aria-hidden="true" />
            </button>
        </header>
    );
};

Header.propTypes = {
    collapsed: PropTypes.bool,
    setCollapsed: PropTypes.func,
    isMobile: PropTypes.bool,
    menuButtonRef: PropTypes.object,
};

export default Header;
