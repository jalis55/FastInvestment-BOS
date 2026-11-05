import { useApiQuery } from '@/hooks/use-api-query';
import { QueryState } from '@/components/ui/query-state';
import React, { useState } from 'react';
import UserCard from './UserCard';
import BannerTitle from '../../components/BannerTitle';
import { EmptyState } from '@/components/ui/empty-state';
import { PageIntro } from '@/components/ui/page-intro';
import { SearchBar } from '@/components/ui/search-bar';
import { SurfaceCard } from '@/components/ui/surface-card';

const Users = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: userList, loading, error, refetch } = useApiQuery('/api/admin/users/');

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

        <QueryState loading={loading} error={error} onRetry={refetch}><span /></QueryState>

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
