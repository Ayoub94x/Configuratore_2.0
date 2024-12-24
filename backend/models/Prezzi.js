// models/Prezzi.js
const mongoose = require('mongoose');

const PrezzoSchema = new mongoose.Schema({
  categoria: { type: String, required: true, unique: true }, // Es: "corpo_contenitore", "bascule ferro", ecc.
  prezzo: { type: Number, required: true }
});

module.exports = mongoose.model('Prezzo', PrezzoSchema);
