import { create } from 'zustand';
import { getSocket } from '../services/chat.service';
import axiosInstance from '../services/url.service';

const useStatusStore = create((set, get) => ({
  statuses: [],
  loading: false,
  error: null,
  viewedStatusIds: {},

  setStatuses: (statuses) => set({ statuses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

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

  fetchStatuses: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get('status');
      set({ statuses: data.data || [], loading: false });
    } catch (error) {
      console.error('Error fetching statuses:', error);
      set({ error: error.message, loading: false });
    }
  },

  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      if (statusData.file) formData.append('media', statusData.file);
      if (statusData.content?.trim()) formData.append('content', statusData.content);

      const { data } = await axiosInstance.post('/status', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

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
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // No loading spinner — background operation
  viewStatus: async (statusId) => {
    try {
      await axiosInstance.put(`status/${statusId}/view`);
      set((state) => ({
        viewedStatusIds: { ...state.viewedStatusIds, [statusId]: true },
      }));
    } catch (error) {
      console.error('Error viewing status:', error);
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
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  getStatusViewers: async (statusId) => {
    try {
      const { data } = await axiosInstance.get(`/status/${statusId}/viewers`);
      return data.data;
    } catch (error) {
      console.error('Error fetching status viewers:', error);
      throw error;
    }
  },

  getGroupedStatus: () => {
    const { statuses, viewedStatusIds } = get();
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
        seen: !!viewedStatusIds[status._id],
      });
      return acc;
    }, {});
  },

  getUserStatuses: (userId) => {
    const grouped = get().getGroupedStatus();
    return userId ? grouped[userId] : null;
  },

  getOtherStatuses: (userId) => {
    const grouped = get().getGroupedStatus();
    return Object.values(grouped)
      .filter((contact) => contact.id !== userId)
      .map((contact) => ({
        ...contact,
        allSeen: contact.statuses.every((s) => s.seen),
      }))
      .sort((a, b) => {
        // Unseen first
        if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
        // Then most recent
        const aTime = new Date(a.statuses[a.statuses.length - 1]?.timestamp || 0);
        const bTime = new Date(b.statuses[b.statuses.length - 1]?.timestamp || 0);
        return bTime - aTime;
      });
  },

  clearError: () => set({ error: null }),

  reset: () => set({ statuses: [], loading: false, error: null, viewedStatusIds: {} }),
}));

export default useStatusStore;
