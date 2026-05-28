import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-10">
          {contact.statuses.map((_, index) => (
            <div key={index} className="h-1 bg-white/30 flex-1 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width:
                    index < currentIndex
                      ? '100%'
                      : index === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-3 z-10">
          <div className="flex items-center gap-2">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-9 h-9 rounded-full object-cover border-2 border-white"
            />
            <div>
              <p className="text-white text-sm font-semibold">{contact.name}</p>
              <p className="text-white/70 text-xs">
                {currentStatus.timestamp
                  ? new Date(currentStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOwner && (
              <>
                <button
                  onClick={() => setShowViewers(!showViewers)}
                  className="text-white/80 hover:text-white"
                >
                  <FaEye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete(currentStatus.id)}
                  disabled={loading}
                  className="text-white/80 hover:text-red-400"
                >
                  <FaTrash className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white">
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
              src={currentStatus.media}
              autoPlay
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-[#1a1a2e] px-8">
              <p className="text-white text-2xl text-center leading-relaxed">
                {currentStatus.media}
              </p>
            </div>
          )}
        </div>

        {/* Viewers panel */}
        {showViewers && isOwner && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 z-10 rounded-t-xl">
            <p className="text-white text-sm font-semibold mb-2">
              {currentStatus.viewers?.length ?? 0} view{currentStatus.viewers?.length !== 1 ? 's' : ''}
            </p>
            {currentStatus.viewers?.map((viewer) => (
              <div key={viewer._id} className="flex items-center gap-2 py-1">
                <img src={viewer.profilePicture} alt={viewer.username} className="w-7 h-7 rounded-full object-cover" />
                <p className="text-white/80 text-sm">{viewer.username}</p>
              </div>
            ))}
          </div>
        )}

        {/* Prev / Next tap areas */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/3 z-20"
          onClick={onPrev}
          aria-label="Previous"
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-1/3 z-20"
          onClick={onNext}
          aria-label="Next"
        />
      </div>
    </motion.div>
  );
};

export default StatusPreview;
