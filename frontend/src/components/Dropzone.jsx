import React, { useState, useRef } from 'react';
import './Dropzone.css';

const Dropzone = ({ onFileSelected, errore }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="dropzone-container">
      
      {errore && (
        <div className="dropzone-error">
          <strong>Errore:</strong> {errore}
        </div>
      )}

      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`dropzone-area ${isDragging ? 'active' : ''}`}
      >
        <div className="dropzone-icon">📄</div>
        
        <button 
          onClick={() => fileInputRef.current.click()}
          className="dropzone-button"
        >
          SCEGLI FILE
        </button>
        
        <p className="dropzone-text">o trascina file qui</p>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileSelect} 
          className="hidden-input"
        />
      </div>
    </div>
  );
};

export default Dropzone;