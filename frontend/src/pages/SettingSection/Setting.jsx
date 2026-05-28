import useThemeStore from '../../store/themeStore';
import { logoutUser } from '../../services/user.service';
import useUserStore from '../../store/useUserStore';
import { toast } from 'react-toastify';
import {
  FaComments,
  FaMoon,
  FaQuestionCircle,
  FaSignOutAlt,
  FaSun,
  FaUser,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { MdChevronRight } from 'react-icons/md';

const Setting = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, clearUser } = useUserStore();
  const dark = theme === 'dark';

  const toggleTheme = () => setTheme(dark ? 'light' : 'dark');

  const handleLogout = async () => {
    try {
      await logoutUser();
      clearUser();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const Row = ({ icon: Icon, label, href, onClick, danger, right }) => {
    const cls = `flex items-center gap-3 px-4 py-3.5 w-full text-left transition-colors ${
      danger
        ? dark
          ? 'hover:bg-white/5 text-red-400'
          : 'hover:bg-red-50 text-red-500'
        : dark
          ? 'hover:bg-white/5 text-gray-200'
          : 'hover:bg-gray-50 text-gray-800'
    }`;

    const content = (
      <>
        <Icon
          className={`h-4 w-4 shrink-0 ${danger ? 'text-red-400' : dark ? 'text-gray-400' : 'text-gray-500'}`}
        />
        <span className="text-sm flex-1">{label}</span>
        {right || (
          <MdChevronRight
            className={`h-4 w-4 ${dark ? 'text-gray-600' : 'text-gray-300'}`}
          />
        )}
      </>
    );

    if (href)
      return (
        <Link to={href} className={cls}>
          {content}
        </Link>
      );
    return (
      <button onClick={onClick} className={cls}>
        {content}
      </button>
    );
  };

  const divider = (
    <div className={`mx-4 h-px ${dark ? 'bg-white/5' : 'bg-gray-100'}`} />
  );

  return (
    <div
      className={`flex h-full flex-col ${dark ? 'bg-[rgb(17,27,33)] text-white' : 'bg-[#f0f2f5] text-black'}`}
    >
      {/* Header */}
      <div
        className={`px-4 pt-5 pb-3 shrink-0 ${dark ? 'bg-[rgb(17,27,33)]' : 'bg-[#f0f2f5]'}`}
      >
        <h1
          className={`text-lg font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}
        >
          Settings
        </h1>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Profile */}
        <Link
          to="/user-profile"
          className={`flex items-center gap-3 px-4 py-3 mb-2 transition-colors ${
            dark ? 'bg-[#202c33] hover:bg-white/5' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <img
            src={user?.profilePicture}
            alt=""
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p
              className={`font-semibold text-sm truncate ${dark ? 'text-white' : 'text-gray-900'}`}
            >
              {user?.username}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {user?.about || 'Hey there! I am using Hudai Chat'}
            </p>
          </div>
          <MdChevronRight
            className={`h-5 w-5 shrink-0 ${dark ? 'text-gray-600' : 'text-gray-300'}`}
          />
        </Link>

        {/* Menu group */}
        <div className={`${dark ? 'bg-[#202c33]' : 'bg-white'} mb-2`}>
          <Row icon={FaUser} label="Account" href="/user-profile" />
          {divider}
          <Row icon={FaComments} label="Chats" href="/" />
          {divider}
          <Row icon={FaQuestionCircle} label="Help" href="/help" />
        </div>

        {/* Theme toggle */}
        <div className={`${dark ? 'bg-[#202c33]' : 'bg-white'} mb-2`}>
          <Row
            icon={dark ? FaMoon : FaSun}
            label="Dark mode"
            onClick={toggleTheme}
            right={
              <button
                onClick={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}
                className={`relative w-10 h-5.5 rounded-full transition-colors duration-300 focus:outline-none ${dark ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${dark ? 'translate-x-4.5' : 'translate-x-0'}`}
                />
              </button>
            }
          />
        </div>

        {/* Logout */}
        <div className={`${dark ? 'bg-[#202c33]' : 'bg-white'}`}>
          <Row
            icon={FaSignOutAlt}
            label="Log out"
            onClick={handleLogout}
            danger
            right={null}
          />
        </div>
      </div>
    </div>
  );
};

export default Setting;
