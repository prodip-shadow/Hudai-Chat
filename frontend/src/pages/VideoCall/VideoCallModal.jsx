import React, { useRef } from 'react'
import useVideoCallStore from '../../store/videoCallStore';

export const VideoCallModal = ({ socket }) => {


    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
          const {
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
          } = useVideoCallStore();




  return (
    <div>VideoCallModal</div>
  )
}
