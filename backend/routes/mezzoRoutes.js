// routes/mezzoRoutes.js
const express = require('express');
const router = express.Router();
const Mezzo = require('../models/Mezzo');
const Joi = require('joi');

// Schema di validazione per le categorie e le opzioni
const categoriaSchema = Joi.object({
    nome: Joi.string().trim().required(),
    indicazioni: Joi.string().trim().required(),
    opzioni: Joi.array().items(
        Joi.object({
            nome: Joi.string().trim().required(),
            prezzo: Joi.number().min(0).required(),
            sconto: Joi.number().min(0).max(100).default(0),
            prezzoScontato: Joi.number().min(0).optional()
        })
    ).required()
});

const mezzoSchema = Joi.object({
    categoria: categoriaSchema.required()
});

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
// Ottenere le opzioni per una specifica categoria di automezzi
router.get('/categoria/:categoria', async (req, res) => {
    const { categoria } = req.params;
    try {
        const mezzo = await Mezzo.findOne({ 'categoria.nome': categoria });
        if (!mezzo) {
            return res.status(404).json({ message: 'Categoria non trovata.' });
        }
        res.status(200).json(mezzo);
    } catch (error) {
        console.error('Errore nel recupero della categoria:', error);
        res.status(500).json({ message: 'Errore nel recupero della categoria.' });
    }
});

// Ottenere le opzioni per Allestimento
router.get('/allestimento/:tipo', async (req, res) => {
    const { tipo } = req.params;
    try {
        const mezzo = await Mezzo.findOne({ 'categoria.nome': 'Allestimento', 'categoria.opzioni.nome': tipo });
        if (!mezzo) {
            return res.status(404).json({ message: 'Tipo di allestimento non trovato.' });
        }
        // Filtra le opzioni per tipo
        const opzioni = mezzo.categoria.opzioni.filter(op => op.nome === tipo);
        res.status(200).json({ categoria: mezzo.categoria.nome, opzioni });
    } catch (error) {
        console.error('Errore nel recupero del tipo di allestimento:', error);
        res.status(500).json({ message: 'Errore nel recupero del tipo di allestimento.' });
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

        const { categoria } = value;

        // Calcola il prezzo scontato per ogni opzione
        categoria.opzioni = categoria.opzioni.map(opzione => ({
            ...opzione,
            prezzoScontato: opzione.prezzo - (opzione.prezzo * opzione.sconto) / 100
        }));

        const newMezzo = new Mezzo({
            categoria
        });

        await newMezzo.save();
        console.log('Mezzo aggiunto con successo:', categoria.nome);
        res.status(201).json({ message: 'Mezzo aggiunto con successo.' });
    } catch (error) {
        console.error('Errore nell\'aggiunta del mezzo:', error);
        res.status(500).json({ message: 'Errore del server durante l\'aggiunta del mezzo.' });
    }
});

// Aggiornare un mezzo (categoria specifica)
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        // Validazione dell'ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID del mezzo non valido.' });
        }

        const { error, value } = mezzoSchema.validate(updateData);
        if (error) {
            console.log('Errore di validazione:', error.details[0].message);
            return res.status(400).json({ message: error.details[0].message });
        }

        // Calcola il prezzo scontato per ogni opzione
        value.categoria.opzioni = value.categoria.opzioni.map(opzione => ({
            ...opzione,
            prezzoScontato: opzione.prezzo - (opzione.prezzo * opzione.sconto) / 100
        }));

        const updatedMezzo = await Mezzo.findByIdAndUpdate(id, value, { new: true });
        if (!updatedMezzo) {
            return res.status(404).json({ message: 'Mezzo non trovato.' });
        }

        res.status(200).json({ message: 'Mezzo aggiornato con successo.', mezzo: updatedMezzo });
    } catch (error) {
        console.error('Errore nell\'aggiornamento del mezzo:', error);
        res.status(500).json({ message: 'Errore del server durante l\'aggiornamento del mezzo.' });
    }
});

// Eliminare un mezzo
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica se l'ID è un ObjectId valido
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('ID del mezzo non valido:', id);
            return res.status(400).json({ message: 'ID del mezzo non valido.' });
        }

        console.log(`Richiesta DELETE per il mezzo con ID: ${id}`);
        const deletedMezzo = await Mezzo.findByIdAndDelete(id);

        if (!deletedMezzo) {
            console.log('Mezzo non trovato.');
            return res.status(404).json({ message: 'Mezzo non trovato.' });
        }

        console.log('Mezzo eliminato con successo.');
        res.json({ message: 'Mezzo eliminato con successo.' });
    } catch (error) {
        console.error('Errore durante l\'eliminazione del mezzo:', error);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

module.exports = router;
