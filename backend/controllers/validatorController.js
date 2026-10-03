const path = require('path');
const xlsx = require('xlsx');
const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');

// --- ANALISI 1 STELLA (Formati Statici e Non Strutturati) ---
const analizzaFormatoNonStrutturato = (mimeType, extension, originalName) => {
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 1,
        livelloMaturita: "1 Stella - Open License (Dato non strutturato)",
        dettagli: []
    };
//Aggiunti tutti i formati che ci servono
    const coerenzaMime = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.csv': 'text/csv',
        '.json': 'application/json',
        '.xml': 'application/xml'
    };

    const mimeAtteso = coerenzaMime[extension];

    if (mimeAtteso && mimeType.includes(mimeAtteso.split('/')[0])) {
        diagnosi.dettagli.push("Verifica di sicurezza: L'estensione e la firma MIME coincidono.");
        diagnosi.dettagli.push("Il dato è statico o non presenta una matrice tabellare valida.");
    } else {
        // LIVELLO 0: File falso, manomesso o illeggibile
        diagnosi.stelleAssegnate = 0;
        diagnosi.livelloMaturita = "0 Stelle - Non Classificabile (Spoofing o Corruzione)";
        diagnosi.dettagli.push(`ALLARME: Il file dichiara l'estensione ${extension} ma la vera firma è ${mimeType}.`);
    }

    return diagnosi;
};

// --- ANALISI 2 STELLE (Formati Proprietari Strutturati) ---
// Ora accetta anche mimeType e extension per poterli passare al fallback
const analizzaFormatoProprietario = (filePath, originalName, mimeType, extension) => {
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 0,
        livelloMaturita: "",
        dettagli: []
    };

    try {
        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        
        // Controllo profondo 1: Il file ha dei fogli?
        if (sheetNames.length === 0) {
            throw new Error("Il file Excel è vuoto (nessun foglio trovato).");
        }

        const firstSheet = workbook.Sheets[sheetNames[0]];
        
        // Controllo profondo 2: Il primo foglio ha dei dati? (!ref indica il range di celle piene)
        if (!firstSheet['!ref']) {
            throw new Error("Il foglio di calcolo principale non contiene dati.");
        }

        const range = xlsx.utils.decode_range(firstSheet['!ref']);
        const rowCount = range.e.r - range.s.r + 1;
        const colCount = range.e.c - range.s.c + 1;

        // Controllo profondo 3: È davvero strutturato? (Es. non basta 1 riga e 1 colonna)
        if (rowCount < 2 || colCount < 2) {
            throw new Error("Dati insufficienti per formare una struttura tabellare (minimo 2 righe e 2 colonne).");
        }

        diagnosi.stelleAssegnate = 2;
        diagnosi.livelloMaturita = "2 Stelle - Machine Readable (Formato proprietario)";
        diagnosi.dettagli.push("Verifica superata: Foglio di calcolo valido e integro.");
        diagnosi.dettagli.push(`Rilevata matrice strutturata: ${rowCount} righe e ${colCount} colonne.`);
        diagnosi.dettagli.push("Il formato è proprietario (rischio vendor lock-in).");
        
        return diagnosi;
        
    } catch (error) {
        // FALLBACK: Il file Excel non è valido o non è strutturato. Passiamo al livello 1.
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        
        // La funzione 1 stella valuterà se dare 1 stella (es. è un file chiuso ma leggibile) o 0 stelle
        let diagnosiFallback = analizzaFormatoNonStrutturato(mimeType, extension, originalName);
        
        // Inseriamo il motivo del declassamento in cima ai dettagli
        diagnosiFallback.dettagli.unshift(`Declassamento da 2 stelle: ${error.message}`);
        
        return diagnosiFallback;
    }
};
// --- ANALISI 3 STELLE (Formati Aperti Strutturati) --- Qua è impossibile andare al livello 2 quindi nel caso Il CSV in realtà è un formato testuale, passerà direttamente al livello 1

const analizzaFormatoAperto = (filePath, originalName, mimeType, extension) => {
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 0,
        livelloMaturita: "",
        dettagli: []
    };

    try {
        // Leggiamo la grandezza del file per evitare il collasso della RAM
        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);

        if (extension === '.csv') {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length < 2) {
                throw new Error("Il file CSV non contiene abbastanza righe per formare una matrice dati.");
            }

            const headerLine = lines[0];
            const commaCount = (headerLine.match(/,/g) || []).length;
            const semicolonCount = (headerLine.match(/;/g) || []).length;

            if (commaCount === 0 && semicolonCount === 0) {
                throw new Error("Nessun delimitatore valido (, o ;) trovato. Il file manca di struttura tabellare.");
            }

            // --- CONTROLLO CATALOGHI (AGGIORNATO) ---
            // 1. Cerca formati non strutturati anche SENZA il punto (es. "versione pdf", "scansione tiff")
            const regexFormatiChiusi = /\b(pdf|jpe?g|png|tiff|doc|docx|txt)\b/i;
            
            // 2. Cerca visualizzatori web, aggiungendo "item.jsp" (tipico della Puglia Digital Library)
            const regexVetrina = /(opac|viewer|showdocument|dettaglio_documento|handle|gallery|item\.jsp)/i;

            if (regexFormatiChiusi.test(fileContent) || regexVetrina.test(fileContent)) {
                throw new Error("Il CSV funge da 'vetrina' verso documenti non strutturati (es. PDF, TIFF) o pagine di visualizzazione web. I dati reali puntati sono a 1 stella.");
            }

            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (CSV)";
            diagnosi.dettagli.push("Verifica superata: Rilevata matrice dati tabellare non proprietaria.");
            return diagnosi;
        }

        if (extension === '.json') {
            // CONTROLLO DI SICUREZZA PER FILE ENORMI (Evita il blocco del server)
            if (fileSizeInMB > 15) {
                diagnosi.stelleAssegnate = 3;
                diagnosi.livelloMaturita = "3 Stelle - Open Format (JSON Enorme)";
                diagnosi.dettagli.push(`Verifica leggera superata: Il file è troppo grande (${fileSizeInMB.toFixed(2)} MB) per un'analisi profonda sicura.`);
                diagnosi.dettagli.push("Assegnazione fiduciaria della terza stella basata sul formato per prevenire il collasso della RAM del server (Denial of Service).");
                return diagnosi;
            }

            // Se il file è sotto i 15MB, facciamo l'analisi chirurgica classica
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const parsedData = JSON.parse(fileContent);
            if (!parsedData || typeof parsedData !== 'object' || Object.keys(parsedData).length === 0) {
                throw new Error("Il file JSON è sintatticamente valido, ma risulta vuoto o privo di struttura.");
            }
            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (JSON)";
            diagnosi.dettagli.push("Verifica superata: Struttura JSON valida e sintatticamente corretta.");
            return diagnosi;
        }

        if (extension === '.xml') {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const parser = new XMLParser();
            const parsedXML = parser.parse(fileContent);
            
            if (!parsedXML || typeof parsedXML !== 'object' || Array.isArray(parsedXML) || Object.keys(parsedXML).length === 0) {
                throw new Error("Il file XML risulta vuoto, non formattato correttamente o privo di nodi gerarchici.");
            }
            
            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (XML)";
            diagnosi.dettagli.push("Verifica superata: Struttura XML valida e sintatticamente corretta.");
            return diagnosi;
        }

    } catch (error) {
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        let diagnosiFallback = analizzaFormatoNonStrutturato(mimeType, extension, originalName);
        diagnosiFallback.dettagli.unshift(`Declassamento da 3 stelle: ${error.message}`);
        return diagnosiFallback;
    }
};



const analyzeDataset = (req, res) => {
    if(!req.file){
        return res.status(400).json({error:"Errore, non è stato inviato alcun file"});
    }

    const originalName = req.file.originalname;
    const extension = path.extname(originalName).toLowerCase();
    const mimeType = req.file.mimetype;
    const fileSize = req.file.size;
    
    // CORREZIONE 2: Dobbiamo prendere il percorso del file salvato da multer!
    const filePath = req.file.path; 

    // Questa variabile conterrà la risposta finale generata dalle varie funzioni
    let risultatoValidazione;

    const estensioni1Stella = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt'];
    const estensioni2Stelle = ['.xls', '.xlsx', '.ods'];
    const estensioni3Stelle = ['.csv', '.json', '.xml'];
    const estensioniSemantiche = ['.rdf', '.ttl', '.n3', '.nt', '.jsonld'];

    // CORREZIONE 3: Smistamento corretto a cascata
    if (estensioni3Stelle.includes(extension)) {
        risultatoValidazione = analizzaFormatoAperto(filePath, originalName, mimeType, extension);
    } 
    else if (estensioni2Stelle.includes(extension)) {
        risultatoValidazione = analizzaFormatoProprietario(filePath, originalName, mimeType, extension);
    } 
    else if (estensioni1Stella.includes(extension)) {
        risultatoValidazione = analizzaFormatoNonStrutturato(mimeType, extension, originalName);
    } 
    else if (estensioniSemantiche.includes(extension)) {
        risultatoValidazione = {
            file: originalName,
            stelleAssegnate: 4,
            livelloMaturita: "4/5 Stelle - Semantic Web / Linked Data",
            dettagli: ["Rilevato formato del Web Semantico. Richiede scansione del grafo RDF."]
        };
    } 
    else {
        // Formato non riconosciuto
        // Eliminiamo comunque il file temporaneo prima di dare errore
        fs.unlink(filePath, () => {});
        return res.status(400).json({
            file: originalName,
            stelleAssegnate: 0,
            livelloMaturita: "Formato non riconosciuto",
            dettagli: ["Il formato del file non è supportato dal validatore."]
        });
    }

    // Aggiungiamo i metadati finali alla diagnosi
    risultatoValidazione.dimensioneKB = (fileSize / 1024).toFixed(2);
    risultatoValidazione.mimeType = mimeType;

    // Questa funzione elimina fisicamente il file da /uploads una volta finiti i nostri controlli. 
    //Questo serve sia per motivi di sicurezza che per evitare di saturare lo spazio disco del server con file temporanei.
    //Ma anche per un motivo di privacy: non vogliamo che i file caricati rimangano sul server.
    fs.unlink(filePath, (err) => {
        if (err) console.error("Errore nell'eliminazione del file temporaneo:", err);
    });

    // Rispediamo il JSON completo al frontend React!
    return res.json(risultatoValidazione);
};

module.exports = {
    analyzeDataset
};