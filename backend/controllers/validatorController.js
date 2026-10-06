const path = require('path');
const xlsx = require('xlsx');
const { XMLParser } = require('fast-xml-parser');
const os = require('os');
const fs = require('fs');

// --- ANALISI 1 STELLA (Formati Statici e Non Strutturati) ---
const analizzaFormatoNonStrutturato = (filePath, mimeType, extension, originalName) => {
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 1,
        livelloMaturita: "1 Stella - Open License (Dato non strutturato)",
        dettagli: []
    };
    
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

    // Controllo di coerenza tra estensione e firma MIME
    const mimeAtteso = coerenzaMime[extension];

    if (mimeAtteso && mimeType.includes(mimeAtteso.split('/')[0])) {
        
        // NUOVO CONTROLLO ANTI-CORRUZIONE E SPOOFING PER FILE TESTUALI 
        // Controllo se il file di testo contiene caratteri binari o nulli
        if (['.txt', '.csv', '.json', '.xml'].includes(extension)) {
            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(1024);
            fs.readSync(fd, buffer, 0, 1024, 0);
            fs.closeSync(fd);

            if (buffer.includes(0x00)) {
                diagnosi.stelleAssegnate = 0;
                diagnosi.livelloMaturita = "0 Stelle - Non Classificabile (Spoofing o Corruzione)";
                diagnosi.dettagli = [`ALLARME SPOOFING: Il file si dichiara di testo (${extension}), ma contiene dati binari o illeggibili.`];
                return diagnosi;
            }
        }

        diagnosi.dettagli.push("Verifica di sicurezza: L'estensione e la firma MIME coincidono.");
        diagnosi.dettagli.push("Il dato è statico o non presenta una matrice tabellare valida.");
    } else {
        diagnosi.stelleAssegnate = 0;
        diagnosi.livelloMaturita = "0 Stelle - Non Classificabile (Spoofing o Corruzione)";
        diagnosi.dettagli.push(`ALLARME: Il file dichiara l'estensione ${extension} ma la vera firma è ${mimeType}.`);
    }

    return diagnosi;
};

// --- ANALISI 2 STELLE (Formati Proprietari Strutturati) ---
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
        const ramLiberaMB = os.freemem() / (1024 * 1024);
        const sogliaSicurezzaMB = Math.min(ramLiberaMB * 0.10, 50);
        const isBigData = fileSizeInMB > sogliaSicurezzaMB;

        if (isBigData) {
            diagnosi.dettagli.push(`ATTENZIONE: File di grandi dimensioni (${fileSizeInMB.toFixed(2)} MB). Analisi ottimizzata per preservare la RAM (${sogliaSicurezzaMB.toFixed(0)} MB max allocabili).`);

            const fd = fs.openSync(filePath, 'r');
            const buffer = Buffer.alloc(8);
            fs.readSync(fd, buffer, 0, 8, 0);
            fs.closeSync(fd);

            const hexSignature = buffer.toString('hex').toUpperCase();
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

        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        
        if (sheetNames.length === 0) {
            throw new Error("Il file Excel è vuoto (nessun foglio trovato).");
        }

        const firstSheet = workbook.Sheets[sheetNames[0]];
        
        if (!firstSheet['!ref']) {
            throw new Error("Il foglio di calcolo principale non contiene dati.");
        }

        const range = xlsx.utils.decode_range(firstSheet['!ref']);
        const rowCount = range.e.r - range.s.r + 1;
        const colCount = range.e.c - range.s.c + 1;

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
        
        // FIX: Passato filePath come primo parametro
        let diagnosiFallback = analizzaFormatoNonStrutturato(filePath, mimeType, extension, originalName);
        diagnosiFallback.dettagli.unshift(`Declassamento da 2 stelle: ${error.message}`);
        
        return diagnosiFallback;
    }
};

// --- ANALISI 3 STELLE (Formati Aperti Strutturati) ---
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
        const ramLiberaMB = os.freemem() / (1024 * 1024);
        const sogliaSicurezzaMB = Math.min(ramLiberaMB * 0.10, 50);
        const isBigData = fileSizeInMB > sogliaSicurezzaMB;

        const leggiChunk = (bytesToRead) => {
            const fd = fs.openSync(filePath, 'r');
            const allocSize = Math.min(bytesToRead, stats.size);
            const buffer = Buffer.alloc(allocSize);
            const bytesRead = fs.readSync(fd, buffer, 0, allocSize, 0);
            fs.closeSync(fd);
            return buffer.toString('utf8', 0, bytesRead);
        };

        if (isBigData) {
            diagnosi.dettagli.push(`ATTENZIONE: File di grandi dimensioni (${fileSizeInMB.toFixed(2)} MB). Analisi ottimizzata a blocchi (Chunking) per preservare la RAM (${sogliaSicurezzaMB.toFixed(0)} MB max allocabili).`);
        }

        if (extension === '.csv') {
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

        if (extension === '.json') {
            if (isBigData) {
                const chunk = leggiChunk(500 * 1024); 
                
                if (!chunk.includes('":') && !chunk.includes('": ')) {
                     throw new Error("Il file JSON di grandi dimensioni non presenta una sintassi chiave-valore valida nei primi blocchi di dati.");
                }

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
            if (isBigData) {
                const chunk = leggiChunk(500 * 1024); 
                const haTag = (chunk.includes('<') && chunk.includes('>')) || chunk.startsWith('<?xml');
                
                if (!haTag) {
                    throw new Error("Il file XML di grandi dimensioni non presenta marcatori gerarchici validi all'inizio del file.");
                }
                
                diagnosi.stelleAssegnate = 3;
                diagnosi.livelloMaturita = "3 Stelle - Open Format (XML Big Data)";
                diagnosi.dettagli.push("Verifica parziale superata: Marcatori e gerarchia XML di base identificati correttamente.");
                return diagnosi;
            }

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
        
        // FIX: Passato filePath come primo parametro
        let diagnosiFallback = analizzaFormatoNonStrutturato(filePath, mimeType, extension, originalName);
        diagnosiFallback.dettagli.unshift(`Declassamento da 3 stelle: ${error.message}`);
        return diagnosiFallback;
    }
};

const analizzaFormato4stelle = (filePath, originalName, mimeType, extension)=>{
    //Ridichiaro Diagnosi anche se potrei toglierlo ma lo faccio perché un domani possa essere usata la funzione solo per capire se è 4 stelle o meno senza passare per 5 stelle
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 0,
        livelloMaturita: "",
        dettagli: []
    };

     
    try {
        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        // Calcolo RAM dinamico per sicurezza
        const ramLiberaMB = os.freemem() / (1024 * 1024);
        const sogliaSicurezzaMB = Math.min(ramLiberaMB * 0.10, 50);
        const isBigData = fileSizeInMB > sogliaSicurezzaMB;

        // Funzione per leggere un chunk o il file intero
        const leggiContenuto = () => {
            if (isBigData) {
                diagnosi.dettagli.push(`ATTENZIONE: Grafo RDF di grandi dimensioni (${fileSizeInMB.toFixed(2)} MB). Analisi euristica a blocchi applicata.`);
                const fd = fs.openSync(filePath, 'r');
                const allocSize = Math.min(5 * 1024 * 1024, stats.size); // Leggiamo i primi 5MB
                const buffer = Buffer.alloc(allocSize);
                const bytesRead = fs.readSync(fd, buffer, 0, allocSize, 0);
                fs.closeSync(fd);
                return buffer.toString('utf8', 0, bytesRead);
            }
            // Per file di dimensioni normali, leggiamo tutto il contenuto
            return fs.readFileSync(filePath, 'utf8');
            //il utf8 è un encoding standard per i file di testo, che permette di rappresentare caratteri di diverse lingue e simboli speciali in modo coerente.
        };

        const fileContent = leggiContenuto();

        // Cerchiamo i marcatori tipici e fondamentali dei grafi semantici (RDF/XML, Turtle, JSON-LD)
        const regex4Stelle = /(<rdf:RDF|@prefix|@context|xmlns:rdf|http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#)/i;
        
        if (!regex4Stelle.test(fileContent)) {
            // Se non ha i marcatori base, non è un file semantico.
            // Lanciamo l'errore per farlo cadere nel blocco catch e declassarlo a 3 stelle.
            throw new Error("Il file non presenta i marcatori standard di un grafo semantico (es. tag <rdf:RDF>, @prefix o @context).");
        }

        // Se sopravvive al test, è un grafo valido ma isolato (visto che è stato declassato dal 5 stelle)
        diagnosi.stelleAssegnate = 4;
        diagnosi.livelloMaturita = "4 Stelle - Semantic Web (RDF isolato)";
        diagnosi.dettagli.push("Verifica superata: Rilevata sintassi strutturale del Web Semantico (RDF, Turtle o JSON-LD).");
        diagnosi.dettagli.push("Limite rilevato: Il grafo utilizza URI per denotare le entità, ma non si interconnette a vocabolari esterni. Agisce come un silo.");
        
        return diagnosi;
        


        
    } catch (error) {
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        
        // DECLASSAMENTO A 3 STELLE:
        // Se un file .rdf fallisce l'analisi semantica, molto probabilmente è comunque un file XML valido.
        // Se è .jsonld, è un JSON. Se è .csv (con mapping sbagliato), è un CSV.
        // Simuliamo l'estensione di base per il controllo a 3 stelle.
        let estensioneBase = extension;
        if (extension === '.rdf' || extension === '.owl') estensioneBase = '.xml';
        if (extension === '.jsonld') estensioneBase = '.json';

        let diagnosiFallback = analizzaFormatoAperto(filePath, originalName, mimeType, estensioneBase);
        
        // Se fallisce anche il 3 stelle (es. XML corrotto), analizzaFormatoAperto lo manderà in automatico a 1 stella.
        // Dobbiamo solo ricordarci di aggiungere la nostra motivazione in cima.
        diagnosiFallback.dettagli.unshift(`Declassamento da formati semantici (4/5 stelle): ${error.message}`);
        
        return diagnosiFallback;
    }

}

// --- ANALISI 5 STELLE (Web Semantico e Linked Open Data) ---
const analizzaFormatoSemantico = (filePath, originalName, mimeType, extension) => {
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 0,
        livelloMaturita: "",
        dettagli: []
    };

    try {
        // Controllo dimensione del file e RAM disponibile
        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        // Calcolo RAM dinamico per sicurezza
        const ramLiberaMB = os.freemem() / (1024 * 1024);
        const sogliaSicurezzaMB = Math.min(ramLiberaMB * 0.10, 50);
        const isBigData = fileSizeInMB > sogliaSicurezzaMB;

        // Funzione per leggere un chunk o il file intero
        const leggiContenuto = () => {
            if (isBigData) {
                diagnosi.dettagli.push(`ATTENZIONE: Grafo RDF di grandi dimensioni (${fileSizeInMB.toFixed(2)} MB). Analisi euristica a blocchi applicata.`);
                const fd = fs.openSync(filePath, 'r');
                const allocSize = Math.min(5 * 1024 * 1024, stats.size); // Leggiamo i primi 5MB
                const buffer = Buffer.alloc(allocSize);
                const bytesRead = fs.readSync(fd, buffer, 0, allocSize, 0);
                fs.closeSync(fd);
                return buffer.toString('utf8', 0, bytesRead);
            }
            // Per file di dimensioni normali, leggiamo tutto il contenuto
            return fs.readFileSync(filePath, 'utf8');
            //il utf8 è un encoding standard per i file di testo, che permette di rappresentare caratteri di diverse lingue e simboli speciali in modo coerente.
        };

        const fileContent = leggiContenuto();

        // 1. Verifichiamo se è effettivamente un formato semantico (RDF, Turtle, JSON-LD)
        // Cerca le proprietà di linking formattate come tag XML (es. <owl:sameAs) 
        const regex5Stelle = /(<owl:sameAs|<skos:exactMatch|<skos:closeMatch|<rdfs:seeAlso|<schema:sameAs|owl:sameAs[\s:"]|skos:exactMatch[\s:"]|skos:closeMatch[\s:"]|rdfs:seeAlso[\s:"]|schema:sameAs[\s:"])/i;
        //Il .test() è un metodo che verifica se una stringa corrisponde a un pattern specifico definito da una regex. In questo caso, controlla se il contenuto del file contiene riferimenti a proprietà di linking semantico.
        if (regex5Stelle.test(fileContent)) {
            diagnosi.stelleAssegnate = 5;
            diagnosi.dettagli.push("Verifica superata: Rilevata sintassi del Web Semantico (RDF/Turtle/JSON-LD).");
            diagnosi.dettagli.push("Verifica superata: Rilevati predicati di linking semantico (es. owl:sameAs). Il dataset è interconnesso alla LOD Cloud.");
            return diagnosi;
        }
        throw new Error("Il file semantico non contiene predicati di linking (owl:sameAs, skos:exactMatch, ecc.). Non è interconnesso alla LOD Cloud.");

        
    } catch (error) {
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        
        // DECLASSAMENTO A 4 STELLE:
        let diagnosiFallback = analizzaFormato4stelle(filePath, originalName, mimeType, extension);
        diagnosiFallback.dettagli.unshift(`Declassamento da 5 stelle: ${error.message}`);
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
    const filePath = req.file.path; 

    let risultatoValidazione;

    const estensioni1Stella = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt'];
    const estensioni2Stelle = ['.xls', '.xlsx', '.ods'];
    const estensioni3Stelle = ['.csv', '.json', '.xml'];
    const estensioniSemantiche = ['.rdf', '.ttl', '.n3', '.nt', '.jsonld'];

    if (estensioni3Stelle.includes(extension)) {
        risultatoValidazione = analizzaFormatoAperto(filePath, originalName, mimeType, extension);
    } 
    else if (estensioni2Stelle.includes(extension)) {
        risultatoValidazione = analizzaFormatoProprietario(filePath, originalName, mimeType, extension);
    } 
    else if (estensioni1Stella.includes(extension)) {
        // FIX: Aggiunto filePath come primo parametro
        risultatoValidazione = analizzaFormatoNonStrutturato(filePath, mimeType, extension, originalName);
    } 
    else if (estensioniSemantiche.includes(extension)) {
        risultatoValidazione= analizzaFormatoSemantico(filePath, originalName, mimeType, extension)
    } 
    else {
        fs.unlink(filePath, () => {});
        return res.status(400).json({
            file: originalName,
            stelleAssegnate: 0,
            livelloMaturita: "Formato non riconosciuto",
            dettagli: ["Il formato del file non è supportato dal validatore."]
        });
    }

    risultatoValidazione.dimensioneKB = (fileSize / 1024).toFixed(2);
    risultatoValidazione.mimeType = mimeType;

    fs.unlink(filePath, (err) => {
        if (err) console.error("Errore nell'eliminazione del file temporaneo:", err);
    });

    return res.json(risultatoValidazione);
};

module.exports = {
    analyzeDataset
};