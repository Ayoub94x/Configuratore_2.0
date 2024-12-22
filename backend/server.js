// server.js
require('dotenv').config(); // Carica le variabili d'ambiente

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const basicAuth = require('express-basic-auth');
const path = require('path');

const customersRoute = require('./routes/customerRoutes');

const app = express();

// Middleware vari
app.use(bodyParser.json());
app.use(cors());

// Connessione a MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://Ayoub_Majdouli:nI6Ds3JJEqqknaJ2@configuratore.hucwx.mongodb.net/?api/=true&w=majority&appName=Configuratore/tuo-database';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Connesso a MongoDB Atlas!'))
  .catch(err => console.error('Errore di connessione a MongoDB Atlas:', err));

// Rotte API
app.use('/api/customers', customersRoute);

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
// => Tutto ciò che sta in "public" è accessibile all'URL base
//    (es. /index.html, /admin.html, /styles.css, ecc.)
app.use(express.static(path.join(__dirname, 'public')));

// Rotta di fallback per l’admin
// Se l’utente richiede un percorso /admin/... che non esiste, 
// inviargli la pagina admin_list.html (o admin.html, come preferisci).
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin_list.html'));
});

// Rotta di fallback per TUTTO il resto
// Se l’utente richiede una qualunque rotta che non sia /api/... o /admin/...,
// mandiamo l’index.html (tipico scenario da SPA o sito statico generico).
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
