// models/Customer.js
const mongoose = require('mongoose');

const ExtraDiscountSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['percentuale', 'fisso'],
        required: true
    },
    value: {
        type: Number,
        required: true
    },
    active: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const CustomerSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    discounts: {
        // Sconti per Contenitori
        corpo_contenitore: { type: Number, required: true },
        bascule: { type: Number, required: true },
        gancio: { type: Number, required: true },
        bocche: { type: Number, required: true },
        guida_a_terra: { type: Number, required: true },
        adesivo: { type: Number, required: true },
        optional: { type: Number, required: true },
        // Sconti per Mezzi
        AUTOMEZZI: { type: Number, required: true },
        Allestimento: { type: Number, required: true },
        GRU: { type: Number, required: true },
        Compattatore: { type: Number, required: true },
        Lavacontenitori: { type: Number, required: true },
        Accessori: { type: Number, required: true },
        PLUS: { type: Number, required: true }
    },
    extra_discount: {
        type: ExtraDiscountSchema,
        default: { type: 'percentuale', value: 0, active: false }
    },
    usage_limit: {
        type: Number,
        default: null // null per illimitato
    },
    usage_count: {
        type: Number,
        default: 0
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
