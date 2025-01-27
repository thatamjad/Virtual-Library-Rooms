import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL;

// Add auth token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Ensure proper token format
      config.headers.Authorization = `Bearer ${token.trim()}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = async (email, password) => {
  try {
    console.log('Attempting login for:', email);
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    const { token, user } = response.data;
    console.log('Login successful, token received');
    
    // Store token
    localStorage.setItem('token', token);
    
    return user;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

export const getStoredToken = () => {
  const token = localStorage.getItem('token');
  console.log('Retrieved token from storage:', token ? 'exists' : 'not found');
  return token;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
}; 