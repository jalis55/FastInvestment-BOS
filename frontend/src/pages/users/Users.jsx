import React, { useState, useEffect } from 'react';
import UserCard from './UserCard';
import API from '@/api/axios';
import BannerTitle from '../../components/BannerTitle';



const Users = () => {
  const [userList, setUserList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getUserList();
  }, []);

  const getUserList = async () => {
    try {
      const response = await API.get('/api/admin/users/');
      setUserList(response.data);
      
    } catch (error) {
      console.error(error);
    }
  };

  // Filter users based on search query (name or email)
  const filteredUsers = userList.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAdminStatus = (userId, isStaff) => {
    API.patch(`api/admin/users/${userId}/`, { is_staff: !isStaff })
      .then(() => {
        setUserList((prevUserList) =>
          prevUserList.map((user) =>
            user.id === userId ? { ...user, is_staff: !isStaff } : user
          )
        );
      })
      .catch((err) => alert('Error updating admin status: ' + err));
  };

  const toggleActiveStatus = (userId, isActive) => {
    API.patch(`api/admin/users/${userId}/`, { is_active: !isActive })
      .then(() => {
        setUserList((prevUserList) =>
          prevUserList.map((user) =>
            user.id === userId ? { ...user, is_active: !isActive } : user
          )
        );
      })
      .catch((err) => alert('Error updating active status: ' + err));
  };

  return (
    <>
    <BannerTitle title="Users" />
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Search Box */}
        <div className="relative">
          <label htmlFor="default-search" className="sr-only">Search</label>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
          </div>
          <input
            type="search"
            id="default-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-50 p-4 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 mb-2"
            placeholder="Search by name or email"
            required
          />

        </div>

        {/* User Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user, index) => (
            <UserCard key={index} user={user} toggleAdminStatus={toggleAdminStatus} toggleActiveStatus={toggleActiveStatus} />
          ))}
        </div>
      </div>
    </div>
    </>
  );
};

export default Users;