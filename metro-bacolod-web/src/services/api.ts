import axios from 'axios';
import { auth } from '../firebase-config';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000", 
});

// Attach Firebase Auth token to every outgoing request
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Failed to attach auth token:", err);
  }
  return config;
});

export default api;