import React, { forwardRef, useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import menu from "../constants/menu.js";
import { cn } from "../utils/cn";
import PropTypes from "prop-types";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";

const Sidebar = forwardRef(({ collapsed }, ref) => {
  const [openMenus, setOpenMenus] = useState({});
  const { user, hasRole } = useAuth();

  useEffect(() => {
    if (collapsed) {
      setOpenMenus({});
    }
  }, [collapsed]);

  const toggleMenu = (menuName) => {
    setOpenMenus((prev) => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  // Filter menu items based on user role
  const filteredMenu = menu.filter(item => {
    if (!hasRole(item.roles)) return false;
    if (item.children) {
      return item.children.some(child => hasRole(child.roles));
    }
    return true;
  }).map(item => ({
    ...item,
    children: item.children ? item.children.filter(child => hasRole(child.roles)) : null
  }));

  if (!user) return null;

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed z-[100] flex h-full w-[268px] flex-col overflow-x-hidden border-r border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#0f172a_0%,#172554_100%)] text-white transition-all duration-300",
        collapsed ? "md:w-[70px] md:items-center" : "md:w-[240px]",
        collapsed ? "max-md:-left-full" : "max-md:left-0"
      )}
    >
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-x-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-lg font-semibold text-cyan-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            FI
          </div>
        {!collapsed && (
            <div>
              <p className="text-sm font-semibold tracking-[0.18em] text-white/60 uppercase">
                Fast Investment
              </p>
              <p className="text-base font-medium text-white">
                Backoffice Suite
              </p>
            </div>
        )}
        </div>
      </div>
      <div className="flex w-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin">
        {filteredMenu.map((menuItem) => (
          <nav
            key={menuItem.menuName}
            className={cn("sidebar-group", collapsed && "md:items-center")}
          >
            {menuItem.children ? (
              <button
                type="button"
                onClick={() => toggleMenu(menuItem.menuName)}
                className="flex w-full items-center rounded-2xl p-3 text-white/80 transition duration-150 hover:bg-white/8 hover:text-white"
              >
                <menuItem.icon size={22} className="flex-shrink-0" />
                {!collapsed && (
                  <p className="whitespace-nowrap ms-3 flex-1 text-left">
                    {menuItem.menuName}
                  </p>
                )}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    openMenus[menuItem.menuName] ? "rotate-180" : ""
                  )}
                />
              </button>
            ) : (
              <NavLink
                to={menuItem.url}
                className={({ isActive }) => cn(
                  "flex w-full items-center rounded-lg p-2 transition duration-75 hover:bg-slate-100",
                  isActive 
                    ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "text-white/78"
                )}
              >
                <menuItem.icon size={22} className="flex-shrink-0" />
                {!collapsed && (
                  <p className="whitespace-nowrap ms-3 flex-1 text-left">
                    {menuItem.menuName}
                  </p>
                )}
              </NavLink>
            )}
            {menuItem.children && (
              <div
                className={cn(
                  "pl-5 transition-all",
                  openMenus[menuItem.menuName] ? "block" : "hidden"
                )}
              >
                {menuItem.children.map((child) => (
                  <NavLink
                    key={child.menuName}
                    to={child.url}
                    className={({ isActive }) => cn(
                      "flex w-full items-center rounded-2xl p-3 transition duration-150 hover:bg-white/8 hover:text-white",
                      isActive 
                        ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-white/72",
                      collapsed && "md:w-[45px] md:justify-center"
                    )}
                  >
                    <child.icon size={22} className="flex-shrink-0" />
                    {!collapsed && <p className="text-balance ms-3">{child.menuName}</p>}
                  </NavLink>
                ))}
              </div>
            )}
          </nav>
        ))}
      </div>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";

Sidebar.propTypes = {
  collapsed: PropTypes.bool,
};

export default Sidebar;
