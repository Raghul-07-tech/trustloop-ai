import axios from "axios";

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Feedback
  submitFeedback: async (feedbackData) => {
    const response = await axios.post(
      `${API_URL}/feedback/submit`,
      feedbackData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Issues
  getMyIssues: async () => {
    const response = await axios.get(`${API_URL}/issues/my`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  getAllIssues: async () => {
    const response = await axios.get(`${API_URL}/issues/all`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  getIssue: async (issueId) => {
    const response = await axios.get(`${API_URL}/issues/${issueId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  addUpdate: async (issueId, updateData) => {
    const response = await axios.post(
      `${API_URL}/issues/${issueId}/update`,
      updateData,
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  escalateIssue: async (issueId, reason) => {
    const response = await axios.post(
      `${API_URL}/issues/${issueId}/escalate`,
      { reason },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  updateStatus: async (issueId, status) => {
    const response = await axios.post(
      `${API_URL}/issues/${issueId}/status`,
      { status },
      { headers: getAuthHeaders() }
    );
    return response.data;
  },

  // Dashboard
  getDashboardStats: async () => {
    const response = await axios.get(`${API_URL}/stats/dashboard`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};

export default api;