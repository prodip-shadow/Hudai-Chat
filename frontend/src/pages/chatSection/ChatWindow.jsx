import React, { useEffect, useRef, useState } from 'react';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/useUserStore';
import { useChatStore } from '../../store/chatStore';
import { isToday, isYesterday, format } from 'date-fns';
import whatsappImage from '../../images/whatsapp_image.png';
import { FaArrowLeft, FaLock } from 'react-icons/fa';

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

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
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
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact) return;
    setFilePreview(null);

    try {
      const formData = new FormData();
      formData.append('senderId', user?._id);
      formData.append('receiverId', selectedContact?._id);

      const status = online ? 'delivered' : 'sent';

      formData.append('messageStatus', status);
      if (message.trim()) {
        formData.append('content', message.trim());
      }

      // if there is a file include that
      if (selectedFile) {
        formData.append('media', selectedFile, selectedFile.name);
      }
      if (!message.trim() && !selectedFile) return;

      await sendMessage(formData, selectedContact._id);

      // clear status
      setMessage('');
      setFilePreview(null);
      setSelectedFile(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Fail to sending message:', error);
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
    addReaction(messageId, emoji);
  };

  if (!selectedContact) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center mx-auto h-screen text-center">
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
      className={`flex-1 flex flex-col h-screen w-full ${theme === 'dark' ? 'bg-[#303430]' : 'bg-[rgb(239,242,245)]'}`}
    >
      <div
        className={`p-4 ${theme === 'dark' ? 'bg-[#303430] text-white' : 'bg-[rgb(239,242,245)] text-gray-600'} flex items-center`}
      >
        <button
          className="mr-2 focus:outline-none"
          onClick={() => setSelectedContact(null)}
        >
          <FaArrowLeft className="h-6 w-6 " />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
