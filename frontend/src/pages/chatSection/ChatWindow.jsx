import React, { useEffect, useRef, useState } from 'react';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/useUserStore';
import { useChatStore } from '../../store/chatStore';
import { isToday, isYesterday, format } from 'date-fns';
import whatsappImage from '../../images/whatsapp_image.png';
import {
  FaArrowLeft,
  FaEllipsisV,
  FaFile,
  FaImage,
  FaLock,
  FaPaperclip,
  FaPaperPlane,
  FaPhone,
  FaSmile,
  FaTimes,
  FaVideo,
} from 'react-icons/fa';
import MessageBubble from './MessageBubble';
import EmojiPicker from 'emoji-picker-react';

const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
};

const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const docFileInputRef = useRef(null);
  const isSendingRef = useRef(false);

  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const {
    messages,
    loading,
    sendMessage,
    receiveMessage,
    fetchMessages,
    fetchConversations,
    conversations,
    isUserTyping,
    startTyping,
    stopTyping,
    getUserLastSeen,
    isUserOnline,
    cleanUP,
    deleteMessage,
    addReaction,
  } = useChatStore();

  // getOnline User and last seen
  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

  useEffect(() => {
    isInitialLoadRef.current = true;
    if (selectedContact?._id && conversations?.data?.length > 0) {
      const conversation = conversations?.data?.find((conv) =>
        conv.participants.some(
          (participant) => participant._id === selectedContact?._id,
        ),
      );
      if (conversation?._id) {
        fetchMessages(conversation._id);
      }
    }
  }, [selectedContact, conversations, fetchMessages]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const isInitialLoadRef = useRef(true);

  const scrollToBottom = (smooth = false) => {
    messageEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (isInitialLoadRef.current) {
      scrollToBottom(false);
      isInitialLoadRef.current = false;
    } else {
      scrollToBottom(true);
    }
  }, [messages]);

  useEffect(() => {
    if ((message, selectedContact)) {
      startTyping(selectedContact._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact?._id);
      }, 2000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact, startTyping, stopTyping]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowFileMenu(false);
      setFilePreview({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        size: file.size,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact || isSendingRef.current) return;
    const trimmed = message.trim();
    if (!trimmed && !selectedFile) return;

    isSendingRef.current = true;
    const currentFile = selectedFile;

    // Clear input immediately for snappy UX
    setMessage('');
    setSelectedFile(null);
    setFilePreview(null);
    setShowEmojiPicker(false);

    try {
      const formData = new FormData();
      formData.append('senderId', user?._id);
      formData.append('receiverId', selectedContact?._id);
      formData.append('messageStatus', online ? 'delivered' : 'send');
      if (trimmed) formData.append('content', trimmed);
      if (currentFile) formData.append('media', currentFile, currentFile.name);

      await sendMessage({ formData });
    } catch (error) {
      console.error('Fail to sending message:', error);
    } finally {
      isSendingRef.current = false;
    }
  };

  const renderDateSeparator = (date) => {
    if (!isValidate(date)) {
      return null;
    }

    let dateString;
    if (isToday(date)) {
      dateString = 'Today';
    } else if (isYesterday(date)) {
      dateString = 'Yesterday';
    } else {
      dateString = format(date, 'EEEE, MMMM d');
    }

    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full text-sm ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  // Group Message
  const groupedMessages = Array.isArray(messages)
    ? messages.reduce((acc, message) => {
        if (!message.createdAt) return acc; // skip messages without a valid date
        const date = new Date(message.createdAt);
        if (isValidate(date)) {
          const dateString = format(date, 'yyyy-MM-dd');
          if (!acc[dateString]) {
            acc[dateString] = [];
          }
          acc[dateString].push(message);
        } else {
          console.log('Invalid date for message:', message);
        }

        return acc;
      }, {})
    : {};

  const handleReaction = async (messageId, emoji) => {
    addReaction({ messageId, emoji });
  };

  if (!selectedContact) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center mx-auto h-full text-center ${theme === 'dark' ? 'bg-[#303430]' : 'bg-[rgb(239,242,245)]'}`}
      >
        <div className="max-w-md">
          <img src={whatsappImage} alt="chat-app" className="w-full h-auto" />

          <h2
            className={`text-3xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
          >
            Select conversation to start chatting
          </h2>

          <p
            className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-6`}
          >
            Choose contact from the list one the left to begin messaging
          </p>

          <p
            className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} text-sm mt-8 flex items-center justify-center gap-2`}
          >
            <FaLock
              className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
            />
            Your personal messages are end-to-end encrypted
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full w-full ${theme === 'dark' ? 'bg-[#303430]' : 'bg-[rgb(239,242,245)]'}`}
    >
      <div
        className={`p-3 shrink-0 ${theme === 'dark' ? 'bg-[#303430] text-white' : 'bg-[rgb(239,242,245)] text-gray-600'} flex items-center z-10`}
      >
        <button
          className="mr-2 focus:outline-none"
          onClick={() => setSelectedContact(null)}
        >
          <FaArrowLeft className="h-6 w-6 " />
        </button>

        <img
          src={selectedContact?.profilePicture}
          alt={selectedContact?.username}
          className="w-10 h-10 rounded-full"
        />

        <div className="ml-3 grow ">
          <h2 className="font-semibold text-start">
            {selectedContact?.username}
          </h2>

          {isTyping ? (
            <div>typing...</div>
          ) : (
            <p
              className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
            >
              {online
                ? 'Online'
                : lastSeen
                  ? `Last seen at ${format(new Date(lastSeen), 'HH:mm')}`
                  : 'Offline'}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button className="focus:outline-none">
            <FaVideo className="h-5 w-5" />
          </button>

          <button className="focus:outline-none">
            <FaEllipsisV className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className={`flex-1 min-h-0 p-4 overflow-y-auto overscroll-contain ${theme === 'dark' ? 'bg-[#191a1a]' : 'bg-[rgb(241,236,229)]'}`}
      >
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <React.Fragment key={date}>
            {renderDateSeparator(new Date(date))}
            {msgs
              .filter(
                (msg) =>
                  msg.conversation === selectedContact?.conversation?._id,
              )
              .map((msg) => (
                <MessageBubble
                  key={msg._id || msg.tempId}
                  message={msg}
                  theme={theme}
                  currentUser={user}
                  onReact={handleReaction}
                  deleteMessage={deleteMessage}
                />
              ))}
          </React.Fragment>
        ))}
        <div ref={messageEndRef} />
      </div>

      {filePreview && (
        <div className="relative p-2">
          {filePreview.type?.startsWith('video/') ? (
            <video
              src={filePreview.url}
              controls
              className="w-80 object-cover rounded shadow-lg mx-auto"
            />
          ) : filePreview.type?.startsWith('image/') ? (
            <img
              src={filePreview.url}
              alt="file-preview"
              className="w-80 object-cover rounded shadow-lg mx-auto"
            />
          ) : (
            <div className={`w-80 flex flex-col items-center justify-center p-4 rounded shadow-lg mx-auto border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-200 text-black'}`}>
              <FaFile className="h-12 w-12 text-blue-500 mb-2" />
              <span className="text-sm font-semibold truncate max-w-full text-center">{filePreview.name}</span>
              <span className="text-xs text-gray-500 mt-1">{(filePreview.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          <button
            onClick={() => {
              setSelectedFile(null);
              setFilePreview(null);
            }}
            className="absolute top-2 right-1 bg-red-500 text-white hover:bg-red-600 rounded-full p-1 z-10"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={`p-4 shrink-0 ${theme === 'dark' ? 'bg-[#303430]' : 'bg-white'} flex items-center space-x-2 relative`}
      >
        <button
          className="focus:outline-none"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <FaSmile
            className={`h-6 w-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
          />
        </button>

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-16 left-0 z-50">
            <EmojiPicker
              onEmojiClick={(emojiObject) => {
                setMessage((prev) => prev + emojiObject.emoji);
                setShowEmojiPicker(false);
              }}
              theme={theme}
            />
          </div>
        )}

        <div className="relative">
          <button
            className="focus:outline-none"
            onClick={() => setShowFileMenu(!showFileMenu)}
          >
            <FaPaperclip
              className={`h-6 w-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-2`}
            />
          </button>

          {showFileMenu && (
            <div
              className={`absolute bottom-full left-0 mb-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded shadow-lg`}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,video/*"
              />
              <input
                type="file"
                ref={docFileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className={`flex items-center px-4 py-2 w-full transition-colors hover:bg-gray-100 ${theme === 'dark' ? ' hover:bg-gray-500' : 'hover:bg-gray-100'}`}
              >
                <FaImage className="mr-2" />
                Image/Video
              </button>

              <button
                onClick={() => docFileInputRef.current.click()}
                className={`flex items-center px-4 py-2 w-full transition-colors hover:bg-gray-100 ${theme === 'dark' ? ' hover:bg-gray-500' : 'hover:bg-gray-100'}`}
              >
                <FaFile className="mr-2" />
                Documents
              </button>
            </div>
          )}
        </div>

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSendMessage();
            }
          }}
          placeholder="Type a message"
          className={`grow px-4 py-2 border rounded-full focus: outline-none focus:ring-2 focus:ring-green-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-700  text-white' : 'bg-white text-black border-gray-300'}`}
        />

        <button
          onClick={handleSendMessage}
          className="bg-green-500 text-white p-2 focus:outline-none rounded-full hover:bg-green-600 transition-colors"
        >
          <FaPaperPlane className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
