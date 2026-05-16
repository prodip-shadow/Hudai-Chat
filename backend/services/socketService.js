const { Server } = require('socket.io');
const User = require('../models/User');
const Message = require('../models/Message');

// Map to store online users

const onlineUsers = new Map();

// map to track typing status -> userId , socketId
const typingUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
    pingTimeout: 60000, //Disconnect user after 60 seconds
  });

  // when new socket connection is established
  io.on('connection', (socket) => {
    console.log(`User connectes with this socket id: ${socket.id}`);

    let userId = null;

    // handle user connection
    socket.on('user_connected', async (connectingUserId) => {
      try {
        userId = connectingUserId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId); // Join a room with the userId as the room name

        // Update user status to online in the database
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // // Notify all clients about the updated online users list
        io.emit('user_status', { userId, isOnline: true });
      } catch (error) {
        console.error('Error handling user connection:', error);
      }
    });

    // return online users list to client
    socket.on('get_user_status', (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    // forwarding messages to the recipient
    socket.on('send_message', async (message) => {
      try {
        const receiverSocketId = onlineUsers.get(message.receiver?.id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', message);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { error: 'Failed to send message' });
      }
    });

    // Update message as read and notify the sender
    socket.on('message_read', async ({ messageIds, senderId }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $set: { messageStatus: 'read' } },
        );

        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit('message_status_update', {
              messageId,
              messageStatus: 'read',
            });
          });
        }
      } catch (error) {
        console.error('Error updating message read status:', error);
      }
    });

    // handle typing start event and auto stop typing after 3 sec

    socket.on('typing_start', ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;
      if (!typingUsers.has(userId)) typingUsers.set(userId, {});

      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = true;

      // clear any existing timeout for this conversation
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      // Auto stop ater 3 seconds
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket.to(receiverId).emit('user_typing', {
          conversationId,
          userId,
          isTyping: false,
        });
      }, 3000);

      // Notify the receiver
      socket.to(receiverId).emit('user_typing', {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;
      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }

      socket.to(receiverId).emit('user_typing', {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    // Add or update reactions and update
    socket.on(
      'add_reaction',
      async ({ messageId, emoji, userId, reactionUserId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;

          const existingIndex = message.reactions.findIndex(
            (r) => r.user.toString() === reactionUserId,
          );

          if (existingIndex > -1) {
            const existing = message.reactions(existingIndex);
            if (existing.emoji === emoji) {
              // remove same reaction if already exists
              message.reactions.splice(existingIndex, 1);
            } else {
              // update to new reaction
              message.reactions[existingIndex].emoji = emoji;
            }
          } else {
            // add new reaction
            message.reactions.push({ user: reactionUserId, emoji });
          }

          await message.save();
          const populatedMessage = await Message.findOne(message?._id)
            .populate('sender', 'username profilePicture')
            .populate('receiver', 'username profilePicture')
            .populate('reactions.user', 'username');

          const reactionUpdated = {
            messageId,
            reactions: populatedMessage.reactions,
          };

          const senderSocket = onlineUsers.get(
            populatedMessage.sender?._id.toString(),
          );
          const receiverSocket = onlineUsers.get(
            populatedMessage.receiver?._id.toString(),
          );

          if (senderSocket) {
            io.to(senderSocket).emit('reaction_update', reactionUpdated);
          }

          if (receiverSocket) {
            io.to(receiverSocket).emit('reaction_update', reactionUpdated);
          }
        } catch (error) {
          console.error('Error handling reaction:', error);
        }
      },
    );

    // handle disconnection and mark user as offline
    const handleDisconnect = async (socket) => {
      if (!userId) return;

      try {
        onlineUsers.delete(userId);

        // clear all typing status for the user
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith('_timeout')) clearTimeout(userTyping[key]);
          });
          typingUsers.delete(userId);
        }

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        io.emit('user_status', {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.leave(userId);
        console.log(`User  ${userId} disconnected`);
      } catch (error) {
        console.error('Error handling user disconnection:', error);
      }
    };

    // disconnect user when socket disconnects
    socket.on('disconnect', handleDisconnect);
  });

  // Expose onlineUsers map for external access if needed
  io.socketUserMap = onlineUsers;

  return io;
};

module.exports = initializeSocket;
