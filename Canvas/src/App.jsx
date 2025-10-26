import React from 'react';
import CanvasEditor from './components/CanvasEditor';
import Toolbar from './components/Toolbar';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <h1>Canvas Editor</h1>
      <Toolbar />
      
      <div className="canvas-wrapper">
        <CanvasEditor />
      </div>
    </div>
  );
}

export default App;