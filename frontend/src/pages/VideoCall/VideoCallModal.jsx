import React from 'react'
import useVideoCallStore from '../../store/videoCallStore'

export const VideoCallModal = () => {
  const { isCallModalOpen, callStatus, incomingCall, currentCall, endCall } = useVideoCallStore()

  if (!isCallModalOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 text-white rounded-2xl p-8 flex flex-col items-center gap-4 min-w-[280px] shadow-2xl">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
          {(incomingCall?.callerAvater || currentCall?.participantAvatar) ? (
            <img
              src={incomingCall?.callerAvater || currentCall?.participantAvatar}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-4xl">👤</span>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold">
            {incomingCall?.callerName || currentCall?.participantName || 'Unknown'}
          </h2>
          <p className="text-gray-400 text-sm mt-1 capitalize">{callStatus}...</p>
        </div>

        <div className="flex gap-4 mt-2">
          {callStatus === 'ringing' && (
            <button
              className="bg-green-500 hover:bg-green-600 text-white rounded-full px-6 py-2 font-medium transition-colors"
              onClick={() => {/* accept call */}}
            >
              Accept
            </button>
          )}
          <button
            className="bg-red-500 hover:bg-red-600 text-white rounded-full px-6 py-2 font-medium transition-colors"
            onClick={endCall}
          >
            {callStatus === 'ringing' ? 'Decline' : 'End'}
          </button>
        </div>
      </div>
    </div>
  )
}
