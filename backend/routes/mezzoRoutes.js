// routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Joi = require('joi');
const mongoose = require('mongoose'); // Assicurati di importare mongoose

// Schema di validazione per l'aggiunta di un nuovo cliente
const customerSchema = Joi.object({
    code: Joi.string().trim().required(),
    name: Joi.string().trim().required(),
    discounts: Joi.object({
        // Sconti per Contenitori
        corpo_contenitore: Joi.number().min(0).max(100).required(),
        bascule: Joi.number().min(0).max(100).required(),
        gancio: Joi.number().min(0).max(100).required(),
        bocche: Joi.number().min(0).max(100).required(),
        guida_a_terra: Joi.number().min(0).max(100).required(),
        adesivo: Joi.number().min(0).max(100).required(),
        optional: Joi.number().min(0).max(100).required(),
        // Sconti per Mezzi
        AUTOMEZZI: Joi.number().min(0).max(100).required(),
        Allestimento: Joi.number().min(0).max(100).required(),
        GRU: Joi.number().min(0).max(100).required(),
        Compattatore: Joi.number().min(0).max(100).required(),
        Lavacontenitori: Joi.number().min(0).max(100).required(),
        Accessori: Joi.number().min(0).max(100).required(),
        PLUS: Joi.number().min(0).max(100).required()
    }).required(),
    extra_discount: Joi.object({
        type: Joi.string().valid('percentuale', 'fisso').required(),
        value: Joi.number().min(0).required(),
        active: Joi.boolean().required()
    }).required(),
    usage_limit: Joi.number().integer().min(0).allow(null),
    is_active: Joi.boolean().required()
});

// Ottenere tutti i clienti
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.find({});
        res.status(200).json(customers);
    } catch (error) {
        console.error('Errore nel recupero dei clienti:', error);
        res.status(500).json({ message: 'Errore nel recupero dei clienti' });
    }
});

// Aggiungere un nuovo cliente
router.post('/', async (req, res) => {
    console.log('Ricevuta richiesta POST /api/customers');
    console.log('Corpo della richiesta:', req.body);

    try {
        const { error, value } = customerSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessages = error.details.map(detail => detail.message).join(', ');
            console.log('Errore di validazione:', errorMessages);
            return res.status(400).json({ message: errorMessages });
        }

        const { code, name, discounts, extra_discount, usage_limit, is_active } = value;

        const existingCustomer = await Customer.findOne({ code });
        if (existingCustomer) {
            console.log('Codice cliente esistente:', code);
            return res.status(400).json({ message: 'Il codice cliente esiste già.' });
        }

        const newCustomer = new Customer({
            code,
            name,
            discounts,
            extra_discount,
            usage_limit,
            is_active,
            usage_count: 0
        });

        await newCustomer.save();
        console.log('Cliente aggiunto con successo:', code);
        res.status(201).json({ message: 'Cliente aggiunto con successo.' });
    } catch (error) {
        console.error('Errore nell\'aggiunta del cliente:', error);
        res.status(500).json({ message: 'Errore del server durante l\'aggiunta del cliente.' });
    }
});

// Altre rotte...

module.exports = router;
