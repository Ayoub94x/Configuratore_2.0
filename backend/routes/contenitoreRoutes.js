// routes/contenitoreRoutes.js
const express = require('express');
const router = express.Router();
const Contenitore = require('../models/Contenitore');
const Joi = require('joi');

// Schema di validazione per le categorie
const categoriaSchema = Joi.object({
  nome: Joi.string().required(),
  prezzi: Joi.array().items(
    Joi.object({
      volume: Joi.string().required(),
      prezzo: Joi.number().min(0).required()
    })
  ).required()
});

// Schema di validazione per gli optional
const optionalSchema = Joi.object({
  nome: Joi.string().required(),
  prezzo: Joi.number().min(0).required()
});

// Ottenere la configurazione dei contenitori
router.get('/', async (req, res) => {
  try {
    const contenitori = await Contenitore.find();
    res.status(200).json(contenitori);
  } catch (error) {
    console.error('Errore nel recupero dei contenitori:', error);
    res.status(500).json({ message: 'Errore nel recupero dei contenitori' });
  }
});

// Aggiungere o aggiornare una categoria
router.post('/categoria', async (req, res) => {
  const { error, value } = categoriaSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    let contenitore = await Contenitore.findOne();
    if (!contenitore) {
      contenitore = new Contenitore({ categorie: [], optional: [] });
    }

    // Verifica se la categoria esiste già
    const categoriaIndex = contenitore.categorie.findIndex(cat => cat.nome === value.nome);
    if (categoriaIndex !== -1) {
      // Aggiorna la categoria esistente
      contenitore.categorie[categoriaIndex].prezzi = value.prezzi;
    } else {
      // Aggiungi una nuova categoria
      contenitore.categorie.push(value);
    }

    await contenitore.save();
    res.status(200).json(contenitore);
  } catch (error) {
    console.error('Errore nell\'aggiornamento della categoria:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento della categoria' });
  }
});

// Aggiungere o aggiornare un optional
router.post('/optional', async (req, res) => {
  const { error, value } = optionalSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    let contenitore = await Contenitore.findOne();
    if (!contenitore) {
      contenitore = new Contenitore({ categorie: [], optional: [] });
    }

    // Verifica se l'optional esiste già
    const optionalIndex = contenitore.optional.findIndex(opt => opt.nome === value.nome);
    if (optionalIndex !== -1) {
      // Aggiorna l'optional esistente
      contenitore.optional[optionalIndex].prezzo = value.prezzo;
    } else {
      // Aggiungi un nuovo optional
      contenitore.optional.push(value);
    }

    await contenitore.save();
    res.status(200).json(contenitore);
  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'optional:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento dell\'optional' });
  }
});

// Eliminare una categoria
router.delete('/categoria/:nome', async (req, res) => {
  const { nome } = req.params;

  try {
    const contenitore = await Contenitore.findOne();
    if (!contenitore) return res.status(404).json({ message: 'Contenitore non trovato' });

    contenitore.categorie = contenitore.categorie.filter(cat => cat.nome !== nome);
    await contenitore.save();
    res.status(200).json(contenitore);
  } catch (error) {
    console.error('Errore nell\'eliminazione della categoria:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione della categoria' });
  }
});

// Eliminare un optional
router.delete('/optional/:nome', async (req, res) => {
  const { nome } = req.params;

  try {
    const contenitore = await Contenitore.findOne();
    if (!contenitore) return res.status(404).json({ message: 'Contenitore non trovato' });

    contenitore.optional = contenitore.optional.filter(opt => opt.nome !== nome);
    await contenitore.save();
    res.status(200).json(contenitore);
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'optional:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione dell\'optional' });
  }
});

module.exports = router;
