import React, { useState, useEffect } from 'react';
import UserCard from './UserCard';
import API from '@/api/axios';
import BannerTitle from '../../components/BannerTitle';
import Spinner from '@/components/Spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PageIntro } from '@/components/ui/page-intro';
import { SearchBar } from '@/components/ui/search-bar';
import { SurfaceCard } from '@/components/ui/surface-card';

const Users = () => {
  const [userList, setUserList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getUserList();
  }, []);

  const getUserList = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.get('/api/admin/users/');
      setUserList(response.data);
    } catch (error) {
      console.error(error);
      setError('Unable to load users right now.');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search query (name or email)
  const filteredUsers = userList.filter(
    (user) => {
      const name = (user?.name || '').toLowerCase();
      const email = (user?.email || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      return name.includes(query) || email.includes(query);
    }
  );


  return (
    <>
    <BannerTitle title="Users" />
    <SurfaceCard>
      <PageIntro
        eyebrow="Directory"
        title="Team Directory"
        description="Search and review registered users."
      />
      <div className="max-w-7xl mx-auto">
        <SearchBar
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email"
            className="mb-6 md:w-80"
            aria-label="Search users"
          />

        {loading && <Spinner />}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && filteredUsers.length === 0 && (
          <EmptyState
            title="No users matched your search"
            description="Try a different name or email to find the user you are looking for."
          />
        )}

        {!loading && !error && filteredUsers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
        )}
      </div>
    </SurfaceCard>
    </>
  );
};

export default Users;
