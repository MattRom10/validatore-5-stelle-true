const path = require('path');

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
        diagnosi.stelleAssegnate = 1;
        diagnosi.livelloMaturita = "1 Stella - Open License (Dato non strutturato)";
        diagnosi.dettagli.push("I dati sono leggibili dall'uomo ma richiedono trascrizione manuale o OCR per l'elaborazione.");
        return res.json(diagnosi);
    }

    if (estensioni2Stelle.includes(extension)) {
        diagnosi.stelleAssegnate = 2;
        diagnosi.livelloMaturita = "2 Stelle - Machine Readable (Formato proprietario)";
        diagnosi.dettagli.push("Il dato è strutturato in righe e colonne ed è leggibile da una macchina.");
        diagnosi.dettagli.push("Il formato dipende da software commerciale proprietario (rischio vendor lock-in).");
        return res.json(diagnosi);
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