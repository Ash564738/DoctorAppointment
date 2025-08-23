import { setLoading } from "./rootSlice";
import toast from "react-hot-toast";
import { apiCall } from "../../helper/apiCall";

// Action Types
const FETCH_LEAVE_REQUESTS = "FETCH_LEAVE_REQUESTS";
const SET_LEAVE_REQUESTS = "SET_LEAVE_REQUESTS";
const SET_LEAVE_LOADING = "SET_LEAVE_LOADING";
const SET_LEAVE_ERROR = "SET_LEAVE_ERROR";
const SET_LEAVE_STATISTICS = "SET_LEAVE_STATISTICS";
const UPDATE_LEAVE_REQUEST = "UPDATE_LEAVE_REQUEST";
const DELETE_LEAVE_REQUEST = "DELETE_LEAVE_REQUEST";

// Initial State
const initialState = {
  leaveRequests: [],
  statistics: {
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    leaveBalance: {
      sick: 0,
      vacation: 0,
      personal: 0,
      other: 0
    }
  },
  loading: false,
  error: null,
};

// Reducer
const leaveReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_LEAVE_REQUESTS:
      return {
        ...state,
        leaveRequests: action.payload,
      };
    case SET_LEAVE_STATISTICS:
      return {
        ...state,
        statistics: action.payload,
      };
    case SET_LEAVE_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case SET_LEAVE_ERROR:
      return {
        ...state,
        error: action.payload,
      };
    case UPDATE_LEAVE_REQUEST:
      return {
        ...state,
        leaveRequests: state.leaveRequests.map(request => 
          request._id === action.payload._id ? action.payload : request
        ),
      };
    case DELETE_LEAVE_REQUEST:
      return {
        ...state,
        leaveRequests: state.leaveRequests.filter(request => request._id !== action.payload),
      };
    default:
      return state;
  }
};

// Action Creators
export const setLeaveRequests = (requests) => ({
  type: SET_LEAVE_REQUESTS,
  payload: requests,
});

export const setLeaveStatistics = (statistics) => ({
  type: SET_LEAVE_STATISTICS,
  payload: statistics,
});

export const setLeaveLoading = (isLoading) => ({
  type: SET_LEAVE_LOADING,
  payload: isLoading,
});

export const setLeaveError = (error) => ({
  type: SET_LEAVE_ERROR,
  payload: error,
});

export const updateLeaveRequestInState = (request) => ({
  type: UPDATE_LEAVE_REQUEST,
  payload: request,
});

export const deleteLeaveRequestFromState = (requestId) => ({
  type: DELETE_LEAVE_REQUEST,
  payload: requestId,
});

// Thunk Action Creators
export const fetchLeaveRequests = (filters = {}) => {
  return async (dispatch) => {
    try {
      dispatch(setLeaveLoading(true));
      
  // Construct query params from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const data = await apiCall.get(`/leave?${queryParams.toString()}`);
      if (data.success) {
        dispatch(setLeaveRequests(data.leaveRequests));
      } else {
        dispatch(setLeaveError(data.message || 'Failed to fetch leave requests'));
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      dispatch(setLeaveError(error.response?.data?.message || "Failed to fetch leave requests"));
    } finally {
      dispatch(setLeaveLoading(false));
    }
  };
};

export const fetchLeaveStatistics = () => {
  return async (dispatch) => {
    try {
      dispatch(setLeaveLoading(true));
      
      const data = await apiCall.get('/leave/statistics');
      if (data.success) {
        dispatch(setLeaveStatistics(data.statistics));
      } else {
        dispatch(setLeaveError(data.message || 'Failed to fetch leave statistics'));
      }
    } catch (error) {
      console.error("Error fetching leave statistics:", error);
      dispatch(setLeaveError(error.response?.data?.message || "Failed to fetch leave statistics"));
    } finally {
      dispatch(setLeaveLoading(false));
    }
  };
};

export const submitLeaveRequest = (leaveData) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading(true));
      
      const data = await apiCall.post('/leave/request', leaveData);
      if (data.success) {
        toast.success('Leave request submitted successfully');
        dispatch(fetchLeaveRequests());
        dispatch(fetchLeaveStatistics());
        return data.leaveRequest;
      } else {
        toast.error(data.message || 'Failed to submit leave request');
        return null;
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast.error(error.response?.data?.message || "Failed to submit leave request");
      return null;
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const cancelLeaveRequest = (requestId) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading(true));
      
      const data = await apiCall.patch(`/leave/${requestId}/cancel`, {});
      if (data.success) {
        toast.success('Leave request cancelled successfully');
        dispatch(fetchLeaveRequests());
        dispatch(fetchLeaveStatistics());
      } else {
        toast.error(data.message || 'Failed to cancel leave request');
      }
    } catch (error) {
      console.error("Error cancelling leave request:", error);
      toast.error(error.response?.data?.message || "Failed to cancel leave request");
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const processLeaveRequest = (requestId, status, rejectionReason) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading(true));
      
      const data = await apiCall.patch(`/leave/${requestId}/process`, { status, rejectionReason });
      if (data.success) {
        toast.success(`Leave request ${status} successfully`);
        dispatch(fetchLeaveRequests());
        dispatch(fetchLeaveStatistics());
      } else {
        toast.error(data.message || 'Failed to process leave request');
      }
    } catch (error) {
      console.error("Error processing leave request:", error);
      toast.error(error.response?.data?.message || "Failed to process leave request");
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export default leaveReducer;
