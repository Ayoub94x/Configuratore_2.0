// public/js/contenitori.js

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
  "corpo_contenitore": "contenitore",
  "bascule": "bascule",
  "gancio": "gancio",
  "bocche": "bocche",
  "guida": "guida",
  "adesivo": "adesivo",
  "optional": "optional"
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
  data: {
    volumes: ["1750L", "2100L", "2500L", "2700L", "3000L", "3750L"],
    configurazioni: {} // Sarà popolato dinamicamente
  }
};

// Carica i prezzi dal server all'avvio
document.addEventListener('DOMContentLoaded', async () => {
  const prezzi = await fetchPrezzi();
  
  // Popola configurazione.data.configurazioni con i prezzi
  configurazione.data.configurazioni = {};

  prezzi.forEach(p => {
    configurazione.data.configurazioni[p.categoria] = p.prezzo;
  });

  // Inizializza la prima step
  showStep("contenitore");
});

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
    const response = await fetch('/api/customers/validate-code', { // Endpoint corretto
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
    showStep("contenitore");
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
    case "contenitore":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-box"></i> Seleziona il Contenitore</h2>
        <p>Scegli il volume del contenitore principale.</p>
        <select id="contenitore">
          <option value="">-- Seleziona --</option>
          ${configurazione.data.volumes
            .map((v) => `<option value="${v}">${v}</option>`)
            .join("")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          ${avantiButton("bascule")}
        </div>
      `;

      document
        .getElementById("contenitore")
        .addEventListener("change", function () {
          const volume = this.value;
          if (volume) {
            const categoria = `corpo_contenitore_${volume}`;
            const basePrice = configurazione.data.configurazioni[categoria] || 0;
            const discount = configurazione.customer.discounts["corpo_contenitore"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["corpo_contenitore"] = {
              nome: `Corpo Contenitore (${volume})`,
              prezzo: parseFloat(discountedPrice.toFixed(2))
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["corpo_contenitore"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "bascule":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-pallet"></i> Seleziona Bascule</h2>
        <p>Scegli tra bascule in ferro o HDPE.</p>
        <select id="bascule">
          <option value="">-- Seleziona --</option>
          <option value="bascule_ferro">Bascule Ferro</option>
          <option value="bascule_hdpe">Bascule HDPE</option>
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('contenitore')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("gancio")}
        </div>
      `;
      document
        .getElementById("bascule")
        .addEventListener("change", function () {
          const basculeType = this.value;
          if (basculeType && configurazione.selections["corpo_contenitore"]) {
            const volume = getSelectedVolume();
            const categoria = `${basculeType}_${volume}`;
            const basePrice = configurazione.data.configurazioni[categoria] || 0;
            const discount = configurazione.customer.discounts["bascule"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["bascule"] = {
              nome: capitalize(basculeType.replace('_', ' ')),
              prezzo: parseFloat(discountedPrice.toFixed(2))
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["bascule"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "gancio":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-link"></i> Seleziona Gancio</h2>
        <p>Scegli il tipo di gancio (F90 o KS).</p>
        <select id="gancio">
          <option value="">-- Seleziona --</option>
          <option value="gancio_F90">Gancio F90</option>
          <option value="gancio_ks">Gancio KS</option>
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('bascule')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("bocche")}
        </div>
      `;
      document
        .getElementById("gancio")
        .addEventListener("change", function () {
          const gancioType = this.value;
          if (gancioType && configurazione.selections["corpo_contenitore"]) {
            const volume = getSelectedVolume();
            const categoria = `${gancioType}_${volume}`;
            const basePrice = configurazione.data.configurazioni[categoria] || 0;
            const discount = configurazione.customer.discounts["gancio"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["gancio"] = {
              nome: capitalize(gancioType.replace('_', ' ')),
              prezzo: parseFloat(discountedPrice.toFixed(2))
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["gancio"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "bocche":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-door-open"></i> Seleziona le Bocche</h2>
        <p>Scegli tra Feritoia, Cassetto, Tamburo o Oblò.</p>
        <select id="bocche">
          <option value="">-- Seleziona --</option>
          <option value="Feritoia_metallo">Feritoia (Metallo)</option>
          <option value="Feritoia_plastica">Feritoia (Plastica)</option>
          <option value="Cassetto">Cassetto</option>
          <option value="Tamburo">Tamburo</option>
          <option value="Oblo">Oblò</option>
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('gancio')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("guida")}
        </div>
      `;
      document
        .getElementById("bocche")
        .addEventListener("change", function () {
          const boccaType = this.value;
          if (boccaType && configurazione.selections["corpo_contenitore"]) {
            const volume = getSelectedVolume();
            const categoria = boccaType === "Oblo" ? `Oblo_${volume}` : `${boccaType}_${volume}`;
            const basePrice = configurazione.data.configurazioni[categoria] || 0;
            const discount = configurazione.customer.discounts["bocche"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["bocche"] = {
              nome: capitalize(boccaType.replace('_', ' ')),
              prezzo: parseFloat(discountedPrice.toFixed(2))
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["bocche"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "guida":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-road"></i> Seleziona Guida a Terra</h2>
        <p>Scegli la guida a terra per il contenitore.</p>
        <select id="guida">
          <option value="">-- Seleziona --</option>
          <option value="guida_a_terra_metallo">Guida a Terra Metallo</option>
          <option value="guida_a_terra_hdpe">Guida a Terra HDPE</option>
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('bocche')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("adesivo")}
        </div>
      `;
      document
        .getElementById("guida")
        .addEventListener("change", function () {
          const guidaType = this.value;
          if (guidaType && configurazione.selections["corpo_contenitore"]) {
            const volume = getSelectedVolume();
            const categoria = `${guidaType}_${volume}`;
            const basePrice = configurazione.data.configurazioni[categoria] || 0;
            const discount = configurazione.customer.discounts["guida_a_terra"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["guida_a_terra"] = {
              nome: capitalize(guidaType.replace('_', ' ')),
              prezzo: parseFloat(discountedPrice.toFixed(2))
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["guida_a_terra"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "adesivo":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-sticky-note"></i> Seleziona l'Adesivo</h2>
        <p>Aggiungi un adesivo personalizzato (opzionale).</p>
        <select id="adesivo">
          <option value="">-- Seleziona --</option>
          <option value="adesivo">Adesivo Standard</option>
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('guida')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("optional")}
        </div>
      `;
      document
        .getElementById("adesivo")
        .addEventListener("change", function () {
          const adesivoType = this.value;
          if (adesivoType && configurazione.selections["corpo_contenitore"]) {
            const volume = getSelectedVolume();
            const categoria = `${adesivoType}_${volume}`;
            const basePrice = configurazione.data.configurazioni[categoria] || 0;
            const discount = configurazione.customer.discounts["adesivo"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["adesivo"] = {
              nome: capitalize(adesivoType.replace('_', ' ')),
              prezzo: parseFloat(discountedPrice.toFixed(2))
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["adesivo"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "optional":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-plus-circle"></i> Seleziona Optional</h2>
        <p>Aggiungi funzioni extra.</p>
        <div class="optional-item">
          <label>
            <input type="checkbox" name="optional" value="optional_pedale" />
            Pedale (Apertura a Pedale)
          </label>
        </div>
        <div class="optional-item">
          <label>
            <input type="checkbox" name="optional" value="optional_elettronica" />
            Elettronica (Monitoraggio)
          </label>
        </div>
        <div class="optional-item">
          <label>
            <input type="checkbox" name="optional" value="optional_sensore_volumetrico" />
            Sensore Volumetrico
          </label>
        </div>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('adesivo')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("resoconto")}
        </div>
      `;

      configurazione.selections["optional"] = { items: [], prezzo: 0 };
      const checkboxes = document.querySelectorAll('input[name="optional"]');
      checkboxes.forEach((cb) => {
        cb.addEventListener("change", function () {
          configurazione.selections["optional"].items = [];
          configurazione.selections["optional"].prezzo = 0;

          checkboxes.forEach((box) => {
            if (box.checked) {
              const optName = box.value;
              const basePrice = configurazione.data.configurazioni[optName] || 0;
              const discount = configurazione.customer.discounts["optional"] || 0;
              const discountedPrice = basePrice - (basePrice * discount) / 100;

              configurazione.selections["optional"].items.push({
                nome: capitalize(optName.replace('optional_', '')),
                prezzo: parseFloat(discountedPrice.toFixed(2))
              });
              configurazione.selections["optional"].prezzo += discountedPrice;
            }
          });

          document.getElementById("currentSelectionPrice").textContent =
            `Prezzo Selezione Corrente: ${formatCurrency(configurazione.selections["optional"].prezzo)}`;
          aggiornaPrezzo(false);
        });
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
  const stepsConValidazione = ["contenitore", "bascule", "gancio", "bocche", "guida", "adesivo"];

  if (stepsConValidazione.includes(stepCorrente)) {
    if (stepCorrente === "optional") {
      // "optional" può avere selezioni multiple o nessuna, non obbligatorio
    } else {
      if (!configurazione.selections[stepCorrente] || (stepCorrente === "optional" && configurazione.selections[stepCorrente].length === 0)) {
        const categoriaFormattata = capitalize(stepCorrente.replace('_', ' '));
        showWarningModal(`Per continuare devi selezionare un ${categoriaFormattata}!`);
        return;
      }
    }
  }

  showStep(nextStepName);
}

function prevStep(prevStepName) {
  showStep(prevStepName);
}

/* ----------------------------------------------
   Aggiorna il prezzo
   isFinal = false => no sconto quantità, no sconto extra
   isFinal = true  => sconto extra
----------------------------------------------- */
function aggiornaPrezzo(isFinal) {
  let prezzoUnitario = 0;

  // Somma dei prezzi delle selezioni (scontati a livello di categoria)
  for (let categoria in configurazione.selections) {
    if (categoria === "optional") {
      prezzoUnitario += configurazione.selections.optional.prezzo || 0;
    } else {
      prezzoUnitario += configurazione.selections[categoria].prezzo || 0;
    }
  }

  if (!isFinal) {
    // Calcolo "parziale" (1 pezzo, no sconto extra)
    configurazione.prezzoTotale = prezzoUnitario;
    configurazione.prezzoTotaleScontato = prezzoUnitario;
  } else {
    // Calcolo finale con la quantità effettiva
    configurazione.prezzoTotale = prezzoUnitario * configurazione.quantità;

    // Sconto extra
    if (configurazione.customer.extra_discount.active) {
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
    if (categoria === "optional") {
      if (configurazione.selections.optional.items.length > 0) {
        const itemsHTML = configurazione.selections.optional.items
          .map(
            (item) => `<li>${item.nome} - ${formatCurrency(item.prezzo)}</li>`
          )
          .join("");
        ul.innerHTML += `
          <li>
            <div>
              <strong>${capitalize(categoria)}</strong>:
              <ul>${itemsHTML}</ul>
            </div>
            <button class="modifica" onclick="modificaSelezione('optional')">Modifica</button>
          </li>
        `;
      }
    } else {
      const sel = configurazione.selections[categoria];
      ul.innerHTML += `
        <li>
          <div>
            <strong>${capitalize(categoria)}</strong>:
            ${sel.nome} - ${formatCurrency(sel.prezzo)}
          </div>
          <button class="modifica" onclick="modificaSelezione('${categoria}')">Modifica</button>
        </li>
      `;
    }
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
    if (configurazione.customer.extra_discount.active && scontoExtra > 0) {
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
  const logoURL = "/path/to/Logo.jpg"; // Assicurati che il percorso sia corretto

  try {
    const img = new Image();
    img.src = logoURL;
    img.onload = async function () {
      doc.addImage(img, "JPEG", 10, 10, 50, 20);
      doc.setFontSize(20);
      doc.text("Configurazione Utente", 105, 40, null, null, "center");

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
        if (categoria === "optional") {
          if (configurazione.selections.optional.items.length > 0) {
            doc.text(`${capitalize(categoria)}:`, 20, y);
            y += 10;
            configurazione.selections.optional.items.forEach((item) => {
              doc.text(`- ${item.nome} - ${formatCurrency(item.prezzo)}`, 30, y);
              y += 10;
            });
          }
        } else {
          const sel = configurazione.selections[categoria];
          doc.text(
            `${capitalize(categoria)}: ${sel.nome} - ${formatCurrency(sel.prezzo)}`,
            20,
            y
          );
          y += 10;
        }
      }

      // Sconti finali
      if (
        configurazione.customer.extra_discount.active &&
        configurazione.scontoExtra > 0
      ) {
        const extra = configurazione.customer.extra_discount;
        if (extra.type === "percentuale") {
          doc.text(
            `Sconto Extra: -${extra.value}% (${formatCurrency(configurazione.scontoExtra)})`,
            20,
            y
          );
        } else if (extra.type === "fisso") {
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
      doc.save("resoconto.pdf");

      // Aggiorna l'uso del codice sconto sul server
      try {
        const updateResponse = await fetch('/api/customers/update-usage', { // Endpoint corretto
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
      const toEmail = "ayoub.majdouli@esa-italy.com"; // Sostituisci con la tua email
      const subject = encodeURIComponent("Nuova Configurazione Utente");

      let body = `Nome: ${configurazione.userInfo.nome}\nCognome: ${configurazione.userInfo.cognome}\nAzienda: ${configurazione.userInfo.azienda}\nQuantità: ${configurazione.quantità}\n\nSelezioni:\n`;

      for (let categoria in configurazione.selections) {
        if (categoria === "optional") {
          if (configurazione.selections.optional.items.length > 0) {
            body += `${capitalize(categoria)}:\n`;
            configurazione.selections.optional.items.forEach((item) => {
              body += `- ${item.nome} - ${formatCurrency(item.prezzo)}\n`;
            });
          }
        } else {
          const sel = configurazione.selections[categoria];
          body += `${capitalize(categoria)}: ${sel.nome} - ${formatCurrency(sel.prezzo)}\n`;
        }
      }

      if (
        configurazione.customer.extra_discount.active &&
        configurazione.scontoExtra > 0
      ) {
        const extra = configurazione.customer.extra_discount;
        if (extra.type === "percentuale") {
          body += `\nSconto Extra: -${extra.value}% (${formatCurrency(configurazione.scontoExtra)})`;
        } else if (extra.type === "fisso") {
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
   Funzione per Ottenere il Volume Selezionato
----------------------------------------------- */
function getSelectedVolume() {
  const sel = configurazione.selections["corpo_contenitore"];
  if (!sel) return null;
  const match = sel.nome.match(/\((.*?)\)/);
  return match ? match[1] : null;
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
