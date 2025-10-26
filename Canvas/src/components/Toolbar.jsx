import React, { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  resetTransformations,
  clearImage,
  setImage,
  triggerZoomIn,
  triggerZoomOut,
} from '../store/canvasSlice';

function Toolbar() {
  const dispatch = useDispatch();
  const { imageUrl } = useSelector((state) => state.canvas);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      dispatch(setImage(e.target.result));
    };
    reader.readAsDataURL(file);

    // Reset input value to allow re-uploading the same file
    event.target.value = null;
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    dispatch(resetTransformations());
  };

  const handleClear = () => {
    dispatch(clearImage());
  };

  const handleZoomIn = () => {
    dispatch(triggerZoomIn());
  };

  const handleZoomOut = () => {
    dispatch(triggerZoomOut());
  };

  return (
    <div className="controls">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
      <button onClick={triggerFileUpload}>Upload Image</button>

      <button onClick={handleZoomIn} disabled={!imageUrl}>
        Zoom In
      </button>
      <button onClick={handleZoomOut} disabled={!imageUrl}>
        Zoom Out
      </button>

      <button onClick={handleReset} disabled={!imageUrl}>
        Reset Image
      </button>
      <button onClick={handleClear} disabled={!imageUrl}>
        Clear Image
      </button>
    </div>
  );
}

export default Toolbar;