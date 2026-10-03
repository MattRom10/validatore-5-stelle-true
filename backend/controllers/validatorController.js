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

    const coerenzaMime = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        // Aggiungiamo i mime di Excel nel caso in cui arrivino dal fallback
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
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
        // Leggiamo solo i primi byte del file per non saturare la memoria con dataset enormi
        const fileBuffer = fs.readFileSync(filePath);
        const fileContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 5000));

        if (extension === '.csv') {
            const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
            
            // Un CSV valido deve avere almeno due righe (intestazione + dati)
            if (lines.length < 2) {
                throw new Error("Il file CSV non contiene abbastanza righe per formare una matrice dati.");
            }

            // Controlliamo che la prima riga abbia un delimitatore standard (, o ;)
            const headerLine = lines[0];
            const commaCount = (headerLine.match(/,/g) || []).length;
            const semicolonCount = (headerLine.match(/;/g) || []).length;

            if (commaCount === 0 && semicolonCount === 0) {
                throw new Error("Nessun delimitatore valido (, o ;) trovato. Il file manca di struttura tabellare.");
            }

            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (Formato Aperto Strutturato)";
            diagnosi.dettagli.push("Verifica superata: Rilevata matrice dati tabellare non proprietaria.");
            diagnosi.dettagli.push(`Identificato delimitatore di colonna. L'estrazione dei dati non richiede software commerciale.`);
            
            return diagnosi;
        }

        if (extension === '.json') {
            // Per il JSON, proviamo a farne il parsing
            const parseData=JSON.parse(fileContent);
            if (typeof parseData !== 'object' || parseData === null || Array.isArray(parseData) === false || Object.keys(parseData).length === 0) {
                throw new Error("Il file JSON è sintatticamente valido, ma non contiene una struttura dati valida (E' vuoto o è privo di struttura).");
            }
            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (Formato Aperto Strutturato)";
            diagnosi.dettagli.push("Verifica superata: Struttura JSON valida e sintatticamente corretta.");
            
            return diagnosi;
        }

        //Controllo per XML, che è un formato aperto ma può essere complesso da validare senza uno schema

        if (extension === '.xml') {
            const parser = new XMLParser();
            const parsedXML = parser.parse(fileContent);
            if(Object.keys(parsedXML).length === 0 || parsedXML === null || typeof parsedXML !== 'object' || Array.isArray(parsedXML)){
                throw new Error("Il file XML risulta vuoto, non formattato correttamente o privo di nodi gerarchici.");
            }
            
            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (Formato Aperto Strutturato)";
            diagnosi.dettagli.push("Verifica superata: Struttura XML valida e sintatticamente corretta.");
            return diagnosi;

        }

    } catch (error) {
        // FALLBACK: Il formato dichiara di essere aperto, ma non è strutturato correttamente.
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        
        // Salta il livello 2 (non è proprietario) e va direttamente al controllo di 1 stella
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

    // Facciamo una specie di costruttore dove creiamo la nostra diagnosi
    let diagnosi = {
        file: originalName,
        formato: extension,
        mimeType: mimeType,
        dimensioneKB: (fileSize / 1024).toFixed(2),
        stelleAssegnate: 0,
        livelloMaturita: "",
        dettagli: []
    };

    //Facciamo la prima schermatura in base alla estensione del file inviato

    // --- LIVELLO 1 STELLA: Dati non strutturati / formati statici ---
    const estensioni1Stella = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.txt'];
    
    // --- LIVELLO 2 STELLE: Dati strutturati ma proprietari ---
    const estensioni2Stelle = ['.xls', '.xlsx', '.ods'];

    // --- LIVELLO 3 STELLE: Dati strutturati in formato aperto (placeholder) ---
    const estensioni3Stelle = ['.csv', '.json', '.xml'];

    // --- LIVELLI 4 E 5 STELLE: Dati semantici RDF (placeholder) ---
    const estensioniSemantiche = ['.rdf', '.ttl', '.n3', '.nt', '.jsonld'];


    if(estensioni1Stella.includes(extension)){
        risultatoValidazione = analizzaFormatoNonStrutturato(mimeType, extension, originalName);
    }

    if (estensioni2Stelle.includes(extension)) {
        risultatoValidazione = analizzaFormatoProprietario(filePath, originalName, mimeType, extension);
    }

    if (estensioni3Stelle.includes(extension)) {
        diagnosi.stelleAssegnate = 3;
        diagnosi.livelloMaturita = "3 Stelle - Open Format (In fase di test approfondito)";
        diagnosi.dettagli.push("Formato tabellare aperto non proprietario.");
        return res.json(diagnosi);
    }

    if (estensioniSemantiche.includes(extension)) {
        diagnosi.stelleAssegnate = 4;
        diagnosi.livelloMaturita = "4/5 Stelle - Semantic Web / Linked Data";
        diagnosi.dettagli.push("Rilevato formato del Web Semantico. Richiede scansione del grafo RDF.");
        return res.json(diagnosi);
    }

    // Se il file non rientra in nessuna delle categorie sopra, restituiamo un messaggio di errore
    diagnosi.stelleAssegnate = 0;
    diagnosi.livelloMaturita = "Formato non riconosciuto";
    diagnosi.dettagli.push("Il formato del file non è supportato dal validatore.");
    return res.status(400).json(diagnosi);


    };

module.exports = {
    analyzeDataset
};