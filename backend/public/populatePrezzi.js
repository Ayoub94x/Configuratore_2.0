// populatePrezzi.js
require('dotenv').config();
const mongoose = require('mongoose');
const Prezzo = require('./models/Prezzi');

const mongoURI = process.env.MONGODB_URI;

// Prezzi iniziali per Contenitori
const prezziContenitori = [
  { categoria: "corpo_contenitore_1750L", prezzo: 520.0 },
  { categoria: "corpo_contenitore_2100L", prezzo: 550.0 },
  { categoria: "corpo_contenitore_2500L", prezzo: 600.0 },
  { categoria: "corpo_contenitore_2700L", prezzo: 650.0 },
  { categoria: "corpo_contenitore_3000L", prezzo: 650.0 },
  { categoria: "corpo_contenitore_3750L", prezzo: 710.0 },

  { categoria: "bascule_ferro_1750L", prezzo: 260.0 },
  { categoria: "bascule_ferro_2100L", prezzo: 290.0 },
  { categoria: "bascule_ferro_2500L", prezzo: 290.0 },
  { categoria: "bascule_ferro_2700L", prezzo: 320.0 },
  { categoria: "bascule_ferro_3000L", prezzo: 320.0 },
  { categoria: "bascule_ferro_3750L", prezzo: 350.0 },

  { categoria: "bascule_hdpe_1750L", prezzo: 120.0 },
  { categoria: "bascule_hdpe_2100L", prezzo: 130.0 },
  { categoria: "bascule_hdpe_2500L", prezzo: 135.0 },
  { categoria: "bascule_hdpe_2700L", prezzo: 150.0 },
  { categoria: "bascule_hdpe_3000L", prezzo: 155.0 },
  { categoria: "bascule_hdpe_3750L", prezzo: 175.0 },

  { categoria: "gancio_F90_1750L", prezzo: 300.0 },
  { categoria: "gancio_F90_2100L", prezzo: 310.0 },
  { categoria: "gancio_F90_2500L", prezzo: 310.0 },
  { categoria: "gancio_F90_2700L", prezzo: 320.0 },
  { categoria: "gancio_F90_3000L", prezzo: 320.0 },
  { categoria: "gancio_F90_3750L", prezzo: 330.0 },

  { categoria: "gancio_ks_1750L", prezzo: 300.0 },
  { categoria: "gancio_ks_2100L", prezzo: 310.0 },
  { categoria: "gancio_ks_2500L", prezzo: 310.0 },
  { categoria: "gancio_ks_2700L", prezzo: 320.0 },
  { categoria: "gancio_ks_3000L", prezzo: 320.0 },
  { categoria: "gancio_ks_3750L", prezzo: 330.0 },

  { categoria: "Feritoia_metallo_1750L", prezzo: 195.0 },
  { categoria: "Feritoia_metallo_2100L", prezzo: 205.0 },
  { categoria: "Feritoia_metallo_2500L", prezzo: 195.0 },
  { categoria: "Feritoia_metallo_2700L", prezzo: 220.0 },
  { categoria: "Feritoia_metallo_3000L", prezzo: 205.0 },
  { categoria: "Feritoia_metallo_3750L", prezzo: 220.0 },

  { categoria: "Feritoia_plastica_1750L", prezzo: 70.0 },
  { categoria: "Feritoia_plastica_2100L", prezzo: 80.0 },
  { categoria: "Feritoia_plastica_2500L", prezzo: 70.0 },
  { categoria: "Feritoia_plastica_2700L", prezzo: 90.0 },
  { categoria: "Feritoia_plastica_3000L", prezzo: 80.0 },
  { categoria: "Feritoia_plastica_3750L", prezzo: 90.0 },

  { categoria: "Cassetto_1750L", prezzo: 295.0 },
  { categoria: "Cassetto_2100L", prezzo: 305.0 },
  { categoria: "Cassetto_2500L", prezzo: 295.0 },
  { categoria: "Cassetto_2700L", prezzo: 310.0 },
  { categoria: "Cassetto_3000L", prezzo: 305.0 },
  { categoria: "Cassetto_3750L", prezzo: 310.0 },

  { categoria: "Tamburo_1750L", prezzo: 295.0 },
  { categoria: "Tamburo_2100L", prezzo: 305.0 },
  { categoria: "Tamburo_2500L", prezzo: 295.0 },
  { categoria: "Tamburo_2700L", prezzo: 310.0 },
  { categoria: "Tamburo_3000L", prezzo: 305.0 },
  { categoria: "Tamburo_3750L", prezzo: 310.0 },

  { categoria: "Oblo_1750L", prezzo: 25.0 },
  { categoria: "Oblo_2100L", prezzo: 25.0 },
  { categoria: "Oblo_2500L", prezzo: 25.0 },
  { categoria: "Oblo_2700L", prezzo: 25.0 },
  { categoria: "Oblo_3000L", prezzo: 25.0 },
  { categoria: "Oblo_3750L", prezzo: 25.0 },

  { categoria: "guida_a_terra_metallo_1750L", prezzo: 25.0 },
  { categoria: "guida_a_terra_metallo_2100L", prezzo: 28.0 },
  { categoria: "guida_a_terra_metallo_2500L", prezzo: 25.0 },
  { categoria: "guida_a_terra_metallo_2700L", prezzo: 31.0 },
  { categoria: "guida_a_terra_metallo_3000L", prezzo: 28.0 },
  { categoria: "guida_a_terra_metallo_3750L", prezzo: 31.0 },

  { categoria: "guida_a_terra_hdpe_1750L", prezzo: 16.0 },
  { categoria: "guida_a_terra_hdpe_2100L", prezzo: 18.0 },
  { categoria: "guida_a_terra_hdpe_2500L", prezzo: 16.0 },
  { categoria: "guida_a_terra_hdpe_2700L", prezzo: 19.0 },
  { categoria: "guida_a_terra_hdpe_3000L", prezzo: 18.0 },
  { categoria: "guida_a_terra_hdpe_3750L", prezzo: 19.0 },

  { categoria: "adesivo_1750L", prezzo: 26.4 },
  { categoria: "adesivo_2100L", prezzo: 28.4 },
  { categoria: "adesivo_2500L", prezzo: 26.4 },
  { categoria: "adesivo_2700L", prezzo: 32.4 },
  { categoria: "adesivo_3000L", prezzo: 28.4 },
  { categoria: "adesivo_3750L", prezzo: 32.4 },

  { categoria: "optional_pedale", prezzo: 77.0 },
  { categoria: "optional_elettronica", prezzo: 850.0 },
  { categoria: "optional_sensore_volumetrico", prezzo: 105.0 },
];

// Prezzi iniziali per Mezzi
const prezziMezzi = [
  // AUTOMEZZI
  { categoria: "AUTOMEZZI_2_assi_18_Ton", prezzo: 88500.0 },
  { categoria: "AUTOMEZZI_2+1_assi_22_Ton", prezzo: 95000.0 },
  { categoria: "AUTOMEZZI_3_assi_26_Ton", prezzo: 108000.0 },
  { categoria: "AUTOMEZZI_4_assi_32_Ton", prezzo: 115000.0 },

  // Allestimento
  { categoria: "Allestimento_Scarrabile_2_assi", prezzo: 37830.0 },
  { categoria: "Allestimento_Scarrabile_2+1_assi", prezzo: 38500.0 },
  { categoria: "Allestimento_Scarrabile_3_assi", prezzo: 40740.0 },
  { categoria: "Allestimento_Scarrabile_4_assi", prezzo: 43500.0 },
  { categoria: "Allestimento_Fisso_2_assi", prezzo: 25000.0 },
  { categoria: "Allestimento_Fisso_2+1_assi", prezzo: 25000.0 },
  { categoria: "Allestimento_Fisso_3_assi", prezzo: 25000.0 },
  { categoria: "Allestimento_Fisso_4_assi", prezzo: 25000.0 },

  // ROBOT
  { categoria: "ROBOT_2AS_Kinshofer", prezzo: 125000.0 },
  { categoria: "ROBOT_2AS_F90", prezzo: 125000.0 },

  // Compattatore
  { categoria: "Compattatore_Scarrabili_L_4500", prezzo: 55000.0 },
  { categoria: "Compattatore_Scarrabili_L_4800", prezzo: 55000.0 },
  { categoria: "Compattatore_Scarrabili_L_6200", prezzo: 55000.0 },
  { categoria: "Compattatore_Scarrabili_L_6600", prezzo: 55000.0 },
  { categoria: "Compattatore_Fisso_L_4500", prezzo: 55000.0 },
  { categoria: "Compattatore_Fisso_L_4800", prezzo: 55000.0 },
  { categoria: "Compattatore_Fisso_L_6200", prezzo: 55000.0 },
  { categoria: "Compattatore_Fisso_L_6600", prezzo: 55000.0 },

  // Lavacontenitori
  { categoria: "Lavacontenitori_2_assi", prezzo: 135315.0 },
  { categoria: "Lavacontenitori_2+1_assi", prezzo: 142120.0 },
  { categoria: "Lavacontenitori_3_assi", prezzo: 149380.0 },
  { categoria: "Lavacontenitori_4_assi", prezzo: 153120.0 },

  // Accessori
  { categoria: "Accessori_PTO", prezzo: 2300.0 },
  { categoria: "Accessori_Tracciamento_percorso", prezzo: 5000.0 },
  { categoria: "Accessori_Antenna_UHF", prezzo: 6693.0 },
  { categoria: "Accessori_Impianto_sanificazione", prezzo: 4400.0 },
  { categoria: "Accessori_Impianto_lubrificazione", prezzo: 4850.0 },
  { categoria: "Accessori_Centralina_oleodinamica_emergenza_ROBOT", prezzo: 3492.0 },
  { categoria: "Accessori_Connessione_remota_1Y", prezzo: 2910.0 },

  // PLUS
  { categoria: "PLUS_Trasporto", prezzo: 1000.0 },
];

// Combina tutti i prezzi
const prezziIniziali = [...prezziContenitori, ...prezziMezzi];

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('Connesso a MongoDB Atlas!');
    await Prezzo.deleteMany({});
    await Prezzo.insertMany(prezziIniziali);
    console.log('Prezzi iniziali popolati con successo!');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Errore di connessione a MongoDB Atlas:', err);
  });
