import axios from 'axios';

// Create a configured instance of axios
const api = axios.create({
  baseURL: 'http://localhost:3000', // Your Backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;