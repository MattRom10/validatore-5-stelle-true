const path = require('path');
const xlsx = require('xlsx');
const { XMLParser } = require('fast-xml-parser');
const os = require('os');
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
        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);

        // Calcolo risorse dinamico per la sicurezza dell'Heap V8
        const ramLiberaMB = os.freemem() / (1024 * 1024);
        const ramTotaleMB = os.totalmem() / (1024 * 1024);
        const sogliaSicurezzaMB = Math.min(ramLiberaMB * 0.10, 250);
        
        const isBigData = fileSizeInMB > sogliaSicurezzaMB;

        if (isBigData) {
            diagnosi.dettagli.push(`ATTENZIONE: File di grandi dimensioni (${fileSizeInMB.toFixed(2)} MB). Analisi ottimizzata per preservare la RAM (${sogliaSicurezzaMB.toFixed(0)} MB max allocabili).`);

            // Lettura a basso livello dei primi 8 byte per cercare i Magic Numbers di Excel
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(8);
            fs.readSync(fd, buffer, 0, 8, 0);
            fs.closeSync(fd);

            // Convertiamo il buffer in una stringa esadecimale maiuscola
            const hexSignature = buffer.toString('hex').toUpperCase();

            // .xlsx signature: 504B0304 (Archivio ZIP)
            // .xls signature: D0CF11E0 (Microsoft OLE2)
            const isXlsx = hexSignature.startsWith('504B0304');
            const isXls = hexSignature.startsWith('D0CF11E0');

            if (!isXlsx && !isXls) {
                throw new Error("Il file di grandi dimensioni non presenta l'intestazione binaria (Magic Number) tipica dei formati Excel validi.");
            }

            diagnosi.stelleAssegnate = 2;
            diagnosi.livelloMaturita = "2 Stelle - Machine Readable (Proprietario Big Data)";
            diagnosi.dettagli.push("Verifica parziale superata: Intestazione binaria del formato proprietario identificata correttamente.");
            diagnosi.dettagli.push("Il formato è proprietario (rischio vendor lock-in).");
            return diagnosi;
        }

        // Se il file rientra nei limiti di sicurezza, eseguiamo l'analisi profonda classica
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
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        
        let diagnosiFallback = analizzaFormatoNonStrutturato(mimeType, extension, originalName);
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
        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);

        // Calcolo risorse dinamico per la sicurezza dell'Heap V8
        const ramLiberaMB = os.freemem() / (1024 * 1024);
        const ramTotaleMB = os.totalmem() / (1024 * 1024);
        const sogliaSicurezzaMB = Math.min(ramLiberaMB * 0.10, 250);
        
        const isBigData = fileSizeInMB > sogliaSicurezzaMB;

        // Funzione per leggere un "Chunk" iniziale in modo sicuro, senza saturare la RAM.
        // Utilissima per validare la struttura base di file enormi.
        const leggiChunk = (bytesToRead) => {
            const fd = fs.openSync(filePath, 'r');
            // Creiamo un buffer grande al massimo quanto il file o quanto richiesto
            const allocSize = Math.min(bytesToRead, stats.size);
            const buffer = Buffer.alloc(allocSize);
            const bytesRead = fs.readSync(fd, buffer, 0, allocSize, 0);
            fs.closeSync(fd);
            return buffer.toString('utf8', 0, bytesRead);
        };

        // Se il file è enorme, aggiungiamo una nota ai dettagli
        if (isBigData) {
            diagnosi.dettagli.push(`ATTENZIONE: File di grandi dimensioni (${fileSizeInMB.toFixed(2)} MB). Analisi ottimizzata a blocchi (Chunking) per preservare la RAM (${sogliaSicurezzaMB.toFixed(0)} MB max allocabili).`);
        }

        // --- CONTROLLO CSV ---
        if (extension === '.csv') {
            // Se è Big Data, leggiamo i primi 5MB per cercare intestazioni e link
            // Se è piccolo, lo leggiamo tutto
            const contentToAnalyze = isBigData ? leggiChunk(5 * 1024 * 1024) : fs.readFileSync(filePath, 'utf8');
            
            const lines = contentToAnalyze.split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length < 2) {
                throw new Error("Il file CSV non contiene abbastanza righe per formare una matrice dati.");
            }

            const headerLine = lines[0];
            const commaCount = (headerLine.match(/,/g) || []).length;
            const semicolonCount = (headerLine.match(/;/g) || []).length;

            if (commaCount === 0 && semicolonCount === 0) {
                throw new Error("Nessun delimitatore valido (, o ;) trovato. Il file manca di struttura tabellare.");
            }

            const regexFormatiChiusi = /\b(pdf|jpe?g|png|tiff|doc|docx|txt)\b/i;
            const regexPagineWeb = /https?:\/\/[^\s,;]+(\.(jsp|php|aspx?|html?)\b|\?(id|record|item|doc)=\d+)/i;

            if (regexFormatiChiusi.test(contentToAnalyze) || regexPagineWeb.test(contentToAnalyze)) {
                throw new Error("Il CSV funge da 'vetrina' verso documenti non strutturati o pagine web HTML. I dati reali puntati sono a 1 stella.");
            }

            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (CSV)";
            diagnosi.dettagli.push("Verifica superata: Rilevata matrice dati tabellare non proprietaria.");
            return diagnosi;
        }

        // --- CONTROLLO JSON ---
        if (extension === '.json') {
            if (isBigData) {
                // Per il JSON gigante, oltre a controllare inizio/fine, leggiamo un blocco per assicurarci
                // che non sia solo "spazzatura" impacchettata tra parentesi graffe.
                const chunk = leggiChunk(500 * 1024); // Leggiamo il primo mezzo Megabyte
                
                // Verifichiamo che ci sia almeno una chiave-valore tipica del JSON
                if (!chunk.includes('":') && !chunk.includes('": ')) {
                     throw new Error("Il file JSON di grandi dimensioni non presenta una sintassi chiave-valore valida nei primi blocchi di dati.");
                }

                // Controllo dei confini per accertarsi che il file sia chiuso
                const fd = fs.openSync(filePath, 'r');
                const bufferFine = Buffer.alloc(10);
                const posizioneFine = Math.max(0, stats.size - 10);
                fs.readSync(fd, bufferFine, 0, 10, posizioneFine);
                fs.closeSync(fd);
                const fine = bufferFine.toString('utf8').trim();

                const isObject = chunk.trim().startsWith('{') && fine.endsWith('}');
                const isArray = chunk.trim().startsWith('[') && fine.endsWith(']');

                if (!isObject && !isArray) {
                    throw new Error("Il file JSON di grandi dimensioni è corrotto: non inizia o non termina con parentesi valide.");
                }

                diagnosi.stelleAssegnate = 3;
                diagnosi.livelloMaturita = "3 Stelle - Open Format (JSON Big Data)";
                diagnosi.dettagli.push("Verifica parziale superata: Struttura dei dati e confini di apertura/chiusura sintatticamente coerenti.");
                return diagnosi;
            }

            // Analisi classica profonda (file interi che non sforano l'Heap)
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

        // --- CONTROLLO XML ---
        if (extension === '.xml') {
            if (isBigData) {
                // Per un XML enorme, leggiamo il primo blocco e verifichiamo la presenza di tag
                const chunk = leggiChunk(500 * 1024); 
                
                // Un XML valido deve avere almeno un'apertura e chiusura di tag vicine (es. <tag></tag> o <tag/>)
                const haTag = (chunk.includes('<') && chunk.includes('>')) || chunk.startsWith('<?xml');
                
                if (!haTag) {
                    throw new Error("Il file XML di grandi dimensioni non presenta marcatori gerarchici validi all'inizio del file.");
                }
                
                diagnosi.stelleAssegnate = 3;
                diagnosi.livelloMaturita = "3 Stelle - Open Format (XML Big Data)";
                diagnosi.dettagli.push("Verifica parziale superata: Marcatori e gerarchia XML di base identificati correttamente.");
                return diagnosi;
            }

            // Analisi classica profonda per file interi
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