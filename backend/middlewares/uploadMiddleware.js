const multer = require('multer');
const path = require('path');

// Configurazione di dove e come salvare i file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Salva nella cartella uploads
    },
    filename: (req, file, cb) => {
        // Aggiunto un timestamp per evitare nomi di file duplicati con un numero random tipo id univoco
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload;