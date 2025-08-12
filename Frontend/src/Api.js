// src/api.js
import axios from 'axios';

// Create an Axios instance with your backend API base URL
const api = axios.create({
  baseURL: 'http://localhost:5000', // Change this to your backend URL
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
