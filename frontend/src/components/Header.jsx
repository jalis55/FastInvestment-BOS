import { Bell, PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import PropTypes from "prop-types";
import { useLocation, useMatches } from "react-router-dom";
import menu from "@/constants/menu";

const controlClass = "grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300";

const Header = ({ collapsed, setCollapsed, isMobile, menuButtonRef }) => {
    const { pathname } = useLocation();
    const pageTitle = useMatches().at(-1)?.handle?.pageTitle;
    const section = menu.find((item) => item.children?.some(({ url }) =>
        pathname === url || pathname.startsWith(url + "/"),
    ));
    const NavigationIcon = isMobile ? Menu : collapsed ? PanelLeftOpen : PanelLeftClose;

    return (
        <header className="relative z-10 flex h-16 items-center gap-3 border-b border-slate-700 bg-linear-to-r from-[#101a2b] via-[#14233b] to-[#192d4a] px-4 text-white sm:gap-4 sm:px-6 lg:h-[72px] lg:px-8">
            <button
                type="button"
                className={controlClass}
                ref={menuButtonRef}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={isMobile ? "Open navigation" : "Toggle sidebar"}
                aria-expanded={!collapsed}
                aria-controls="main-sidebar"
            >
                <NavigationIcon size={19} aria-hidden="true" />
            </button>

            <div className="min-w-0 flex-1 border-l border-white/15 pl-3 sm:pl-4">
                {section && (
                    <p className="truncate text-xs font-medium leading-4 text-slate-300">
                        {section.menuName}
                    </p>
                )}
                {pageTitle && (
                    <h1 className="truncate text-base font-semibold leading-tight tracking-tight sm:text-xl" title={pageTitle}>
                        {pageTitle}
                    </h1>
                )}
            </div>

            <button type="button" className={controlClass} aria-label="Notifications">
                <Bell size={19} aria-hidden="true" />
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
