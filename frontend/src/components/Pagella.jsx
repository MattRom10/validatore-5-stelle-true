import React, { useState, useEffect } from 'react';
import './Pagella.css';

const Pagella = ({ risultato, onReset }) => {
  const [stelleVisibili, setStelleVisibili] = useState(0);
  const [logVisibili, setLogVisibili] = useState([]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [cheFo, setCheFo] = useState(false);

  // Dizionario con le spiegazioni di Tim Berners-Lee
  const descrizioniLOD = {
    0: "Il file non risulta classificabile secondo i parametri degli Open Data. Potrebbe presentare un formato errato, dati binari illeggibili o risultare corrotto (rilevato rischio di spoofing).",
    
    1: "Il dato è pubblicato sul web con licenza aperta, ma in un formato statico e non strutturato (es. PDF, JPEG, TXT). È facilmente consultabile e stampabile da un utente umano, ma non è elaborabile in modo automatico da una macchina.",
    
    2: "Il dato è strutturato ed elaborabile automaticamente (machine-readable), ma utilizza un formato proprietario (es. Microsoft Excel). Questo vincola l'utente all'uso di software commerciali specifici per poterlo manipolare.",
    
    3: "Il dato è strutturato e distribuito in un formato aperto e non proprietario (es. CSV, JSON, XML). Questo garantisce massima interoperabilità: qualunque software può leggerlo e analizzarlo liberamente senza vincoli di licenza.",
    
    4: "Il dato è strutturato secondo gli standard del Web Semantico (RDF, Turtle). Utilizza URI (Uniform Resource Identifier) per identificare in modo univoco i concetti sul web, ma il dataset agisce ancora come un 'silo' isolato.",
    
    5: "Linked Open Data (LOD). È il massimo livello di maturità semantica: il dataset utilizza URI ed è esplicitamente interconnesso ad altri database esterni (es. Wikidata, GeoNames), contribuendo a creare una rete globale di conoscenza."
  };

  const suggerimentiLOD = {
    0: "Assicurati di caricare un file testuale integro (come CSV o XML) o un grafo RDF valido, verificando che non sia corrotto. Il vantaggio di correggere il formato è rendere i dati quantomeno elaborabili da un computer (1-3 stelle). L'obiettivo finale di raggiungere le 5 stelle permetterà invece di inserire queste informazioni in una vera e propria rete di conoscenza globale. Per maggiori informazioni, contatta un IT specialist.",
    
    1: "Il tuo file è leggibile solo da esseri umani. Per salire a 2 o 3 stelle, dovresti estrarre questi dati e inserirli in una struttura tabellare (come Excel) o in un formato aperto (come CSV o JSON). Il vantaggio immediato di questo passaggio è permettere ai software di estrarre e analizzare automaticamente i tuoi dati. Il vantaggio massimo nell'andare a 5 stelle è l'interconnessione globale e la scoperta automatica da parte di altri database. Per maggiori informazioni, contatta un IT specialist.",
    
    2: "Il tuo dataset è strutturato, ma intrappolato in un formato proprietario. Per passare a 3 stelle ed eliminare il 'vendor lock-in', esporta semplicemente il tuo file Excel nel formato aperto CSV. Il vantaggio nell'andare a 3 stelle è la totale libertà di utilizzo senza dipendere da costosi software a pagamento. Il vantaggio finale nell'andare a 5 stelle è trasformare la tua semplice tabella in un ecosistema esplorabile da tutto il Web Semantico. Per maggiori informazioni, contatta un IT specialist.",
    
    3: "Ottimo lavoro! Per raggiungere le 4 stelle, devi fare il salto verso il Web Semantico convertendo il tuo CSV/XML in un grafo RDF o JSON-LD, assegnando un URI a ogni singola entità. Il vantaggio nell'andare a 4 stelle è poter identificare i concetti in modo inequivocabile su internet. Il vantaggio finale nell'andare a 5 stelle sarà collegare i tuoi concetti a vocabolari enciclopedici mondiali come DBpedia o Wikidata. Per maggiori informazioni, contatta un IT specialist.",
    
    4: "Ci sei quasi! Hai un grafo semantico perfetto. Per raggiungere l'eccellenza delle 5 stelle (LOD), devi inserire predicati come 'owl:sameAs' o 'skos:closeMatch' per collegare le tue entità a quelle di vocabolari esterni. Il vantaggio nell'andare a 5 stelle è rompere l'isolamento del tuo dataset, rendendolo interrogabile a livello globale e fornendo un contesto infinitamente più ricco agli utenti. Per maggiori informazioni, contatta un IT specialist.",
    
    5: "Hai raggiunto l'eccellenza assoluta! Il tuo dataset è un nodo attivo della Linked Open Data Cloud. I vantaggi concreti di avere 5 stelle: i tuoi dati sono ricercabili globalmente, interoperabili con intelligenze artificiali e arricchiscono il contesto delle informazioni a cui si collegano. Mantenere questo livello garantisce il massimo valore tecnologico possibile. Per maggiori informazioni, contatta un IT specialist."
  };

  useEffect(() => {
    let isMounted = true;

    const avviaAnimazione = async () => {
      let stellaPartenza = risultato.stelleAssegnate;
      const tuttiILog = risultato.dettagli.join(' ').toLowerCase();

      // Scansioniamo in anticipo i log
      if (tuttiILog.includes('declassamento da 5')) stellaPartenza = 5;
      else if (tuttiILog.includes('declassamento dal modello a 4')) stellaPartenza = 4;
      else if (tuttiILog.includes('declassamento da 3')) stellaPartenza = 3;
      else if (tuttiILog.includes('declassamento da 2')) stellaPartenza = 2;

      // SALITA RAPIDA
      for (let i = 1; i <= stellaPartenza; i++) {
        if (!isMounted) return;
        await new Promise((resolve) => setTimeout(resolve, 950));
        setStelleVisibili(i);
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));

      // LETTURA LOG E DECLASSAMENTI (Il colore cambia dinamicamente!)
      let stelleAttuali = stellaPartenza;

      for (let i = 0; i < risultato.dettagli.length; i++) {
        if (!isMounted) return;
        
        const rigaLog = risultato.dettagli[i];
        setLogVisibili((prev) => [...prev, rigaLog]);

        const testoLog = rigaLog.toLowerCase();
        
        if (testoLog.includes('declassamento da 5')) stelleAttuali = 4;
        else if (testoLog.includes('declassamento dal modello a 4')) stelleAttuali = 3;
        else if (testoLog.includes('declassamento da 3') || testoLog.includes('declassamento da 2')) stelleAttuali = 1;
        else if (testoLog.includes('spoofing') || testoLog.includes('corruzione') || testoLog.includes('allarme')) stelleAttuali = 0;

        setStelleVisibili(stelleAttuali);
        await new Promise((resolve) => setTimeout(resolve, 1700));
      }

      // CONCLUSIONE
      if (isMounted) {
        setStelleVisibili(risultato.stelleAssegnate);
        setIsFinishing(true);
      }
    };

    avviaAnimazione();

    return () => {
      isMounted = false;
    };
  }, [risultato]);

  return (
    <div className={"pagella-container tema-" + stelleVisibili}>
      <div className="pagella-header">
        {isFinishing && <h2 className="pagella-title">Valutazione Completata</h2>}
        <p className="pagella-file">📄 {risultato.file} ({risultato.dimensioneKB} KB)</p>
      </div>

      {/* RENDERIZZAZIONE DELLE 5 STELLE CON CLASSI COLORE DINAMICHE */}
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((stella) => (
          <span 
            key={stella} 
            className={`star ${stella <= stelleVisibili ? `filled star-color-${stelleVisibili} star-pop` : 'empty'}`}
          >
            ★
          </span>
        ))}
      </div>

      {/* LIVELLO DI MATURITÀ */}
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

      {/* SPIEGAZIONE DEL LIVELLO (Mostrata solo alla fine) */}
      {isFinishing && (
        <div className="descrizione-livello fade-in">
          <h4>Perché il tuo dataset: {risultato.file} ha ottenuto {risultato.stelleAssegnate} {risultato.stelleAssegnate === 1 ? 'stella' : 'stelle'}?</h4>
          <p>{descrizioniLOD[risultato.stelleAssegnate]}</p>
        </div>
      )}


      {/* BOTTONE PER RICOMINCIARE E SUGGERIMENTI */}
      {isFinishing && (
        <div className="azioni-finali fade-in">
          
          <button className="btn-reset" onClick={onReset}>
            Analizza un altro dataset
          </button>

          {/* Il finto "Link" al posto del bottone */}
          <button 
            className="link-consiglio" 
            onClick={() => setCheFo(!cheFo)}
          >
            {cheFo ? 'Nascondi suggerimenti' : 'E adesso che faccio?'}
          </button>

          {/* Pannello a comparsa con il consiglio */}
          {cheFo && (
            <div className="box-consiglio slide-in-top">
              <h4>{risultato.stelleAssegnate === 5 ? 'I vantaggi del tuo dataset:' : 'Come migliorare il tuo dataset:'}</h4>
              <p>{suggerimentiLOD[risultato.stelleAssegnate]}</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default Pagella;