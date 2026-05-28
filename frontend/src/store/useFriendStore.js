import { create } from 'zustand';
import axiosInstance from '../services/url.service';
import { getSocket } from '../services/chat.service';

const useFriendStore = create((set, get) => ({
  friends: [],
  sentRequests: [],
  receivedRequests: [],
  discoverUsers: [],
  loading: false,
  error: null,

  // Badge count for sidebar
  receivedCount: 0,

  setReceivedCount: (count) => set({ receivedCount: count }),

  // Socket listeners for real-time friend events
  initFriendSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('friend_request_received', (request) => {
      set((state) => ({
        receivedRequests: [request, ...state.receivedRequests],
        receivedCount: state.receivedCount + 1,
      }));
    });

    socket.on('friend_request_accepted', ({ friendId, friend }) => {
      // Remove from sent requests, add to friends
      set((state) => ({
        sentRequests: state.sentRequests.filter(
          (r) => r.receiver?._id !== friendId,
        ),
        friends: [...state.friends, friend],
      }));
    });
  },

  cleanupFriendSocket: () => {
    const socket = getSocket();
    if (socket) {
      socket.off('friend_request_received');
      socket.off('friend_request_accepted');
    }
  },

  fetchSentRequests: async () => {
    try {
      const { data } = await axiosInstance.get('/friends/sent-requests');
      set({ sentRequests: data.data || [] });
    } catch (err) {
      console.error(err);
    }
  },

  fetchReceivedRequests: async () => {
    try {
      const { data } = await axiosInstance.get('/friends/received-requests');
      const requests = data.data || [];
      set({ receivedRequests: requests, receivedCount: requests.length });
    } catch (err) {
      console.error(err);
    }
  },

  fetchAllFriends: async () => {
    try {
      const { data } = await axiosInstance.get('/friends/all');
      set({ friends: data.data || [] });
    } catch (err) {
      console.error(err);
    }
  },

  fetchDiscoverUsers: async () => {
    set({ loading: true });
    try {
      const { data } = await axiosInstance.get('/friends/discover');
      set({ discoverUsers: data.data || [], loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  sendRequest: async (receiverId) => {
    try {
      await axiosInstance.post('/friends/send-request', { receiverId });
      // Remove from discover list
      set((state) => ({
        discoverUsers: state.discoverUsers.filter((u) => u._id !== receiverId),
      }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  cancelRequest: async (requestId, receiverId) => {
    try {
      await axiosInstance.delete(`/friends/cancel-request/${requestId}`);
      set((state) => ({
        sentRequests: state.sentRequests.filter((r) => r._id !== requestId),
        // Put user back in discover? No — they stay hidden until page refresh
      }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  acceptRequest: async (requestId) => {
    try {
      await axiosInstance.put(`/friends/accept-request/${requestId}`);
      const request = get().receivedRequests.find((r) => r._id === requestId);
      set((state) => ({
        receivedRequests: state.receivedRequests.filter((r) => r._id !== requestId),
        receivedCount: Math.max(0, state.receivedCount - 1),
        friends: request?.sender ? [...state.friends, request.sender] : state.friends,
      }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  declineRequest: async (requestId) => {
    try {
      await axiosInstance.delete(`/friends/decline-request/${requestId}`);
      set((state) => ({
        receivedRequests: state.receivedRequests.filter((r) => r._id !== requestId),
        receivedCount: Math.max(0, state.receivedCount - 1),
      }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  unfriend: async (friendId) => {
    try {
      await axiosInstance.delete(`/friends/unfriend/${friendId}`);
      set((state) => ({
        friends: state.friends.filter((f) => f._id !== friendId),
      }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  },
}));

export default useFriendStore;
