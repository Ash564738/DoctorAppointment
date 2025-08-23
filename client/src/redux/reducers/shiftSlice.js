import { setLoading } from "./rootSlice";
import toast from "react-hot-toast";
import { apiCall } from "../../helper/apiCall";

// Action Types
const FETCH_DOCTOR_SHIFTS = "FETCH_DOCTOR_SHIFTS";
const SET_DOCTOR_SHIFTS = "SET_DOCTOR_SHIFTS";
const SET_SHIFT_LOADING = "SET_SHIFT_LOADING";
const SET_SHIFT_ERROR = "SET_SHIFT_ERROR";
const SET_TIME_SLOTS = "SET_TIME_SLOTS";
const UPDATE_SHIFT = "UPDATE_SHIFT";
const DELETE_SHIFT = "DELETE_SHIFT";

// Initial State
const initialState = {
  shifts: [],
  timeSlots: [],
  loading: false,
  error: null,
};

// Reducer
const shiftReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_DOCTOR_SHIFTS:
      return {
        ...state,
        shifts: action.payload,
      };
    case SET_TIME_SLOTS:
      return {
        ...state,
        timeSlots: action.payload,
      };
    case SET_SHIFT_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case SET_SHIFT_ERROR:
      return {
        ...state,
        error: action.payload,
      };
    case UPDATE_SHIFT:
      return {
        ...state,
        shifts: state.shifts.map(shift => 
          shift._id === action.payload._id ? action.payload : shift
        ),
      };
    case DELETE_SHIFT:
      return {
        ...state,
        shifts: state.shifts.filter(shift => shift._id !== action.payload),
      };
    default:
      return state;
  }
};

// Action Creators
export const setShifts = (shifts) => ({
  type: SET_DOCTOR_SHIFTS,
  payload: shifts,
});

export const setTimeSlots = (slots) => ({
  type: SET_TIME_SLOTS,
  payload: slots,
});

export const setShiftLoading = (isLoading) => ({
  type: SET_SHIFT_LOADING,
  payload: isLoading,
});

export const setShiftError = (error) => ({
  type: SET_SHIFT_ERROR,
  payload: error,
});

export const updateShiftInState = (shift) => ({
  type: UPDATE_SHIFT,
  payload: shift,
});

export const deleteShiftFromState = (shiftId) => ({
  type: DELETE_SHIFT,
  payload: shiftId,
});

// Thunk Action Creators
export const fetchDoctorShifts = (doctorId) => {
  return async (dispatch) => {
    try {
      dispatch(setShiftLoading(true));
      
      const data = await apiCall.get(`/shift/doctor/${doctorId || ''}`);
      if (data.success) {
        dispatch(setShifts(data.shifts));
      } else {
        dispatch(setShiftError(data.message || 'Failed to fetch shifts'));
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
      dispatch(setShiftError(error.response?.data?.message || "Failed to fetch shifts"));
    } finally {
      dispatch(setShiftLoading(false));
    }
  };
};

export const fetchMyDoctorShifts = () => {
  return async (dispatch) => {
    try {
      dispatch(setShiftLoading(true));
      
      const data = await apiCall.get('/shift/doctor');
      if (data.success) {
        dispatch(setShifts(data.shifts));
      } else {
        dispatch(setShiftError(data.message || 'Failed to fetch shifts'));
      }
    } catch (error) {
      console.error("Error fetching shifts:", error);
      dispatch(setShiftError(error.response?.data?.message || "Failed to fetch shifts"));
    } finally {
      dispatch(setShiftLoading(false));
    }
  };
};

export const fetchTimeSlotsForDate = (doctorId, date) => {
  return async (dispatch) => {
    try {
      dispatch(setShiftLoading(true));
      
      const data = await apiCall.get(`/shift/available-slots/${doctorId}/${date}`);
      if (data.success) {
        dispatch(setTimeSlots(data.slots));
      } else {
        dispatch(setShiftError(data.message || 'Failed to fetch time slots'));
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      dispatch(setShiftError(error.response?.data?.message || "Failed to fetch time slots"));
    } finally {
      dispatch(setShiftLoading(false));
    }
  };
};

export const createShift = (shiftData) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading(true));
      
      const data = await apiCall.post('/shift/create', shiftData);
      if (data.success) {
        toast.success('Shift created successfully');
        dispatch(fetchMyDoctorShifts());
      } else {
        toast.error(data.message || 'Failed to create shift');
      }
    } catch (error) {
      console.error("Error creating shift:", error);
      toast.error(error.response?.data?.message || "Failed to create shift");
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const updateShift = (shiftId, shiftData) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading(true));
      
      const data = await apiCall.put(`/shift/${shiftId}`, shiftData);
      if (data.success) {
        toast.success('Shift updated successfully');
        dispatch(updateShiftInState(data.shift));
      } else {
        toast.error(data.message || 'Failed to update shift');
      }
    } catch (error) {
      console.error("Error updating shift:", error);
      toast.error(error.response?.data?.message || "Failed to update shift");
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const deleteShift = (shiftId) => {
  return async (dispatch) => {
    try {
      dispatch(setLoading(true));
      
      const data = await apiCall.delete(`/shift/${shiftId}`);
      if (data.success) {
        toast.success('Shift deleted successfully');
        dispatch(deleteShiftFromState(shiftId));
      } else {
        toast.error(data.message || 'Failed to delete shift');
      }
    } catch (error) {
      console.error("Error deleting shift:", error);
      toast.error(error.response?.data?.message || "Failed to delete shift");
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export default shiftReducer;
