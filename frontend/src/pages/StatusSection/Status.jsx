import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/useUserStore';
import useStatusStore from '../../store/useStatusStore';
import { Layout } from '../../components/Layout';
import StatusPreview from './StatusPreview';
import StatusCreator from './StatusCreator';
import { motion } from 'framer-motion';
import { FaPlus } from 'react-icons/fa';
import formatTimestamp from '../../utils/formatTime';
import StatusList from './StatusList';

const Status = () => {
  // Instead of storing the full contact object (which goes stale after delete),
  // we store just the userId and derive the contact live from the store on each render.
  const [previewUserId, setPreviewUserId] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showCreator, setShowCreator] = useState(false);

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const {
    loading,
    fetchStatuses,
    viewStatus,
    deleteStatus,
    getUserStatuses,
    getOtherStatuses,
    initializeSocket,
    cleanUpSocket,
  } = useStatusStore();

  // Derived live from store — auto-updates when a status is deleted/added
  const userStatuses = getUserStatuses(user?._id);
  const otherStatuses = getOtherStatuses(user?._id);

  const previewContact = previewUserId
    ? previewUserId === user?._id
      ? userStatuses
      : otherStatuses.find((c) => c.id === previewUserId) ?? null
    : null;

  useEffect(() => {
    fetchStatuses();
    initializeSocket();
    return () => cleanUpSocket();
  }, [cleanUpSocket, fetchStatuses, initializeSocket]);

  // If the previewed contact disappears from store (all statuses deleted), close preview
  useEffect(() => {
    if (previewUserId && !previewContact) {
      setPreviewUserId(null);
      setCurrentStatusIndex(0);
    }
  }, [previewContact, previewUserId]);

  // Clamp index if statuses shrink
  useEffect(() => {
    if (previewContact && currentStatusIndex >= previewContact.statuses.length) {
      setCurrentStatusIndex(Math.max(0, previewContact.statuses.length - 1));
    }
  }, [previewContact, currentStatusIndex]);

  const handlePreviewClose = () => {
    setPreviewUserId(null);
    setCurrentStatusIndex(0);
  };

  const handlePreviewNext = () => {
    if (!previewContact) return;
    if (currentStatusIndex < previewContact.statuses.length - 1) {
      const next = currentStatusIndex + 1;
      setCurrentStatusIndex(next);
      if (previewContact.statuses[next]) viewStatus(previewContact.statuses[next].id);
    } else {
      handlePreviewClose();
    }
  };

  const handlePreviewPrev = () => {
    setCurrentStatusIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleStatusPreview = (contact, statusIndex = 0) => {
    setPreviewUserId(contact.id);
    setCurrentStatusIndex(statusIndex);
    if (contact.statuses[statusIndex]) viewStatus(contact.statuses[statusIndex].id);
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      await deleteStatus(statusId);
      // After store update, re-derive the live contact
      const liveContact = previewUserId === user?._id
        ? useStatusStore.getState().getUserStatuses(user?._id)
        : useStatusStore.getState().getOtherStatuses(user?._id).find((c) => c.id === previewUserId);

      if (!liveContact || liveContact.statuses.length === 0) {
        handlePreviewClose();
      } else if (currentStatusIndex >= liveContact.statuses.length) {
        setCurrentStatusIndex(liveContact.statuses.length - 1);
      }
    } catch (err) {
      console.error('Error deleting status:', err);
    }
  };

  const bg = theme === 'dark' ? 'bg-[rgb(12,19,24)]' : 'bg-gray-100';
  const cardBg = theme === 'dark' ? 'bg-[rgb(17,27,33)]' : 'bg-white';
  const subtext = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <Layout>
      {/* Status Preview Portal */}
      {previewContact &&
        ReactDOM.createPortal(
          <StatusPreview
            contact={previewContact}
            currentIndex={Math.min(currentStatusIndex, previewContact.statuses.length - 1)}
            onClose={handlePreviewClose}
            onNext={handlePreviewNext}
            onPrev={handlePreviewPrev}
            onDelete={handleDeleteStatus}
            currentUser={user}
            loading={loading}
          />,
          document.body,
        )}

      {/* Status Creator Portal */}
      {showCreator &&
        ReactDOM.createPortal(
          <StatusCreator onClose={() => { setShowCreator(false); fetchStatuses(); }} />,
          document.body,
        )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`flex-1 h-screen border-r ${bg} ${theme === 'dark' ? 'border-gray-600 text-white' : 'text-black'}`}
      >
        {/* Header */}
        <div className={`flex justify-between items-center shadow-sm ${cardBg} px-4 py-4`}>
          <h2 className="text-xl font-semibold">Status</h2>
        </div>

        <div className="overflow-y-auto h-[calc(100vh-64px)]">

          {/* My Status */}
          <div className={`flex items-center gap-3 p-4 ${cardBg}`}>
            <div
              className="relative cursor-pointer shrink-0"
              onClick={() => userStatuses ? handleStatusPreview(userStatuses) : setShowCreator(true)}
            >
              {userStatuses ? (
                <div className="relative w-14 h-14">
                  <img src={user?.profilePicture} alt={user?.username}
                    className="w-14 h-14 rounded-full object-cover" />
                  <svg className="absolute inset-0 w-14 h-14" viewBox="0 0 100 100">
                    {userStatuses.statuses.map((_, index) => {
                      const total = userStatuses.statuses.length;
                      const circumference = 2 * Math.PI * 46;
                      const segmentLength = circumference / total - 3;
                      const gap = 3;
                      const offset = index * (segmentLength + gap);
                      return (
                        <circle key={index} cx="50" cy="50" r="46" fill="none"
                          stroke="#25D366" strokeWidth="4"
                          strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                          strokeDashoffset={-(offset - circumference * 0.25)} />
                      );
                    })}
                  </svg>
                  <button
                    className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-0.75 z-10"
                    onClick={(e) => { e.stopPropagation(); setShowCreator(true); }}>
                    <FaPlus className="h-2 w-2" />
                  </button>
                </div>
              ) : (
                <div className="relative w-14 h-14">
                  <div className="rounded-full p-0.75 bg-green-500">
                    <div className={`rounded-full p-0.5 ${cardBg}`}>
                      <img src={user?.profilePicture} alt={user?.username}
                        className="w-11 h-11 rounded-full object-cover block" />
                    </div>
                  </div>
                  <button
                    className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-0.75 z-10"
                    onClick={(e) => { e.stopPropagation(); setShowCreator(true); }}>
                    <FaPlus className="h-2 w-2" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 cursor-pointer"
              onClick={() => userStatuses ? handleStatusPreview(userStatuses) : setShowCreator(true)}>
              <p className="font-semibold text-sm">My Status</p>
              <p className={`text-xs ${subtext}`}>
                {userStatuses
                  ? `${userStatuses.statuses.length} status${userStatuses.statuses.length > 1 ? 'es' : ''} · ${formatTimestamp(userStatuses.statuses[userStatuses.statuses.length - 1].timestamp)}`
                  : 'Tap to add status update'}
              </p>
            </div>

            <button
              onClick={() => setShowCreator(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-600 text-white transition shrink-0">
              <FaPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Status skeleton while loading */}
          {loading && otherStatuses.length === 0 && (
            <div className={`mt-2 ${cardBg}`}>
              <div className={`h-4 w-28 rounded animate-pulse mx-4 mt-4 mb-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
              {[...Array(4)].map((_, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-12 h-12 rounded-full shrink-0 animate-pulse ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
                    <div className="flex-1 space-y-2">
                      <div className={`h-3.5 w-28 rounded-full animate-pulse ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
                      <div className={`h-3 w-20 rounded-full animate-pulse ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'}`} />
                    </div>
                  </div>
                  {i < 3 && <hr className={`mx-4 ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-100'}`} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Other statuses */}
          {otherStatuses.length > 0 && (
            <div className={`mt-2 ${cardBg}`}>
              <p className={`px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide ${subtext}`}>
                Recent updates
              </p>
              {otherStatuses.map((contact, index) => (
                <React.Fragment key={contact.id}>
                  <div className="px-3">
                    <StatusList contact={contact} onPreview={() => handleStatusPreview(contact)} theme={theme} />
                  </div>
                  {index < otherStatuses.length - 1 && (
                    <hr className={`mx-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && otherStatuses.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-12 text-center px-8">
              <div className="text-6xl mb-4">📱</div>
              <h3 className={`text-lg mb-1 font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No status updates
              </h3>
              <p className={`text-sm ${subtext}`}>
                Be the first to share a status update
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
};

export default Status;
