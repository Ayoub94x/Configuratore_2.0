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
        corpo_contenitore: Joi.number().min(0).max(100).required(),
        bascule: Joi.number().min(0).max(100).required(),
        gancio: Joi.number().min(0).max(100).required(),
        bocche: Joi.number().min(0).max(100).required(),
        guida_a_terra: Joi.number().min(0).max(100).required(),
        adesivo: Joi.number().min(0).max(100).required(),
        optional: Joi.number().min(0).max(100).required()
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
        const { error, value } = customerSchema.validate(req.body);
        if (error) {
            console.log('Errore di validazione:', error.details[0].message);
            return res.status(400).json({ message: error.details[0].message });
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

// Validare il codice sconto
router.post('/validate-code', async (req, res) => {
    console.log('Ricevuta richiesta POST /api/customers/validate-code');
    console.log('Corpo della richiesta:', req.body);

    const { code } = req.body;
    try {
        const customer = await Customer.findOne({ code, is_active: true });

        if (!customer) {
            console.log('Codice sconto non valido o inattivo:', code);
            return res.status(400).json({ message: 'Codice sconto non valido o inattivo.' });
        }

        if (customer.usage_limit !== null && customer.usage_count >= customer.usage_limit) {
            console.log('Limite di utilizzo raggiunto:', code);
            return res.status(400).json({ message: 'Limite di utilizzo del codice sconto raggiunto.' });
        }

        res.status(200).json(customer);
    } catch (error) {
        console.error('Errore nella validazione del codice:', error);
        res.status(500).json({ message: 'Errore del server durante la validazione del codice.' });
    }
});

// Aggiornare l'uso del codice sconto
router.post('/update-usage', async (req, res) => {
    console.log('Ricevuta richiesta POST /api/customers/update-usage');
    console.log('Corpo della richiesta:', req.body);

    const { code } = req.body;
    try {
        const customer = await Customer.findOne({ code, is_active: true });
        if (!customer) {
            console.log('Codice sconto non valido o inattivo:', code);
            return res.status(400).json({ message: 'Codice sconto non valido o inattivo.' });
        }
        if (customer.usage_limit !== null && customer.usage_count >= customer.usage_limit) {
            console.log('Limite di utilizzo raggiunto:', code);
            return res.status(400).json({ message: 'Limite di utilizzo del codice sconto raggiunto.' });
        }
        if (customer.usage_limit !== null) {
            customer.usage_count += 1;
            await customer.save();
            console.log('Uso aggiornato:', code, 'Nuovo uso:', customer.usage_count);
        }
        res.status(200).json({ message: 'Uso del codice sconto aggiornato con successo.' });
    } catch (error) {
        console.error('Errore nell\'aggiornamento dell\'uso del codice:', error);
        res.status(500).json({ message: 'Errore del server durante l\'aggiornamento dell\'uso del codice.' });
    }
});

// Aggiorna un cliente (PATCH)
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body; 

    try {
        // Opzionalmente, potresti voler validare updateData qui
        const updatedCustomer = await Customer.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedCustomer) {
            return res.status(404).json({ message: 'Cliente non trovato.' });
        }
        res.status(200).json({ message: 'Cliente aggiornato con successo.', customer: updatedCustomer });
    } catch (error) {
        console.error('Errore nell\'aggiornamento del cliente:', error);
        res.status(500).json({ message: 'Errore nel server durante l\'aggiornamento del cliente.' });
    }
});

// DELETE /api/customers/:id - Elimina un cliente
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verifica se l'ID è un ObjectId valido
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log('ID del cliente non valido:', id);
            return res.status(400).json({ message: 'ID del cliente non valido.' });
        }

        console.log(`Richiesta DELETE per il cliente con ID: ${id}`);
        const deletedCustomer = await Customer.findByIdAndDelete(id);

        if (!deletedCustomer) {
            console.log('Cliente non trovato.');
            return res.status(404).json({ message: 'Cliente non trovato.' });
        }

        console.log('Cliente eliminato con successo.');
        res.json({ message: 'Cliente eliminato con successo.' });
    } catch (error) {
        console.error('Errore durante l\'eliminazione del cliente:', error);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

module.exports = router;
