const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const validatorController = require('../controllers/validatorController');

// Rotta POST: accetta un file chiamato 'dataset' e poi avvia l'analisi nel controller
router.post('/upload', upload.single('dataset'), validatorController.analyzeDataset);

module.exports = router;