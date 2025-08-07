import { useState, useEffect, useRef } from 'react';
import UserImage from "./UserImage";
import API from '@/api/axios';

const UserCard = ({ user }) => { 
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const [activeSt, setActiveSt] = useState(user.is_active);
    const [adminSt, setAdminSt] = useState(user.is_staff);

    // Close dropdown when clicking outside
    const handleClickOutside = (e) => {
        if (
            dropdownRef.current &&
            !dropdownRef.current.contains(e.target) &&
            buttonRef.current &&
            !buttonRef.current.contains(e.target)
        ) {
            setIsDropdownOpen(false);
        }
    };

    // Add event listener when dropdown is open
    useEffect(() => {
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    const toggleStatus = async (statusType) => {
        try {
            let response;
            if (statusType === 'activeStatus') {
                response = await API.patch(`api/admin/users/${user.id}/`, { is_active: !activeSt });
                if (response.status === 200) {
                    setActiveSt(!activeSt);
                }
            }
            if (statusType === 'adminStatus') {
                response = await API.patch(`api/admin/users/${user.id}/`, { is_staff: !adminSt });
                if (response.status === 200) {
                    setAdminSt(!adminSt);
                }
            }
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    return (
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 relative">
            {/* Dropdown button and menu */}
            <div className="flex justify-end px-4 pt-4">
                <button
                    ref={buttonRef}
                    id="dropdown-button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="inline-block text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-1.5"
                    type="button"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                >
                    <span className="sr-only">Open dropdown</span>
                    <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 3">
                        <path d="M2 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6.041 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM14 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                    </svg>
                </button>

                {/* Dropdown menu */}
                {isDropdownOpen && (
                    <div
                        ref={dropdownRef}
                        className="z-10 absolute right-4 top-12 text-base list-none bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700"
                        role="menu"
                    >
                        <ul className="py-2">
                            <li>
                                <button
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                                    role="menuitem" 
                                    onClick={() => toggleStatus('activeStatus')}
                                >
                                    {activeSt ? "Deactivate" : "Activate"}
                                </button>
                            </li>
                            <li>
                                <button
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                                    role="menuitem"
                                    onClick={() => toggleStatus('adminStatus')}
                                >
                                    {adminSt ? "Remove Admin" : "Make Admin"}
                                </button>
                            </li>
                            <li>
                                <button
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white"
                                    role="menuitem"
                                >
                                    Delete
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>

            {/* User content */}
            <div className="flex flex-col items-center pb-10">
                <UserImage image_url={user.profile_image} name={user.name} sex={user.sex} />
                <div className="mb-1 flex items-center gap-2">
                    <h5 className="text-xl font-medium text-gray-900 dark:text-white">
                        {user.name.toUpperCase()}
                    </h5>
                    <span
                        className={`inline-block w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                            activeSt ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    ></span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                </span>
                <div className="flex mt-4 md:mt-6">
                    <button className="py-2 px-4 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700">
                        Send Mail
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserCard;