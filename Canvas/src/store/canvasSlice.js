import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  imageUrl: null,
  transformations: null,
  initialTransformations: null,
  zoomTrigger: null, // 'in', 'out', or null
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // Triggered when a new file is uploaded
    setImage: (state, action) => {
      state.imageUrl = action.payload;
      state.transformations = null; // Reset transforms to trigger new load
      state.initialTransformations = null;
    },
    // Dispatched by CanvasEditor *after* initial fit
    setInitialTransformations: (state, action) => {
      state.transformations = action.payload;
      state.initialTransformations = action.payload;
    },
    // Dispatched by CanvasEditor during/after pan/zoom
    setTransformations: (state, action) => {
      state.transformations = action.payload;
    },
    // Resets image to its initial state
    resetTransformations: (state) => {
      state.transformations = state.initialTransformations;
    },
    // Removes image from canvas
    clearImage: (state) => {
      state.imageUrl = null;
      state.transformations = null;
      state.initialTransformations = null;
    },
    // Button actions, consumed by CanvasEditor
    triggerZoomIn: (state) => {
      state.zoomTrigger = 'in';
    },
    triggerZoomOut: (state) => {
      state.zoomTrigger = 'out';
    },
    clearZoomTrigger: (state) => {
      state.zoomTrigger = null;
    },
  },
});

export const {
  setImage,
  setInitialTransformations,
  setTransformations,
  resetTransformations,
  clearImage,
  triggerZoomIn,
  triggerZoomOut,
  clearZoomTrigger,
} = canvasSlice.actions;

export default canvasSlice.reducer;