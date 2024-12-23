// contenitori.js

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
  "guida_a_terra": "guida",
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
  prezzoTotaleScontato: 0,
  currentStep: null
};

// URL del backend
const API_URL = 'http://localhost:10000/api';

/**
 * Carica le configurazioni dei contenitori dal backend
 */
async function loadContenitoriData() {
  try {
    const response = await fetch(`${API_URL}/contenitori`);
    const data = await response.json();
    return data[0]; // Assumiamo un solo documento
  } catch (error) {
    showWarningModal('Errore nel caricamento dei dati dei contenitori.');
    console.error(error);
    return null;
  }
}

// Caricamento delle configurazioni e avvio del configuratore
document.addEventListener('DOMContentLoaded', async () => {
  // Aggiungi Event Listener per il form di login
  const userForm = document.getElementById("userForm");
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

      // Carica i dati dei contenitori
      const contenitoriData = await loadContenitoriData();
      if (!contenitoriData) throw new Error('Dati dei contenitori non disponibili.');

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
      configurazione.data = contenitoriData;
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
});

/**
 * Funzione per mostrare un determinato step
 * @param {string} stepName - Il nome dello step da mostrare
 */
function showStep(stepName) {
  const configuratorDiv = document.getElementById("configurator");
  configuratorDiv.innerHTML = ""; // Reset del contenuto

  switch (stepName) {
    case "contenitore":
      configuratoreContenitore();
      break;
    case "bascule":
      configuratoreBascule();
      break;
    case "gancio":
      configuratoreGancio();
      break;
    // Aggiungi altri casi per gli altri step
    case "optional":
      configuratoreOptional();
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
 * Funzione per configurare il Contenitore
 */
function configuratoreContenitore() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "corpo_contenitore"; // Esempio, dovrebbe essere dinamico se hai più categorie

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-box"></i> Seleziona Corpo Contenitore</h2>
    <p>${categoriaData.nome}</p>
    <select id="corpoContenitoreCategoria">
      <option value="">-- Seleziona Corpo Contenitore --</option>
      ${categoriaData.prezzi
        .map(prezzo => `<option value="${prezzo.volume}">${prezzo.volume}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep()">
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('bascule')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("corpoContenitoreCategoria").addEventListener("change", function () {
    const selectedVolume = this.value;
    const prezzoObj = categoriaData.prezzi.find(p => p.volume === selectedVolume);
    if (prezzoObj) {
      // Applica lo sconto per la categoria "corpo_contenitore" se disponibile
      const scontoCategoria = configurazione.customer.discounts.corpus_contenitore || 0;
      const prezzoScontato = prezzoObj.prezzo - (prezzoObj.prezzo * scontoCategoria / 100);

      configurazione.selections["corpo_contenitore"] = {
        volume: selectedVolume,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["corpo_contenitore"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

/**
 * Funzione per mostrare il Resoconto
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
 * Funzioni per altri configuratori (bascule, gancio, ecc.)
 * Implementale analogamente a configuratoreContenitore()
 * Ad esempio:
 */

function configuratoreBascule() {
  const configuratorDiv = document.getElementById("configurator");
  const categoria = "bascule"; // Esempio

  const categoriaData = configurazione.data.categorie.find(cat => cat.nome === categoria);
  if (!categoriaData) {
    configuratorDiv.innerHTML = "<p>Categoria non trovata.</p>";
    return;
  }

  configuratorDiv.innerHTML = `
    <h2><i class="fas fa-truck-moving"></i> Seleziona Bascule</h2>
    <p>${categoriaData.nome}</p>
    <select id="basculeCategoria">
      <option value="">-- Seleziona Bascule --</option>
      ${categoriaData.prezzi
        .map(prezzo => `<option value="${prezzo.volume}">${prezzo.volume}</option>`)
        .join("")}
    </select>
    <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
    <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
    <div class="button-group">
      <button onclick="prevStep('contenitore')">
        <i class="fas fa-arrow-left"></i> Indietro
      </button>
      <button onclick="nextStep('gancio')" class="btn-primary">Avanti <i class="fas fa-arrow-right"></i></button>
    </div>
  `;

  document.getElementById("basculeCategoria").addEventListener("change", function () {
    const selectedVolume = this.value;
    const prezzoObj = categoriaData.prezzi.find(p => p.volume === selectedVolume);
    if (prezzoObj) {
      // Applica lo sconto per la categoria "bascule" se disponibile
      const scontoCategoria = configurazione.customer.discounts.bascule || 0;
      const prezzoScontato = prezzoObj.prezzo - (prezzoObj.prezzo * scontoCategoria / 100);

      configurazione.selections["bascule"] = {
        volume: selectedVolume,
        prezzo: parseFloat(prezzoScontato.toFixed(2)),
        sconto: scontoCategoria
      };
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(prezzoScontato)}`;
    } else {
      delete configurazione.selections["bascule"];
      document.getElementById("currentSelectionPrice").textContent =
        `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
    }
    aggiornaPrezzo(false);
  });
}

// Implementa altre funzioni per le altre categorie (gancio, bocche, ecc.)

/**
 * Funzione per navigare allo step successivo
 * @param {string} nextStepName - Il nome dello step successivo
 */
function nextStep(nextStepName) {
  // Validazione opzionale prima di passare allo step successivo
  showStep(nextStepName);
}

/**
 * Funzione per navigare allo step precedente
 * @param {string} prevStepName - Il nome dello step precedente
 */
function prevStep() {
  // Implementa la logica per tornare allo step precedente
  // Potresti mantenere una history stack per tracciare gli step
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
 * Funzione per inviare la configurazione (generare PDF, inviare email, aggiornare uso del codice)
 */
async function inviaConfigurazione() {
  const configuratorDiv = document.getElementById("configurator");
  const riepilogoSelezioni = document.getElementById("riepilogoSelezioni");
  
  // Genera il PDF
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
  const stepsConValidazione = ["corpo_contenitore", "bascule", "gancio", "bocche", "guida_a_terra", "adesivo", "optional"];

  if (stepsConValidazione.includes(stepCorrente)) {
    if (!configurazione.selections[stepCorrente]) {
      // Converti la prima lettera della categoria in maiuscolo per il messaggio
      const categoriaFormattata = capitalize(stepCorrente.replace('_', ' '));
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
}

/**
 * Aggiorna il prezzo
 * isFinal = false => no sconto quantità, no sconto extra
 * isFinal = true  => sconto extra
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
 * Funzione modificaSelezione: permette di modificare una selezione specifica
 */
function modificaSelezione(categoria) {
  const step = categoria; // Assumiamo che il nome dello step sia lo stesso della categoria
  if (stepMap[step]) {
    configurazione.isModifying = true; // Imposta lo stato di modifica
    showStep(step);
  } else {
    alert("Passo non trovato per la modifica.");
  }
}

/**
 * Invia la configurazione: genera PDF + mailto + aggiorna uso del codice sconto
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
  const stepsConValidazione = ["corpo_contenitore", "bascule", "gancio", "bocche", "guida_a_terra", "adesivo", "optional"];

  if (stepsConValidazione.includes(stepCorrente)) {
    if (!configurazione.selections[stepCorrente]) {
      // Converti la prima lettera della categoria in maiuscolo per il messaggio
      const categoriaFormattata = capitalize(stepCorrente.replace('_', ' '));
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

function prevStep(prevStepName) {
  // Implementa la logica per tornare allo step precedente
  // Potresti mantenere una history stack per tracciare gli step
}

/**
 * Funzione modificaSelezione: permette di modificare una selezione specifica
 */
function modificaSelezione(categoria) {
  const step = categoria; // Assumiamo che il nome dello step sia lo stesso della categoria
  if (stepMap[step]) {
    configurazione.isModifying = true; // Imposta lo stato di modifica
    showStep(step);
  } else {
    alert("Passo non trovato per la modifica.");
  }
}
