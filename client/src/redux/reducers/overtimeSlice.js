import toast from "react-hot-toast";
import { apiCall } from "../../helper/apiCall";

// Action Types
const SET_OVERTIME_REQUESTS = "SET_OVERTIME_REQUESTS";
const SET_OVERTIME_LOADING = "SET_OVERTIME_LOADING";
const SET_OVERTIME_ERROR = "SET_OVERTIME_ERROR";

// Initial State
const initialState = {
  overtimeRequests: [],
  loading: false,
  error: null,
};

// Reducer
const overtimeReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_OVERTIME_REQUESTS:
      return { ...state, overtimeRequests: action.payload };
    case SET_OVERTIME_LOADING:
      return { ...state, loading: action.payload };
    case SET_OVERTIME_ERROR:
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

// Action Creators
export const setOvertimeRequests = (requests) => ({ type: SET_OVERTIME_REQUESTS, payload: requests });
export const setOvertimeLoading = (isLoading) => ({ type: SET_OVERTIME_LOADING, payload: isLoading });
export const setOvertimeError = (error) => ({ type: SET_OVERTIME_ERROR, payload: error });

// Thunks
export const fetchMyOvertimeRequests = () => async (dispatch) => {
  dispatch(setOvertimeLoading(true));
  try {
    const data = await apiCall.get('/overtime/my-overtime');
    if (data.success) {
      dispatch(setOvertimeRequests(data.data));
    } else {
      dispatch(setOvertimeError(data.message || 'Failed to fetch overtime requests'));
    }
  } catch (error) {
    dispatch(setOvertimeError(error.response?.data?.message || 'Failed to fetch overtime requests'));
  } finally {
    dispatch(setOvertimeLoading(false));
  }
};

export const createOvertimeRequest = (overtimeData) => async (dispatch) => {
  dispatch(setOvertimeLoading(true));
  try {
    const data = await apiCall.post('/overtime/create', overtimeData);
    if (data.success) {
      toast.success('Overtime request submitted');
      dispatch(fetchMyOvertimeRequests());
    } else {
      toast.error(data.message || 'Failed to submit overtime request');
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to submit overtime request');
  } finally {
    dispatch(setOvertimeLoading(false));
  }
};

export default overtimeReducer;
