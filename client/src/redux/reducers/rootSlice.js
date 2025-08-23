import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

export const rootReducer = createSlice({
  name: "root",
  initialState: {
    loading: false,
    userInfo: (() => {
      try {
        const token = localStorage.getItem('token');
        return token ? jwtDecode(token) : null;
      } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('token');
        return null;
      }
    })(),
    error: null
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setUserInfo: (state, action) => {
      state.userInfo = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  },
});

export const { setLoading, setUserInfo } = rootReducer.actions;
export default rootReducer.reducer;
