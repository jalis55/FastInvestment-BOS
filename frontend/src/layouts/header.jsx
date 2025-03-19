import { useContext } from "react";
import { useTheme } from "../hooks/use-theme";
import { Bell, ChevronsLeft, Moon, Search, Sun, LogOut } from "lucide-react";



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



    return (
        <header className="relative z-10 flex h-[60px] items-center justify-between bg-white px-4 shadow-md transition-colors dark:bg-slate-900">
            <div className="flex items-center gap-x-3">
                <button
                    className="btn-ghost size-10"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <ChevronsLeft className={collapsed && "rotate-180"} />
                </button>
                <div className="">
                    {/* <Search
                        size={20}
                        className="text-slate-300"
                    />
                    <input
                        type="text"
                        name="search"
                        id="search"
                        placeholder="Search..."
                        className="w-full bg-transparent text-slate-900 outline-0 placeholder:text-slate-300 dark:text-slate-50"
                    /> */}
                    <div className="">{user.name.toUpperCase()}</div>
                </div>
            </div>
            <div className="flex items-center gap-x-3">
                <button className="size-10 overflow-hidden rounded-full">

                    <img
                        src={profileImageUrl}
                        alt="profile image"
                        className="size-full object-cover"
                    />
                </button>
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

                <Link to={"logout"} className="btn-ghost size-10" ><LogOut /></Link>
            </div>
        </header>
    );
};

Header.propTypes = {
    collapsed: PropTypes.bool,
    setCollapsed: PropTypes.func,
};

export default Header;
