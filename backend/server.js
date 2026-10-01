const express = require('express');
const cors = require('cors');
const path = require('path');

// Inizializzazione dell'app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware globali
app.use(cors()); // Permette le chiamate dal frontend
app.use(express.json()); // Permette di leggere i body in JSON
app.use(express.urlencoded({ extended: true }));

// Rotta di test per verificare che il server sia vivo
app.get('/api/status', (req, res) => {
    res.json({ message: "Server del validatore operativo!", status: "OK" });
});

// Qui importeremo le rotte (Routes) in stile MVC
// const apiRoutes = require('./routes/apiRoutes');
// app.use('/api', apiRoutes);

// Avvio del server
app.listen(PORT, () => {
    console.log(`🚀 Server in esecuzione sulla porta ${PORT}`);
    console.log(`Testalo aprendo: http://localhost:${PORT}/api/status`);
});