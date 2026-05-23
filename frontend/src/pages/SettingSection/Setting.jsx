import React, { useState } from 'react';
import useThemeStore from '../../store/themeStore';
import { logoutUser } from '../../services/user.service';
import useUserStore from '../../store/useUserStore';
import { toast } from 'react-toastify';
import { Layout } from '../../components/Layout';
import { FaSearch } from 'react-icons/fa';

const Setting = () => {
  const [isThemeDialogueOpen, setIsDialogueOpen] = useState(false);

  const { theme } = useThemeStore();
  const { user, clearUser } = useUserStore();

  const toggleThemeDialog = () => {
    setIsDialogueOpen(!isThemeDialogueOpen);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearUser();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <Layout
      isThemeDialogOpen={isThemeDialogueOpen}
      toggleThemeDialog={toggleThemeDialog}
    >
      <div
        className={`flex h-screen ${theme === 'dark' ? 'bg-[rgb(17,27,33)] text-white' : 'bg-white text-black'}`}
      >
        <div
          className={`w-100  ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
        >
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-4">Settings</h1>

            <div className="relative mb-4">
              <FaSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search settings"
                className={`w-full ${theme === 'dark' ? 'bg-[#202c33] text-white' : 'bg-gray-100 text-black '} border-none pl-10 placeholder:gray-400 rounded p-2`}
              />
            </div>
          </div>

          <div
            className={`flex items-center gap-4 p-3 ${theme === 'dark' ? 'hover:bg-[#202c33] ' : 'hover:bg-gray-100'} cursor-pointer rounded-lg mb-4`}
            onClick={toggleThemeDialog}
          >
            <img
              src={user.profilePicture}
              alt="profile"
              className="w-14 h-14 rounded-full"
            />

            <div>
              <h2 className="font-semibold">{user?.username}</h2>
              <p className="text-sm text-gray-400">{user?.about}</p>
            </div>
          </div>


                {/* Menu items */}
            

        </div>
      </div>
    </Layout>
  );
};

export default Setting;
