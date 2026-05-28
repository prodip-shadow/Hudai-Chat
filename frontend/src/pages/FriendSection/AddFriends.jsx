import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaSearch, FaUserPlus, FaCheck } from 'react-icons/fa';
import useThemeStore from '../../store/themeStore';
import useFriendStore from '../../store/useFriendStore';

const AddFriends = () => {
  const { theme } = useThemeStore();
  const { discoverUsers, loading, fetchDiscoverUsers, sendRequest } = useFriendStore();
  const [search, setSearch] = useState('');
  const [sentIds, setSentIds] = useState(new Set());
  const [sending, setSending] = useState(null);

  useEffect(() => {
    fetchDiscoverUsers();
  }, []);

  const filtered = discoverUsers.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSend = async (userId) => {
    setSending(userId);
    try {
      await sendRequest(userId);
      setSentIds((prev) => new Set([...prev, userId]));
    } catch {
      // error handled in store
    } finally {
      setSending(null);
    }
  };

  const bg = theme === 'dark' ? 'bg-[rgb(12,19,24)]' : 'bg-gray-100';
  const cardBg = theme === 'dark' ? 'bg-[rgb(17,27,33)]' : 'bg-white';
  const text = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const subtext = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col h-full ${bg} ${text}`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 ${cardBg} shadow-sm`}>
        <h2 className="text-xl font-bold mb-3">Add Friends</h2>
        <div className="relative">
          <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${subtext}`} />
          <input
            type="text"
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${
              theme === 'dark'
                ? 'bg-[#202c33] text-white placeholder-gray-500'
                : 'bg-gray-100 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className={`text-sm ${subtext}`}>No new people to add</p>
          </div>
        ) : (
          <div className={`mt-2 ${cardBg}`}>
            {filtered.map((user, index) => {
              const isSent = sentIds.has(user._id);
              const isSending = sending === user._id;

              return (
                <React.Fragment key={user._id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <img
                      src={user.profilePicture}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{user.username}</p>
                      {user.about && (
                        <p className={`text-xs truncate ${subtext}`}>{user.about}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleSend(user._id)}
                      disabled={isSent || isSending}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        isSent
                          ? theme === 'dark'
                            ? 'bg-gray-700 text-gray-400'
                            : 'bg-gray-100 text-gray-400'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <FaCheck className="h-3 w-3" />
                          Sent
                        </>
                      ) : (
                        <>
                          <FaUserPlus className="h-3 w-3" />
                          {isSending ? '...' : 'Add'}
                        </>
                      )}
                    </button>
                  </div>
                  {index < filtered.length - 1 && (
                    <hr className={`mx-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AddFriends;
