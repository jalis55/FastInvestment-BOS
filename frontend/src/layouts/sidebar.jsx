import React, { forwardRef, useState, useEffect, useContext } from "react";
import { NavLink } from "react-router-dom";
import menu from "../constants/menu.js";
import logoLight from "../assets/logo-light.svg";
import logoDark from "../assets/logo-dark.svg";
import { cn } from "../utils/cn";
import PropTypes from "prop-types";
import { ChevronDown } from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";

const Sidebar = forwardRef(({ collapsed }, ref) => {
  const [openMenus, setOpenMenus] = useState({});
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (collapsed) {
      setOpenMenus({});
    }
  }, [collapsed]);

  const toggleMenu = (menuName) => {
    setOpenMenus((prev) => ({ ...prev, [menuName]: !prev[menuName] }));
  };

  // Function to check if user has access to a menu item
  const hasAccess = (roles) => {
    if (!roles) return true;
    if (!user) return false;
    
    if (user.is_super_admin) return true;
    if (user.is_admin && roles.includes("admin")) return true;
    if (!user.is_admin && roles.includes("user")) return true;
    
    return false;
  };

  // Filter menu items based on user role
  const filteredMenu = menu.filter(item => {
    // Check if user has access to this item
    if (!hasAccess(item.roles)) return false;
    
    // If item has children, check if any child is accessible
    if (item.children) {
      const accessibleChildren = item.children.filter(child => hasAccess(child.roles));
      return accessibleChildren.length > 0;
    }
    
    return true;
  }).map(item => ({
    ...item,
    // Filter children if they exist
    children: item.children ? item.children.filter(child => hasAccess(child.roles)) : null
  }));

  return (
    <aside
      ref={ref}
      className={cn(
        "fixed z-[100] flex h-full w-[240px] flex-col overflow-x-hidden border-r border-slate-300 bg-white [transition:_width_300ms_cubic-bezier(0.4,_0,_0.2,_1),_left_300ms_cubic-bezier(0.4,_0,_0.2,_1),_background-color_150ms_cubic-bezier(0.4,_0,_0.2,_1),_border_150ms_cubic-bezier(0.4,_0,_0.2,_1)] dark:border-slate-700 dark:bg-slate-900",
        collapsed ? "md:w-[70px] md:items-center" : "md:w-[240px]",
        collapsed ? "max-md:-left-full" : "max-md:left-0"
      )}
    >
      <div className="flex gap-x-3 p-3">
        <img src={logoLight} alt="Logoipsum" className="dark:hidden" />
        <img src={logoDark} alt="Logoipsum" className="hidden dark:block" />
        {!collapsed && (
          <p className="text-lg font-medium text-slate-900 transition-colors dark:text-slate-50">
            Fast Investment Limited
          </p>
        )}
      </div>
      <div className="flex w-full flex-col gap-y-4 overflow-y-auto overflow-x-hidden p-3 [scrollbar-width:_thin]">
        {filteredMenu.map((menuItem) => (
          <nav
            key={menuItem.menuName}
            className={cn("sidebar-group", collapsed && "md:items-center")}
          >
            {menuItem.children ? (
              <button
                type="button"
                onClick={() => toggleMenu(menuItem.menuName)}
                className="flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
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
                className="flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
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
                    className={cn(
                      "sidebar-item flex items-center w-full p-2 text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700",
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