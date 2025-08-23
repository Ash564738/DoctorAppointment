import { configureStore } from "@reduxjs/toolkit";
import { rootReducer } from "./reducers/rootSlice";
import appointmentReducer from "./reducers/appointmentSlice";
import shiftReducer from "./reducers/shiftSlice";
import leaveReducer from "./reducers/leaveSlice";
import swapReducer from "./reducers/swapSlice";
import overtimeReducer from "./reducers/overtimeSlice";

const store = configureStore({
  reducer: {
    root: rootReducer.reducer,
    appointments: appointmentReducer,
    shifts: shiftReducer,
  leaves: leaveReducer,
  swap: swapReducer,
  overtime: overtimeReducer
  },
});

export default store;
