import axios from "axios";
import logger from "../utils/logger";

// Configure axios with the correct base URL structure
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_SERVER_URL + '/api' || 'http://localhost:5015/api'
});

// Request interceptor for timing
axiosInstance.interceptors.request.use(
  (config) => {
    const startTime = Date.now();
    config.metadata = { startTime };
    return config;
  },
  (error) => {
    logger.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
axiosInstance.interceptors.response.use(
  (response) => {
    const endTime = Date.now();
    const startTime = response.config.metadata?.startTime || endTime;
    const responseTime = endTime - startTime;



    return response;
  },
  (error) => {
    const endTime = Date.now();
    const startTime = error.config?.metadata?.startTime || endTime;
    const responseTime = endTime - startTime;

    // Only log server errors (5xx)
    if (error.response?.status >= 500) {
      logger.error('API Server Error', error, {
        method: error.config?.method?.toUpperCase(),
        url: error.config?.url,
        status: error.response?.status
      });
    }

    return Promise.reject(error);
  }
);

const fetchData = async (url, options = {}) => {
  try {

    const { data } = await axiosInstance.get(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        ...options.headers
      },
      ...options
    });

    logger.debug(`Successfully fetched data from: ${url}`, {
      dataSize: JSON.stringify(data).length,
      success: data.success
    });

    return data;
  } catch (error) {
    logger.error(`Failed to fetch data from: ${url}`, error, {
      status: error.response?.status,
      statusText: error.response?.statusText,
      options
    });
    throw error;
  }
};

// Enhanced API methods
const apiCall = {
  get: async (url, config = {}) => {
    try {
      const response = await axiosInstance.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          ...config.headers
        },
        ...config
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  post: async (url, data = {}, config = {}) => {
    try {
      const response = await axiosInstance.post(url, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json',
          ...config.headers
        },
        ...config
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  put: async (url, data = {}, config = {}) => {
    try {
      const response = await axiosInstance.put(url, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json',
          ...config.headers
        },
        ...config
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  delete: async (url, config = {}) => {
    try {
      const response = await axiosInstance.delete(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          ...config.headers
        },
        ...config
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export { apiCall };
export default fetchData;
