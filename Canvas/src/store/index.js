import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from './canvasSlice';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Fabric.js objects are not serializable.
      // This disables the check, which is common for Fabric+Redux.
      serializableCheck: false,
    }),
});