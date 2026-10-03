const path = require('path');
const xlsx = require('xlsx');
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