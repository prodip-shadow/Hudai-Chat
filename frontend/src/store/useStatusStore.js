import { create } from 'zustand';
import { getSocket } from '../services/chat.service';
import axiosInstance from '../services/url.service';

const useStatusStore = create((set, get) => ({
  // state
  statuses: [],
  loading: false,
  error: null,

  // actions
  setStatuses: (statuses) => set({ statuses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Initialize  the socket listener
  initializeSocket: () => {
    const socket = getSocket();

    if (!socket) return;

    socket.on('new_status', (newStatus) => {
      set((state) => ({
        statuses: state.statuses.some((s) => s._id === newStatus._id)
          ? state.statuses
          : [newStatus, ...state.statuses],
      }));
    });
    socket.on('status_deleted', (statusId) => {
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
    });
    socket.on('status_viewed', (statusId, viewers) => {
      set((state) => ({
        statuses: state.statuses.map((s) =>
          s._id === statusId ? { ...s, viewers } : s,
        ),
      }));
    });
  },
  cleanUpSocket: () => {
    const socket = getSocket();
    if (socket) {
      socket.off('new_status');
      socket.off('status_deleted');
      socket.off('status_viewed');
    }
  },

  // Fetch status

  fetchStatuses: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get('status');
      set({ statuses: data.data || [], loading: false });
    } catch (error) {
      console.error('Error fetching statuses:', error);
      set({ error: error.message, loading: false });
    }
  },

  // create status
  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();

      if (statusData.file) {
        formData.append('media', statusData.file);
      }

      if (statusData.content?.trim()) {
        formData.append('content', statusData.content);
      }

      const { data } = await axiosInstance.post('/status', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // add to  status in local  state
      if (data?.data) {
        set((state) => ({
          statuses: state.statuses.some((s) => s._id === data.data._id)
            ? state.statuses
            : [data.data, ...state.statuses],
          loading: false,
        }));
      } else {
        set({ loading: false });
      }

      return data.data;
    } catch (error) {
      console.error('Error creating status:', error);

      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // view status
  viewStatus: async (statusId) => {
    try {
      set({ loading: true, error: null });

      await axiosInstance.put(`status/${statusId}/view`);
      set((state) => ({
        statuses: state.statuses.map((s) =>
          s._id === statusId ? { ...s } : s,
        ),
      }));
    } catch (error) {
      console.error('Error viewing status:', error);
      set({ error: error.message,loading: false });
    }
  },

  deleteStatus: async (statusId) => {
    try {
      set({ loading: true, error: null });
      await axiosInstance.delete(`status/${statusId}`);
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
        loading: false,
      }));
    } catch (error) {
      console.error('Error deleting status:', error);

      set({ error: error.message, loading: false });
      throw error;
    }
  },

  getStatusViewers: async (statusId) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(`/status/${statusId}/viewers`);
      return data.data;
    } catch (error) {
      console.error('Error fetching status viewers:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // helper function for groupped status
  getGroupedStatus: () => {
    const { statuses } = get();
    return statuses.reduce((acc, status) => {
      const statusUserId = status.user?._id;
      if (!acc[statusUserId]) {
        acc[statusUserId] = {
          id: statusUserId,
          name: status.user?.username,
          avatar: status?.user?.profilePicture,
          statuses: [],
        };
      }

      acc[statusUserId].statuses.push({
        id: status._id,
        media: status.content,
        contentType: status.contentType,
        timestamp: status.createdAt,
        viewers: status.viewers,
      });

      return acc;
    }, {});
  },

  getUserStatuses: (userId) => {
    const groupedStatuses = get().getGroupedStatus();
    return userId ? groupedStatuses[userId] : null;
  },

  getOtherStatuses: (userId) => {
    const groupedStatuses = get().getGroupedStatus();
    return Object.values(groupedStatuses).filter(
      (contact) => contact.id !== userId,
    );
  },

  // clear error
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      statuses: [],
      loading: false,
      error: null,
    }),
}));

export default useStatusStore;
