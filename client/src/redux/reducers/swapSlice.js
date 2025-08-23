import toast from "react-hot-toast";
import { apiCall } from "../../helper/apiCall";

// Action Types
const SET_SWAP_REQUESTS = "SET_SWAP_REQUESTS";
const SET_SWAP_LOADING = "SET_SWAP_LOADING";
const SET_SWAP_ERROR = "SET_SWAP_ERROR";

// Initial State
const initialState = {
  swapRequests: [],
  loading: false,
  error: null,
};

// Reducer
const swapReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_SWAP_REQUESTS:
      return { ...state, swapRequests: action.payload };
    case SET_SWAP_LOADING:
      return { ...state, loading: action.payload };
    case SET_SWAP_ERROR:
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

// Action Creators
export const setSwapRequests = (requests) => ({ type: SET_SWAP_REQUESTS, payload: requests });
export const setSwapLoading = (isLoading) => ({ type: SET_SWAP_LOADING, payload: isLoading });
export const setSwapError = (error) => ({ type: SET_SWAP_ERROR, payload: error });

// Thunks
export const fetchMySwapRequests = () => async (dispatch) => {
  dispatch(setSwapLoading(true));
  try {
    const data = await apiCall.get('/shift-swap/my-swaps');
    if (data.success) {
      dispatch(setSwapRequests(data.data));
    } else {
      dispatch(setSwapError(data.message || 'Failed to fetch swap requests'));
    }
  } catch (error) {
    dispatch(setSwapError(error.response?.data?.message || 'Failed to fetch swap requests'));
  } finally {
    dispatch(setSwapLoading(false));
  }
};

export const createSwapRequest = (swapData) => async (dispatch) => {
  dispatch(setSwapLoading(true));
  try {
    const data = await apiCall.post('/shift-swap/create', swapData);
    if (data.success) {
      toast.success('Swap request submitted');
      dispatch(fetchMySwapRequests());
    } else {
      toast.error(data.message || 'Failed to submit swap request');
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to submit swap request');
  } finally {
    dispatch(setSwapLoading(false));
  }
};

export default swapReducer;
