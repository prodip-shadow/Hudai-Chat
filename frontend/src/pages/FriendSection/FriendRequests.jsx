import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaCheck, FaTimes } from 'react-icons/fa';
import useThemeStore from '../../store/themeStore';
import useFriendStore from '../../store/useFriendStore';
import formatTimestamp from '../../utils/formatTime';

const FriendRequests = () => {
  const { theme } = useThemeStore();
  const {
    sentRequests,
    receivedRequests,
    fetchSentRequests,
    fetchReceivedRequests,
    cancelRequest,
    acceptRequest,
    declineRequest,
  } = useFriendStore();

  const [activeTab, setActiveTab] = useState('received');
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    fetchSentRequests();
    fetchReceivedRequests();
  }, []);

  const handleAction = async (fn, ...args) => {
    setActioning(args[0]);
    try {
      await fn(...args);
    } finally {
      setActioning(null);
    }
  };

  const cardBg = theme === 'dark' ? 'bg-[rgb(17,27,33)]' : 'bg-white';
  const bg = theme === 'dark' ? 'bg-[rgb(12,19,24)]' : 'bg-gray-100';
  const text = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const subtext = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const tabActive = theme === 'dark' ? 'border-green-400 text-green-400' : 'border-green-500 text-green-600';
  const tabInactive = theme === 'dark' ? 'border-transparent text-gray-400' : 'border-transparent text-gray-500';

  const EmptyState = ({ label }) => (
    <div className={`flex flex-col items-center justify-center py-16 ${subtext}`}>
      <p className="text-sm">{label}</p>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col h-full ${bg} ${text}`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-0 ${cardBg} shadow-sm`}>
        <h2 className="text-xl font-bold mb-3">Friend Requests</h2>

        {/* Tabs */}
        <div className="flex">
          {['received', 'sent'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 capitalize transition-colors ${
                activeTab === tab ? tabActive : tabInactive
              }`}
            >
              {tab === 'received' ? 'Received' : 'Sent'}
              {tab === 'received' && receivedRequests.length > 0 && (
                <span className="ml-1.5 bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {receivedRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'received' ? (
          receivedRequests.length === 0 ? (
            <EmptyState label="No received requests" />
          ) : (
            <div className={`mt-2 ${cardBg}`}>
              {receivedRequests.map((req, index) => (
                <React.Fragment key={req._id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <img
                      src={req.sender?.profilePicture}
                      alt={req.sender?.username}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{req.sender?.username}</p>
                      <p className={`text-xs ${subtext}`}>{formatTimestamp(req.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(acceptRequest, req._id)}
                        disabled={actioning === req._id}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors disabled:opacity-50"
                        title="Accept"
                      >
                        <FaCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleAction(declineRequest, req._id)}
                        disabled={actioning === req._id}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                          theme === 'dark'
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                        }`}
                        title="Decline"
                      >
                        <FaTimes className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {index < receivedRequests.length - 1 && (
                    <hr className={`mx-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )
        ) : sentRequests.length === 0 ? (
          <EmptyState label="No sent requests" />
        ) : (
          <div className={`mt-2 ${cardBg}`}>
            {sentRequests.map((req, index) => (
              <React.Fragment key={req._id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={req.receiver?.profilePicture}
                    alt={req.receiver?.username}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{req.receiver?.username}</p>
                    <p className={`text-xs ${subtext}`}>{formatTimestamp(req.createdAt)}</p>
                  </div>

                  <button
                    onClick={() => handleAction(cancelRequest, req._id, req.receiver?._id)}
                    disabled={actioning === req._id}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                      theme === 'dark'
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                    }`}
                  >
                    {actioning === req._id ? '...' : 'Cancel'}
                  </button>
                </div>
                {index < sentRequests.length - 1 && (
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

export default FriendRequests;
