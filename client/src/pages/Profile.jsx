import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import ProfileForm from '../components/profile/ProfileForm';
import PasswordForm from '../components/profile/PasswordForm';
import ManagerCard from '../components/profile/ManagerCard';
import DistrictCard from '../components/profile/DistrictCard';
import { useAuth } from '../context/AuthContext';
import useManagerOverview from '../hooks/useManagerOverview';

export default function Profile() {
  const { user, setUser } = useAuth();
  const role = user?.role || 'farmer';
  const isFarmer = role === 'farmer';
  const isManager = role === 'manager';
  const hasApprovedDevices = Boolean(user?.devices?.length);
  const managerOverview = useManagerOverview(isManager);

  return (
    <div className="bg-background text-on-background font-body-sm antialiased h-screen flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 md:ml-sidebar-width mt-[64px] md:mt-0 h-full overflow-y-auto w-full bg-background relative">
        <Header title="Profile" showDevice={isFarmer && hasApprovedDevices} />

        <div className="p-container-padding md:p-8 max-w-[1200px] mx-auto pb-24 md:pb-8">
          <div className="mb-6">
            <h2 className="font-headline-md text-headline-md font-bold text-on-background">
              Account Settings
            </h2>
            <p className="text-secondary text-body-sm mt-1">
              Manage your personal information and account credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <ProfileForm user={user} setUser={setUser} />
              <PasswordForm />
            </div>

            <div className="lg:col-span-4 space-y-6">
              {isFarmer && (
                <ManagerCard manager={user?.manager} district={user?.district} />
              )}
              {isManager && (
                <DistrictCard division={user?.division} district={user?.district} farmerCount={managerOverview.data?.farmerCount} deviceCount={managerOverview.data?.deviceCount} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
