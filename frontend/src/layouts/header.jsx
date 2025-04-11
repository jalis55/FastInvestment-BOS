import { useContext, useState } from "react";
import { useTheme } from "../hooks/use-theme";
import { Bell, ChevronsLeft, Moon,  Sun} from "lucide-react";
import profileImg from "../assets/profile-image.jpg";
import PropTypes from "prop-types";
import { AuthContext } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

const Header = ({ collapsed, setCollapsed }) => {
    const { theme, setTheme } = useTheme();
    const { user } = useContext(AuthContext);


    // Retrieve the base URL from environment variables
    const baseURL = process.env.REACT_APP_API_URL;

    // Construct the absolute URL for the profile image
    const profileImageUrl = user.profile_image
        ? `${baseURL}${user.profile_image}`
        : profileImg;

    const [isOpen, setIsOpen] = useState(false);

    // Function to toggle the dropdown's visibility
    const toggleDropdown = () => setIsOpen(!isOpen);

    // Function to close the dropdown
    // const closeDropdown = () => setIsOpen(false);



    return (
        <header className="relative z-10 flex h-[60px] items-center justify-between bg-white px-4 shadow-md transition-colors dark:bg-slate-900">
            <div className="flex items-center gap-x-3">
                <button
                    className="btn-ghost size-10"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <ChevronsLeft className={collapsed && "rotate-180"} />
                </button>

            </div>

            <div className="flex items-center gap-x-3">

                <button
                    className="btn-ghost size-10"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                    <Sun
                        size={20}
                        className="dark:hidden"
                    />
                    <Moon
                        size={20}
                        className="hidden dark:block"
                    />
                </button>
                <button className="btn-ghost size-10">
                    <Bell size={20} />
                </button>

                {/* <Link to={"logout"} title="logout" className="btn-ghost size-10" ><LogOut /></Link> */}
                <div className="relative inline-block text-left">
                    {/* Profile image button */}
                    <button
                        type="button"
                        className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-gray-300 ring-inset hover:bg-gray-50"
                        id="menu-button"
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                        onClick={toggleDropdown}
                    >
                        <img
                            src={profileImageUrl}
                            alt="profile"
                            className="size-10 rounded-full object-cover"
                        />
                    </button>

                    {/* Dropdown menu */}
                    {isOpen && (
                        <div
                            className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white ring-1 shadow-lg ring-black/5 focus:outline-hidden"
                            role="menu"
                            aria-orientation="vertical"
                            aria-labelledby="menu-button"
                            tabIndex="-1"
                        >
                            <div className="py-1" role="none">

                                <Link to="/" title="logout" className="block px-4 py-2 text-sm text-gray-700">
                                    {user.name.toUpperCase()}
                                </Link>
                                <Link to="/logout" title="logout" className="block px-4 py-2 text-sm text-gray-700">
                                    Logout
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

Header.propTypes = {
    collapsed: PropTypes.bool,
    setCollapsed: PropTypes.func,
};

export default Header;
