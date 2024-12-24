// server.js
require('dotenv').config(); // Carica le variabili d'ambiente

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const path = require('path');

const customersRoute = require('./routes/customerRoutes');
const mezziRoute = require('./routes/mezzoRoutes'); // Assicurati che il percorso sia corretto
const prezziRoute = require('./routes/prezzoRoutes'); // Importa le rotte dei prezzi

const app = express();

// Middleware vari
app.use(bodyParser.json());
app.use(cors());

// Connessione a MongoDB
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connesso a MongoDB Atlas!'))
  .catch(err => console.error('Errore di connessione a MongoDB Atlas:', err));

// Rotte API
app.use('/api/customers', customersRoute);
app.use('/api/mezzi', mezziRoute); // Usa le rotte dei mezzi
app.use('/api/prezzi', prezziRoute); // Usa le rotte dei prezzi

/**
 * Sezione dedicata all'ADMIN
 * ----------------------------------
 * 1. Autenticazione di base per /admin
 * 2. Servire i file statici dell’admin (e di tutto il sito) da "public"
 * 3. Fallback per rotte /admin
 */
app.use(
  '/admin',
  basicAuth({
    users: { [process.env.ADMIN_USER]: process.env.ADMIN_PASS },
    challenge: true,
    realm: 'Amministrazione'
  })
);

// Servire tutta la cartella "public" come statica
app.use(express.static(path.join(__dirname, 'public')));

// Rotta di fallback per l’admin
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin_mezzi.html')); // Cambia in admin_mezzi.html
});

// Rotta di fallback per TUTTO il resto
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware di gestione degli errori
app.use((err, req, res, next) => {
  console.error('Errore:', err.stack);
  res.status(500).json({ message: 'Errore interno del server.' });
});

// Avvio del Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server in ascolto sulla porta ${PORT}`);
});
