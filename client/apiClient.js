// apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://linkup-server.onrender.com/api', // Replace with your actual backend URL
  withCredentials: false, // 🔴 Disable cookie sending
});

// ✅ Automatically attach token from localStorage to headers
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // 🔐 Your stored token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;
