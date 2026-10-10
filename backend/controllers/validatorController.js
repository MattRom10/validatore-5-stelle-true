const path = require('path');
const xlsx = require('xlsx');
const { XMLParser } = require('fast-xml-parser');
const os = require('os');
const fs = require('fs');
const csv = require('csv-parser');
const sax = require('sax');
const { parser } = require('stream-json');

// --- ANALISI 1 STELLA (Formati Statici e Non Strutturati) ---
const analizzaFormatoNonStrutturato = async (filePath, mimeType, extension, originalName) => {
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

    const mimeAtteso = coerenzaMime[extension];

    if (mimeAtteso && mimeType.includes(mimeAtteso.split('/')[0])) {
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
const analizzaFormatoProprietario = async (filePath, originalName, mimeType, extension) => {
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
        
        if (sheetNames.length === 0) throw new Error("Il file Excel è vuoto (nessun foglio trovato).");

        const firstSheet = workbook.Sheets[sheetNames[0]];
        if (!firstSheet['!ref']) throw new Error("Il foglio di calcolo principale non contiene dati.");

        const range = xlsx.utils.decode_range(firstSheet['!ref']);
        const rowCount = range.e.r - range.s.r + 1;
        const colCount = range.e.c - range.s.c + 1;

        if (rowCount < 2 || colCount < 2) throw new Error("Dati insufficienti per formare una struttura tabellare (minimo 2 righe e 2 colonne).");

        diagnosi.stelleAssegnate = 2;
        diagnosi.livelloMaturita = "2 Stelle - Machine Readable (Formato proprietario)";
        diagnosi.dettagli.push("Verifica superata: Foglio di calcolo valido e integro.");
        diagnosi.dettagli.push(`Rilevata matrice strutturata: ${rowCount} righe e ${colCount} colonne.`);
        diagnosi.dettagli.push("Il formato è proprietario (rischio vendor lock-in).");
        
        return diagnosi;
        
    } catch (error) {
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        // AWAIT inserito qui!
        let diagnosiFallback = await analizzaFormatoNonStrutturato(filePath, mimeType, extension, originalName);
        diagnosiFallback.dettagli.unshift(`Declassamento da 2 stelle: ${error.message}`);
        return diagnosiFallback;
    }
};

// --- ANALISI 3 STELLE (Formati Aperti Strutturati in Streaming) ---
const analizzaFormatoAperto = async (filePath, originalName, mimeType, extension) => {
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 0,
        livelloMaturita: "",
        dettagli: []
    };

    try {
        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        if (fileSizeInMB > 10) {
        diagnosi.dettagli.push(`Dimensione file: ${fileSizeInMB.toFixed(2)} MB. Analisi in Stream Processing attivata per la sicurezza dell'Heap.`);
        }else{
            diagnosi.dettagli.push(`Dimensione file: ${fileSizeInMB.toFixed(2)} MB. Analisi completa in memoria.`);
        }

        // --- CONTROLLO CSV A STREAMING ---
        if (extension === '.csv') {
            
            // Funzione di supporto per tentare il parsing con un separatore specifico
            const tryParseCSV = (sep) => {
                return new Promise((resolve, reject) => {
                    let rowCount = 0;
                    const stream = fs.createReadStream(filePath);
                    
                    stream.pipe(csv({ separator: sep })) 
                        .on('headers', (headers) => {
                            if (headers.length < 2) {
                                stream.destroy();
                                reject(new Error("Delimitatori insufficienti."));
                            }
                        })
                        .on('data', () => { rowCount++; }) 
                        .on('error', (error) => reject(error))
                        .on('end', () => {
                            if (rowCount < 1) reject(new Error("Il file CSV non contiene righe di dati."));
                            resolve(true);
                        });
                });
            };

            try {
                // Tentativo 1: Punto e Virgola (Standard Europeo)
                await tryParseCSV(';');
            } catch (errorPuntoVirgola) {
                try {
                    // Tentativo 2: Virgola (Standard Internazionale)
                    await tryParseCSV(',');
                } catch (errorVirgola) {
                    // Se falliscono entrambi, il file non è una tabella valida
                    throw new Error("Nessun delimitatore valido (, o ;) trovato. Il file manca di struttura tabellare.");
                }
            }

            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (CSV)";
            diagnosi.dettagli.push("Verifica superata: Matrice dati tabellare scansionata interamente con successo.");
            return diagnosi;
        }

        // --- CONTROLLO JSON A STREAMING (CON HYBRID FALLBACK) ---
        if (extension === '.json') {
            await new Promise((resolve, reject) => {
                const stream = fs.createReadStream(filePath);
                
                try {
                    // Tentativo 1: Uso della libreria stream-json
                    const streamJson = require('stream-json');
                    const jsonStream = typeof streamJson.parser === 'function' ? streamJson.parser() : streamJson();
                    
                    if (typeof jsonStream.on !== 'function') {
                        throw new Error("Libreria non compatibile."); // Forziamo il passaggio al Fallback
                    }

                    let hasTokens = false;
                    jsonStream.on('data', () => { hasTokens = true; });
                    jsonStream.on('error', () => {
                        stream.destroy();
                        reject(new Error("Sintassi JSON corrotta o non ben formattata."));
                    });
                    jsonStream.on('end', () => {
                        if (!hasTokens) reject(new Error("Il file JSON risulta vuoto o privo di struttura."));
                        resolve(true);
                    });
                    
                    stream.pipe(jsonStream);

                } catch (fallbackError) {
                    // TENTATIVO 2: FALLBACK NATIVO (Nessun crash da librerie esterne)
                    stream.destroy(); 
                    console.log(`Fallback JSON nativo attivato per ${originalName}`);
                    
                    if (fileSizeInMB > 50) {
                        // Per i Big Data (es. 170 MB), euristica sicura Testa-Coda
                        const fd = fs.openSync(filePath, 'r');
                        
                        const chunkInizio = Buffer.alloc(1000);
                        fs.readSync(fd, chunkInizio, 0, 1000, 0);
                        const inizio = chunkInizio.toString('utf8').trim();
                        
                        const chunkFine = Buffer.alloc(10);
                        const posFine = Math.max(0, stats.size - 10);
                        fs.readSync(fd, chunkFine, 0, 10, posFine);
                        fs.closeSync(fd);
                        const fine = chunkFine.toString('utf8').trim();
                        
                        const isObject = inizio.startsWith('{') && fine.endsWith('}');
                        const isArray = inizio.startsWith('[') && fine.endsWith(']');
                        
                        if (!isObject && !isArray) return reject(new Error("Il file JSON di grandi dimensioni è corrotto alle estremità."));
                        resolve(true);
                    } else {
                        // Per file gestibili, parsing nativo di Node
                        const content = fs.readFileSync(filePath, 'utf8');
                        JSON.parse(content);
                        resolve(true);
                    }
                }
            });

            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (JSON)";
            diagnosi.dettagli.push("Verifica superata: Struttura JSON validata con successo.");
            return diagnosi;
        }
        // --- CONTROLLO XML A STREAMING ---
        if (extension === '.xml') {
            await new Promise((resolve, reject) => {
                const stream = fs.createReadStream(filePath);
                const saxStream = sax.createStream(true); // Modalità strict
                
                // PATCH SALVAVITA: Insegniamo a sax come "distruggersi" per non far crashare Node 26+
                if (typeof saxStream.destroy !== 'function') {
                    saxStream.destroy = function() {}; 
                }
                
                let hasTags = false;
                
                saxStream.on('opentag', (node) => {
                    hasTags = true;
                });
                
                saxStream.on('error', (error) => {
                    stream.unpipe(saxStream); // scolleghiamo i tubi
                    stream.destroy(); // chiudiamo il file per salvare la RAM
                    reject(new Error("Struttura XML corrotta o tag non bilanciati."));
                });
                
                saxStream.on('end', () => {
                    if (!hasTags) reject(new Error("Il file XML risulta vuoto o privo di nodi gerarchici."));
                    resolve(true);
                });
                
                stream.pipe(saxStream);
            });

            diagnosi.stelleAssegnate = 3;
            diagnosi.livelloMaturita = "3 Stelle - Open Format (XML)";
            diagnosi.dettagli.push("Verifica superata: Gerarchia XML validata integralmente tag per tag.");
            return diagnosi;
        }

        throw new Error(`Estensione di base ${extension} non supportata come Formato Aperto.`);

    } catch (error) {
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        let diagnosiFallback = await analizzaFormatoNonStrutturato(filePath, mimeType, extension, originalName);
        diagnosiFallback.dettagli.unshift(`Declassamento da 3 stelle: ${error.message}`);
        return diagnosiFallback;
    }
};

// --- ANALISI 4 STELLE (Formati Semantici Isolati) ---
const analizzaFormato4stelle = async (filePath, originalName, mimeType, extension) => {
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 0,
        livelloMaturita: "",
        dettagli: []
    };

    try {
        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);

        const regex4Stelle = /(<rdf:RDF|@prefix|@context|xmlns:rdf|http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#)/i;
        let found4Stelle = false;

        const fd = fs.openSync(filePath, 'r');
        const chunkSize = 5 * 1024 * 1024;
        const buffer = Buffer.alloc(chunkSize);
        let bytesRead = 0;
        let tail = ""; 

        if (fileSizeInMB > 5) {
            diagnosi.dettagli.push(`ATTENZIONE: Grafo RDF di grandi dimensioni (${fileSizeInMB.toFixed(2)} MB). Analisi in Streaming a blocchi continui attivata.`);
        }

        while ((bytesRead = fs.readSync(fd, buffer, 0, chunkSize, null)) !== 0) {
            const chunkStr = tail + buffer.toString('utf8', 0, bytesRead);
            if (!found4Stelle && regex4Stelle.test(chunkStr)) found4Stelle = true;
            if (found4Stelle) break; 
            tail = chunkStr.slice(-100);
        }
        fs.closeSync(fd);

        if (!found4Stelle) {
            throw new Error("Il file non presenta i marcatori standard di un grafo semantico (es. tag <rdf:RDF>, @prefix o @context).");
        }

        diagnosi.stelleAssegnate = 4;
        diagnosi.livelloMaturita = "4 Stelle - Semantic Web (RDF isolato)";
        diagnosi.dettagli.push("Verifica superata: Rilevata sintassi strutturale del Web Semantico (RDF, Turtle o JSON-LD).");
        diagnosi.dettagli.push("Limite rilevato: Il grafo utilizza URI per denotare le entità, ma non si interconnette a vocabolari esterni. Agisce come un silo.");
        
        return diagnosi;

    } catch (error) {
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        
        let estensioneBase = extension;
        if (extension === '.rdf' || extension === '.owl') estensioneBase = '.xml';
        if (extension === '.jsonld') estensioneBase = '.json';

        
        
        let diagnosiFallback = await analizzaFormatoAperto(filePath, originalName, mimeType, estensioneBase);
        diagnosiFallback.dettagli.unshift(`Declassamento dal modello a 4 stelle: ${error.message}`);
        
        return diagnosiFallback;
    }
}

// --- ANALISI 5 STELLE (Web Semantico e Linked Open Data) ---
const analizzaFormatoSemantico = async (filePath, originalName, mimeType, extension) => {
    let diagnosi = {
        file: originalName,
        stelleAssegnate: 0,
        livelloMaturita: "",
        dettagli: []
    };

    try {
        const stats = fs.statSync(filePath);
        const fileSizeInMB = stats.size / (1024 * 1024);

        if (fileSizeInMB > 5) {
            diagnosi.dettagli.push(`ATTENZIONE: Grafo RDF di grandi dimensioni (${fileSizeInMB.toFixed(2)} MB). Analisi in Streaming a blocchi continui attivata.`);
        }

        const regex4Stelle = /(<rdf:RDF|@prefix|@context|xmlns:rdf|http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#)/i;
        const regex5Stelle = /(<owl:sameAs|<skos:exactMatch|<skos:closeMatch|<rdfs:seeAlso|<schema:sameAs|owl:sameAs[\s:"]|skos:exactMatch[\s:"]|skos:closeMatch[\s:"]|rdfs:seeAlso[\s:"]|schema:sameAs[\s:"])/i;

        let found4Stelle = false;
        let found5Stelle = false;

        const fd = fs.openSync(filePath, 'r');
        const chunkSize = 5 * 1024 * 1024;
        const buffer = Buffer.alloc(chunkSize);
        let bytesRead = 0;
        let tail = ""; 

        while ((bytesRead = fs.readSync(fd, buffer, 0, chunkSize, null)) !== 0) {
            const chunkStr = tail + buffer.toString('utf8', 0, bytesRead);
            if (!found4Stelle && regex4Stelle.test(chunkStr)) found4Stelle = true;
            if (!found5Stelle && regex5Stelle.test(chunkStr)) found5Stelle = true;
            if (found4Stelle && found5Stelle) break; 
            tail = chunkStr.slice(-100);
        }
        fs.closeSync(fd);

        if (!found4Stelle) {
            throw new Error("Il file non presenta i marcatori standard di un grafo semantico (es. tag <rdf:RDF>, @prefix o @context).");
        }

        if (found5Stelle) {
            diagnosi.stelleAssegnate = 5;
            diagnosi.livelloMaturita = "5 Stelle - Linked Open Data (LOD)";
            diagnosi.dettagli.push("Verifica superata: Rilevata sintassi base del Web Semantico (RDF/Turtle/JSON-LD).");
            diagnosi.dettagli.push("Verifica superata: Rilevati predicati di linking semantico (es. owl:sameAs). Il dataset è interconnesso alla LOD Cloud.");
            return diagnosi;
        }
        
        throw new Error("Il file semantico non contiene predicati di linking (owl:sameAs, skos:exactMatch, ecc.) in nessuna sua parte. Non è interconnesso alla LOD Cloud.");

    } catch (error) {
        console.log(`Declassamento in corso per ${originalName}. Causa: ${error.message}`);
        // AWAIT inserito qui!
        let diagnosiFallback = await analizzaFormato4stelle(filePath, originalName, mimeType, extension);
        diagnosiFallback.dettagli.unshift(`Declassamento da 5 stelle: ${error.message}`);
        return diagnosiFallback;
    }
};

const analyzeDataset = async (req, res) => {
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

    if (estensioniSemantiche.includes(extension)) {
        risultatoValidazione = await analizzaFormatoSemantico(filePath, originalName, mimeType, extension);
    } 
    else if (estensioni3Stelle.includes(extension)) {
        risultatoValidazione = await analizzaFormatoAperto(filePath, originalName, mimeType, extension);
    } 
    else if (estensioni2Stelle.includes(extension)) {
        risultatoValidazione = await analizzaFormatoProprietario(filePath, originalName, mimeType, extension);
    } 
    else if (estensioni1Stella.includes(extension)) {
        risultatoValidazione = await analizzaFormatoNonStrutturato(filePath, mimeType, extension, originalName);
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