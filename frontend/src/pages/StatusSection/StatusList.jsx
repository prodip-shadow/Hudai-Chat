import React from 'react';
import formatTimestamp from '../../utils/formatTime';

const StatusList = ({ contact, theme, onPreview }) => {
  const isSeen = contact.allSeen;
  const lastTimestamp = contact.statuses[contact.statuses.length - 1]?.timestamp;

  return (
    <div
      className="flex items-center gap-3 py-2 cursor-pointer"
      onClick={onPreview}
    >
      {/* Avatar with ring */}
      <div className="relative flex-shrink-0">
        <div
          className={`rounded-full p-[2.5px] ${
            isSeen ? 'bg-gray-400' : 'bg-green-500'
          }`}
        >
          <div
            className={`rounded-full p-[2px] ${
              theme === 'dark' ? 'bg-[rgb(17,27,33)]' : 'bg-white'
            }`}
          >
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-12 h-12 rounded-full object-cover block"
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div>
        <p className="font-semibold">{contact.name}</p>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          {lastTimestamp ? formatTimestamp(lastTimestamp) : ''}
        </p>
      </div>
    </div>
  );
};

export default StatusList;
