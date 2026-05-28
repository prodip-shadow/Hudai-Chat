import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useThemeStore from '../store/themeStore';
import useUserStore from '../store/useUserStore';
import useLayoutStore from '../store/layoutStore';
import useFriendStore from '../store/useFriendStore';
import { FaUserCircle, FaCog, FaUserPlus, FaUserFriends, FaBell } from 'react-icons/fa';
import { MdRadioButtonChecked } from 'react-icons/md';
import { motion } from 'framer-motion';
import Logo from '../images/logo.png';


const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActiveTab, selectedContact } = useLayoutStore();
  const { receivedCount } = useFriendStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === '/') {
      setActiveTab('chats');
    } else if (location.pathname === '/status') {
      setActiveTab('status');
    } else if (location.pathname === '/user-profile') {
      setActiveTab('profile');
    } else if (location.pathname === '/setting') {
      setActiveTab('setting');
    } else if (location.pathname === '/add-friends') {
      setActiveTab('add-friends');
    } else if (location.pathname === '/friend-requests') {
      setActiveTab('friend-requests');
    } else if (location.pathname === '/all-friends') {
      setActiveTab('all-friends');
    }
  }, [location, setActiveTab]);

  if (isMobile && selectedContact) {
    return null;
  }

  const iconClass = (tab) =>
    `h-6 w-6 ${activeTab === tab ? (theme === 'dark' ? 'text-gray-800' : '') : theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`;

  const linkClass = (tab) =>
    `${isMobile ? '' : 'mb-8'} relative ${activeTab === tab ? 'bg-gray-300 shadow-sm p-2 rounded-full' : ''} focus:outline-none`;

  const SidebarContent = (
    <>
      {/* Chats */}
      <Link to={'/'} className={linkClass('chats')}>
        <img src={Logo} className={iconClass('chats')} alt="Logo" />
      </Link>

      {/* Status */}
      <Link to={'/status'} className={linkClass('status')}>
        <MdRadioButtonChecked className={iconClass('status')} />
      </Link>

      {/* Add Friends */}
      <Link to={'/add-friends'} className={linkClass('add-friends')}>
        <FaUserPlus className={iconClass('add-friends')} />
      </Link>

      {/* Friend Requests (with badge) */}
      <Link to={'/friend-requests'} className={linkClass('friend-requests')}>
        <FaBell className={iconClass('friend-requests')} />
        {receivedCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 flex items-center justify-center bg-green-500 text-white text-[10px] font-bold rounded-full px-0.5">
            {receivedCount > 99 ? '99+' : receivedCount}
          </span>
        )}
      </Link>

      {/* All Friends */}
      <Link to={'/all-friends'} className={linkClass('all-friends')}>
        <FaUserFriends className={iconClass('all-friends')} />
      </Link>

      {!isMobile && <div className="grow" />}

      {/* Profile */}
      <Link to={'/user-profile'} className={linkClass('profile')}>
        {user?.profilePicture ? (
          <img src={user.profilePicture} alt="User" className="h-6 w-6 rounded-full" />
        ) : (
          <FaUserCircle className={iconClass('profile')} />
        )}
      </Link>

      {/* Settings */}
      <Link to={'/setting'} className={linkClass('setting')}>
        <FaCog className={iconClass('setting')} />
      </Link>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${isMobile ? 'fixed bottom-0 left-0 right-0 h-14 z-50' : 'w-16 h-screen border-r-2'} ${theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-[rgb(239,242,245)] border-gray-300'} flex items-center py-2 shadow-lg ${isMobile ? 'flex-row justify-around px-4' : 'flex-col justify-between py-4'}`}
    >
      {SidebarContent}
    </motion.div>
  );
};

export default Sidebar;
