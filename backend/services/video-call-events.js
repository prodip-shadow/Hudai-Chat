const handleVideoCallEvents = (socket, io, onlineUsers) => {
  // initiate call
  socket.on(
    'initiate_call',
    ({ callerId, receiverId, callType, callerInfo }) => {
      // Handle initiate call logic
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        const callId = `${callerId}-${receiverId}-${Date.now()}`;

        io.to(receiverSocketId).emit('incoming_call', {
          callerId,
          callerName: callerInfo.username,
          callerAvatar: callerInfo.profilePicture,
          callId,
          callType,
        });
      } else {
        console.log(`Receiver ${receiverId} is offline`);
        socket.emit('call_failed', { message: 'User is offline' });
      }
    },
  );

  // Accept call
  socket.on('accept_call', ({ callerId, callId, receiverInfo }) => {
    // Handle initiate call logic
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', {
        callerName: receiverInfo.username,
        callerAvatar: receiverInfo.profilePicture,
        callId,
      });
    } else {
      console.log(`Caller ${callerId} not found`);
    }
  });

  // reject call
  socket.on('reject_call', ({ callerId, callId }) => {
    // Handle initiate call logic
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_rejected', { callId });
    }
  });

  // end call
  socket.on('end_call', ({ callId, participantId }) => {
    // Handle initiate call logic
    const participantSocketId = onlineUsers.get(participantId);
    if (participantSocketId) {
      io.to(participantSocketId).emit('call_ended', { callId });
    }
  });

  // webRTC signaling events
  socket.on('webrtc_offer', ({ offer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc_offer', {
        offer,
        senderId: socket.userId,
        callId,
      });
      console.log(`Server: offer forwarded to receiver ${receiverId} `);
    } else {
      console.log(`Server: Receiver ${receiverId} not found offer`);
    }
  });

  socket.on('webrtc_answer', ({ answer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc_answer', {
        answer,
        senderId: socket.userId,
        callId,
      });
      console.log(`Server: answer forwarded to receiver ${receiverId} `);
    } else {
      console.log(`Server: Receiver ${receiverId} not found answer`);
    }
  });

  socket.on('webrtc_ice_candidate', ({ candidate, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('webrtc_ice_candidate', {
        candidate,
        senderId: socket.userId,
        callId,
      });
    } else {
      console.log(`Server: Receiver ${receiverId} not found ice candidate`);
    }
  });
};

module.exports = handleVideoCallEvents;
