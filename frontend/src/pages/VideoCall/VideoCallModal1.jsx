import React, { useRef } from 'react';
import useVideoCallStore from '../../store/videoCallStore';
import useUserStore from '../../store/useUserStore';
import useThemeStore from '../../store/themeStore';

export const VideoCallModal = ({ socket }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const {
    currentCall,
    incomingCall,
    isCallActive,
    callType, // 'audio' or 'video'

    // media state
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,

    // webRtc
    peerConnection,
    iceCandidatesQueue, //Queue  for ice candidates

    isCallModalOpen,
    callStatus,

    setIncomingCall,
    setCurrentCall,
    setCallType,
    setCallModalOpen,
    endCall,
    setCallStatus,
    setCallActive,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    addIceCandidate,
    processQueuedIceCandidates,
    toggleVideo,
    toggleAudio,
    clearIncomingCall,
  } = useVideoCallStore();
    
    
    
    const { user } = useUserStore();
    const { theme } = useThemeStore();


    const rtcConfiguration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
        {
          urls: 'stun:stun1.l.google.com:19302',
        },
        {
          urls: 'stun:stun2.l.google.com:19302',
        },
      ],
    };



  return <div>VideoCallModal</div>;
};
