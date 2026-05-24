import React, { useState } from 'react';
import useThemeStore from '../../store/themeStore';
import { logoutUser } from '../../services/user.service';
import useUserStore from '../../store/useUserStore';
import { toast } from 'react-toastify';
import { Layout } from '../../components/Layout';
import {
  FaComments,
  FaMoon,
  FaQuestionCircle,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaUser,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

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
        className={`flex min-h-screen ${theme === 'dark' ? 'bg-[rgb(17,27,33)] text-white' : 'bg-white text-black'}`}
      >
        <div
          className={`w-full border-r  ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}
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
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-1">
                {[
                  { icon: FaUser, label: 'Account', href: '/user-profile' },
                  { icon: FaComments, label: 'Chats', href: '/' },
                  { icon: FaQuestionCircle, label: 'Help', href: '/help' },
                ].map((item, index) => (
                  <Link
                    to={item.href}
                    key={item.label}
                    className={`w-full flex items-center gap-3 p-2 rounded ${theme === 'dark' ? 'hover:bg-[#202c33] text-white' : ' text-black hover:bg-gray-100'}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <div
                      className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} w-full p-4`}
                    >
                      {item.label}
                    </div>
                  </Link>
                ))}

                {/* Theme Button */}

                <button
                  onClick={toggleThemeDialog}
                  className={`w-full pl-2  flex items-center gap-3  rounded ${theme === 'dark' ? 'hover:bg-[#202c33] text-white' : ' text-black hover:bg-gray-100'}`}
                >
                  {theme === 'dark' ? (
                    <FaMoon className="h-5 w-5" />
                  ) : (
                    <FaSun className="h-5 w-5" />
                  )}

                  <div
                    className={`flex w-full  items-center justify-between  border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-2`}
                  >
                    Theme
                    <span className="ml-auto text-sm text-gray-400">
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </span>
                  </div>
                </button>
              </div>

              <button
                className={`w-full flex items-center gap-3 p-2 rounded mt-10 md:mt-36 text-red-500 ${theme === 'dark' ? 'hover:bg-[#202c33] text-white' : ' text-black hover:bg-gray-100'}`}
                onClick={handleLogout}
              >
                <FaSignOutAlt className="h-5 w-5 " />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Setting;
