import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { FaCheck, FaCheckDouble, FaPlus, FaRegCopy, FaSmile } from 'react-icons/fa';
import { HiDotsVertical } from 'react-icons/hi';
import useOutsideClick from '../../hooks/useOutsideclick';
import EmojiPicker from 'emoji-picker-react';
import { RxCross2 } from 'react-icons/rx';
import { IoTrashBin } from 'react-icons/io5';

const MessageBubble = ({ message, theme, currentUser, onReact, deleteMessage }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [menuAbove, setMenuAbove] = useState(false);

  const messageRef = useRef(null);
  const optionsRef = useRef(null);
  const optionsBtnRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionsMenuRef = useRef(null);

  const isUserMessage = message.sender._id === currentUser._id;
  const bubbleClass = isUserMessage ? 'chat-end' : 'chat-start';

  const bubbleContentClass = isUserMessage
    ? `chat-bubble md:max-w-[50%] min-w-[130px] ${theme === 'dark' ? 'bg-[#144d38] text-white' : 'bg-[#d9fdd3] text-black'}`
    : `chat-bubble md:max-w-[50%] min-w-[130px] ${theme === 'dark' ? 'bg-[rgb(17,27,33)] text-white' : 'bg-white text-black'}`;

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleReact = (emoji) => {
    onReact(message._id, emoji);
    setShowEmojiPicker(false);
    setShowReactions(false);
  };

  const handleShowOptions = () => {
    if (optionsBtnRef.current) {
      const rect = optionsBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuAbove(spaceBelow < 120);
    }
    setShowOptions((prev) => !prev);
  };

  useOutsideClick(emojiPickerRef, () => { if (showEmojiPicker) setShowEmojiPicker(false); });
  useOutsideClick(reactionsMenuRef, () => { if (showReactions) setShowReactions(false); });
  useOutsideClick(optionsRef, () => { if (showOptions) setShowOptions(false); });

  if (message === 0) return null;

  return (
    <div className={`chat ${bubbleClass}`}>
      <div
        className={`${bubbleContentClass} relative group${message.reactions?.length > 0 ? ' mb-4' : ''}`}
        ref={messageRef}
      >
        {/* Message content */}
        <div className="flex justify-center gap-2">
          {message.contentType === 'text' && <p className="mr-2">{message.content}</p>}
          {message.contentType === 'image' && (
            <div>
              <img src={message.imageOrVideoUrl} alt="media" className="rounded-lg max-w-xs" />
              <p className="mt-1">{message.content}</p>
            </div>
          )}
        </div>

        {/* Time + status */}
        <div className="self-end flex items-center justify-end gap-1 text-xs opacity-60 mt-2 ml-2">
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {isUserMessage && (
            <>
              {message.messageStatus === 'send' && <FaCheck size={12} />}
              {message.messageStatus === 'delivered' && <FaCheckDouble size={12} />}
              {message.messageStatus === 'read' && <FaCheckDouble size={12} className="text-blue-400" />}
              {message.messageStatus === 'failed' && <span className="text-red-400 text-xs">!</span>}
            </>
          )}
        </div>

        {/* 3-dot options button — always visible on mobile, hover-only on desktop */}
        <div className="absolute top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
          <button
            ref={optionsBtnRef}
            onClick={handleShowOptions}
            className={`p-1 rounded-full focus:outline-none ${theme === 'dark' ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-black/10'}`}
          >
            <HiDotsVertical size={16} />
          </button>
        </div>

        {/* Emoji react button — always visible on mobile, hover-only on desktop */}
        <div
          className={`absolute ${isUserMessage ? '-left-9' : '-right-9'} top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity`}
        >
          <button
            onClick={() => setShowReactions(!showReactions)}
            className={`p-1.5 rounded-full focus:outline-none ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/10'}`}
          >
            <FaSmile size={16} />
          </button>
        </div>

        {/* Quick reactions bar */}
        {showReactions && (
          <div
            ref={reactionsMenuRef}
            className={`absolute -top-12 ${isUserMessage ? 'right-0' : 'left-0'} flex items-center ${theme === 'dark' ? 'bg-[#2a3942]' : 'bg-white'} rounded-full px-2 py-1.5 gap-1 shadow-xl z-50 border ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}
          >
            {quickReactions.map((emoji) => (
              <button key={emoji} onClick={() => handleReact(emoji)} className="hover:scale-125 transition-transform p-0.5 text-lg">
                {emoji}
              </button>
            ))}
            <div className="w-px h-4 bg-gray-500 mx-1" />
            <button className="hover:scale-110 transition-transform rounded-full p-1" onClick={() => { setShowReactions(false); setShowEmojiPicker(true); }}>
              <FaPlus className={`h-3 w-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
          </div>
        )}

        {/* Full emoji picker */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute mb-6 left-0 z-50">
            <div className="relative">
              <EmojiPicker onEmojiClick={(obj) => handleReact(obj.emoji)} theme={theme} />
              <button onClick={() => setShowEmojiPicker(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                <RxCross2 />
              </button>
            </div>
          </div>
        )}

        {/* Reactions display */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`absolute -bottom-4 ${isUserMessage ? 'right-2' : 'left-2'} flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shadow-md text-sm z-10 border ${theme === 'dark' ? 'bg-[#2a3942] border-[#111b21]' : 'bg-white border-gray-200'}`}
          >
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                if (r.emoji) acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {}),
            ).map(([emoji, count]) => (
              <span key={emoji} className="leading-none">
                {emoji}
                {count > 1 && (
                  <span className={`text-xs ml-0.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>{count}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Context menu (Copy / Delete) */}
        {showOptions && (
          <div
            ref={optionsRef}
            className={`absolute ${menuAbove ? 'bottom-7' : 'top-7'} right-0 min-w-[150px] rounded-xl overflow-hidden shadow-2xl z-50 border ${
              theme === 'dark'
                ? 'bg-[#233138] border-white/10 text-white'
                : 'bg-white border-gray-100 text-gray-800'
            }`}
          >
            <button
              onClick={() => {
                if (message.contentType === 'text') navigator.clipboard.writeText(message.content);
                setShowOptions(false);
              }}
              className={`flex items-center w-full px-4 py-3 gap-3 text-sm font-medium transition-colors ${
                theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-50'
              }`}
            >
              <FaRegCopy size={14} />
              <span>Copy</span>
            </button>

            {isUserMessage && (
              <>
                <div className={`h-px mx-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`} />
                <button
                  onClick={() => { deleteMessage(message._id); setShowOptions(false); }}
                  className={`flex items-center w-full px-4 py-3 gap-3 text-sm font-medium text-red-500 transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-red-50'
                  }`}
                >
                  <IoTrashBin size={14} />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
