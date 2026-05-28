/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useLayoutStore from '../../store/layoutStore';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/useUserStore';
import { useChatStore } from '../../store/chatStore';
import { FaSearch, FaUserPlus } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import formatTimestamp from '../../utils/formatTime';

const ContactSkeleton = ({ theme }) => (
  <div className="flex items-center px-3 py-3 gap-3">
    <div className={`w-12 h-12 rounded-full shrink-0 animate-pulse ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
    <div className="flex-1 space-y-2.5">
      <div className="flex justify-between">
        <div className={`h-3.5 w-28 rounded-full animate-pulse ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
        <div className={`h-3 w-10 rounded-full animate-pulse ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} />
      </div>
      <div className={`h-3 w-44 rounded-full animate-pulse ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'}`} />
    </div>
  </div>
);

const ChatList = ({ contacts }) => {
  const setSelectedContact = useLayoutStore((state) => state.setSelectedContact);
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setActiveTab = useLayoutStore((state) => state.setActiveTab);
  const { theme } = useThemeStore();
  const { user: currentUser } = useUserStore();
  const typingUsers = useChatStore((state) => state.typingUsers);
  const loading = useChatStore((state) => state.loading);
  const [searchTerms, setSearchTerms] = useState('');
  const navigate = useNavigate();

  const filteredContacts = contacts?.filter((contact) =>
    contact?.username?.toLowerCase().includes(searchTerms.toLowerCase()),
  );

  const handleAddFriends = () => {
    setActiveTab('add-friends');
    navigate('/add-friends');
  };

  return (
    <div
      className={`w-full h-full flex flex-col border-r ${
        theme === 'dark' ? 'bg-[rgb(17,27,33)] border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-2 shrink-0 flex justify-between items-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        <h2 className="text-xl font-bold">Chats</h2>
        <button
          onClick={handleAddFriends}
          className={`p-2 rounded-full transition-colors ${
            theme === 'dark' ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
          }`}
          title="Add Friends"
        >
          <MdEdit size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
          <input
            type="text"
            placeholder="Search or start a new chat"
            className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${
              theme === 'dark'
                ? 'bg-[#202c33] border-transparent placeholder-gray-500 text-white'
                : 'bg-gray-100 text-gray-900 placeholder-gray-400'
            }`}
            value={searchTerms}
            onChange={(e) => setSearchTerms(e.target.value)}
          />
        </div>
      </div>

      {/* Contact list or empty state */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {loading && (!contacts || contacts.length === 0) ? (
          /* Skeleton: first load, no cache */
          <div>
            {[...Array(7)].map((_, i) => (
              <React.Fragment key={i}>
                <ContactSkeleton theme={theme} />
                {i < 6 && <hr className={`mx-4 ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-100'}`} />}
              </React.Fragment>
            ))}
          </div>
        ) : !contacts || contacts.length === 0 ? (
          /* No friends at all */
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <FaUserPlus className={`h-7 w-7 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No chats yet</p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Add friends to start chatting
              </p>
            </div>
            <button
              onClick={handleAddFriends}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-full transition-colors"
            >
              <FaUserPlus className="h-3.5 w-3.5" />
              Add Friends
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          /* Search returned nothing */
          <div className={`flex justify-center pt-12 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            No results for &ldquo;{searchTerms}&rdquo;
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredContacts.map((contact) => {
              const isActive = selectedContact?._id === contact._id;
              const unread = contact?.conversation?.unreadCount || 0;
              const lastMsg = contact?.conversation?.lastMessage;
              const convId = contact?.conversation?._id;
              const isContactTyping = convId && typingUsers instanceof Map && typingUsers.has(convId) && typingUsers.get(convId).size > 0;

              return (
                <motion.div
                  key={contact._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSelectedContact(contact)}
                  className={`flex items-center px-3 py-3 cursor-pointer transition-colors active:scale-[0.99] ${
                    theme === 'dark'
                      ? isActive ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'
                      : isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={contact?.profilePicture}
                      alt={contact?.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>

                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h3 className={`font-semibold text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {contact?.username}
                      </h3>
                      {lastMsg && (
                        <span className={`text-xs ml-2 shrink-0 ${unread > 0 && lastMsg?.sender?._id !== currentUser?._id ? 'text-green-500 font-medium' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatTimestamp(lastMsg?.createdAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {isContactTyping ? (
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-sm text-green-500 italic">typing</span>
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '160ms', animationDuration: '0.8s' }} />
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '320ms', animationDuration: '0.8s' }} />
                        </div>
                      ) : (
                        <p className={`text-sm truncate flex-1 ${
                          unread > 0 && lastMsg?.sender?._id !== currentUser?._id
                            ? theme === 'dark' ? 'text-white font-medium' : 'text-gray-800 font-medium'
                            : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {lastMsg?.content || ''}
                        </p>
                      )}

                      {unread > 0 && lastMsg?.sender?._id !== currentUser?._id && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="shrink-0 min-w-5 h-5 flex items-center justify-center bg-green-500 text-white text-xs font-bold rounded-full px-1"
                        >
                          {unread > 99 ? '99+' : unread}
                        </motion.span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ChatList;
