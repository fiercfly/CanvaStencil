# Canvas Stencil Editor

A canvas-based image editor built with React, Fabric.js, and Redux. This application allows users to upload an image into a predefined stencil frame and then pan and zoom the image within that frame's bounds.

## Features

-   **Image Upload:** Load any local image (JPG, PNG) into the canvas.
-   **Stencil Masking:** The image is automatically scaled to cover and is clipped by a rounded rectangle stencil.
-   **Pan/Drag:** Click and drag the image to reposition it within the frame.
-   **Zoom:** Use the mouse wheel or the "Zoom In" / "Zoom Out" buttons to scale the image.
-   **Bounds Constraint:** The image can never be panned or zoomed out of the stencil's boundaries.
-   **State Management:** Image state (transforms, URL) is managed globally with Redux, allowing for "Reset" and "Clear" functionality.

## Local Setup

To run this project locally, follow these steps:

1.  **Clone the repository (or download the source):**
    ```sh
    git clone [https://github.com/fiercfly/CanvaStencil.git](https://github.com/fiercfly/CanvaStencil.git)
    cd CanvaStencil
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Implementation Details

### Fabric.js Canvas

The core visual component is a `fabric.Canvas`. The "stencil" effect is achieved by two separate `fabric.Rect` objects:

1.  **Clip Path (`clipPathRef`):** An invisible `fabric.Rect` with rounded corners (`rx`, `ry`) that is assigned to the `fabric.Image` object's `clipPath` property. This shape dynamically masks the image.
2.  **Visible Frame (`frameRef`):** A second `fabric.Rect` with a transparent fill and a dashed stroke. This is added to the canvas *on top* of the image to provide a visual guideline for the user.

### State Management (Redux)

Redux Toolkit is used to manage the application's global state. The `canvasSlice` holds key information:

-   `imageUrl`: The `data:URL` of the currently loaded image.
-   `transformations`: An object `{ scale, x, y }` representing the image's current state. This is updated on pan/zoom and read on "Reset".
-   `zoomTrigger`: A simple state (`'in'`, `'out'`) used to communicate from the `Toolbar` buttons to the `CanvasEditor`.

### Interaction & Bounds

-   **Pan:** Implemented using `mouse:down`, `mouse:move`, and `mouse:up` listeners. The `applyImageBounds()` function is called on every move to prevent the image from being dragged outside the frame.
-   **Zoom:** Implemented using the `mouse:wheel` event and by subscribing to the `zoomTrigger` state from Redux.
-   **`applyImageBounds()`:** This is the core constraint logic. It checks if any of the image's four bounding-box edges have moved "inside" the stencil's corresponding edge. If so, it calculates the difference and snaps the image's position back to the boundary.
