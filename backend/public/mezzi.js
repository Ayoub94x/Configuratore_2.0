// mezzi.js

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
 * Funzione per capitalizzare la prima lettera di una stringa
 * @param {string} str - La stringa da capitalizzare
 * @returns {string} - La stringa con la prima lettera maiuscola
 */
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Mappa dei passaggi (categorie) usata per la navigazione
 * e per la modifica delle selezioni.
 */
const stepMap = {
  "AUTOMEZZI": "AUTOMEZZI",
  "Allestimento": "Allestimento",
  "ROBOT": "ROBOT",
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
  quantità: 1,                    // Quantità selezionata
  isModifying: false             // Stato di modifica
};

// URL del backend
const API_URL = 'http://localhost:10000/api';

/**
 * Carica le configurazioni dei mezzi dal backend
 */
async function loadMezziData() {
  try {
    const response = await fetch(`${API_URL}/mezzi`);
    if (!response.ok) {
      throw new Error('Errore nel recupero dei dati dei mezzi.');
    }
    const data = await response.json();
    return data[0]; // Assumiamo un solo documento
  } catch (error) {
    showWarningModal('Errore nel caricamento dei dati dei mezzi.');
    console.error(error);
    return null;
  }
}

/**
 * Mostra un modal di avviso (implementa questa funzione secondo le tue esigenze)
 * @param {string} message - Il messaggio da mostrare
 */
function showWarningModal(message) {
  // Implementa la logica per mostrare un modal di avviso
  alert(`⚠️ ${message}`);
}

/**
 * Mostra un modal di successo (implementa questa funzione secondo le tue esigenze)
 * @param {string} message - Il messaggio da mostrare
 */
function showSuccessModal(message) {
  // Implementa la logica per mostrare un modal di successo
  alert(`✅ ${message}`);
}

/**
 * Caricamento delle configurazioni e avvio del configuratore
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Aggiungi Event Listener per il form di login
  const userForm = document.getElementById("userForm");
  if (userForm) {
    userForm.addEventListener("submit", async function (e) {
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
        const response = await fetch(`${API_URL}/customers/validate-code`, { // Assicurati che questa rotta sia implementata
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

        // Carica i dati dei mezzi
        const mezziData = await loadMezziData();
        if (!mezziData) throw new Error('Dati dei mezzi non disponibili.');

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
        configurazione.data = mezziData;
        configurazione.selections = {};
        configurazione.prezzoTotale = 0;
        configurazione.scontoExtra = 0;
        configurazione.prezzoTotaleScontato = 0;

        // Nascondi il form di registrazione e mostra il configuratore
        document.getElementById("registration").style.display = "none";
        document.getElementById("configurator").style.display = "block";
        showStep("AUTOMEZZI");
      } catch (error) {
        console.error(error);
        showWarningModal(`Errore: ${error.message}`);
      }
    });
  }
});

/**
 * Funzione per mostrare un determinato step
 * @param {string} stepName - Il nome dello step da mostrare
 */
function showStep(stepName) {
  const configuratorDiv = document.getElementById("configurator");
  configuratorDiv.innerHTML = ""; // Reset del contenuto

  switch (stepName) {
    case "AUTOMEZZI":
      configuratoreAutomezzi();
      break;
    case "Allestimento":
      configuratoreAllestimento();
      break;
    case "ROBOT":
      configuratoreRobot();
      break;
    case "Compattatore":
      configuratoreCompattatore();
      break;
    case "Lavacontenitori":
      configuratoreLavacontenitori();
      break;
    case "Accessori":
      configuratoreAccessori();
      break;
    case "PLUS":
      configuratorePlus();
      break;
    case "resoconto":
      mostraResoconto();
      return;
    default:
      configuratorDiv.innerHTML = "<p>Step non riconosciuto.</p>";
      break;
  }
}

/**
 * Funzione per configurare AUTOMEZZI
 */
function configuratoreAutomezzi() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "AUTOMEZZI";

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-truck"></i> Seleziona Automezzo</h2>
    <p>${categoriaData.indicazioni}</p>
    <select id="automezziCategoria">
      <option value="">-- Seleziona Automezzo --</option>
      ${categoriaData.opzioni
        .map(opzione => `<option value="${opzione.nome}">${opzione.nome}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep()" disabled>
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('Allestimento')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("automezziCategoria").addEventListener("change", function () {
    const selectedOpzione = categoriaData.opzioni.find(op => op.nome === this.value);
    if (selectedOpzione) {
      // Applica lo sconto per la categoria AUTOMEZZI se disponibile
      const scontoCategoria = configurazione.customer.discounts.AUTOMEZZI || 0;
      const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

      configurazione.selections["AUTOMEZZI"] = {
        nome: selectedOpzione.nome,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["AUTOMEZZI"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

/**
 * Funzione per configurare Allestimento
 */
function configuratoreAllestimento() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "Allestimento";

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-tools"></i> Seleziona Allestimento</h2>
    <p>${categoriaData.indicazioni}</p>
    <select id="allestimentoCategoria">
      <option value="">-- Seleziona Allestimento --</option>
      ${categoriaData.opzioni
        .map(opzione => `<option value="${opzione.nome}">${opzione.nome}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep()" class="btn-secondary">
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('ROBOT')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("allestimentoCategoria").addEventListener("change", function () {
    const selectedOpzione = categoriaData.opzioni.find(op => op.nome === this.value);
    if (selectedOpzione) {
      // Applica lo sconto per la categoria Allestimento se disponibile
      const scontoCategoria = configurazione.customer.discounts.Allestimento || 0;
      const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

      configurazione.selections["Allestimento"] = {
        nome: selectedOpzione.nome,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["Allestimento"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

/**
 * Funzione per configurare ROBOT
 */
function configuratoreRobot() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "ROBOT";

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-robot"></i> Seleziona Robot</h2>
    <p>${categoriaData.indicazioni}</p>
    <select id="robotCategoria">
      <option value="">-- Seleziona Robot --</option>
      ${categoriaData.opzioni
        .map(opzione => `<option value="${opzione.nome}">${opzione.nome}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep()" class="btn-secondary">
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('Compattatore')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("robotCategoria").addEventListener("change", function () {
    const selectedOpzione = categoriaData.opzioni.find(op => op.nome === this.value);
    if (selectedOpzione) {
      // Applica lo sconto per la categoria ROBOT se disponibile
      const scontoCategoria = configurazione.customer.discounts.ROBOT || 0;
      const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

      configurazione.selections["ROBOT"] = {
        nome: selectedOpzione.nome,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["ROBOT"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

/**
 * Funzione per configurare Compattatore
 */
function configuratoreCompattatore() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "Compattatore";

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-compress-arrows-alt"></i> Seleziona Compattatore</h2>
    <p>${categoriaData.indicazioni}</p>
    <select id="compattatoreCategoria">
      <option value="">-- Seleziona Compattatore --</option>
      ${categoriaData.opzioni
        .map(opzione => `<option value="${opzione.nome}">${opzione.nome}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep()" class="btn-secondary">
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('Lavacontenitori')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("compattatoreCategoria").addEventListener("change", function () {
    const selectedOpzione = categoriaData.opzioni.find(op => op.nome === this.value);
    if (selectedOpzione) {
      // Applica lo sconto per la categoria Compattatore se disponibile
      const scontoCategoria = configurazione.customer.discounts.Compattatore || 0;
      const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

      configurazione.selections["Compattatore"] = {
        nome: selectedOpzione.nome,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["Compattatore"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

/**
 * Funzione per configurare Lavacontenitori
 */
function configuratoreLavacontenitori() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "Lavacontenitori";

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-shower"></i> Seleziona Lavacontenitori</h2>
    <p>${categoriaData.indicazioni}</p>
    <select id="lavacontenitoriCategoria">
      <option value="">-- Seleziona Lavacontenitori --</option>
      ${categoriaData.opzioni
        .map(opzione => `<option value="${opzione.nome}">${opzione.nome}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep()" class="btn-secondary">
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('Accessori')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("lavacontenitoriCategoria").addEventListener("change", function () {
    const selectedOpzione = categoriaData.opzioni.find(op => op.nome === this.value);
    if (selectedOpzione) {
      // Applica lo sconto per la categoria Lavacontenitori se disponibile
      const scontoCategoria = configurazione.customer.discounts.Lavacontenitori || 0;
      const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

      configurazione.selections["Lavacontenitori"] = {
        nome: selectedOpzione.nome,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["Lavacontenitori"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

/**
 * Funzione per configurare Accessori
 */
function configuratoreAccessori() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "Accessori";

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-cogs"></i> Seleziona Accessori</h2>
    <p>${categoriaData.indicazioni}</p>
    <select id="accessoriCategoria">
      <option value="">-- Seleziona Accessori --</option>
      ${categoriaData.opzioni
        .map(opzione => `<option value="${opzione.nome}">${opzione.nome}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep()" class="btn-secondary">
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('PLUS')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("accessoriCategoria").addEventListener("change", function () {
    const selectedOpzione = categoriaData.opzioni.find(op => op.nome === this.value);
    if (selectedOpzione) {
      // Applica lo sconto per la categoria Accessori se disponibile
      const scontoCategoria = configurazione.customer.discounts.Accessori || 0;
      const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

      configurazione.selections["Accessori"] = {
        nome: selectedOpzione.nome,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["Accessori"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

/**
 * Funzione per configurare PLUS
 */
function configuratorePlus() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "PLUS";

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-star"></i> Seleziona PLUS</h2>
    <p>${categoriaData.indicazioni}</p>
    <select id="plusCategoria">
      <option value="">-- Seleziona PLUS --</option>
      ${categoriaData.opzioni
        .map(opzione => `<option value="${opzione.nome}">${opzione.nome}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep()" class="btn-secondary">
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('resoconto')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("plusCategoria").addEventListener("change", function () {
    const selectedOpzione = categoriaData.opzioni.find(op => op.nome === this.value);
    if (selectedOpzione) {
      // Applica lo sconto per la categoria PLUS se disponibile
      const scontoCategoria = configurazione.customer.discounts.PLUS || 0;
      const prezzoScontato = selectedOpzione.prezzo - (selectedOpzione.prezzo * scontoCategoria / 100);

      configurazione.selections["PLUS"] = {
        nome: selectedOpzione.nome,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["PLUS"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

/**
 * Funzione per navigare allo step successivo
 * @param {string} nextStepName - Il nome dello step successivo
 */
function nextStep(nextStepName) {
  // Validazione opzionale prima di passare allo step successivo
  validateAndNextStep(nextStepName);
}

/**
 * Funzione per navigare allo step precedente
 * @param {string} prevStepName - Il nome dello step precedente
 */
function prevStep() {
  // Implementa la logica per tornare allo step precedente
  // Potresti mantenere una history stack per tracciare gli step
  // Per semplicità, puoi gestire manualmente gli step
  // Ad esempio, se currentStep è "Allestimento", prevStep è "AUTOMEZZI"
  const stepsOrder = ["AUTOMEZZI", "Allestimento", "ROBOT", "Compattatore", "Lavacontenitori", "Accessori", "PLUS"];
  const currentIndex = stepsOrder.indexOf(configurazione.currentStep);
  if (currentIndex > 0) {
    const prevStepName = stepsOrder[currentIndex - 1];
    showStep(prevStepName);
  }
}

/**
 * Funzione per modificare una selezione specifica
 * @param {string} categoria - La categoria da modificare
 */
function modificaSelezione(categoria) {
  // Implementa la logica per tornare allo step della categoria da modificare
  showStep(categoria);
}

/**
 * Aggiorna il prezzo totale e il prezzo scontato
 * @param {boolean} isFinal - Se true, applica sconti extra e quantità
 */
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

/**
 * Schermata di Resoconto
 */
function mostraResoconto() {
  const configuratorDiv = document.getElementById("configurator");
  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-list-alt"></i> Riepilogo Selezioni</h2>
    <ul id="riepilogoSelezioni"></ul>

    <!-- Sezione Quantità -->
    <div style="margin: 20px 0;">
      <label for="quantitaInput"><strong>Quantità:</strong></label>
      <input type="number" id="quantitaInput" min="1" value="1" />
      <button id="confermaQuantitaBtn" class="btn-primary">
        Conferma Quantità <i class="fas fa-check"></i>
      </button>
      <button id="modificaQuantitaBtn" class="btn-primary" style="display: none;">
        Modifica Quantità <i class="fas fa-edit"></i>
      </button>
    </div>

    <!-- Sezione prezzi finale (inizialmente vuota) -->
    <div id="dettagliPrezzoFinale" style="margin-bottom: 20px;"></div>

    <!-- Pulsante Invia Ordine (inizialmente disabilitato) -->
    <button class="btn-primary" id="inviaOrdineBtn" disabled>
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
          ${sel.volume || sel.nome} - ${formatCurrency(sel.prezzo)} 
        </div>
        <button class="btn-primary" onclick="modificaSelezione('${categoria}')">Modifica <i class="fas fa-edit"></i></button>
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

/**
 * Aggiorna il prezzo totale e il prezzo scontato
 * @param {boolean} isFinal - Se true, applica sconti extra e quantità
 */
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

/**
 * Funzione di validazione e avanzamento allo step successivo
 * @param {string} nextStepName - Il nome dello step successivo
 */
function validateAndNextStep(nextStepName) {
  const stepCorrente = configurazione.currentStep;

  // Definisci le categorie per le quali mostrare il messaggio di avviso
  const stepsConValidazione = ["AUTOMEZZI", "Allestimento", "ROBOT", "Compattatore", "Lavacontenitori", "Accessori", "PLUS"];

  if (stepsConValidazione.includes(stepCorrente)) {
    if (!configurazione.selections[stepCorrente]) {
      // Converti la prima lettera della categoria in maiuscolo per il messaggio
      const categoriaFormattata = capitalize(stepCorrente);
      showWarningModal(`Per continuare devi selezionare un ${categoriaFormattata}!`);
      return;
    }
  }

  // Controlla se stiamo modificando una selezione
  if (nextStepName === "resoconto" || configurazione.isModifying) {
    showStep("resoconto");
    configurazione.isModifying = false; // Resetta lo stato di modifica
  } else {
    // Per le altre categorie, procedi normalmente
    showStep(nextStepName);
  }
}

/**
 * Schermata di Resoconto
 */
function mostraResoconto() {
  const configuratorDiv = document.getElementById("configurator");
  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-list-alt"></i> Riepilogo Selezioni</h2>
    <ul id="riepilogoSelezioni"></ul>

    <!-- Sezione Quantità -->
    <div style="margin: 20px 0;">
      <label for="quantitaInput"><strong>Quantità:</strong></label>
      <input type="number" id="quantitaInput" min="1" value="1" />
      <button id="confermaQuantitaBtn" class="btn-primary">
        Conferma Quantità <i class="fas fa-check"></i>
      </button>
      <button id="modificaQuantitaBtn" class="btn-primary" style="display: none;">
        Modifica Quantità <i class="fas fa-edit"></i>
      </button>
    </div>

    <!-- Sezione prezzi finale (inizialmente vuota) -->
    <div id="dettagliPrezzoFinale" style="margin-bottom: 20px;"></div>

    <!-- Pulsante Invia Ordine (inizialmente disabilitato) -->
    <button class="btn-primary" id="inviaOrdineBtn" disabled>
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
          ${sel.volume || sel.nome} - ${formatCurrency(sel.prezzo)} 
        </div>
        <button class="btn-primary" onclick="modificaSelezione('${categoria}')">Modifica <i class="fas fa-edit"></i></button>
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

/**
 * Funzione per inviare la configurazione (generare PDF, inviare email, aggiornare uso del codice sconto)
 */
async function inviaConfigurazione() {
  const doc = new jsPDF();
  const logoURL = "Logo.jpg"; // Assicurati che il percorso sia corretto

  try {
    const img = new Image();
    img.src = logoURL;
    img.onload = async function () {
      doc.addImage(img, "JPEG", 10, 10, 50, 20);
      doc.setFontSize(20);
      doc.text("Configurazione Contenitore", 105, 40, null, null, "center");

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
          `${capitalize(categoria)}: ${sel.volume || sel.nome} - ${formatCurrency(sel.prezzo)}`,
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
      doc.save("resoconto_contenitore.pdf");

      // Aggiorna l'uso del codice sconto sul server
      try {
        const updateResponse = await fetch(`${API_URL}/customers/update-usage`, { 
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
      const toEmail = "tuoindirizzo@esempio.com"; // Sostituisci con la tua email
      const subject = encodeURIComponent("Nuova Configurazione Contenitore");

      let body = `Nome: ${configurazione.userInfo.nome}\nCognome: ${configurazione.userInfo.cognome}\nAzienda: ${configurazione.userInfo.azienda}\nQuantità: ${configurazione.quantità}\n\nSelezioni:\n`;

      for (let categoria in configurazione.selections) {
        const sel = configurazione.selections[categoria];
        body += `${capitalize(categoria)}: ${sel.volume || sel.nome} - ${formatCurrency(sel.prezzo)}\n`;
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

      showSuccessModal('Il tuo ordine è stato inviato con successo!');
    };
    img.onerror = function () {
      showWarningModal("Errore nel caricamento del logo.");
    };
  } catch (error) {
    console.error("Errore durante la generazione del PDF:", error);
    showWarningModal("Errore durante la generazione del PDF.");
  }
}

/**
 * Passi successivi e precedenti
 */
function validateAndNextStep(nextStepName) {
  const stepCorrente = configurazione.currentStep;

  // Definisci le categorie per le quali mostrare il messaggio di avviso
  const stepsConValidazione = ["AUTOMEZZI", "Allestimento", "ROBOT", "Compattatore", "Lavacontenitori", "Accessori", "PLUS"];

  if (stepsConValidazione.includes(stepCorrente)) {
    if (!configurazione.selections[stepCorrente]) {
      // Converti la prima lettera della categoria in maiuscolo per il messaggio
      const categoriaFormattata = capitalize(stepCorrente);
      showWarningModal(`Per continuare devi selezionare un ${categoriaFormattata}!`);
      return;
    }
  }

  // Controlla se stiamo modificando una selezione
  if (nextStepName === "resoconto" || configurazione.isModifying) {
    showStep("resoconto");
    configurazione.isModifying = false; // Resetta lo stato di modifica
  } else {
    // Per le altre categorie, procedi normalmente
    showStep(nextStepName);
  }
}

function prevStep() {
  // Implementa la logica per tornare allo step precedente
  // Potresti mantenere una history stack per tracciare gli step
  // Per semplicità, puoi gestire manualmente gli step
  const stepsOrder = ["AUTOMEZZI", "Allestimento", "ROBOT", "Compattatore", "Lavacontenitori", "Accessori", "PLUS"];
  const currentIndex = stepsOrder.indexOf(configurazione.currentStep);
  if (currentIndex > 0) {
    const prevStepName = stepsOrder[currentIndex - 1];
    showStep(prevStepName);
  }
}

/**
 * Funzione modificaSelezione: permette di modificare una selezione specifica
 */
function modificaSelezione(categoria) {
  // Implementa la logica per tornare allo step della categoria da modificare
  showStep(categoria);
}
