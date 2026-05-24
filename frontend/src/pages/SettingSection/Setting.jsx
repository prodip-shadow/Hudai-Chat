import React from 'react';
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
  const { theme, setTheme } = useThemeStore();
  const { user, clearUser } = useUserStore();

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearUser();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const rowClass = `flex items-center gap-3 px-3 py-3.5 rounded-lg cursor-pointer transition-colors ${
    theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-100 text-gray-800'
  }`;

  const dividerClass = `mx-3 h-px ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`;

  return (
    <Layout>
      <div className={`flex h-full flex-col ${theme === 'dark' ? 'bg-[rgb(17,27,33)] text-white' : 'bg-white text-black'}`}>

        {/* Header */}
        <div className={`px-4 pt-5 pb-3 shrink-0 ${theme === 'dark' ? 'bg-[rgb(17,27,33)]' : 'bg-white'}`}>
          <h1 className="text-xl font-semibold mb-3">Settings</h1>
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              placeholder="Search settings"
              className={`w-full ${theme === 'dark' ? 'bg-[#202c33] text-white placeholder-gray-500' : 'bg-gray-100 text-black placeholder-gray-400'} border-none pl-9 rounded-lg p-2.5 text-sm outline-none`}
            />
          </div>
        </div>

        {/* Profile card */}
        <Link
          to="/user-profile"
          className={`flex items-center gap-4 mx-3 p-3 rounded-xl mb-2 transition-colors ${
            theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'
          }`}
        >
          <img src={user?.profilePicture} alt="profile" className="w-14 h-14 rounded-full object-cover" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{user?.username}</h2>
            <p className="text-sm text-gray-400 truncate">{user?.about || 'Hey there! I am using Hudai Chat'}</p>
          </div>
        </Link>

        {/* Scrollable list */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-4">

          {/* Account section */}
          <div className={`mx-3 rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} mb-2`}>
            {[
              { icon: FaUser, label: 'Account', href: '/user-profile' },
              { icon: FaComments, label: 'Chats', href: '/' },
              { icon: FaQuestionCircle, label: 'Help', href: '/help' },
            ].map((item, index, arr) => (
              <React.Fragment key={item.label}>
                <Link to={item.href} className={rowClass}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-600/20' : 'bg-green-100'}`}>
                    <item.icon className={`h-4 w-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
                {index < arr.length - 1 && <div className={dividerClass} />}
              </React.Fragment>
            ))}
          </div>

          {/* Theme toggle row */}
          <div className={`mx-3 rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} mb-2`}>
            <div className={`flex items-center gap-3 px-3 py-3.5`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-600/20' : 'bg-indigo-100'}`}>
                {theme === 'dark'
                  ? <FaMoon className="h-4 w-4 text-indigo-400" />
                  : <FaSun className="h-4 w-4 text-indigo-500" />}
              </div>
              <span className={`text-sm font-medium flex-1 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Dark mode
              </span>
              {/* Toggle switch */}
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none ${
                  theme === 'dark' ? 'bg-green-500' : 'bg-gray-300'
                }`}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                    theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className={`mx-3 rounded-xl overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
            <button onClick={handleLogout} className={`${rowClass} w-full text-red-500`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10">
                <FaSignOutAlt className="h-4 w-4 text-red-500" />
              </div>
              <span className="text-sm font-medium">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Setting;
