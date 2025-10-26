import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useSelector, useDispatch } from 'react-redux';
import {
  setInitialTransformations,
  setTransformations,
  clearZoomTrigger,
} from '../store/canvasSlice';

// Canvas constants
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;
const STENCIL_WIDTH = 400;
const STENCIL_HEIGHT = 400;
const STENCIL_RADIUS = 20;

const CanvasEditor = () => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null); // Ref for fabric.Canvas instance
  const imageRef = useRef(null); // Ref for fabric.Image instance
  const clipPathRef = useRef(null); // Ref for the clip path Rect
  const frameRef = useRef(null); // Ref for the visible dashed frame

  const dispatch = useDispatch();
  const { imageUrl, transformations, zoomTrigger } = useSelector(
    (state) => state.canvas,
  );

  const [isDragging, setIsDragging] = useState(false);
  const lastClientX = useRef(0);
  const lastClientY = useRef(0);

  // Initialize canvas and stencil frame
  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#f0f0f0',
      selection: false, // Disable group selection
    });
    fabricRef.current = canvas;

    // Define the stencil shape used for clipping
    const clipPath = new fabric.Rect({
      left: (CANVAS_WIDTH - STENCIL_WIDTH) / 2,
      top: (CANVAS_HEIGHT - STENCIL_HEIGHT) / 2,
      width: STENCIL_WIDTH,
      height: STENCIL_HEIGHT,
      rx: STENCIL_RADIUS,
      ry: STENCIL_RADIUS,
      selectable: false,
      evented: false,
      absolutePositioned: true,
      fill: 'black',
      strokeWidth: 0,
    });
    clipPathRef.current = clipPath;

    // Create the visible dashed frame, separate from the clip path
    const frame = new fabric.Rect({
      left: clipPath.left,
      top: clipPath.top,
      width: clipPath.width,
      height: clipPath.height,
      rx: clipPath.rx,
      ry: clipPath.ry,
      fill: 'transparent',
      stroke: 'rgba(0,0,0,0.3)',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      hoverCursor: 'default',
    });
    frameRef.current = frame;
    canvas.add(frame);

    setupEventListeners(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Load or clear the image based on Redux state
  useEffect(() => {
    // Only load if imageUrl exists and transformations are null (a new load)
    if (imageUrl && transformations === null) {
      loadImage(imageUrl);
    } else if (!imageUrl) {
      clearCanvas();
    }
  }, [imageUrl, transformations]);

  // Apply transformations from Redux (e.g., on 'Reset')
  useEffect(() => {
    if (!imageRef.current || !transformations) return;

    const img = imageRef.current;
    const { scale, x, y } = transformations;

    // Guard against infinite loops
    if (
      img.scaleX !== scale ||
      img.scaleY !== scale ||
      img.left !== x ||
      img.top !== y
    ) {
      img.set({ scaleX: scale, scaleY: scale, left: x, top: y });
      applyImageBounds();
      img.setCoords();
      fabricRef.current.requestRenderAll();
    }
  }, [transformations]);

  // Consumes the zoom trigger from Redux state
  useEffect(() => {
    if (!zoomTrigger || !imageRef.current) return;

    const img = imageRef.current;
    let currentZoom = img.scaleX;
    const zoomStep = 1.1;

    if (zoomTrigger === 'in') {
      currentZoom *= zoomStep;
    } else {
      currentZoom /= zoomStep;
    }

    // Clamp zoom to min/max
    const minZoom = getMinZoom();
    if (currentZoom < minZoom) currentZoom = minZoom;
    if (currentZoom > 5) currentZoom = 5;

    img.scale(currentZoom);
    applyImageBounds();
    img.setCoords();
    fabricRef.current.requestRenderAll();

    dispatchTransformations();
    dispatch(clearZoomTrigger());
  }, [zoomTrigger, dispatch]);

  // Binds all Fabric.js interaction listeners
  const setupEventListeners = (canvas) => {
    // Mouse wheel zooming
    canvas.on('mouse:wheel', (opt) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();

      if (!imageRef.current) return;

      const delta = opt.e.deltaY;
      let zoom = imageRef.current.scaleX * 0.999 ** delta;
      const minZoom = getMinZoom();

      if (zoom < minZoom) zoom = minZoom;
      if (zoom > 5) zoom = 5;

      // Zoom towards the mouse pointer
      const pointer = canvas.getPointer(opt.e);
      imageRef.current.scale(zoom);
      imageRef.current.set({
        left: pointer.x - (pointer.x - imageRef.current.left) * (zoom / imageRef.current.scaleX),
        top: pointer.y - (pointer.y - imageRef.current.top) * (zoom / imageRef.current.scaleY),
      });

      applyImageBounds();
      imageRef.current.setCoords();
      canvas.requestRenderAll();
      dispatchTransformations();
    });

    // Panning (Drag)
    canvas.on('mouse:down', (opt) => {
      if (opt.target === imageRef.current) {
        setIsDragging(true);
        lastClientX.current = opt.e.clientX;
        lastClientY.current = opt.e.clientY;
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (!isDragging || !imageRef.current) return;

      const img = imageRef.current;
      const e = opt.e;
      const vpt = canvas.viewportTransform;
      const deltaX = (e.clientX - lastClientX.current) / vpt[0];
      const deltaY = (e.clientY - lastClientY.current) / vpt[3];

      img.set({ left: img.left + deltaX, top: img.top + deltaY });
      applyImageBounds(); // Apply bounds *during* move
      img.setCoords();
      canvas.requestRenderAll();

      lastClientX.current = e.clientX;
      lastClientY.current = e.clientY;
    });

    canvas.on('mouse:up', () => {
      if (isDragging) {
        setIsDragging(false);
        if (imageRef.current) {
          imageRef.current.setCoords();
          dispatchTransformations();
        }
      }
    });
  };

  // Loads the image onto the canvas
  const loadImage = (url) => {
    fabric.Image.fromURL(url, (img) => {
      clearCanvas(); // Clear any existing image
      imageRef.current = img;

      const canvas = fabricRef.current;
      const clipPath = clipPathRef.current;

      // Scale image to "cover" the stencil
      const stencilRatio = clipPath.width / clipPath.height;
      const imgRatio = img.width / img.height;
      const scale =
        imgRatio >= stencilRatio
          ? clipPath.height / img.height
          : clipPath.width / img.width;

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: clipPath.left + clipPath.width / 2,
        top: clipPath.top + clipPath.height / 2,
        originX: 'center',
        originY: 'center',
        clipPath: clipPath,
        
        // This combination allows dragging without showing controls
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: false,
      });

      canvas.add(img);
      img.sendToBack(); // Send behind the frame

      const initialTf = {
        scale: scale,
        x: img.left,
        y: img.top,
      };
      dispatch(setInitialTransformations(initialTf));
      canvas.requestRenderAll();
    });
  };

  // Helper to remove the current image
  const clearCanvas = () => {
    if (imageRef.current) {
      fabricRef.current.remove(imageRef.current);
      imageRef.current = null;
    }
  };

  // Calculates the minimum zoom to ensure the image always covers the stencil
  const getMinZoom = () => {
    if (!imageRef.current) return 1;
    return Math.max(
      STENCIL_WIDTH / imageRef.current.width,
      STENCIL_HEIGHT / imageRef.current.height
    );
  };

  // Prevents the image from being panned outside the stencil bounds
  const applyImageBounds = () => {
    const img = imageRef.current;
    const clipPath = clipPathRef.current;
    if (!img || !clipPath) return;

    const imgBox = img.getBoundingRect();
    const stencilLeft = clipPath.left;
    const stencilTop = clipPath.top;
    const stencilRight = stencilLeft + clipPath.width;
    const stencilBottom = stencilTop + clipPath.height;

    let newLeft = img.left;
    let newTop = img.top;

    // Check horizontal bounds
    if (imgBox.left > stencilLeft) {
      newLeft = img.left - (imgBox.left - stencilLeft);
    }
    if (imgBox.left + imgBox.width < stencilRight) {
      newLeft = img.left + (stencilRight - (imgBox.left + imgBox.width));
    }

    // Check vertical bounds
    if (imgBox.top > stencilTop) {
      newTop = img.top - (imgBox.top - stencilTop);
    }
    if (imgBox.top + imgBox.height < stencilBottom) {
      newTop = img.top + (stencilBottom - (imgBox.top + imgBox.height));
    }

    img.set({ left: newLeft, top: newTop });
  };

  // Dispatches the image's current transform state to Redux
  const dispatchTransformations = () => {
    if (!imageRef.current) return;
    dispatch(
      setTransformations({
        scale: imageRef.current.scaleX,
        x: imageRef.current.left,
        y: imageRef.current.top,
      })
    );
  };

  return <canvas ref={canvasRef} />;
};

export default CanvasEditor;