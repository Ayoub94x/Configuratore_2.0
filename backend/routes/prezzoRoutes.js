// routes/prezzoRoutes.js
const express = require('express');
const router = express.Router();
const Prezzo = require('../models/Prezzi');
const Joi = require('joi');

// Schema di validazione per aggiornare un prezzo
const prezzoSchema = Joi.object({
  categoria: Joi.string().trim().required(),
  prezzo: Joi.number().min(0).required()
});

// Ottenere tutti i prezzi
router.get('/', async (req, res) => {
  try {
    const prezzi = await Prezzo.find({});
    res.status(200).json(prezzi);
  } catch (error) {
    console.error('Errore nel recupero dei prezzi:', error);
    res.status(500).json({ message: 'Errore nel recupero dei prezzi' });
  }
});

// Aggiornare un prezzo
router.put('/', async (req, res) => {
  try {
    const { error, value } = prezzoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { categoria, prezzo } = value;

    const prezzoAggiornato = await Prezzo.findOneAndUpdate(
      { categoria },
      { prezzo },
      { new: true }
    );

    if (!prezzoAggiornato) {
      return res.status(404).json({ message: 'Categoria non trovata.' });
    }

    res.status(200).json({ message: 'Prezzo aggiornato con successo.', prezzo: prezzoAggiornato });
  } catch (error) {
    console.error('Errore nell\'aggiornamento del prezzo:', error);
    res.status(500).json({ message: 'Errore del server durante l\'aggiornamento del prezzo.' });
  }
});

// Aggiungere un nuovo prezzo (opzionale)
router.post('/', async (req, res) => {
  try {
    const { error, value } = prezzoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { categoria, prezzo } = value;

    const existingPrezzo = await Prezzo.findOne({ categoria });
    if (existingPrezzo) {
      return res.status(400).json({ message: 'La categoria esiste già.' });
    }

    const newPrezzo = new Prezzo({ categoria, prezzo });
    await newPrezzo.save();

    res.status(201).json({ message: 'Prezzo aggiunto con successo.', prezzo: newPrezzo });
  } catch (error) {
    console.error('Errore nell\'aggiunta del prezzo:', error);
    res.status(500).json({ message: 'Errore del server durante l\'aggiunta del prezzo.' });
  }
});

const JoiDeleteSchema = Joi.object({
    categoria: Joi.string().trim().required()
  });
  
  // DELETE /api/prezzi/:categoria - Elimina un prezzo
  router.delete('/:categoria', async (req, res) => {
    try {
      const categoria = req.params.categoria;
  
      const prezzoEliminato = await Prezzo.findOneAndDelete({ categoria });
  
      if (!prezzoEliminato) {
        return res.status(404).json({ message: 'Categoria non trovata.' });
      }
  
      res.status(200).json({ message: 'Prezzo eliminato con successo.' });
    } catch (error) {
      console.error('Errore durante l\'eliminazione del prezzo:', error);
      res.status(500).json({ message: 'Errore interno del server.' });
    }
  });
  
  module.exports = router;
