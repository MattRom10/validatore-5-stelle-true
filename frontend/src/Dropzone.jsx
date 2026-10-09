import React, { useState, useRef } from 'react';

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
    <div className='ErroreSeSta'>
      {/* Mostriamo l'errore sopra il box blu se presente */}
      {errore && (
        <div style={{ color: '#d9534f', backgroundColor: '#fdf7f7', padding: '10px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #d9534f' }}>
          <strong>Errore:</strong> {errore}
        </div>
      )}

      <div 
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
        
        <button className='ScegliFile'
          onClick={() => fileInputRef.current.click()}
        >
          SCEGLI FILE
        </button>
        
        <p style={{ margin: 0, fontSize: '1.1rem' }}>o trascina file qui</p>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onFileSelect} 
          style={{ display: 'none' }} 
        />
      </div>
    </div>
  );
};

export default Dropzone;