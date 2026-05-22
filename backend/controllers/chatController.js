const { uploadFileToCloudinary } = require('../config/cloudinaryConfig');
const Conversation = require('../models/Conversation');
const response = require('../utils/responceHandler');
const Message = require('../models/Message');

const normalizeUploadedUrl = (url, req) => {
  if (!url) {
    return null;
  }

  if (url.startsWith('/uploads/')) {
    return `${req.protocol}://${req.get('host')}${url}`;
  }

  return url;
};

exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;

    const participants = [senderId, receiverId].sort();

    // check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: participants,
    });

    if (!conversation) {
      conversation = new Conversation({
        participants,
      });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    // Handle file upload
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, 'Failed to upload media');
      }
      imageOrVideoUrl = normalizeUploadedUrl(uploadFile.secure_url, req);
      if (file.mimetype.startsWith('image')) {
        contentType = 'image';
      } else if (file.mimetype.startsWith('video')) {
        contentType = 'video';
      } else {
        return response(res, 400, 'Unsupported media type');
      }
    } else if (content?.trim()) {
      contentType = 'text';
    } else {
      return response(res, 400, 'Message content is required');
    }

    const message = new Message({
      conversation: conversation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });

    await message.save();

    if (message?.content) {
      conversation.lastMessage = message?._id;
    }
    conversation.unreadCount += 1;
    await conversation.save();

    const populatedMessage = await Message.findOne(message?._id)
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture');

    // emit socket event to receiver
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiverId);
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit('receive_message', populatedMessage);
        message.messageStatus = 'delivered';
        await message.save();
      }
    }

    return response(res, 200, 'Message sent successfully', populatedMessage);
  } catch (error) {
    console.error(error);
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// get all conversations
exports.getConversations = async (req, res) => {
  const userId = req.user.userId;
  try {
    let conversation = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username profilePicture isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender receiver',
          select: 'username profilePicture',
        },
      })
      .sort({ updatedAt: -1 });

    return response(res, 200, 'Conversations get successfully', conversation);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, 'Conversation not found');
    }

    if (!conversation.participants.includes(userId)) {
      return response(res, 403, 'Unauthorized access to this conversation');
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture')
      .sort('createdAt');

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ['sent', 'delivered'] },
      },
      { $set: { messageStatus: 'read' } },
    );

    conversation.unreadCount = 0;
    await conversation.save();

    return response(res, 200, 'Messages retrieved successfully', messages);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

exports.markAsRead = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user.userId;

  try {
    // Get relevent message
    let messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
    });

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
      },
      { $set: { messageStatus: 'read' } },
    );

    // notify to original sender
    if (req.io && req.socketUserMap) {
      for (const message of messages) {
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if (senderSocketId) {
          const updatedMessage = {
            _id: message._id,
            messageStatus: 'read',
          };

          req.io.to(senderSocketId).emit('message_read', updatedMessage);
          await message.save();
        }
      }
    }

    return response(res, 200, 'Message marked as read successfully', message);
  } catch (error) {}
};

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, 'Message not found');
    }

    if (message.sender.toString() !== userId) {
      return response(res, 403, 'Not authorized to delete this message');
    }

    await message.deleteOne();

    //   emit socket events
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(
        message.receiver.toString(),
      );
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit('message_deleted', messageId);
      }
    }

    return response(res, 200, 'Message deleted successfully');
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};
