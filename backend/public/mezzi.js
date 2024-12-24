// public/js/mezzi.js

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
  isModifying: false,            // Stato di modifica
  data: {
    categorie: {} // Sarà popolato dinamicamente
  }
};

// Carica i prezzi dal server all'avvio
document.addEventListener('DOMContentLoaded', async () => {
  const prezzi = await fetchPrezzi();
  
  // Popola configurazione.data.categorie con i prezzi
  configurazione.data.categorie = {};

  prezzi.forEach(p => {
    configurazione.data.categorie[p.categoria] = p.prezzo;
  });

  // Inizializza la prima step
  showStep("AUTOMEZZI");
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
        <p>${configurazione.data.categorie["AUTOMEZZI"].indicazioni || "Seleziona l'automezzo adatto alle tue esigenze."}</p>
        <select id="automezziCategoria">
          <option value="">-- Seleziona Categoria --</option>
          ${getCategorieOptions("AUTOMEZZI")}
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
          const selectedOpzioneNome = this.value;
          if (selectedOpzioneNome) {
            const categoria = `AUTOMEZZI_${selectedOpzioneNome.replace(/ /g, '_')}`;
            const basePrice = configurazione.data.categorie[categoria] || 0;
            const discount = configurazione.customer.discounts["AUTOMEZZI"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["AUTOMEZZI"] = {
              nome: selectedOpzioneNome,
              prezzo: parseFloat(discountedPrice.toFixed(2)),
              sconto: discount
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["AUTOMEZZI"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "Allestimento":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-tools"></i> Seleziona Allestimento</h2>
        <p>${configurazione.data.categorie["Allestimento"].indicazioni || "Scegli il tipo di allestimento per il tuo automezzo."}</p>
        <select id="allestimentoCategoria">
          <option value="">-- Seleziona Allestimento --</option>
          ${getCategorieOptions("Allestimento")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('AUTOMEZZI')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("ROBOT")}
        </div>
      `;

      document
        .getElementById("allestimentoCategoria")
        .addEventListener("change", function () {
          const selectedOpzioneNome = this.value;
          if (selectedOpzioneNome) {
            const categoria = `Allestimento_${selectedOpzioneNome.replace(/ /g, '_')}`;
            const basePrice = configurazione.data.categorie[categoria] || 0;
            const discount = configurazione.customer.discounts["Allestimento"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["Allestimento"] = {
              nome: selectedOpzioneNome,
              prezzo: parseFloat(discountedPrice.toFixed(2)),
              sconto: discount
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["Allestimento"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "ROBOT":
      configuratorDiv.innerHTML = `
        <h2><i class="fa-solid fa-robot"></i> Seleziona la ROBOT</h2>
        <p>${configurazione.data.categorie["ROBOT"].indicazioni || "Seleziona il modello di ROBOT."}</p>
        <select id="ROBOTCategoria">
          <option value="">-- Seleziona ROBOT --</option>
          ${getCategorieOptions("ROBOT")}
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
        .getElementById("ROBOTCategoria")
        .addEventListener("change", function () {
          const selectedOpzioneNome = this.value;
          if (selectedOpzioneNome) {
            const categoria = `ROBOT_${selectedOpzioneNome.replace(/ /g, '_')}`;
            const basePrice = configurazione.data.categorie[categoria] || 0;
            const discount = configurazione.customer.discounts["ROBOT"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["ROBOT"] = {
              nome: selectedOpzioneNome,
              prezzo: parseFloat(discountedPrice.toFixed(2)),
              sconto: discount
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["ROBOT"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "Compattatore":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-trash"></i> Seleziona Compattatore</h2>
        <p>${configurazione.data.categorie["Compattatore"].indicazioni || "Scegli il tipo di compattatore."}</p>
        <select id="compattatoreCategoria">
          <option value="">-- Seleziona Compattatore --</option>
          ${getCategorieOptions("Compattatore")}
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('ROBOT')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("Lavacontenitori")}
        </div>
      `;

      document
        .getElementById("compattatoreCategoria")
        .addEventListener("change", function () {
          const selectedOpzioneNome = this.value;
          if (selectedOpzioneNome) {
            const categoria = `Compattatore_${selectedOpzioneNome.replace(/ /g, '_')}`;
            const basePrice = configurazione.data.categorie[categoria] || 0;
            const discount = configurazione.customer.discounts["Compattatore"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["Compattatore"] = {
              nome: selectedOpzioneNome,
              prezzo: parseFloat(discountedPrice.toFixed(2)),
              sconto: discount
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["Compattatore"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "Lavacontenitori":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-soap"></i> Seleziona Lavacontenitori</h2>
        <p>${configurazione.data.categorie["Lavacontenitori"].indicazioni || "Seleziona il sistema di lavacontenitori."}</p>
        <select id="lavacontenitoriCategoria">
          <option value="">-- Seleziona Lavacontenitori --</option>
          ${getCategorieOptions("Lavacontenitori")}
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
          const selectedOpzioneNome = this.value;
          if (selectedOpzioneNome) {
            const categoria = `Lavacontenitori_${selectedOpzioneNome.replace(/ /g, '_')}`;
            const basePrice = configurazione.data.categorie[categoria] || 0;
            const discount = configurazione.customer.discounts["Lavacontenitori"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["Lavacontenitori"] = {
              nome: selectedOpzioneNome,
              prezzo: parseFloat(discountedPrice.toFixed(2)),
              sconto: discount
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["Lavacontenitori"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    case "Accessori":
      const accessoriOpzioni = getAccessoriOpzioni();
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-cogs"></i> Seleziona Accessori</h2>
        <p>${configurazione.data.categorie["Accessori"].indicazioni || "Aggiungi accessori al tuo automezzo."}</p>
        <div id="accessoriChecklist">
          ${accessoriOpzioni
            .map((opzione) => `
              <div class="optional-item">
                <label>
                  <input type="checkbox" name="accessori" value="${opzione.categoria}" />
                  ${capitalize(opzione.nome)} (${formatCurrency(opzione.prezzo)})
                </label>
              </div>
            `)
            .join("")}
        </div>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('Lavacontenitori')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("PLUS")}
        </div>
      `;

      // Event Listener per le checkbox multiple
      const accessoriCheckboxes = document.querySelectorAll('input[name="accessori"]');
      accessoriCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", function () {
          const categoria = "Accessori";
          if (!configurazione.selections[categoria]) {
            configurazione.selections[categoria] = [];
          }

          if (this.checked) {
            const opzioneNome = this.value;
            const basePrice = configurazione.data.configurazioni[opzioneNome] || 0;
            const discount = configurazione.customer.discounts["Accessori"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections[categoria].push({
              nome: capitalize(opzioneNome.replace('Accessori_', '').replace('_', ' ')),
              prezzo: parseFloat(discountedPrice.toFixed(2)),
              sconto: discount
            });
          } else {
            // Rimuove l'opzione deselezionata
            configurazione.selections[categoria] = configurazione.selections[categoria].filter(sel => sel.nome !== capitalize(this.value.replace('Accessori_', '').replace('_', ' ')));
            if (configurazione.selections[categoria].length === 0) {
              delete configurazione.selections[categoria];
            }
          }

          // Aggiorna il prezzo
          aggiornaPrezzo(false);

          // Aggiorna la visualizzazione del prezzo corrente
          const prezzoCorrente = configurazione.selections[categoria]
            ? configurazione.selections[categoria].reduce((acc, curr) => acc + curr.prezzo, 0)
            : 0;
          document.getElementById("currentSelectionPrice").textContent =
            `Prezzo Selezione Corrente: ${formatCurrency(prezzoCorrente)}`;
        });
      });
      break;

    case "PLUS":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-plus-circle"></i> Seleziona PLUS</h2>
        <p>${configurazione.data.categorie["PLUS"].indicazioni || "Aggiungi funzioni extra al tuo automezzo."}</p>
        <select id="plusCategoria">
          <option value="">-- Seleziona PLUS --</option>
          ${getCategorieOptions("PLUS")}
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
          const selectedOpzioneNome = this.value;
          if (selectedOpzioneNome) {
            const categoria = `PLUS_${selectedOpzioneNome.replace(/ /g, '_')}`;
            const basePrice = configurazione.data.configurazioni[categoria] || 0;
            const discount = configurazione.customer.discounts["PLUS"] || 0;
            const discountedPrice = basePrice - (basePrice * discount) / 100;

            configurazione.selections["PLUS"] = {
              nome: selectedOpzioneNome,
              prezzo: parseFloat(discountedPrice.toFixed(2)),
              sconto: discount
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(discountedPrice)}`;
          } else {
            delete configurazione.selections["PLUS"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
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
  const stepsConValidazione = ["contenitore", "bascule", "gancio", "bocche", "guida", "adesivo", "Allestimento", "AUTOMEZZI", "ROBOT", "Compattatore", "Lavacontenitori", "Accessori", "PLUS"];

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
        const sel = configurazione.selections[categoria];
        if (categoria === "optional") {
          if (sel.items.length > 0) {
            doc.text(`${capitalize(categoria)}:`, 20, y);
            y += 10;
            sel.items.forEach((item) => {
              doc.text(`- ${item.nome} - ${formatCurrency(item.prezzo)}`, 30, y);
              y += 10;
            });
          }
        } else {
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
        const sel = configurazione.selections[categoria];
        if (categoria === "optional") {
          if (sel.items.length > 0) {
            body += `${capitalize(categoria)}:\n`;
            sel.items.forEach((item) => {
              body += `- ${item.nome} - ${formatCurrency(item.prezzo)}\n`;
            });
          }
        } else {
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

function showSuccessModal(message) {
  const successModal = document.getElementById("successModal");
  const successMessageText = document.getElementById("successMessageText");
  if (successMessageText) {
    successMessageText.textContent = message;
  }
  if (successModal) {
    successModal.style.display = "block";
  }
}

function closeSuccessModal() {
  const successModal = document.getElementById("successModal");
  if (successModal) {
    successModal.style.display = "none";
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
  const successModal = document.getElementById("successModal");
  const messageModal = document.getElementById("messageModal");
  if (warningModal && event.target === warningModal) {
    warningModal.style.display = 'none';
  }
  if (successModal && event.target === successModal) {
    successModal.style.display = 'none';
  }
  if (messageModal && event.target === messageModal) {
    messageModal.style.display = 'none';
  }
}

/* ----------------------------------------------
   Funzione modificaSelezione: permette di modificare una selezione specifica
----------------------------------------------- */
function modificaSelezione(categoria) {
  const step = stepMap[categoria];
  if (step) {
    configurazione.isModifying = true; // Imposta lo stato di modifica

    // Rimuove la selezione precedente per obbligare una nuova scelta
    delete configurazione.selections[categoria];

    showStep(step);
  } else {
    alert("Passo non trovato per la modifica.");
  }
}
