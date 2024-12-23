// config.js

const configurazioneData = {
    contenitori: {
      volumes: ["1750L", "2100L", "2500L", "2700L", "3000L", "3750L"],
      configurazioni: {
        "corpo_contenitore": {
          prezzi: {
            "1750L": 520.0,
            "2100L": 550.0,
            "2500L": 600.0,
            "2700L": 650.0,
            "3000L": 650.0,
            "3750L": 710.0
          }
        },
        "bascule ferro": {
          prezzi: {
            "1750L": 260.0,
            "2100L": 290.0,
            "2500L": 290.0,
            "2700L": 320.0,
            "3000L": 320.0,
            "3750L": 350.0
          }
        },
        // ... (Altre configurazioni per Contenitori)
        "optional": {
          pedale: 77.0,
          elettronica: 850.0,
          "sensore volumetrico": 105.0
        }
      }
    },
    mezzi: {
      categorie: {
        "AUTOMEZZI": {
          indicazioni: "Seleziona l'automezzo adatto alle tue esigenze.",
          opzioni: [
            { nome: "2 assi (18 Ton)", prezzo: 88500.00 },
            { nome: "2 + 1 assi (22 Ton)", prezzo: 95000.00 },
            { nome: "3 assi (26 Ton)", prezzo: 108000.00 },
            { nome: "4 assi (32 Ton)", prezzo: 115000.00 }
          ]
        },
        "Allestimento": {
          indicazioni: "Scegli il tipo di allestimento per il tuo automezzo.",
          opzioni: [
            { nome: "Scarrabile 2 assi", prezzo: 37830.00 },
            { nome: "Scarrabile 2+1 assi", prezzo: 38500.00 },
            // ... (Altre opzioni)
          ]
        },
        // ... (Altre categorie per Mezzi)
        "PLUS": {
          indicazioni: "Aggiungi funzioni extra al tuo automezzo.",
          opzioni: [
            { nome: "Trasporto", prezzo: 1000.00 }
          ]
        }
      }
    }
  };
  