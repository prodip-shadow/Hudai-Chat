import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaTrash, FaEye } from 'react-icons/fa';

const StatusPreview = ({
  contact,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onDelete,
  currentUser,
  loading,
}) => {
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const onNextRef = useRef(onNext);

  const currentStatus = contact?.statuses[currentIndex];
  const isOwner = contact?.id === currentUser?._id;

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    setShowViewers(false);
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      setProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        onNextRef.current();
      }
    }, 100);
    return () => {
      clearInterval(interval);
      setProgress(0);
    };
  }, [currentIndex, contact]);

  if (!currentStatus) return null;

  const handleDelete = () => {
    onDelete(currentStatus.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black"
    >
      <div className="relative w-full h-full">

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-20">
          {contact.statuses.map((_, index) => (
            <div key={index} className="h-[3px] bg-white/30 flex-1 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width:
                    index < currentIndex
                      ? '100%'
                      : index === currentIndex
                      ? `${progress}%`
                      : '0%',
                  transition: index === currentIndex ? 'width 0.1s linear' : 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-3">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/60"
            />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{contact.name}</p>
              <p className="text-white/60 text-xs">
                {currentStatus.timestamp
                  ? new Date(currentStatus.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isOwner && (
              <>
                <button
                  onClick={() => setShowViewers((v) => !v)}
                  className="text-white/80 hover:text-white transition-colors"
                  title="Who viewed"
                >
                  <FaEye className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-white/80 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Delete status"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center bg-[#111]">
          {currentStatus.contentType === 'image' ? (
            <img
              src={currentStatus.media}
              alt="status"
              className="w-full h-full object-contain"
            />
          ) : currentStatus.contentType === 'video' ? (
            <video
              key={currentStatus.id}
              src={currentStatus.media}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-[#1a1a2e] px-10">
              <p className="text-white text-2xl text-center leading-relaxed font-medium">
                {currentStatus.media}
              </p>
            </div>
          )}
        </div>

        {/* Viewers modal (bottom sheet) */}
        <AnimatePresence>
          {showViewers && isOwner && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 z-30 bg-[#1f2c34] rounded-t-2xl max-h-[50vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
                <p className="text-white font-semibold text-base">
                  {currentStatus.viewers?.length ?? 0}{' '}
                  {(currentStatus.viewers?.length ?? 0) === 1 ? 'view' : 'views'}
                </p>
                <button
                  onClick={() => setShowViewers(false)}
                  className="text-white/60 hover:text-white"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>

              {currentStatus.viewers?.length > 0 ? (
                <div className="px-4 py-2">
                  {currentStatus.viewers.map((viewer) => (
                    <div key={viewer._id} className="flex items-center gap-3 py-3">
                      <img
                        src={viewer.profilePicture}
                        alt={viewer.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <p className="text-white text-sm font-medium">{viewer.username}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm text-center py-8">
                  No one has viewed this yet
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prev / Next tap zones — only active when viewers panel is closed */}
        {!showViewers && (
          <>
            <button
              className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
              onClick={onPrev}
              aria-label="Previous"
            />
            <button
              className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
              onClick={onNext}
              aria-label="Next"
            />
          </>
        )}
      </div>
    </motion.div>
  );
};

export default StatusPreview;
