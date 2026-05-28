import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaCommentDots, FaUserMinus } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import useThemeStore from '../../store/themeStore';
import useFriendStore from '../../store/useFriendStore';
import useLayoutStore from '../../store/layoutStore';

const AllFriends = () => {
  const { theme } = useThemeStore();
  const { friends, fetchAllFriends, unfriend } = useFriendStore();
  const { setSelectedContact, setActiveTab } = useLayoutStore();
  const navigate = useNavigate();
  const [unfriending, setUnfriending] = useState(null);

  useEffect(() => {
    fetchAllFriends();
  }, []);

  const handleChat = (friend) => {
    setSelectedContact(friend);
    setActiveTab('chats');
    navigate('/');
  };

  const handleUnfriend = async (friendId) => {
    setUnfriending(friendId);
    try {
      await unfriend(friendId);
    } finally {
      setUnfriending(null);
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
        <h2 className="text-xl font-bold">All Friends</h2>
        <p className={`text-xs mt-0.5 ${subtext}`}>{friends.length} friend{friends.length !== 1 ? 's' : ''}</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {friends.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 ${subtext}`}>
            <p className="text-sm">No friends yet</p>
          </div>
        ) : (
          <div className={`mt-2 ${cardBg}`}>
            {friends.map((friend, index) => (
              <React.Fragment key={friend._id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="relative shrink-0">
                    <img
                      src={friend.profilePicture}
                      alt={friend.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {friend.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{friend.username}</p>
                    {friend.about && (
                      <p className={`text-xs truncate ${subtext}`}>{friend.about}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleChat(friend)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
                      title="Chat"
                    >
                      <FaCommentDots className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleUnfriend(friend._id)}
                      disabled={unfriending === friend._id}
                      className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                        theme === 'dark'
                          ? 'bg-gray-700 hover:bg-red-900/50 text-gray-300 hover:text-red-400'
                          : 'bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-red-500'
                      }`}
                      title="Unfriend"
                    >
                      <FaUserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {index < friends.length - 1 && (
                  <hr className={`mx-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AllFriends;
