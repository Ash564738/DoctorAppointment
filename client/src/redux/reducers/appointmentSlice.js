import { apiCall } from "../../helper/apiCall";
import { setLoading } from "./rootSlice";
import toast from "react-hot-toast";

// Action Types
const FETCH_APPOINTMENTS = "FETCH_APPOINTMENTS";
const SET_AVAILABLE_SLOTS = "SET_AVAILABLE_SLOTS";
const SET_DOCTOR_SCHEDULE = "SET_DOCTOR_SCHEDULE";
const SET_APPOINTMENT_FILTERS = "SET_APPOINTMENT_FILTERS";
const CLEAR_FILTERS = "CLEAR_FILTERS";

// Initial State
const initialState = {
  appointments: [],
  availableSlots: [],
  doctorSchedule: [],
  filters: {
    status: "",
    date: "",
    doctorId: "",
    userId: "",
  },
  pagination: {
    total: 0,
    page: 1,
    pages: 1
  }
};

// Reducer
const appointmentReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_APPOINTMENTS:
      return {
        ...state,
        appointments: action.payload.data,
        pagination: action.payload.pagination
      };
    case SET_AVAILABLE_SLOTS:
      return {
        ...state,
        availableSlots: action.payload
      };
    case SET_DOCTOR_SCHEDULE:
      return {
        ...state,
        doctorSchedule: action.payload
      };
    case SET_APPOINTMENT_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };
    case CLEAR_FILTERS:
      return {
        ...state,
        filters: initialState.filters
      };
    default:
      return state;
  }
};

// Action Creators
export const fetchAppointments = (page = 1, filters = {}) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const data = await apiCall.get(`/enhanced-appointment`, { params: { page, ...filters } });
    dispatch({ type: FETCH_APPOINTMENTS, payload: data });
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to fetch appointments");
  } finally {
    dispatch(setLoading(false));
  }
};

export const fetchAvailableSlots = (doctorId, date) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const data = await apiCall.get(`/shift/available-slots/${doctorId}/${date}`);
    dispatch({ type: SET_AVAILABLE_SLOTS, payload: data.slots });
  } catch (error) {
    toast.error("Failed to fetch available slots");
  } finally {
    dispatch(setLoading(false));
  }
};

export const fetchDoctorSchedule = (doctorId, startDate, endDate) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const data = await apiCall.get(`/enhanced-appointment/doctor/${doctorId}/schedule`, { params: { startDate, endDate } });
    dispatch({ type: SET_DOCTOR_SCHEDULE, payload: data.data });
  } catch (error) {
    toast.error("Failed to fetch doctor schedule");
  } finally {
    dispatch(setLoading(false));
  }
};

export const bookAppointment = async (appointmentData) => {
  try {
    const data = await apiCall.post(`/enhanced-appointment/book`, appointmentData);
    toast.success("Appointment booked successfully!");
    return data;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to book appointment");
    throw error;
  }
};

export const updateAppointmentStatus = async (appointmentId, statusData) => {
  try {
    const data = await apiCall.put(`/enhanced-appointment/${appointmentId}/status`, statusData);
    toast.success("Appointment status updated successfully!");
    return data;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to update appointment status");
    throw error;
  }
};

export const addAppointmentRating = async (appointmentId, ratingData) => {
  try {
    const data = await apiCall.post(`/enhanced-appointment/${appointmentId}/rating`, ratingData);
    toast.success("Rating submitted successfully!");
    return data;
  } catch (error) {
    toast.error(error.response?.data?.message || "Failed to submit rating");
    throw error;
  }
};

export const setAppointmentFilters = (filters) => ({
  type: SET_APPOINTMENT_FILTERS,
  payload: filters
});

export const clearFilters = () => ({
  type: CLEAR_FILTERS
});

export default appointmentReducer;
