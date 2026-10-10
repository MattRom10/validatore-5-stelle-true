import React, { useState, useEffect } from 'react';
import './Pagella.css';

const Pagella = ({ risultato, onReset }) => {
  const [stelleVisibili, setStelleVisibili] = useState(0);
  const [logVisibili, setLogVisibili] = useState([]);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    //isMounted serve per evitare memory leak se l'utente chiude la pagella prima della fine dell'animazione
    let isMounted = true;

    const avviaAnimazione = async () => {
      // 1. INTELLIGENZA ANIMAZIONE: Calcolo del tetto massimo di partenza
      let stellaPartenza = risultato.stelleAssegnate;
      const tuttiILog = risultato.dettagli.join(' ').toLowerCase();

      // Scansioniamo in anticipo i log per capire da che piano è caduto il file
      if (tuttiILog.includes('declassamento da 5')) stellaPartenza = 5;
      else if (tuttiILog.includes('declassamento dal modello a 4')) stellaPartenza = 4;
      else if (tuttiILog.includes('declassamento da 3')) stellaPartenza = 3;
      // Se è un Excel o un CSV senza errori, stellaPartenza rimane il voto finale (es. 2 o 3)

      // 2. SALITA RAPIDA FINO AL TETTO CORRETTO
      for (let i = 1; i <= stellaPartenza; i++) {
        if (!isMounted) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
        setStelleVisibili(i);
      }

      await new Promise((resolve) => setTimeout(resolve, 800)); // Pausa di suspense incredibile

      // 3. LETTURA LOG E DECLASSAMENTI IN TEMPO REALE (con decurtazione stelle)")
      let stelleAttuali = stellaPartenza;

      for (let i = 0; i < risultato.dettagli.length; i++) {
        if (!isMounted) return;
        
        const rigaLog = risultato.dettagli[i];
        const testoLog = rigaLog.toLowerCase();
        
        // Appare la riga di log a schermo
        setLogVisibili((prev) => [...prev, rigaLog]);

        // Applichiamo la decurtazione delle stelle in sincronia con il testo
        if (testoLog.includes('declassamento da 5')) stelleAttuali = 4;
        else if (testoLog.includes('declassamento dal modello a 4')) stelleAttuali = 3;
        else if (testoLog.includes('declassamento da 3') || testoLog.includes('declassamento da 2')) stelleAttuali = 1;
        else if (testoLog.includes('spoofing') || testoLog.includes('corruzione') || testoLog.includes('allarme')) stelleAttuali = 0;

        setStelleVisibili(stelleAttuali);

        // Tempo di lettura per l'utente prima del log successivo
        await new Promise((resolve) => setTimeout(resolve, 1400));
      }

      // 4. CONCLUSIONE
      if (isMounted) {
        setStelleVisibili(risultato.stelleAssegnate); // Allineamento di sicurezza
        setIsFinishing(true);
      }
    };

    avviaAnimazione();

    return () => {
      isMounted = false;
    };
  }, [risultato]);

  return (
    <div className="pagella-container">
      <div className="pagella-header">
        <h2 className="pagella-title">Valutazione Completata</h2>
        <p className="pagella-file">📄 {risultato.file} ({risultato.dimensioneKB} KB)</p>
      </div>

      {/* RENDERIZZAZIONE DELLE 5 STELLE */}
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((stella) => (
          <span 
            key={stella} 
            className={`star ${stella <= stelleVisibili ? 'filled' : 'empty'}`}
          >
            ★
          </span>
        ))}
      </div>

      {/* LIVELLO DI MATURITÀ (Mostrato con un rimbalzo alla fine) */}
      <div className="maturita-container">
        {isFinishing && (
          <h3 className="maturita-testo bounce-in">{risultato.livelloMaturita}</h3>
        )}
      </div>

      {/* TERMINALE CON I LOG ANIMATI */}
      <div className="terminal-logs">
        {logVisibili.map((log, index) => (
          <div 
            key={index} 
            className={`log-line slide-in ${log.includes('Declassamento') || log.includes('ALLARME') ? 'log-error' : 'log-success'}`}
          >
            <span className="log-icon">
              {log.includes('Declassamento') || log.includes('ALLARME') ? '⚠️' : '✅'}
            </span>
            {log}
          </div>
        ))}
      </div>

      {/* BOTTONE PER RICOMINCIARE */}
      {isFinishing && (
        <button className="btn-reset fade-in" onClick={onReset}>
          Analizza un altro dataset
        </button>
      )}
    </div>
  );
};

export default Pagella;