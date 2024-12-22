// routes/mezzoRoutes.js
const express = require('express');
const router = express.Router();
const Mezzo = require('../models/Mezzo');
const Joi = require('joi');
const mongoose = require('mongoose');

// Schema di validazione con Joi
const mezzoSchema = Joi.object({
    categoria: Joi.string().trim().required(),
    indicazioni: Joi.string().trim().required(),
    prezzo_base: Joi.number().min(0).required(),
    sconto_percentuale: Joi.number().min(0).max(100).required(),
    selezionato: Joi.boolean().optional()
});

// Calcola il prezzo scontato
function calcolaPrezzoScontato(prezzo_base, sconto_percentuale) {
    return prezzo_base - (prezzo_base * (sconto_percentuale / 100));
}

// Ottenere tutti i mezzi
router.get('/', async (req, res) => {
    try {
        const mezzi = await Mezzo.find({});
        res.status(200).json(mezzi);
    } catch (error) {
        console.error('Errore nel recupero dei mezzi:', error);
        res.status(500).json({ message: 'Errore nel recupero dei mezzi' });
    }
});

// Aggiungere un nuovo mezzo
router.post('/', async (req, res) => {
    console.log('Ricevuta richiesta POST /api/mezzi');
    console.log('Corpo della richiesta:', req.body);

    try {
        const { error, value } = mezzoSchema.validate(req.body);
        if (error) {
            console.log('Errore di validazione:', error.details[0].message);
            return res.status(400).json({ message: error.details[0].message });
        }

        const { categoria, indicazioni, prezzo_base, sconto_percentuale, selezionato } = value;

        // Calcola il prezzo scontato
        const prezzo_scontato = calcolaPrezzoScontato(prezzo_base, sconto_percentuale);

        const newMezzo = new Mezzo({
            categoria,
            indicazioni,
            prezzo_base,
            sconto_percentuale,
            prezzo_scontato,
            selezionato: selezionato || false
        });

        await newMezzo.save();
        console.log('Mezzo aggiunto con successo:', indicazioni);
        res.status(201).json({ message: 'Mezzo aggiunto con successo.', mezzo: newMezzo });
    } catch (error) {
        console.error('Errore nell\'aggiunta del mezzo:', error);
        res.status(500).json({ message: 'Errore del server durante l\'aggiunta del mezzo.' });
    }
});

// Aggiornare un mezzo (PATCH)
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Validazione dell'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID del mezzo non valido.' });
    }

    try {
        // Se viene aggiornato lo sconto o il prezzo base, ricalcola il prezzo scontato
        if (updateData.prezzo_base !== undefined || updateData.sconto_percentuale !== undefined) {
            const mezzo = await Mezzo.findById(id);
            if (!mezzo) {
                return res.status(404).json({ message: 'Mezzo non trovato.' });
            }

            const prezzo_base = updateData.prezzo_base !== undefined ? updateData.prezzo_base : mezzo.prezzo_base;
            const sconto_percentuale = updateData.sconto_percentuale !== undefined ? updateData.sconto_percentuale : mezzo.sconto_percentuale;
            const prezzo_scontato = calcolaPrezzoScontato(prezzo_base, sconto_percentuale);

            updateData.prezzo_scontato = prezzo_scontato;
        }

        const updatedMezzo = await Mezzo.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedMezzo) {
            return res.status(404).json({ message: 'Mezzo non trovato.' });
        }
        res.status(200).json({ message: 'Mezzo aggiornato con successo.', mezzo: updatedMezzo });
    } catch (error) {
        console.error('Errore nell\'aggiornamento del mezzo:', error);
        res.status(500).json({ message: 'Errore nel server durante l\'aggiornamento del mezzo.' });
    }
});

// Eliminare un mezzo (DELETE)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    // Validazione dell'ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'ID del mezzo non valido.' });
    }

    try {
        const deletedMezzo = await Mezzo.findByIdAndDelete(id);
        if (!deletedMezzo) {
            return res.status(404).json({ message: 'Mezzo non trovato.' });
        }
        res.json({ message: 'Mezzo eliminato con successo.' });
    } catch (error) {
        console.error('Errore durante l\'eliminazione del mezzo:', error);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

module.exports = router;
