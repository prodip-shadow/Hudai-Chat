import React, { useEffect } from 'react';
import useVideoCallStore from '../../store/videoCallStore';
import { VideoCallModal } from './VideoCallModal';

function VideoCallManager({ socket }) {
  const {
    setIncomingCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
  } = useVideoCallStore();

  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ callerId, callerName, callerAvater, callType, callId }) => {
      setIncomingCall({ callerId, callerName, callerAvater, callId });
      setCallType(callType);
      setCallModalOpen(true);
      setCallStatus('ringing');
    };

    const handleCallFailed = () => {
      setCallStatus('ended');
      setTimeout(() => endCall(), 2000);
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_failed', handleCallFailed);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_failed', handleCallFailed);
    };
  }, [socket, setIncomingCall, setCallType, setCallModalOpen, setCallStatus, endCall]);

  return <VideoCallModal socket={socket} />;
}

export default VideoCallManager;
