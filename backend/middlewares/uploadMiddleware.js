const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crea un percorso assoluto partendo dalla cartella 'middlewares' verso 'uploads'
const uploadDir = path.join(__dirname, '..', 'uploads');

// Se la cartella non esiste, la crea in automatico forzatamente
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurazione di dove e come salvare i file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Salva nel percorso assoluto blindato
    },
    filename: (req, file, cb) => {
        // Aggiunto un timestamp per evitare nomi di file duplicati con un numero random tipo id univoco
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload;