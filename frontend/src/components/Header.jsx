import { useMemo, useState } from "react";
import { Bell, ChevronsLeft, Sparkles } from "lucide-react";
import profileImg from "../assets/profile-image.jpg";
import PropTypes from "prop-types";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

const Header = ({ collapsed, setCollapsed }) => {
    const { userData, logout } = useAuth();
    const navigate = useNavigate();
    const displayName = useMemo(() => {
        if (!userData?.name) {
            return "My Profile";
        }

        return userData.name.toUpperCase();
    }, [userData?.name]);

    const [isOpen, setIsOpen] = useState(false);

    // Function to toggle the dropdown's visibility
    const toggleDropdown = () => setIsOpen(!isOpen);

    // Function to close the dropdown
    // const closeDropdown = () => setIsOpen(false);


    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
        navigate('/login');
    };



    return (
        <header className="relative z-10 flex h-[72px] items-center justify-between border-b border-white/50 bg-white/65 px-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="flex items-center gap-x-4">
                <button
                    className="flex size-11 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-slate-600 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label="Toggle sidebar"
                >
                    <ChevronsLeft className={collapsed && "rotate-180"} />
                </button>
                <div className="hidden md:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                        Operations Center
                    </p>
                    <p className="text-sm text-slate-700">
                        Monitor projects, trades, and reporting activity.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-x-3">
                <button
                    type="button"
                    className="hidden items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white md:inline-flex"
                    aria-label="Workspace status"
                >
                    <Sparkles size={16} className="text-cyan-600" />
                    Ready
                </button>
                <button
                    type="button"
                    className="flex size-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-slate-500 transition hover:bg-white hover:text-slate-700"
                    aria-label="Notifications"
                >
                    <Bell size={20} />
                </button>

                <div className="relative inline-block text-left">
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/85 p-1 shadow-sm transition hover:border-slate-300 hover:bg-white"
                        id="menu-button"
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                        onClick={toggleDropdown}
                    >
                        <img
                            src={userData?.profile_image || profileImg}
                            alt="profile"
                            className="size-10 rounded-full object-cover"
                        />
                    </button>

                    {isOpen && (
                        <div
                            className="absolute right-0 z-10 mt-3 w-60 origin-top-right rounded-3xl border border-white/70 bg-white/95 p-2 shadow-[0_22px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl"
                            role="menu"
                            aria-orientation="vertical"
                            aria-labelledby="menu-button"
                            tabIndex="-1"
                        >
                            <div className="py-1" role="none">
                                <Link
                                    to="/user-details"
                                    title="profile"
                                    className="block rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {displayName}
                                </Link>
                                <button
                                    type="button"
                                    className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                    onClick={handleLogout}
                                >
                                    Logout
                                </button>
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
