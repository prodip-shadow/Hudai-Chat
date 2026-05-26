import React, { useCallback, useEffect } from 'react';
import useVideoCallStore from '../../store/videoCallStore';
import useUserStore from '../../store/useUserStore';
import { VideoCallModal } from './VideoCallModal';

function VideoCallManager({ socket }) {
  const {
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
  } = useVideoCallStore();

  const { user } = useUserStore();

  useEffect(() => {
    if (!socket) return;

    // handle incoming call
    const handleIncomingCall = ({
      callerId,
      callerName,
      callerAvater,
      callType,
      callId,
    }) => {
      setIncomingCall({
        callerId,
        callerName,
        callerAvater,
        callId,
      });

      setCallType(callType);
      setCallModalOpen(true);
      setCallStatus('ringing');
    };

    const handleCallEnded = ({ reason }) => {
      setCallStatus('ended');
      setTimeout(() => {
        endCall();
      }, 2000);
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_failed', handleCallEnded);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_failed', handleCallEnded);
    };
  }, [
    socket,
    setIncomingCall,
    setCallType,
    setCallModalOpen,
    setCallStatus,
    endCall,
  ]);

  // memorize the function to initiate call
  const initiateCall = useCallback(
    (receiverId, receiverName, receiverAvatar, callType = 'video') => {
      const callId = `${user?.id}-${receiverId}-${Date.now()}`;

      const callData = {
        callId,
        participantId: receiverId,
        participantName: receiverName,
        participantAvatar: receiverAvatar,
      };

      setCurrentCall(callData);
      setCallType(callType);
      setCallModalOpen(true);
      setCallStatus('calling');

      // emit call request to server
      socket.emit('initiate_call', {
        callerId: user?.id,
        receiverId,
        callType,
        callerInfo: {
          username: user?.username,
          profilePicture: user?.profilePicture,
        },
      });
    },
    [
      user,
      socket,
      setCurrentCall,
      setCallType,
      setCallModalOpen,
      setCallStatus,
    ],
  );
    
    
    // expose initiateCall to global scope for testing
    useEffect(() => {
      useVideoCallStore.getState().initiateCall = initiateCall;
    }, [initiateCall]);

  return <VideoCallModal socket={socket} />;
}

export default VideoCallManager;
