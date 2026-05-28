const { uploadFileToCloudinary } = require('../config/cloudinaryConfig');
const Status = require('../models/Status');
const User = require('../models/User');
const response = require('../utils/responceHandler');

const normalizeUploadedUrl = (url, req) => {
  if (!url) {
    return null;
  }

  if (url.startsWith('/uploads/')) {
    return `${req.protocol}://${req.get('host')}${url}`;
  }

  return url;
};

exports.createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || 'text';

    // Handle file upload
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, 'Failed to upload media');
      }
      mediaUrl = normalizeUploadedUrl(uploadFile.secure_url, req);
      if (file.mimetype.startsWith('image')) {
        finalContentType = 'image';
      } else if (file.mimetype.startsWith('video')) {
        finalContentType = 'video';
      } else {
        return response(res, 400, 'Unsupported media type');
      }
    } else if (content?.trim()) {
      finalContentType = 'text';
    } else {
      return response(res, 400, 'Message content is required');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
    });

    await status.save();

    const populatedStatus = await Status.findById(status._id)
      .populate('user', 'username profilePicture')
      .populate('viewers', 'username profilePicture');

    // Emit new status only to friends
    if (req.io) {
      const me = await User.findById(userId).select('friends');
      if (me) {
        me.friends.forEach((friendId) => {
          req.io.to(friendId.toString()).emit('new_status', populatedStatus);
        });
      }
    }

    return response(res, 201, 'Status Created successfully', populatedStatus);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

exports.getStatuses = async (req, res) => {
  const userId = req.user.userId;
  try {
    const me = await User.findById(userId).select('friends');
    const allowedUserIds = [userId, ...(me?.friends.map((id) => id.toString()) || [])];

    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
      user: { $in: allowedUserIds },
    })
      .populate('user', 'username profilePicture')
      .populate('viewers', 'username profilePicture')
      .sort({ createdAt: -1 });

    return response(res, 200, 'Statuses retrieved successfully', statuses);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, 'Status not found');
    }

    const hasViewed = status.viewers.some(
      (viewerId) => viewerId.toString() === userId,
    );

    if (!hasViewed) {
      status.viewers.push(userId);
      await status.save();
    } else {
      console.log('User has already viewed this status');
    }

    const updatedStatus = await Status.findById(statusId)
      .populate('user', 'username profilePicture')
      .populate('viewers', 'username profilePicture');

    //   emit socket events
    if (req.io && req.socketUserMap) {
      // Broadcast the new status to all connected clients except the sender
      const statusOwnerSocketId = req.socketUserMap.get(
        status.user._id.toString(),
      );
      if (statusOwnerSocketId) {
        const viewData = {
          statusId,
          viewerId: userId,
          totalViewers: updatedStatus.viewers.length,
          viewers: updatedStatus.viewers,
        };

        req.io.to(statusOwnerSocketId).emit('status_viewed', viewData);
      } else {
        console.log('Status owner is not connected to receive view updates');
      }
    }

    return response(res, 200, 'Status viewed successfully', updatedStatus);
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};

exports.deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, 'Status not found');
    }

    if (status.user.toString() !== userId) {
      return response(res, 403, 'Unauthorized to delete this status');
    }

    await status.deleteOne();

    // Emit deletion only to friends
    if (req.io) {
      const me = await User.findById(userId).select('friends');
      if (me) {
        me.friends.forEach((friendId) => {
          req.io.to(friendId.toString()).emit('status_deleted', statusId);
        });
      }
    }

    return response(res, 200, 'Status deleted successfully');
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Server error');
  }
};
