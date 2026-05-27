import React, { useEffect, useMemo, useRef } from 'react';
import useVideoCallStore from '../../store/videoCallStore';
import useUserStore from '../../store/useUserStore';
import useThemeStore from '../../store/themeStore';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneSlash,
  FaTimes,
  FaVideo,
  FaVideoSlash,
} from 'react-icons/fa';

export const VideoCallModal = ({ socket }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const {
    currentCall,
    incomingCall,
    isCallActive,
    callType,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    peerConnection,
    isCallModalOpen,
    callStatus,
    setCurrentCall,
    endCall,
    setCallStatus,
    setCallActive,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    toggleVideo,
    toggleAudio,
    clearIncomingCall,
  } = useVideoCallStore();

  const { user } = useUserStore();
  const { theme } = useThemeStore();

  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      // openrelay — free public TURN
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      // freeturn.net — backup free TURN
      {
        urls: [
          'turn:freeturn.net:3478',
          'turns:freeturn.net:5349',
        ],
        username: 'free',
        credential: 'free',
      },
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
  };

  const displayInfo = useMemo(() => {
    if (incomingCall && !isCallActive) {
      return { name: incomingCall.callerName, avatar: incomingCall.callerAvater };
    } else if (currentCall) {
      return { name: currentCall.participantName, avatar: currentCall.participantAvatar };
    }
    return null;
  }, [incomingCall, currentCall, isCallActive]);

  // connection detection
  useEffect(() => {
    if (peerConnection && remoteStream) {
      setCallStatus('connected');
      setCallActive(true);
    }
  }, [peerConnection, remoteStream, setCallActive, setCallStatus]);

  // caller: initialize camera immediately when call is dialed
  useEffect(() => {
    if (callStatus === 'calling' && !localStream) {
      initializeMedia(callType === 'video').catch((err) =>
        console.error('Could not access camera/mic:', err),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus, callType, localStream]);

  // attach local stream to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // attach remote stream — video element for video calls, audio element always (for voice)
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream]);

  const initializeMedia = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video
          ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
          : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  };

  const createPeerConnection = (stream, role) => {
    const pc = new RTCPeerConnection(rtcConfiguration);

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const { currentCall: cc, incomingCall: ic } = useVideoCallStore.getState();
        const participantId = cc?.participantId || ic?.callerId;
        const callId = cc?.callId || ic?.callId;
        if (participantId && callId) {
          socket.emit('webrtc_ice_candidate', {
            candidate: event.candidate,
            receiverId: participantId,
            callId,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      const incomingStream = event.streams?.[0] ?? new MediaStream([event.track]);
      setRemoteStream(incomingStream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        setCallStatus('failed');
        setTimeout(handleEndCall, 2000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[${role}] ICE state:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' && role === 'CALLER') {
        // proper ICE restart: caller sends new offer with iceRestart flag,
        // receiver answers via existing webrtc_offer handler
        (async () => {
          try {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            const { currentCall: cc } = useVideoCallStore.getState();
            if (socket && cc) {
              socket.emit('webrtc_offer', {
                offer,
                receiverId: cc.participantId,
                callId: cc.callId,
              });
            }
          } catch (err) {
            console.error('ICE restart failed:', err);
          }
        })();
      }
    };

    setPeerConnection(pc);
    return pc;
  };

  const handleEndCall = () => {
    const { currentCall: cc, incomingCall: ic } = useVideoCallStore.getState();
    const participantId = cc?.participantId || ic?.callerId;
    const callId = cc?.callId || ic?.callId;
    if (socket && participantId && callId) {
      socket.emit('end_call', { callId, participantId });
    }
    endCall();
  };

  const handleAnswerCall = async () => {
    try {
      setCallStatus('connecting');
      const { incomingCall: ic, callType: ct } = useVideoCallStore.getState();
      const stream = await initializeMedia(ct === 'video');
      createPeerConnection(stream, 'RECEIVER');

      socket.emit('accept_call', {
        callId: ic?.callId,
        callerId: ic?.callerId,
        receiverInfo: {
          username: user?.username,
          profilePic: user?.profilePicture,
        },
      });

      setCurrentCall({
        callId: ic?.callId,
        participantId: ic?.callerId,
        participantName: ic?.callerName,
        participantAvatar: ic?.callerAvater,
      });
      clearIncomingCall();
    } catch (error) {
      console.error('Receiver error:', error);
      handleEndCall();
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      socket.emit('reject_call', {
        callId: incomingCall?.callId,
        callerId: incomingCall?.callerId,
      });
    }
    endCall();
  };

  // socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleCallAccepted = () => {
      const { currentCall: cc } = useVideoCallStore.getState();
      if (!cc) return;
      setTimeout(async () => {
        try {
          const { currentCall: cur, callType: ct, localStream: existingStream } =
            useVideoCallStore.getState();
          setCallStatus('connecting');
          // reuse already-initialized stream if available (caller cam opens on dial)
          const stream = existingStream || (await initializeMedia(ct === 'video'));
          const pc = createPeerConnection(stream, 'CALLER');
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: ct === 'video',
          });
          await pc.setLocalDescription(offer);
          socket.emit('webrtc_offer', {
            offer,
            receiverId: cur?.participantId,
            callId: cur?.callId,
          });
        } catch (error) {
          console.error('Error initializing caller call:', error);
          setCallStatus('failed');
          setTimeout(handleEndCall, 2000);
        }
      }, 500);
    };

    const handleCallRejected = () => {
      setCallStatus('rejected');
      setTimeout(() => endCall(), 2000);
    };

    const handleCallEnded = () => endCall();

    const handleWebRTCOffer = async ({ offer, senderId, callId }) => {
      // use getState() to avoid stale closure on peerConnection
      const { peerConnection: pc, processQueuedIceCandidates: processICE } =
        useVideoCallStore.getState();
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await processICE();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_answer', { answer, receiverId: senderId, callId });
      } catch (error) {
        console.error('Error handling WebRTC offer:', error);
      }
    };

    const handleWebRTCAnswer = async ({ answer }) => {
      const { peerConnection: pc, processQueuedIceCandidates: processICE } =
        useVideoCallStore.getState();
      if (!pc || pc.signalingState === 'closed') return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        await processICE();
      } catch (error) {
        console.error('Error handling WebRTC answer:', error);
      }
    };

    const handleWebRTCIceCandidate = async ({ candidate }) => {
      const { peerConnection: pc, addIceCandidate: queueICE } =
        useVideoCallStore.getState();
      if (!pc || pc.signalingState === 'closed') return;
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      } else {
        queueICE(candidate);
      }
    };

    socket.on('call_accepted', handleCallAccepted);
    socket.on('call_rejected', handleCallRejected);
    socket.on('call_ended', handleCallEnded);
    socket.on('webrtc_offer', handleWebRTCOffer);
    socket.on('webrtc_answer', handleWebRTCAnswer);
    socket.on('webrtc_ice_candidate', handleWebRTCIceCandidate);

    return () => {
      socket.off('call_accepted', handleCallAccepted);
      socket.off('call_rejected', handleCallRejected);
      socket.off('call_ended', handleCallEnded);
      socket.off('webrtc_offer', handleWebRTCOffer);
      socket.off('webrtc_answer', handleWebRTCAnswer);
      socket.off('webrtc_ice_candidate', handleWebRTCIceCandidate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, endCall, setCallStatus]);

  if (!isCallModalOpen && !incomingCall) return null;

  const shouldShowActiveCall =
    isCallActive || callStatus === 'calling' || callStatus === 'connecting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      {/* Hidden audio element — plays remote audio for both audio and video calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div
        className={`relative w-full h-full max-w-4xl rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
      >
        {/* Incoming call UI */}
        {incomingCall && !isCallActive && (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center mb-8">
              <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 bg-gray-300">
                <img
                  src={displayInfo?.avatar}
                  alt={displayInfo?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className={`text-2xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {displayInfo?.name}
              </h2>
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Incoming {callType} call...
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleRejectCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white"
              >
                <FaPhoneSlash className="w-6 h-6" />
              </button>
              <button
                onClick={handleAnswerCall}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white"
              >
                <FaVideo className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Active call UI — wraps all overlays so absolute positioning works correctly */}
        {shouldShowActiveCall && (
          <div className="relative h-full w-full">
            {/* Remote video */}
            {callType === 'video' && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover bg-gray-800 ${remoteStream ? 'block' : 'hidden'}`}
              />
            )}

            {/* Avatar / status — shown when no remote stream or it's an audio call */}
            {(!remoteStream || callType !== 'video') && (
              <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 bg-gray-300">
                    <img
                      src={displayInfo?.avatar}
                      alt={displayInfo?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-white text-xl">
                    {callStatus === 'calling'
                      ? `Calling ${displayInfo?.name}...`
                      : callStatus === 'connecting'
                        ? 'Connecting...'
                        : callStatus === 'connected'
                          ? displayInfo?.name
                          : callStatus === 'failed'
                            ? 'Connection failed'
                            : displayInfo?.name}
                  </p>
                </div>
              </div>
            )}

            {/* Local video (picture-in-picture) */}
            {callType === 'video' && localStream && (
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Call status badge */}
            <div className="absolute top-4 left-4">
              <div className={`px-4 py-2 rounded-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {callStatus === 'connected' ? 'Connected' : callStatus}
                </p>
              </div>
            </div>

            {/* Call controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="flex space-x-4">
                {callType === 'video' && (
                  <button
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                  >

                    {isVideoEnabled ? (<FaVideo className="w-6 h-6" />) : (<FaVideoSlash className="w-6 h-6" />)}
                    
                  </button>
                )}
                <button
                  onClick={toggleAudio}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                >
                  {isAudioEnabled ? (
                    <FaMicrophone className="w-6 h-6" />
                  ) : (
                    <FaMicrophoneSlash className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={handleEndCall}
                  className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white"
                >
                  <FaPhoneSlash className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel button while waiting for answer */}
        {callStatus === 'calling' && (
          <button
            onClick={handleEndCall}
            className="absolute top-4 right-8 w-8 h-8 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center text-white"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
