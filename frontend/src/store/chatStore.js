import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSocket } from '../services/chat.service';
import axiosInstance from '../services/url.service';
import useUserStore from './useUserStore';
import useLayoutStore from './layoutStore';

export const useChatStore = create(
  persist(
    (set, get) => ({
  conversations: [],
  contacts: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,

  onlineUsers: new Map(),
  typingUsers: new Map(),

  // socket event listener setup

  initsocketListners: () => {
    const socket = getSocket();
    if (!socket) return;

    // remove existing listeners to prevent duplicates
    socket.off('receive_message');
    socket.off('user_typing');
    socket.off('user_status');
    socket.off('message_send');
    socket.off('message_status_update');
    socket.off('message_error');
    socket.off('message_deleted');
    socket.off('reaction_update');

    // listen for incoming messages
    socket.on('receive_message', (message) => {
      get().receiveMessage(message);
    });

    // confirm message delivery
    socket.on('message_send', (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? { ...msg } : msg)
      }))
    });

      // update message status
      socket.on('message_status_update', ({ messageId, messageStatus }) => {
          set((state) => ({
              messages: state.messages.map((msg) =>
                  msg._id === messageId ? { ...msg, messageStatus } : msg)
          }))
       })
      
      
      
      //    handle reactions
      
       socket.on('reaction_update', ({ messageId, reactions }) => {
         set((state) => ({
           messages: state.messages.map((msg) =>
             msg._id === messageId ? { ...msg, reactions } : msg,
           ),
         }));
       });
      
      
      
      
      
      
      //    handle remove message from UI
       socket.on('message_deleted', ({ deletedMessageId }) => {
         set((state) => ({
           messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
         }));
       });

      
      
      //   handle any message sending errors
      
       socket.on('message_error', (error) => {
        console.error('Message error:', error);
       });
      
      
      
      //   listener for typing users
      
      socket.on('user_typing', ({ userId, conversationId, isTyping }) => {
          set((state) => { 
              const newTypingUsers = new Map(state.typingUsers);
              if (!newTypingUsers.has(conversationId)) { 
                  newTypingUsers.set(conversationId, new Set());
              }


              const typingSet = newTypingUsers.get(conversationId);
                if (isTyping) {
                    typingSet.add(userId);
                } else {
                    typingSet.delete(userId);
                }
              
              return { typingUsers: newTypingUsers };

          })
      });




      //   track users online/offline status
      socket.on('user_status', ({ userId, isOnline, lastSeen }) => { 
          set((state) => { 
                const newOnlineUsers = new Map(state.onlineUsers);
                newOnlineUsers.set(userId, { isOnline, lastSeen });
                return { onlineUsers: newOnlineUsers };
          })
      });



      //   emit status check for all users when socket connects
      const { conversations } = get();
      
      if (conversations?.data?.length > 0) {
          conversations.data?.forEach((conv) => {
              const otherUser = conv.participants.find(
                  (p) => p._id !== get().currentUser._id
              );

              if (otherUser._id) {
                  socket.emit('get_user_status', otherUser._id, (status) => {
                      set((state) => {
                          const newOnlineUsers = new Map(state.onlineUsers);
                          newOnlineUsers.set(otherUser._id, {
                              isOnline: status.isOnline,
                              lastSeen: status.lastSeen
                          });
                          return { onlineUsers: newOnlineUsers };
                      })
                  });
              }

           })
       }



      
      
    },
  

  
  
    setCurrentUser: (user) => set({ currentUser: user }),

    fetchContacts: async () => {
        set({ loading: true, error: null });
        try {
            const { data } = await axiosInstance.get('/auth/users');
            set({ contacts: data.data || data, loading: false });
            get().initsocketListners();
            return data;
        } catch (error) {
            set({
                error: error.response?.data?.message || error.message,
                loading: false,
            });
            return null;
        }
    },

    fetchConversations: async () => { 
        set({ loading: true, error: null });
        try {
            const { data } = await axiosInstance.get('/chats/conversations');
            set({ conversations: data, loading: false });

            get().initsocketListners();
            return data;
        } catch (error) {
            set({ 
                error: error.response?.data?.message || error.message || 'Failed to fetch conversations',
                loading: false
            });
            
            return null;
        }
    },
  



    // fetch message for conversation
    fetchMessages: async (conversationId) => { 
        if (!conversationId) return;
        set({ loading: true, error: null });
        try {
            const { data } = await axiosInstance.get(`/chats/conversations/${conversationId}/messages`);
            const messageArray = data.data || data|| [];
            set({
                messages: messageArray,
                currentConversation: conversationId,
                loading: false
            });

            // mark unread messages as read 
            const { markMessagesAsRead } = get();
            markMessagesAsRead();


            return messageArray;
        } catch (error) {
             set({ 
                error: error.response?.data?.message || error.message,
                loading: false
            });
            
            return [];
        }
    },



    // send message in real time
    sendMessage: async ({formData}) => { 
        const senderId = formData.get('senderId');
        const receiverId = formData.get('receiverId');
        const media = formData.get('media');
        const content = formData.get('content');
        const messageStatus = formData.get('messageStatus'); 


        const { conversations } = get();
        let conversationId = null;


        if (conversations?.data?.length > 0) { 
            const conversation = conversations.data.find((conv) =>
                conv.participants.some((p) => p._id === senderId) &&
                conv.participants.some((p) => p._id === receiverId)
            );
            if (conversation) {
                conversationId = conversation._id;
                set({currentConversation: conversationId});
            }
        }

        // temp message before response

        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: tempId,
            sender: { _id: senderId },
            receiver: { _id: receiverId },
            conversation: conversationId,
            imageOrVideoUrl: media && typeof media !== 'string' ? URL.createObjectURL(media) : null,
            content: content || (media ? media.name : null),
            contentType: media
              ? media.type.startsWith('image')
                ? 'image'
                : media.type.startsWith('video')
                  ? 'video'
                  : 'document'
              : 'text',
            createdAt: new Date().toISOString(),
            messageStatus
        };

        set((state) => ({
            messages: [...state.messages, optimisticMessage]
        }))


        try {
            const { data } = await axiosInstance.post('/chats/send-message', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })


            const messageData = data.data || data;

            // replace optimistic message with actual message from server
            set((state) => ({
                currentConversation: messageData.conversation,
                messages: state.messages.map((msg) =>
                    msg._id === tempId ? messageData : msg
                ),
                // update ChatList with new lastMessage in real-time for the sender
                contacts: state.contacts.map((contact) =>
                    contact._id === receiverId
                        ? {
                              ...contact,
                              conversation: {
                                  ...contact.conversation,
                                  _id: messageData.conversation,
                                  lastMessage: messageData,
                                  unreadCount: 0,
                              },
                          }
                        : contact
                ),
            }));

            // Sync layoutStore's selectedContact if it is a brand-new conversation
            const currentSelected = useLayoutStore.getState().selectedContact;
            if (currentSelected && currentSelected._id === receiverId && !currentSelected.conversation?._id) {
                useLayoutStore.getState().setSelectedContact({
                    ...currentSelected,
                    conversation: {
                        ...currentSelected.conversation,
                        _id: messageData.conversation,
                        lastMessage: messageData,
                        unreadCount: 0,
                    }
                });
            }

            return messageData;
        } catch (error) {
            console.error('Failed to send message:', error);

            // remove optimistic message
            set((state) => ({
              messages: state.messages.map((msg) =>
                msg._id === tempId ? { ...msg, messageStatus: 'failed' } : msg,
              ),
              error: error.response?.data?.message || error.message,
            }));

            throw error;
        }


    },






    receiveMessage: (message) => { 
        if (!message) return;

        const { currentConversation, currentUser, messages } = get();
        
        const messageExist = messages.some((msg) => msg._id === message._id);
        if (messageExist) return;

        // Check if the message is from the active contact
        const activeContact = useLayoutStore.getState().selectedContact;
        const senderId = message.sender?._id || message.sender;
        const receiverId = message.receiver?._id || message.receiver;
        const isFromActiveContact = activeContact && (activeContact._id === senderId || activeContact._id === receiverId);

        // If conversation IDs match OR if this is a first message for the active contact (where currentConversation is null)
        if (message.conversation === currentConversation || (currentConversation === null && isFromActiveContact)) {
            set((state) => ({
                currentConversation: message.conversation,
                messages: [...state.messages, message]
            }));

            // Sync layoutStore's selectedContact if it doesn't have a conversation ID yet
            if (activeContact && isFromActiveContact && !activeContact.conversation?._id) {
                useLayoutStore.getState().setSelectedContact({
                    ...activeContact,
                    conversation: {
                        ...activeContact.conversation,
                        _id: message.conversation,
                        lastMessage: message,
                        unreadCount: 0,
                    }
                });
            }

            // automatically mark as read
            if (message?.receiver?._id === currentUser._id) { 
                get().markMessagesAsRead();
            }
        }


        // update contacts list (ChatList) with new lastMessage, unreadCount, and conversation ID
        set((state) => {
            const isInCurrentConv = message.conversation === state.currentConversation;
            const updatedContacts = state.contacts.map((contact) => {
                const isRelated =
                    contact._id === senderId || contact._id === receiverId;
                if (!isRelated) return contact;
                return {
                    ...contact,
                    conversation: {
                        ...contact.conversation,
                        _id: message.conversation,
                        lastMessage: message,
                        unreadCount: isInCurrentConv
                            ? 0
                            : message?.receiver?._id === currentUser._id
                            ? (contact.conversation?.unreadCount || 0) + 1
                            : contact.conversation?.unreadCount || 0,
                    },
                };
            });
            return { contacts: updatedContacts };
        });




    },



    // mark as read
    markMessagesAsRead: async () => {
        const { messages, currentUser } = get();
        
        if (!messages.length || !currentUser) return;
        const unreadIds = messages.filter((msg) => msg.messageStatus !== 'read' && msg.receiver?._id === currentUser._id).map((msg) => msg._id).filter(Boolean);
        if (unreadIds.length === 0) return;
        
        try {
            const { data } = await axiosInstance.put('/chats/messages/read', {
                messageIds: unreadIds
            });


            console.log('Messages marked as read:', data);

            set((state) => ({
                messages: state.messages.map((msg) =>
                    unreadIds.includes(msg._id) ? { ...msg, messageStatus: 'read' } : msg
                ),
                contacts: state.contacts.map((contact) => {
                    const relatedToCurrentConv =
                        contact.conversation?._id === state.currentConversation;
                    return relatedToCurrentConv
                        ? { ...contact, conversation: { ...contact.conversation, unreadCount: 0 } }
                        : contact;
                }),
            }));

            const socket = getSocket();
            if (socket) {
                socket.emit('message_read', {
                    messageIds: unreadIds,
                    senderId: messages[0]?.sender?._id,
                });
            }

        } catch (error) {
            console.error('Failed to mark messages as read:', error);
        }
           
    },
    




    deleteMessage: async (messageId) => { 
        try {
            await axiosInstance.delete(`/chats/messages/${messageId}`);
            set((state) => ({
                messages: state.messages?.filter((msg) => msg?._id !== messageId)
            }));
            return true;
        } catch (error) {
            console.error('Failed to delete message:', error);
            set({ error: error.response?.data?.message || error.message });
            return false;
        }
    },




    // add/change reactions

    addReaction: async ({ messageId, emoji }) => {
        const socket = getSocket();
        const currentUser = useUserStore.getState().user;
        if (socket && currentUser) {
            socket.emit('add_reaction', {
                messageId,
                emoji,
                userId: currentUser._id,
            });
        }
    },



    startTyping: (receiverId) => { 
        const { currentConversation } = get();
        const socket = getSocket();
        if (socket && currentConversation && receiverId) { 
            socket.emit('typing_start', {
                conversationId: currentConversation,
                receiverId,
            });
        }
    },



    stopTyping: (receiverId) => { 
        const { currentConversation } = get();
        const socket = getSocket();
        if (socket && currentConversation && receiverId) { 
            socket.emit('typing_stop', {
                conversationId: currentConversation,
                receiverId,
            });
        }
    },




    isUserTyping: (userId) => {
        
        const { typingUsers, currentConversation } = get();
        if (!currentConversation || !typingUsers.has(currentConversation) || !userId){
            return false;
        }
        return typingUsers.get(currentConversation).has(userId);
    },



    isUserOnline: (userId) => { 
        if (!userId) return null;
        const { onlineUsers } = get();
        return onlineUsers.get(userId)?.isOnline || false;
    },



    getUserLastSeen: (userId) => { 
        if (!userId) return null;
        const { onlineUsers } = get();
        return onlineUsers.get(userId)?.lastSeen || null;
    },




    cleanUP: () => {
        set({
            conversations: [],
            contacts: [],
            currentConversation: null,
            messages: [],
            onlineUsers: new Map(),
            typingUsers: new Map(),
        })
    },



}),
    {
      name: 'hudai-chat-contacts',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ contacts: state.contacts }),
    },
  ),
);
