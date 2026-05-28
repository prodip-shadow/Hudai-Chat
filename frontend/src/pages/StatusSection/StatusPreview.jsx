import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const StatusPreview = ({
  contact,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onDelete,
  theme,
  currentUser,
  loading,
}) => {
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);

  const currentStatus = contact?.statuses[currentIndex];
  const isOwner = contact?.id === currentUser?._id;

  useEffect(() => {
    setProgress(0);

    let current = 0;
    const interval = setInterval(() => {
      current += 2; //increse progress
      setProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        onNext(); //move to next status
      }
    }, 100);
    return () => clearInterval(interval); //cleanup on unmount or index change
  }, [currentIndex, contact, onNext]);

  const handleViewrsToggle = () => {
    setShowViewers(!showViewers);
  };

  const handleDeleteStatus = () => {
    if (onDelete && currentStatus?.id) {
      onDelete(currentStatus.id);
    }
    if (contact?.statuses.length === 1) { 
      onClose(); //close preview if it was the only status
    } else {
      onPrev()
    }
  };




  if (!currentStatus) return null;

  return (
     <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      exit={{opacity: 0}}
      className={`fixed inset-0 w-full h-full bg-black/90 z-50 flex items-center justify-center`}
      style={{ backdropFilter: 'blur(5px)' }}

      onClick={onClose}
    >


      <div className="relative w-full h-full  max-w-4xl mx-auto  flex justify-center items-center" onClick={(e) => e.stopPropagation()}>
        <div className={`w-full h-full ${theme === 'dark' ? 'bg-[#202c33]' : 'bg-gray-800'} relative`}>
          
      </div>
      </div>
      
      </motion.div>
  )
};

export default StatusPreview;
