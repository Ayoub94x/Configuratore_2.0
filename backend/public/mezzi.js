// mezzi_script.js

const { jsPDF } = window.jspdf;

/**
 * Funzione di formattazione della valuta Euro
 * @param {number} value - Il valore numerico da formattare
 * @returns {string} - Il valore formattato come valuta Euro
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Mappa dei passaggi (categorie) usata per la navigazione
 * e per la modifica delle selezioni.
 */
const stepMap = {
  "AUTOMEZZI": "AUTOMEZZI",
  "Allestimento": "Allestimento",
  "GRU": "GRU",
  "Compattatore": "Compattatore",
  "Lavacontenitori": "Lavacontenitori",
  "Accessori": "Accessori",
  "PLUS": "PLUS"
};

/**
 * Oggetto globale di configurazione per gestire
 * tutte le informazioni della sessione corrente.
 */
let configurazione = {
  userInfo: {},
  customer: null, // Info del cliente (inclusi eventuali sconti da codice)
  selections: {},
  prezzoTotale: 0,               // Prezzo totale base (senza quantità/sconti finali)
  scontoExtra: 0,                // Valore in €
  prezzoTotaleScontato: 0,       // Prezzo totale scontato finale
  currentStep: null,             // Passo corrente
  quantità: 1                     // Quantità selezionata
};

// Dati di base per i mezzi
configurazione.data = {
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
        { nome: "Scarrabile 3 assi", prezzo: 40740.00 },
        { nome: "Scarrabile 4 assi", prezzo: 43500.00 },
        { nome: "Fisso 2 assi", prezzo: 25000.00 },
        { nome: "Fisso 2+1 assi", prezzo: 25000.00 },
        { nome: "Fisso 3 assi", prezzo: 25000.00 },
        { nome: "Fisso 4 assi", prezzo: 25000.00 }
      ]
    },
    "GRU": {
      indicazioni: "Seleziona il modello di GRU.",
      opzioni: [
        { nome: "2AS Kinshofer", prezzo: 125000.00 },
        { nome: "2AS F90", prezzo: 125000.00 }
      ]
    },
    "Compattatore": {
      indicazioni: "Scegli il tipo di compattatore.",
      opzioni: [
        { nome: "Scarrabili L=4500", prezzo: 55000.00 },
        { nome: "Scarrabili L=4800", prezzo: 55000.00 },
        { nome: "Scarrabili L=6200", prezzo: 55000.00 },
        { nome: "Scarrabili L=6600", prezzo: 55000.00 },
        { nome: "Fisso L=4500", prezzo: 55000.00 },
        { nome: "Fisso L=4800", prezzo: 55000.00 },
        { nome: "Fisso L=6200", prezzo: 55000.00 },
        { nome: "Fisso L=6600", prezzo: 55000.00 }
      ]
    },
    "Lavacontenitori": {
      indicazioni: "Seleziona il sistema di lavacontenitori.",
      opzioni: [
        { nome: "2 assi", prezzo: 135315.00 },
        { nome: "2 + 1 assi", prezzo: 142120.00 },
        { nome: "3 assi", prezzo: 149380.00 },
        { nome: "4 assi", prezzo: 153120.00 }
      ]
    },
    "Accessori": {
      indicazioni: "Aggiungi accessori al tuo automezzo.",
      opzioni: [
        { nome: "PTO", prezzo: 2300.00 },
        { nome: "Tracciamento percorso", prezzo: 5000.00 },
        { nome: "Antenna UHF", prezzo: 6693.00 },
        { nome: "Impianto di sanificazione", prezzo: 4400.00 },
        { nome: "Impianto di lubrificazione", prezzo: 4850.00 },
        { nome: "Centralina oleodinamica di emergenza (GRU)", prezzo: 3492.00 },
        { nome: "Connessione remota (1Y)", prezzo: 2910.00 }
      ]
    },
    "PLUS": {
      indicazioni: "Aggiungi funzioni extra al tuo automezzo.",
      opzioni: [
        { nome: "Trasporto", prezzo: 1000.00 }
      ]
    }
  }
};

/* ----------------------------------------------
   Funzione di capitalizzazione di una stringa
----------------------------------------------- */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ----------------------------------------------
   Registrazione: gestisce il form utente
----------------------------------------------- */
document.getElementById("userForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const nome = document.getElementById("nome").value.trim();
  const cognome = document.getElementById("cognome").value.trim();
  const azienda = document.getElementById("azienda").value.trim();
  const discountCode = document.getElementById("discountCode").value.trim();

  if (!nome || !cognome || !azienda || !discountCode) {
    showWarningModal("Per favore, compila tutti i campi.");
    return;
  }

  try {
    // Chiamata reale al server per verificare il codice sconto
    const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/validate-code', { // Endpoint corretto
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: discountCode })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Errore nella verifica del codice sconto.');
    }

    const customerData = await response.json();

    // Aggiorna l'oggetto configurazione con i dati del cliente
    configurazione.userInfo = { nome, cognome, azienda };
    configurazione.customer = {
      code: customerData.code,
      name: customerData.name,
      discounts: customerData.discounts, // Sconti per categoria
      extra_discount: customerData.extra_discount || { active: false, type: null, value: 0 },
      usage_limit: customerData.usage_limit,
      is_active: customerData.is_active,
      usage_count: customerData.usage_count
    };
    configurazione.selections = {};
    configurazione.prezzoTotale = 0;
    configurazione.scontoExtra = 0;
    configurazione.prezzoTotaleScontato = 0;

    document.getElementById("registration").style.display = "none";
    document.getElementById("configurator").style.display = "block";
    showStep("AUTOMEZZI");
  } catch (error) {
    console.error(error);
    showWarningModal(`Errore: ${error.message}`);
  }
});

/* ----------------------------------------------
   Navigazione tra i vari step del configuratore
----------------------------------------------- */
function showStep(step) {
  const configuratorDiv = document.getElementById("configurator");
  configuratorDiv.innerHTML = "";

  configurazione.currentStep = step; // Setta il passo corrente

  function avantiButton(nextStep) {
    return `<button onclick="validateAndNextStep('${nextStep}')">Avanti <i class="fas fa-arrow-right"></i></button>`;
  }

  switch (step) {
    case "AUTOMEZZI":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-truck"></i> Seleziona l'Automezzo</h2>
        <p>${configurazione.data.categorie["AUTOMEZZI"].indicazioni}</p>
        <select id="automezziCategoria">
          <option value="">-- Seleziona Categoria --</option>
          ${configurazione.data.categorie["AUTOMEZZI"].opzioni
            .map((opzione) => `<option value="${opzione.nome}">${opzione.nome}</option>`) // Rimosso il prezzo
            .join("")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          ${avantiButton("Allestimento")}
        </div>
      `;

      document
        .getElementById("automezziCategoria")
        .addEventListener("change", function () {
          const selectedOpzione = configurazione.data.categorie["AUTOMEZZI"].opzioni.find(op => op.nome === this.value);
          if (selectedOpzione) {
            // Applica lo sconto per la categoria AUTOMEZZI se disponibile
            const categoria = "AUTOMEZZI";
            const scontoCategoria = configurazione.customer.discounts[categoria] || 0;
            const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

            configurazione.selections["AUTOMEZZI"] = {
              nome: selectedOpzione.nome,
              prezzo: parseFloat(prezzoScontato.toFixed(2)),
              sconto: scontoCategoria
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`; // Rimosso la percentuale di sconto
          } else {
            delete configurazione.selections["AUTOMEZZI"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          // Aggiorna prezzo parziale (no sconto quantità né sconto extra)
          aggiornaPrezzo(false);
        });
      break;

    case "Allestimento":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-tools"></i> Seleziona Allestimento</h2>
        <p>${configurazione.data.categorie["Allestimento"].indicazioni}</p>
        <select id="allestimentoCategoria">
          <option value="">-- Seleziona Allestimento --</option>
          ${configurazione.data.categorie["Allestimento"].opzioni
            .map((opzione) => `<option value="${opzione.nome}">${opzione.nome}</option>`) // Rimosso il prezzo
            .join("")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('AUTOMEZZI')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("GRU")}
        </div>
      `;

      document
        .getElementById("allestimentoCategoria")
        .addEventListener("change", function () {
          const selectedOpzione = configurazione.data.categorie["Allestimento"].opzioni.find(op => op.nome === this.value);
          if (selectedOpzione) {
            // Applica lo sconto per la categoria Allestimento se disponibile
            const categoria = "Allestimento";
            const scontoCategoria = configurazione.customer.discounts[categoria] || 0;
            const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

            configurazione.selections["Allestimento"] = {
              nome: selectedOpzione.nome,
              prezzo: parseFloat(prezzoScontato.toFixed(2)),
              sconto: scontoCategoria
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`; // Rimosso la percentuale di sconto
          } else {
            delete configurazione.selections["Allestimento"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          // Aggiorna prezzo parziale
          aggiornaPrezzo(false);
        });
      break;

    case "GRU":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-crane"></i> Seleziona la GRU</h2>
        <p>${configurazione.data.categorie["GRU"].indicazioni}</p>
        <select id="gruCategoria">
          <option value="">-- Seleziona GRU --</option>
          ${configurazione.data.categorie["GRU"].opzioni
            .map((opzione) => `<option value="${opzione.nome}">${opzione.nome}</option>`) // Rimosso il prezzo
            .join("")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('Allestimento')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("Compattatore")}
        </div>
      `;

      document
        .getElementById("gruCategoria")
        .addEventListener("change", function () {
          const selectedOpzione = configurazione.data.categorie["GRU"].opzioni.find(op => op.nome === this.value);
          if (selectedOpzione) {
            // Applica lo sconto per la categoria GRU se disponibile
            const categoria = "GRU";
            const scontoCategoria = configurazione.customer.discounts[categoria] || 0;
            const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

            configurazione.selections["GRU"] = {
              nome: selectedOpzione.nome,
              prezzo: parseFloat(prezzoScontato.toFixed(2)),
              sconto: scontoCategoria
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`; // Rimosso la percentuale di sconto
          } else {
            delete configurazione.selections["GRU"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          // Aggiorna prezzo parziale
          aggiornaPrezzo(false);
        });
      break;

    case "Compattatore":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-trash"></i> Seleziona Compattatore</h2>
        <p>${configurazione.data.categorie["Compattatore"].indicazioni}</p>
        <select id="compattatoreCategoria">
          <option value="">-- Seleziona Compattatore --</option>
          ${configurazione.data.categorie["Compattatore"].opzioni
            .map((opzione) => `<option value="${opzione.nome}">${opzione.nome}</option>`) // Rimosso il prezzo
            .join("")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('GRU')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("Lavacontenitori")}
        </div>
      `;

      document
        .getElementById("compattatoreCategoria")
        .addEventListener("change", function () {
          const selectedOpzione = configurazione.data.categorie["Compattatore"].opzioni.find(op => op.nome === this.value);
          if (selectedOpzione) {
            // Applica lo sconto per la categoria Compattatore se disponibile
            const categoria = "Compattatore";
            const scontoCategoria = configurazione.customer.discounts[categoria] || 0;
            const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

            configurazione.selections["Compattatore"] = {
              nome: selectedOpzione.nome,
              prezzo: parseFloat(prezzoScontato.toFixed(2)),
              sconto: scontoCategoria
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`; // Rimosso la percentuale di sconto
          } else {
            delete configurazione.selections["Compattatore"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          // Aggiorna prezzo parziale
          aggiornaPrezzo(false);
        });
      break;

    case "Lavacontenitori":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-washer"></i> Seleziona Lavacontenitori</h2>
        <p>${configurazione.data.categorie["Lavacontenitori"].indicazioni}</p>
        <select id="lavacontenitoriCategoria">
          <option value="">-- Seleziona Lavacontenitori --</option>
          ${configurazione.data.categorie["Lavacontenitori"].opzioni
            .map((opzione) => `<option value="${opzione.nome}">${opzione.nome}</option>`) // Rimosso il prezzo
            .join("")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('Compattatore')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("Accessori")}
        </div>
      `;

      document
        .getElementById("lavacontenitoriCategoria")
        .addEventListener("change", function () {
          const selectedOpzione = configurazione.data.categorie["Lavacontenitori"].opzioni.find(op => op.nome === this.value);
          if (selectedOpzione) {
            // Applica lo sconto per la categoria Lavacontenitori se disponibile
            const categoria = "Lavacontenitori";
            const scontoCategoria = configurazione.customer.discounts[categoria] || 0;
            const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

            configurazione.selections["Lavacontenitori"] = {
              nome: selectedOpzione.nome,
              prezzo: parseFloat(prezzoScontato.toFixed(2)),
              sconto: scontoCategoria
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`; // Rimosso la percentuale di sconto
          } else {
            delete configurazione.selections["Lavacontenitori"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          // Aggiorna prezzo parziale
          aggiornaPrezzo(false);
        });
      break;

    case "Accessori":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-cogs"></i> Seleziona Accessori</h2>
        <p>${configurazione.data.categorie["Accessori"].indicazioni}</p>
        <select id="accessoriCategoria">
          <option value="">-- Seleziona Accessorio --</option>
          ${configurazione.data.categorie["Accessori"].opzioni
            .map((opzione) => `<option value="${opzione.nome}">${opzione.nome}</option>`) // Rimosso il prezzo
            .join("")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('Lavacontenitori')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("PLUS")}
        </div>
      `;

      document
        .getElementById("accessoriCategoria")
        .addEventListener("change", function () {
          const selectedOpzione = configurazione.data.categorie["Accessori"].opzioni.find(op => op.nome === this.value);
          if (selectedOpzione) {
            // Applica lo sconto per la categoria Accessori se disponibile
            const categoria = "Accessori";
            const scontoCategoria = configurazione.customer.discounts[categoria] || 0;
            const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

            configurazione.selections["Accessori"] = {
              nome: selectedOpzione.nome,
              prezzo: parseFloat(prezzoScontato.toFixed(2)),
              sconto: scontoCategoria
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`; // Rimosso la percentuale di sconto
          } else {
            delete configurazione.selections["Accessori"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          // Aggiorna prezzo parziale
          aggiornaPrezzo(false);
        });
      break;

    case "PLUS":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-plus-circle"></i> Seleziona PLUS</h2>
        <p>${configurazione.data.categorie["PLUS"].indicazioni}</p>
        <select id="plusCategoria">
          <option value="">-- Seleziona PLUS --</option>
          ${configurazione.data.categorie["PLUS"].opzioni
            .map((opzione) => `<option value="${opzione.nome}">${opzione.nome}</option>`) // Rimosso il prezzo
            .join("")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('Accessori')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("resoconto")}
        </div>
      `;

      document
        .getElementById("plusCategoria")
        .addEventListener("change", function () {
          const selectedOpzione = configurazione.data.categorie["PLUS"].opzioni.find(op => op.nome === this.value);
          if (selectedOpzione) {
            // Applica lo sconto per la categoria PLUS se disponibile
            const categoria = "PLUS";
            const scontoCategoria = configurazione.customer.discounts[categoria] || 0;
            const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

            configurazione.selections["PLUS"] = {
              nome: selectedOpzione.nome,
              prezzo: parseFloat(prezzoScontato.toFixed(2)),
              sconto: scontoCategoria
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`; // Rimosso la percentuale di sconto
          } else {
            delete configurazione.selections["PLUS"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          // Aggiorna prezzo parziale
          aggiornaPrezzo(false);
        });
      break;

    case "resoconto":
      mostraResoconto();
      return;

    default:
      configuratorDiv.innerHTML = "<p>Step non riconosciuto.</p>";
      break;
  }
}

/* ----------------------------------------------
   Passi successivi e precedenti
----------------------------------------------- */
function validateAndNextStep(nextStepName) {
  const stepCorrente = configurazione.currentStep;

  // Definisci le categorie per le quali mostrare il messaggio di avviso
  const stepsConValidazione = ["AUTOMEZZI", "Allestimento", "GRU", "Compattatore", "Lavacontenitori", "Accessori", "PLUS"];

  if (stepsConValidazione.includes(stepCorrente)) {
    if (!configurazione.selections[stepCorrente]) {
      // Converti la prima lettera della categoria in maiuscolo per il messaggio
      const categoriaFormattata = capitalize(stepCorrente.toLowerCase());
      showWarningModal(`Per continuare devi selezionare un ${categoriaFormattata}!`);
      return;
    }
  }

  // Per le altre categorie, non mostrare il messaggio e procedi normalmente
  showStep(nextStepName);
}

function prevStep(prevStepName) {
  // **Nuova Modifica: Resetta la selezione del passaggio precedente**
  // Questo assicura che l'utente debba effettuare una nuova selezione prima di poter procedere
  if (configurazione.selections[prevStepName]) {
    delete configurazione.selections[prevStepName];
  }
  showStep(prevStepName);
}

/* ----------------------------------------------
   Aggiorna il prezzo
   isFinal = false => no sconto quantità, no sconto extra
   isFinal = true  => sconto extra
----------------------------------------------- */
function aggiornaPrezzo(isFinal) {
  let prezzoUnitario = 0;

  // Somma dei prezzi delle selezioni
  for (let categoria in configurazione.selections) {
    prezzoUnitario += configurazione.selections[categoria].prezzo || 0;
  }

  if (!isFinal) {
    // Calcolo "parziale" (1 pezzo, no sconto extra)
    configurazione.prezzoTotale = prezzoUnitario;
    configurazione.prezzoTotaleScontato = prezzoUnitario;
  } else {
    // Calcolo finale con la quantità effettiva
    configurazione.prezzoTotale = prezzoUnitario * configurazione.quantità;

    // Sconto extra
    if (configurazione.customer.extra_discount && configurazione.customer.extra_discount.active) {
      const extra = configurazione.customer.extra_discount;
      if (extra.type === "percentuale") {
        configurazione.scontoExtra = configurazione.prezzoTotale * (extra.value / 100);
      } else if (extra.type === "fisso") {
        configurazione.scontoExtra = extra.value;
      }
      configurazione.prezzoTotaleScontato = configurazione.prezzoTotale - configurazione.scontoExtra;
    } else {
      configurazione.scontoExtra = 0;
      configurazione.prezzoTotaleScontato = configurazione.prezzoTotale;
    }
  }

  // Aggiorna i .prezzo-totale (se presenti)
  const configuratorDiv = document.getElementById("configurator");
  const totElems = configuratorDiv.querySelectorAll(".prezzo-totale");
  totElems.forEach((el) => {
    el.textContent = formatCurrency(configurazione.prezzoTotaleScontato);
  });
}

/* ----------------------------------------------
   Schermata di Resoconto
----------------------------------------------- */
function mostraResoconto() {
  const configuratorDiv = document.getElementById("configurator");
  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-list-alt"></i> Riepilogo Selezioni</h2>
    <ul id="riepilogoSelezioni"></ul>

    <!-- Sezione Quantità -->
    <div style="margin: 20px 0;">
      <label for="quantitaInput"><strong>Quantità:</strong></label>
      <input type="number" id="quantitaInput" min="1" value="1" />
      <button id="confermaQuantitaBtn" class="invia">
        Conferma Quantità
      </button>
      <button id="modificaQuantitaBtn" class="modifica_quantita" style="display: none;">
        Modifica Quantità
      </button>
    </div>

    <!-- Sezione prezzi finale (inizialmente vuota) -->
    <div id="dettagliPrezzoFinale" style="margin-bottom: 20px;"></div>

    <!-- Pulsante Invia Ordine (inizialmente disabilitato) -->
    <button class="invia" id="inviaOrdineBtn" disabled>
      Invia Ordine <i class="fas fa-check"></i>
    </button>
  `;

  // Riempi la lista delle selezioni
  const ul = document.getElementById("riepilogoSelezioni");
  for (let categoria in configurazione.selections) {
    const sel = configurazione.selections[categoria];
    ul.innerHTML += `
      <li>
        <div>
          <strong>${capitalize(categoria)}</strong>:
          ${sel.nome} - ${formatCurrency(sel.prezzo)} (${sel.sconto}% di sconto)
        </div>
        <button class="modifica" onclick="modificaSelezione('${categoria}')">Modifica</button>
      </li>
    `;
  }

  // Mostriamo il prezzo "parziale" per default
  aggiornaPrezzo(false);

  // Riferimenti ai vari elementi
  const quantitaInput = document.getElementById("quantitaInput");
  const confermaQuantitaBtn = document.getElementById("confermaQuantitaBtn");
  const modificaQuantitaBtn = document.getElementById("modificaQuantitaBtn");
  const dettagliPrezzoFinale = document.getElementById("dettagliPrezzoFinale");
  const inviaOrdineBtn = document.getElementById("inviaOrdineBtn");

  // Quando clicca su "Conferma Quantità":
  confermaQuantitaBtn.addEventListener("click", async () => {
    const q = parseInt(quantitaInput.value);
    if (!q || q < 1) {
      showWarningModal("Inserisci una quantità valida (>=1).");
      return;
    }
    configurazione.quantità = q;
    aggiornaPrezzo(true);

    // Mostriamo i dettagli dei prezzi finali
    const {
      prezzoTotale,
      scontoExtra,
      prezzoTotaleScontato
    } = configurazione;

    let htmlPrezzi = `
      <p><strong>Prezzo Totale (${q} pz):</strong> ${formatCurrency(prezzoTotale)}</p>
    `;
    if (configurazione.customer.extra_discount && configurazione.customer.extra_discount.active && scontoExtra > 0) {
      const extra = configurazione.customer.extra_discount;
      if (extra.type === "percentuale") {
        htmlPrezzi += `
          <p>Sconto Extra: -${extra.value}% (${formatCurrency(scontoExtra)})</p>
        `;
      } else if (extra.type === "fisso") {
        htmlPrezzi += `<p>Sconto Extra: -${formatCurrency(scontoExtra)}</p>`;
      }
    }
    htmlPrezzi += `
      <p><strong>Prezzo Totale Scontato:</strong> ${formatCurrency(prezzoTotaleScontato)}</p>
    `;

    dettagliPrezzoFinale.innerHTML = htmlPrezzi;

    // Abilita il pulsante "Invia Ordine"
    inviaOrdineBtn.disabled = false;

    // Disabilita input e bottone per evitare modifiche successive
    quantitaInput.disabled = true;
    confermaQuantitaBtn.disabled = true;

    // Mostra il pulsante "Modifica Quantità"
    modificaQuantitaBtn.style.display = "inline-block";
  });

  // Quando l'utente clicca su "Modifica Quantità"
  modificaQuantitaBtn.addEventListener("click", () => {
    // Abilita l'input della quantità
    quantitaInput.disabled = false;
    // Disabilita il pulsante "Invia Ordine"
    inviaOrdineBtn.disabled = true;
    // Riabilita il pulsante "Conferma Quantità"
    confermaQuantitaBtn.disabled = false;
    // Nascondi il pulsante "Modifica Quantità"
    modificaQuantitaBtn.style.display = "none";
    // Rimuovi i dettagli del prezzo finale
    dettagliPrezzoFinale.innerHTML = "";
  });

  // Quando l'utente clicca su "Invia Ordine"
  inviaOrdineBtn.addEventListener("click", async () => {
    // Procedi con l'invio dell'ordine
    await inviaConfigurazione();
  });
}

/* ----------------------------------------------
   Funzione modificaSelezione: permette di modificare una selezione specifica
----------------------------------------------- */
function modificaSelezione(categoria) {
  const step = stepMap[categoria];
  if (step) {
    showStep(step);
  } else {
    alert("Passo non trovato per la modifica.");
  }
}

/* ----------------------------------------------
   Invia la configurazione: genera PDF + mailto + aggiorna uso del codice sconto
----------------------------------------------- */
async function inviaConfigurazione() {
  const doc = new jsPDF();
  const logoURL = "Logo.jpg"; // Assicurati che il percorso sia corretto

  try {
    const img = new Image();
    img.src = logoURL;
    img.onload = async function () {
      doc.addImage(img, "JPEG", 10, 10, 50, 20);
      doc.setFontSize(20);
      doc.text("Configurazione Mezzo", 105, 40, null, null, "center");

      // Dati utente
      doc.setFontSize(12);
      doc.text(`Nome: ${configurazione.userInfo.nome}`, 20, 50);
      doc.text(`Cognome: ${configurazione.userInfo.cognome}`, 20, 60);
      doc.text(`Azienda: ${configurazione.userInfo.azienda}`, 20, 70);
      doc.text(`Quantità: ${configurazione.quantità}`, 20, 80);

      // Selezioni
      doc.setFontSize(16);
      doc.text("Selezioni:", 20, 95);
      doc.setFontSize(12);

      let y = 105;
      for (let categoria in configurazione.selections) {
        const sel = configurazione.selections[categoria];
        doc.text(
          `${capitalize(categoria)}: ${sel.nome} - ${formatCurrency(sel.prezzo)} (${sel.sconto}% di sconto)`,
          20,
          y
        );
        y += 10;
      }

      // Sconti finali
      if (
        configurazione.customer.extra_discount &&
        configurazione.customer.extra_discount.active &&
        configurazione.scontoExtra > 0
      ) {
        if (configurazione.customer.extra_discount.type === "percentuale") {
          doc.text(
            `Sconto Extra: -${configurazione.customer.extra_discount.value}% (${formatCurrency(configurazione.scontoExtra)})`,
            20,
            y
          );
        } else if (configurazione.customer.extra_discount.type === "fisso") {
          doc.text(
            `Sconto Extra: -${formatCurrency(configurazione.scontoExtra)}`,
            20,
            y
          );
        }
        y += 10;
      }

      doc.setFontSize(14);
      doc.text(
        `Prezzo Totale Scontato: ${formatCurrency(configurazione.prezzoTotaleScontato)}`,
        20,
        y + 10
      );

      // Salva PDF
      doc.save("resoconto_mezzo.pdf");

      // Aggiorna l'uso del codice sconto sul server
      try {
        const updateResponse = await fetch('https://configuratore-2-0.onrender.com/api/customers/update-usage', { // Endpoint corretto
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ code: configurazione.customer.code })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.message || 'Errore nell\'aggiornamento dell\'uso del codice sconto.');
        }

        console.log('Uso del codice sconto aggiornato con successo.');
      } catch (error) {
        console.error(error);
        showWarningModal(`Errore: ${error.message}`);
        return;
      }

      // Prepara il mailto
      const toEmail = "tuo.email@esempio.com"; // Sostituisci con la tua email
      const subject = encodeURIComponent("Nuova Configurazione Mezzo");

      let body = `Nome: ${configurazione.userInfo.nome}\nCognome: ${configurazione.userInfo.cognome}\nAzienda: ${configurazione.userInfo.azienda}\nQuantità: ${configurazione.quantità}\n\nSelezioni:\n`;

      for (let categoria in configurazione.selections) {
        const sel = configurazione.selections[categoria];
        body += `${capitalize(categoria)}: ${sel.nome} - ${formatCurrency(sel.prezzo)} (${sel.sconto}% di sconto)\n`;
      }

      if (
        configurazione.customer.extra_discount &&
        configurazione.customer.extra_discount.active &&
        configurazione.scontoExtra > 0
      ) {
        if (configurazione.customer.extra_discount.type === "percentuale") {
          body += `\nSconto Extra: -${configurazione.customer.extra_discount.value}% (${formatCurrency(configurazione.scontoExtra)})`;
        } else if (configurazione.customer.extra_discount.type === "fisso") {
          body += `\nSconto Extra: -${formatCurrency(configurazione.scontoExtra)}`;
        }
      }
      body += `\nPrezzo Totale Scontato: ${formatCurrency(configurazione.prezzoTotaleScontato)}`;

      const encodedBody = encodeURIComponent(body);
      const mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${encodedBody}`;
      const emailLink = document.getElementById("emailLink");
      if (emailLink) {
        emailLink.href = mailtoLink;
        emailLink.click(); // Avvia l'email client
      } else {
        // Se l'elemento non esiste, apri direttamente il mailto
        window.location.href = mailtoLink;
      }

      openModal();
    };
    img.onerror = function () {
      showWarningModal("Errore nel caricamento del logo.");
    };
  } catch (error) {
    console.error("Errore durante la generazione del PDF:", error);
    showWarningModal("Errore durante la generazione del PDF.");
  }
}

/* ----------------------------------------------
   MODALS per avvisi e successi
----------------------------------------------- */
function showWarningModal(message) {
  const warningModal = document.getElementById("warningModal");
  const warningMessageText = document.getElementById("warningMessageText");
  if (warningMessageText) {
    warningMessageText.textContent = message;
  }
  if (warningModal) {
    warningModal.style.display = "block";
  }
}

function closeWarningModal() {
  const warningModal = document.getElementById("warningModal");
  if (warningModal) {
    warningModal.style.display = "none";
  }
}

function openModal() {
  const modal = document.getElementById("messageModal");
  if (modal) {
    modal.style.display = "block";
  }
}

function closeModal() {
  const modal = document.getElementById("messageModal");
  if (modal) {
    modal.style.display = "none";
  }
}

/* ----------------------------------------------
   Event Listener per chiudere i Modal cliccando fuori
----------------------------------------------- */
window.onclick = function(event) {
  const warningModal = document.getElementById("warningModal");
  const messageModal = document.getElementById("messageModal");
  if (warningModal && event.target === warningModal) {
    warningModal.style.display = 'none';
  }
  if (messageModal && event.target === messageModal) {
    messageModal.style.display = 'none';
  }
}
