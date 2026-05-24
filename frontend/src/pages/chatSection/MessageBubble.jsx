import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { FaCheck, FaCheckDouble, FaPlus, FaRegCopy, FaSmile } from 'react-icons/fa';
import { HiDotsVertical } from 'react-icons/hi';
import useOutsideClick from '../../hooks/useOutsideclick';
import EmojiPicker from 'emoji-picker-react';
import { RxCross2 } from 'react-icons/rx';
import { IoTrashBin } from 'react-icons/io5';




const MessageBubble = ({
  message,
  theme,
  currentUser,
  onReact,
  deleteMessage,
}) => {
  // console.log('Rendering MessageBubble for message:', message);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const messageRef = useRef(null);
  const optionsRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionsMenuRef = useRef(null);

  const isUserMessage = message.sender._id === currentUser._id;

  const bubbleClass = isUserMessage ? `chat-end` : `chat-start`;

  const bubbleContentClass = isUserMessage
    ? `chat-bubble md:max-w-[50%] min-w-[130px] ${theme === 'dark' ? 'bg-[#144d38] text-white' : 'bg-[#d9fdd3] text-black'}`
    : `chat-bubble md:max-w-[50%] min-w-[130px] ${theme === 'dark' ? 'bg-[rgb(17,27,33)] text-white' : 'bg-white text-black'}`;

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const handleReact = (emoji) => {
    onReact(message._id, emoji);
    setShowEmojiPicker(false);
    setShowReactions(false);
  };

  useOutsideClick(emojiPickerRef, () => {
    if (showEmojiPicker) setShowEmojiPicker(false);
  });

  useOutsideClick(reactionsMenuRef, () => {
    if (showReactions) setShowReactions(false);
  });

  useOutsideClick(optionsRef, () => {
    if (showOptions) setShowOptions(false);
  });

  if (message === 0) return;

  return (
    <div className={`chat ${bubbleClass}`}>
      <div
        className={`${bubbleContentClass} relative group${message.reactions?.length > 0 ? ' mb-4' : ''}`}
        ref={messageRef}
      >
        <div className="flex justify-center gap-2">
          {message.contentType === 'text' && (
            <p className="mr-2">{message.content}</p>
          )}
          {message.contentType === 'image' && (
            <div>
              <img
                src={message.imageOrVideoUrl}
                alt="images and videos"
                className="rounded-lg max-w-xs"
              />

              <p className="mt-1">{message.content}</p>
            </div>
          )}
        </div>

        <div className="self-end flex items-center justify-end gap-1 text-xs opacity-60 mt-2 ml-2">
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>

          {isUserMessage && (
            <>
              {message.messageStatus === 'send' && <FaCheck size={12} />}
              {message.messageStatus === 'delivered' && (
                <FaCheckDouble size={12} />
              )}
              {message.messageStatus === 'read' && (
                <FaCheckDouble size={12} className="text-blue-900" />
              )}
            </>
          )}
        </div>

        <div className="absolute top-1 right-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={() => setShowOptions((prev) => !prev)}
            className={`p-1 rounded-full bg-transparent border-0 focus:outline-none focus:ring-0 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
          >
            <HiDotsVertical size={18} />
          </button>
        </div>

        <div
          className={`absolute ${isUserMessage ? '-left-10' : '-right-10'} top-1/2 transform -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex flex-col gap-2`}
        >
          <button
            onClick={() => setShowReactions(!showReactions)}
            className={`p-2 rounded-full border-0 bg-transparent focus:outline-none focus:ring-0 ${theme === 'dark' ? 'hover:bg-[#202c33]/80 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <FaSmile />
          </button>
        </div>

        {showReactions && (
          <div
            ref={reactionsMenuRef}
            className={`absolute -top-10 ${isUserMessage ? 'right-0' : 'left-0'} flex items-center ${theme === 'dark' ? 'bg-[#202c33]' : 'bg-white'} rounded-full px-2 py-1.5 gap-1 shadow-lg z-50`}
          >
            {quickReactions.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleReact(emoji)}
                className="hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-600 mx-1" />
            <button
              className="hover:bg-[#ffffff1a] rounded-full p-1"
              onClick={() => setShowEmojiPicker(true)}
            >
              <FaPlus className="h-4 w-4 text-gray-300" />
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute mb-6 left-0 z-50">
            <div className="relative">
              <EmojiPicker
                onEmojiClick={(emojiObject) => handleReact(emojiObject.emoji)}
                theme={theme}
              />

              <button
                onClick={() => setShowEmojiPicker(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                <RxCross2 />
              </button>
            </div>
          </div>
        )}

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
                  <span
                    className={`text-xs ml-0.5 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}
                  >
                    {count}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}

        {showOptions && (
          <div
            ref={optionsRef}
            className={`absolute top-6 right-1 -${theme === 'dark' ? 'bg-[#1d1f1f] text-white' : 'text-black bg-gray-100'} py-2 text-sm rounded-xl shadow-lg z-50`}
          >
            <button
              onClick={() => {
                if (message.contentType === 'text') {
                  navigator.clipboard.writeText(message.content);
                }
                setShowOptions(false);
              }}
              className="flex items-center w-full px-4 py-2 gap-3 rounded-lg "
            >
              <FaRegCopy className="" size={14} />
              <span>Copy</span>
            </button>

            {isUserMessage && (
              <button
                onClick={() => {
                  deleteMessage(message._id);
                  setShowOptions(false);
                }}
                className="flex items-center w-full px-4 py-2 gap-3 rounded-lg text-red-600 "
              >
                <IoTrashBin className="text-red-600" size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
