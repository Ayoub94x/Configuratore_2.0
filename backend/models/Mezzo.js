// models/Mezzo.js
const mongoose = require('mongoose');

const OpzioneSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  prezzo: { type: Number, required: true }
}, { _id: false });

const CategoriaMezzoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  indicazioni: { type: String, required: true },
  opzioni: [OpzioneSchema]
}, { _id: false });

const MezzoSchema = new mongoose.Schema({
  categorie: [CategoriaMezzoSchema]
}, { timestamps: true });

module.exports = mongoose.model('Mezzo', MezzoSchema);
