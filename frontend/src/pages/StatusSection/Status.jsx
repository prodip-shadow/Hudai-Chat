import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/useUserStore';
import useStatusStore from '../../store/useStatusStore';
import { Layout } from '../../components/Layout';
import StatusPreview from './StatusPreview';
import { motion } from 'framer-motion';
import { RxCross2 } from 'react-icons/rx';
import { FaCamera, FaPlus } from 'react-icons/fa';
import formatTimestamp from '../../utils/formatTime';
import StatusList from './StatusList';

const Status = () => {
  const [previewContact, setPreviewContact] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [filePreview, setFilePreview] = useState(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const {
    loading,
    error,
    fetchStatuses,
    createStatus,
    viewStatus,
    deleteStatus,
    getUserStatuses,
    getOtherStatuses,
    clearError,
    initializeSocket,
    cleanUpSocket,
  } = useStatusStore();

  const userStatuses = getUserStatuses(user?._id);
  const otherStatuses = getOtherStatuses(user?._id);

  useEffect(() => {
    fetchStatuses();
    initializeSocket();
    return () => cleanUpSocket();
  }, [cleanUpSocket, fetchStatuses, initializeSocket]);

  useEffect(() => {
    return () => clearError();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleCreateStatus = async () => {
    if (!newStatus.trim() && !selectedFile) return;
    try {
      await createStatus({ content: newStatus, file: selectedFile });
      setNewStatus('');
      setSelectedFile(null);
      setFilePreview(null);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error creating status:', err);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      await deleteStatus(statusId);
      // If only one status left, close preview
      if (previewContact?.statuses.length <= 1) {
        handlePreviewClose();
      } else {
        // Move to previous or stay
        setCurrentStatusIndex((prev) => Math.max(prev - 1, 0));
      }
    } catch (err) {
      console.error('Error deleting status:', err);
    }
  };

  const handlePreviewClose = () => {
    setPreviewContact(null);
    setCurrentStatusIndex(0);
  };

  const handlePreviewNext = () => {
    if (currentStatusIndex < previewContact.statuses.length - 1) {
      const nextIndex = currentStatusIndex + 1;
      setCurrentStatusIndex(nextIndex);
      if (previewContact.statuses[nextIndex]) {
        viewStatus(previewContact.statuses[nextIndex].id);
      }
    } else {
      handlePreviewClose();
    }
  };

  const handlePreviewPrev = () => {
    setCurrentStatusIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleStatusPreview = (contact, statusIndex = 0) => {
    setPreviewContact(contact);
    setCurrentStatusIndex(statusIndex);
    if (contact.statuses[statusIndex]) {
      viewStatus(contact.statuses[statusIndex].id);
    }
  };

  const bg = theme === 'dark' ? 'bg-[rgb(12,19,24)]' : 'bg-gray-100';
  const cardBg = theme === 'dark' ? 'bg-[rgb(17,27,33)]' : 'bg-white';

  return (
    <Layout>
      {previewContact &&
        ReactDOM.createPortal(
          <StatusPreview
            contact={previewContact}
            currentIndex={currentStatusIndex}
            onClose={handlePreviewClose}
            onNext={handlePreviewNext}
            onPrev={handlePreviewPrev}
            onDelete={handleDeleteStatus}
            currentUser={user}
            loading={loading}
          />,
          document.body,
        )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`flex-1 h-screen border-r ${bg} ${theme === 'dark' ? 'border-gray-600 text-white' : 'text-black'}`}
      >
        {/* Header */}
        <div className={`flex justify-between items-center shadow-md ${cardBg} p-4`}>
          <h2 className="text-xl font-semibold">Status</h2>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-2 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError}>
              <RxCross2 className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto h-[calc(100vh-64px)]">

          {/* My Status */}
          <div className={`flex items-center gap-3 p-3 ${cardBg}`}>
            {/* Avatar with ring */}
            <div
              className="relative cursor-pointer shrink-0"
              onClick={() =>
                userStatuses ? handleStatusPreview(userStatuses) : setShowCreateModal(true)
              }
            >
              {userStatuses ? (
                // Segmented ring when has statuses
                <div className="relative w-14 h-14">
                  <img
                    src={user?.profilePicture}
                    alt={user?.username}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <svg className="absolute inset-0 w-14 h-14" viewBox="0 0 100 100">
                    {userStatuses.statuses.map((_, index) => {
                      const total = userStatuses.statuses.length;
                      const circumference = 2 * Math.PI * 46;
                      const segmentLength = circumference / total - 3;
                      const gap = 3;
                      const offset = index * (segmentLength + gap);
                      return (
                        <circle
                          key={index}
                          cx="50"
                          cy="50"
                          r="46"
                          fill="none"
                          stroke="#25D366"
                          strokeWidth="4"
                          strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                          strokeDashoffset={-(offset - circumference * 0.25)}
                        />
                      );
                    })}
                  </svg>
                  <button
                    className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-[3px] z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateModal(true);
                    }}
                  >
                    <FaPlus className="h-2 w-2" />
                  </button>
                </div>
              ) : (
                // Solid green ring when no status
                <div className="relative w-14 h-14">
                  <div className="rounded-full p-[3px] bg-green-500">
                    <div className={`rounded-full p-[2px] ${cardBg}`}>
                      <img
                        src={user?.profilePicture}
                        alt={user?.username}
                        className="w-11 h-11 rounded-full object-cover block"
                      />
                    </div>
                  </div>
                  <button
                    className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-[3px] z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCreateModal(true);
                    }}
                  >
                    <FaPlus className="h-2 w-2" />
                  </button>
                </div>
              )}
            </div>

            {/* Text */}
            <div
              className="flex-1 cursor-pointer"
              onClick={() =>
                userStatuses ? handleStatusPreview(userStatuses) : setShowCreateModal(true)
              }
            >
              <p className="font-semibold">My Status</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {userStatuses
                  ? `${userStatuses.statuses.length} status${userStatuses.statuses.length > 1 ? 'es' : ''} · ${formatTimestamp(userStatuses.statuses[userStatuses.statuses.length - 1].timestamp)}`
                  : 'Tap to add status update'}
              </p>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
            </div>
          )}

          {/* Other statuses */}
          {!loading && otherStatuses.length > 0 && (
            <div className={`mt-2 ${cardBg}`}>
              <p className={`px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Recent updates
              </p>
              {otherStatuses.map((contact, index) => (
                <React.Fragment key={contact.id}>
                  <div className="px-3">
                    <StatusList
                      contact={contact}
                      onPreview={() => handleStatusPreview(contact)}
                      theme={theme}
                    />
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
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                Be the first to share a status update
              </p>
            </div>
          )}
        </div>

        {/* Create Status Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-xl max-w-md w-full mx-4 shadow-xl ${theme === 'dark' ? 'bg-[rgb(17,27,33)]' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                Create Status
              </h3>

              {filePreview && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  {selectedFile?.type.startsWith('video/') ? (
                    <video src={filePreview} controls className="w-full h-40 object-cover" />
                  ) : (
                    <img src={filePreview} alt="preview" className="w-full h-40 object-cover" />
                  )}
                </div>
              )}

              <textarea
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                placeholder="What's on your mind?"
                className={`w-full p-3 border rounded-lg mb-4 resize-none ${
                  theme === 'dark'
                    ? 'bg-[rgb(12,19,24)] border-gray-600 text-white placeholder-gray-500'
                    : 'bg-gray-50 border-gray-200 text-black'
                }`}
                rows={3}
              />

              <label
                className={`flex items-center gap-2 cursor-pointer mb-5 px-4 py-2 rounded-lg border w-fit text-sm font-medium ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FaCamera className="h-4 w-4" />
                {selectedFile ? selectedFile.name : 'Choose Photo / Video'}
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewStatus('');
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm ${theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateStatus}
                  disabled={loading || (!newStatus.trim() && !selectedFile)}
                  className="px-4 py-2 text-white bg-green-500 rounded-lg text-sm hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Share'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </Layout>
  );
};

export default Status;
