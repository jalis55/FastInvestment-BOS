import { Mail, Phone} from "lucide-react";
import UserImage from "./UserImage";

const UserCard = ({ user ,toggleAdminStatus,toggleActiveStatus}) => {

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:space-x-6 items-center sm:items-start">
                {/* User Avatar */}
                <UserImage image_url={user.profile_image} name={user.name} sex={user.sex} />

                {/* User Details */}
                <div className="flex-grow text-center sm:text-left">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{user.name}</h2>

                    <div className="flex items-center justify-center sm:justify-start mt-2">
                        <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start mt-1">
                        <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.phone}</p>
                    </div>

                    {/* Social Links */}

                </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {user.is_active ?
                    <button type='button' 
                    onClick={() => toggleActiveStatus(user.id, user.is_active)}
                    className='py-1.5 px-3.5 text-xs max-h-max bg-red-500 text-white rounded-full cursor-pointer font-medium leading-5 text-center shadow-xs transition-all duration-500 hover:bg-red-700'>
                        Make Inactive
                    </button>
                    :
                    <button type='button' 
                    onClick={() => toggleActiveStatus(user.id, user.is_active)}
                    className='py-1.5 px-3.5 text-xs max-h-max bg-green-500 text-white rounded-full cursor-pointer font-medium leading-5 text-center shadow-xs transition-all duration-500 hover:bg-green-700'>
                        Make Active
                    </button>
                }
                {
                    user.is_staff ?
                        <button type='button' 
                        onClick={() => toggleAdminStatus(user.id, user.is_staff)}
                        className='py-1.5 px-3.5 text-xs max-h-max bg-red-500 text-white rounded-full cursor-pointer font-medium leading-5 text-center shadow-xs transition-all duration-500 hover:bg-red-700'>
                            Remove Admin
                        </button>
                        :
                        <button type='button' 
                        onClick={() => toggleAdminStatus(user.id, user.is_staff)}
                        className='py-1.5 px-3.5 text-xs max-h-max bg-green-500 text-white rounded-full cursor-pointer font-medium leading-5 text-center shadow-xs transition-all duration-500 hover:bg-green-700'>
                            Make Admin
                        </button>
                }
            </div>
        </div>
    )
}

export default UserCard;
