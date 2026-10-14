import React, { useState } from 'react';
import Dropzone from './components/Dropzone';
import './App.css';
import Pagella from './components/Pagella';
import Footer from './components/Footer';

function App() {
  // Aggiunto stato per memorizzare il file prima di inviarlo
  const [fileDaAnalizzare, setFileDaAnalizzare] = useState(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [risultato, setRisultato] = useState(null);
  const [errore, setErrore] = useState(null);

  // 1. Il Dropzone chiama questa funzione: memorizziamo solo il file, NON facciamo la fetch
  const gestisciSelezioneFile = (file) => {
    setFileDaAnalizzare(file);
    setErrore(null);
    setRisultato(null);
  };

  // 2. Il bottone "Analizza Dataset" chiama questa funzione: invia il file al backend
  const avviaAnalisi = async () => {
    if (!fileDaAnalizzare) return;

    setIsAnalyzing(true);
    setErrore(null);

    const formData = new FormData();
    formData.append('dataset', fileDaAnalizzare); // 'dataset' come nel backend

    try {
      const response = await fetch('https://validatore-5-stelle-true.onrender.com/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Il server non ha risposto correttamente.');
      }

      const data = await response.json();
      setRisultato(data); 
    } catch (err) {
      setErrore(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Funzione per annullare e tornare alla dropzone
  const annullaSelezione = () => {
    setFileDaAnalizzare(null);
    setErrore(null);
  };

  const riavviaTutto = () => {
    setFileDaAnalizzare(null);
    setRisultato(null);
    setErrore(null);
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Validatore 5 Stelle LOD</h1>
      <p>
        <a href="https://dati.veneto.it/content/modello-5-stars" target='_blank'>Cos'è il sistema 5 stelle?</a>
      </p>

      {/* STEP 1: Nessun file selezionato -> Mostra la Dropzone */}
      {!isAnalyzing && !risultato && !fileDaAnalizzare && (
        <Dropzone onFileSelected={gestisciSelezioneFile} errore={errore} />
      )}

      {/* STEP 2: File selezionato -> Mostra riepilogo e bottone Analizza */}
      {!isAnalyzing && !risultato && fileDaAnalizzare && (
        <div className="file-ready-container">
          <h2>File pronto per l'analisi</h2>
          <div className="file-info-box">
            <span style={{ fontSize: '2rem' }}>📄</span>
            <p className="file-name">{fileDaAnalizzare.name}</p>
            <p className="file-size">{(fileDaAnalizzare.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          
          <div className="action-buttons">
            <button className="btn-cancel" onClick={annullaSelezione}>
              Annulla
            </button>
            <button className="btn-analyze" onClick={avviaAnalisi}>
              Analizza Dataset
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Risultati pronti -> Mostra la Pagella */}
      {risultato && !isAnalyzing && (
        <div className="result-container">
          <Pagella risultato={risultato} onReset={riavviaTutto} />
        </div>
      )}
      <Footer />
    </div>
     
  );

 
}

export default App;