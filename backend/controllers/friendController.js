const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Conversation = require('../models/Conversation');
const response = require('../utils/responceHandler');

// Send friend request
exports.sendRequest = async (req, res) => {
  const senderId = req.user.userId;
  const { receiverId } = req.body;

  if (senderId === receiverId) {
    return response(res, 400, 'Cannot send request to yourself');
  }

  try {
    const receiver = await User.findById(receiverId);
    if (!receiver) return response(res, 404, 'User not found');

    // Already friends?
    const sender = await User.findById(senderId);
    if (sender.friends.includes(receiverId)) {
      return response(res, 400, 'Already friends');
    }

    // Request already exists?
    const existing = await FriendRequest.findOne({ sender: senderId, receiver: receiverId });
    if (existing) return response(res, 400, 'Request already sent');

    const request = await FriendRequest.create({ sender: senderId, receiver: receiverId });
    await request.populate('sender', 'username profilePicture');

    // Real-time notification to receiver (room-based)
    if (req.io) {
      req.io.to(receiverId).emit('friend_request_received', {
        _id: request._id,
        sender: request.sender,
        createdAt: request.createdAt,
      });
    }

    return response(res, 201, 'Friend request sent', request);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Cancel sent request
exports.cancelRequest = async (req, res) => {
  const senderId = req.user.userId;
  const { requestId } = req.params;

  try {
    const request = await FriendRequest.findOneAndDelete({
      _id: requestId,
      sender: senderId,
    });
    if (!request) return response(res, 404, 'Request not found');

    return response(res, 200, 'Request cancelled');
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Accept received request
exports.acceptRequest = async (req, res) => {
  const receiverId = req.user.userId;
  const { requestId } = req.params;

  try {
    const request = await FriendRequest.findOne({
      _id: requestId,
      receiver: receiverId,
    }).populate('sender', 'username profilePicture');

    if (!request) return response(res, 404, 'Request not found');

    const senderId = request.sender._id.toString();

    // Add to each other's friends list
    await User.findByIdAndUpdate(receiverId, { $addToSet: { friends: senderId } });
    await User.findByIdAndUpdate(senderId, { $addToSet: { friends: receiverId } });

    await FriendRequest.findByIdAndDelete(requestId);

    // Notify the original sender (room-based)
    if (req.io) {
      const acceptor = await User.findById(receiverId).select('username profilePicture');
      req.io.to(senderId).emit('friend_request_accepted', {
        friendId: receiverId,
        friend: acceptor,
      });
    }

    return response(res, 200, 'Friend request accepted');
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Decline received request
exports.declineRequest = async (req, res) => {
  const receiverId = req.user.userId;
  const { requestId } = req.params;

  try {
    const request = await FriendRequest.findOneAndDelete({
      _id: requestId,
      receiver: receiverId,
    });
    if (!request) return response(res, 404, 'Request not found');

    return response(res, 200, 'Request declined');
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Unfriend
exports.unfriend = async (req, res) => {
  const userId = req.user.userId;
  const { friendId } = req.params;

  try {
    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    return response(res, 200, 'Unfriended successfully');
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Get sent requests
exports.getSentRequests = async (req, res) => {
  const userId = req.user.userId;
  try {
    const requests = await FriendRequest.find({ sender: userId })
      .populate('receiver', 'username profilePicture')
      .sort({ createdAt: -1 });

    return response(res, 200, 'Sent requests', requests);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Get received requests
exports.getReceivedRequests = async (req, res) => {
  const userId = req.user.userId;
  try {
    const requests = await FriendRequest.find({ receiver: userId })
      .populate('sender', 'username profilePicture')
      .sort({ createdAt: -1 });

    return response(res, 200, 'Received requests', requests);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Get my friends with conversation data (for chat list)
exports.getMyFriends = async (req, res) => {
  const userId = req.user.userId;
  try {
    const me = await User.findById(userId).populate(
      'friends',
      'username profilePicture isOnline lastSeen about',
    );

    const friendsWithConversation = await Promise.all(
      me.friends.map(async (friend) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [userId, friend._id] },
        })
          .populate({
            path: 'lastMessage',
            select: 'content createdAt sender receiver contentType',
            populate: { path: 'sender receiver', select: 'username profilePicture' },
          })
          .lean();

        return { ...friend.toObject(), conversation: conversation || null };
      }),
    );

    // Sort: conversations with messages first (by last message time), then others
    friendsWithConversation.sort((a, b) => {
      const aTime = a.conversation?.lastMessage?.createdAt || 0;
      const bTime = b.conversation?.lastMessage?.createdAt || 0;
      return new Date(bTime) - new Date(aTime);
    });

    return response(res, 200, 'Friends retrieved', friendsWithConversation);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Get users to discover (not friends, no pending request, not self)
exports.getDiscoverUsers = async (req, res) => {
  const userId = req.user.userId;
  try {
    const me = await User.findById(userId);

    // IDs to exclude: self + existing friends
    const excludeIds = [userId, ...me.friends.map((id) => id.toString())];

    // Also exclude users with pending requests (both directions)
    const sentRequests = await FriendRequest.find({ sender: userId }).select('receiver');
    const receivedRequests = await FriendRequest.find({ receiver: userId }).select('sender');

    sentRequests.forEach((r) => excludeIds.push(r.receiver.toString()));
    receivedRequests.forEach((r) => excludeIds.push(r.sender.toString()));

    const users = await User.find({ _id: { $nin: excludeIds } })
      .select('username profilePicture about isOnline')
      .lean();

    return response(res, 200, 'Discover users', users);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

// Get all my friends (for All Friends page)
exports.getAllFriends = async (req, res) => {
  const userId = req.user.userId;
  try {
    const me = await User.findById(userId).populate(
      'friends',
      'username profilePicture isOnline lastSeen about',
    );

    return response(res, 200, 'All friends', me.friends);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};
