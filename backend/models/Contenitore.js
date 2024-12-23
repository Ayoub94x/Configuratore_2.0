// models/Contenitore.js
const mongoose = require('mongoose');

const PrezzoSchema = new mongoose.Schema({
  volume: { type: String, required: true },
  prezzo: { type: Number, required: true }
}, { _id: false });

const CategoriaContenitoreSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  prezzi: [PrezzoSchema]
}, { _id: false });

const OptionalContenitoreSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  prezzo: { type: Number, required: true }
}, { _id: false });

const ContenitoreSchema = new mongoose.Schema({
  categorie: [CategoriaContenitoreSchema],
  optional: [OptionalContenitoreSchema]
}, { timestamps: true });

module.exports = mongoose.model('Contenitore', ContenitoreSchema);
