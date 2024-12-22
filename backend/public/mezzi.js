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
  "AUTOMEZZI": "automezzi",
  "Allestimento": "allestimento",
  "GRU": "gru",
  "Compattatore": "compattatore",
  "Lavacontenitori": "lavacontenitori",
  "Accessori": "accessori",
  "PLUS": "plus"
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
  currentStep: null              // Passo corrente
};

// Funzione per capitalizzare una stringa
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
      discounts: customerData.discounts,
      extra_discount: customerData.extra_discount,
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
    showStep("automezzi");
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
    case "automezzi":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-truck"></i> Seleziona l'Automezzo</h2>
        <p>Scegli la categoria e il modello dell'automezzo.</p>
        <select id="automezziCategoria">
          <option value="">-- Seleziona Categoria --</option>
          <option value="AUTOMEZZI">AUTOMEZZI</option>
          <option value="GRU">GRU</option>
          <option value="Compattatore">Compattatore</option>
          <option value="Lavacontenitori">Lavacontenitori</option>
          <option value="Accessori">Accessori</option>
          <option value="PLUS">PLUS</option>
        </select>
        <div id="automezziOpzioni" style="margin-top: 20px;"></div>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          ${avantiButton("allestimento")}
        </div>
      `;

      document
        .getElementById("automezziCategoria")
        .addEventListener("change", async function () {
          const categoria = this.value;
          const opzioniDiv = document.getElementById("automezziOpzioni");
          opzioniDiv.innerHTML = "";

          if (categoria) {
            try {
              const response = await fetch(`https://configuratore-2-0.onrender.com/api/mezzi/categoria/${encodeURIComponent(categoria)}`);
              if (!response.ok) {
                throw new Error('Errore nel recupero delle opzioni.');
              }
              const mezzo = await response.json();
              if (mezzo && mezzo.categoria && mezzo.categoria.opzioni.length > 0) {
                const select = document.createElement("select");
                select.id = "automezziOpzione";
                select.innerHTML = `<option value="">-- Seleziona Opzione --</option>`;
                mezzo.categoria.opzioni.forEach(opzione => {
                  select.innerHTML += `<option value="${opzione.nome}">${opzione.nome} - ${formatCurrency(opzione.prezzoScontato)}</option>`;
                });
                opzioniDiv.appendChild(select);

                // Gestione della selezione
                select.addEventListener("change", function () {
                  const opzioneSelezionata = mezzo.categoria.opzioni.find(op => op.nome === this.value);
                  if (opzioneSelezionata) {
                    configurazione.selections["AUTOMEZZI"] = {
                      nome: opzioneSelezionata.nome,
                      prezzo: opzioneSelezionata.prezzoScontato
                    };
                    document.getElementById("currentSelectionPrice").textContent =
                      `Prezzo Selezione Corrente: ${formatCurrency(opzioneSelezionata.prezzoScontato)}`;
                  } else {
                    delete configurazione.selections["AUTOMEZZI"];
                    document.getElementById("currentSelectionPrice").textContent =
                      `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
                  }
                  // Aggiorna prezzo parziale (no sconto quantità né sconto extra)
                  aggiornaPrezzo(false);
                });
              } else {
                opzioniDiv.innerHTML = "<p>Nessuna opzione disponibile per questa categoria.</p>";
              }
            } catch (error) {
              console.error(error);
              showWarningModal("Errore nel recupero delle opzioni.");
            }
          }
          // Aggiorna prezzo parziale
          aggiornaPrezzo(false);
        });
      break;

    case "allestimento":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-tools"></i> Seleziona l'Allestimento</h2>
        <p>Scegli il tipo di allestimento.</p>
        <select id="allestimentoCategoria">
          <option value="">-- Seleziona Allestimento --</option>
          <option value="Scarrabile">Scarrabile</option>
          <option value="Fisso">Fisso</option>
        </select>
        <div id="allestimentoOpzioni" style="margin-top: 20px;"></div>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('automezzi')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("gru")}
        </div>
      `;

      document
        .getElementById("allestimentoCategoria")
        .addEventListener("change", async function () {
          const tipo = this.value;
          const opzioniDiv = document.getElementById("allestimentoOpzioni");
          opzioniDiv.innerHTML = "";

          if (tipo) {
            try {
              const response = await fetch(`https://configuratore-2-0.onrender.com/api/mezzi/allestimento/${encodeURIComponent(tipo)}`);
              if (!response.ok) {
                throw new Error('Errore nel recupero delle opzioni di allestimento.');
              }
              const mezzo = await response.json();
              if (mezzo && mezzo.categoria && mezzo.categoria.opzioni.length > 0) {
                const select = document.createElement("select");
                select.id = "allestimentoOpzione";
                select.innerHTML = `<option value="">-- Seleziona Opzione --</option>`;
                mezzo.categoria.opzioni.forEach(opzione => {
                  select.innerHTML += `<option value="${opzione.nome}">${opzione.nome} - ${formatCurrency(opzione.prezzoScontato)}</option>`;
                });
                opzioniDiv.appendChild(select);

                // Gestione della selezione
                select.addEventListener("change", function () {
                  const opzioneSelezionata = mezzo.categoria.opzioni.find(op => op.nome === this.value);
                  if (opzioneSelezionata) {
                    configurazione.selections["Allestimento"] = {
                      nome: opzioneSelezionata.nome,
                      prezzo: opzioneSelezionata.prezzoScontato
                    };
                    document.getElementById("currentSelectionPrice").textContent =
                      `Prezzo Selezione Corrente: ${formatCurrency(opzioneSelezionata.prezzoScontato)}`;
                  } else {
                    delete configurazione.selections["Allestimento"];
                    document.getElementById("currentSelectionPrice").textContent =
                      `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
                  }
                  // Aggiorna prezzo parziale
                  aggiornaPrezzo(false);
                });
              } else {
                opzioniDiv.innerHTML = "<p>Nessuna opzione disponibile per questo tipo di allestimento.</p>";
              }
            } catch (error) {
              console.error(error);
              showWarningModal("Errore nel recupero delle opzioni di allestimento.");
            }
          }
          // Aggiorna prezzo parziale
          aggiornaPrezzo(false);
        });
      break;

    // Continua a implementare gli altri passaggi (GRU, Compattatore, Lavacontenitori, Accessori, PLUS) seguendo lo stesso schema.

    case "gru":
      configuratorDiv.innerHTML = `
        <h2><i class="fas fa-crane"></i> Seleziona la GRU</h2>
        <p>Scegli il modello di GRU.</p>
        <select id="gruModello">
          <option value="">-- Seleziona GRU --</option>
          <option value="2AS Kinshofer">2AS Kinshofer - ${formatCurrency(125000)}</option>
          <option value="2AS F90">2AS F90 - ${formatCurrency(125000)}</option>
        </select>
        <p id="currentSelectionPrice">Prezzo Selezione Corrente: ${formatCurrency(0)}</p>
        <p>Prezzo Totale: <span class="prezzo-totale">${formatCurrency(0)}</span></p>
        <div class="button-group">
          <button onclick="prevStep('allestimento')">
            <i class="fas fa-arrow-left"></i> Indietro
          </button>
          ${avantiButton("compattatore")}
        </div>
      `;

      document
        .getElementById("gruModello")
        .addEventListener("change", function () {
          const modello = this.value;
          if (modello) {
            const prezzo = 125000; // Prezzo fisso per entrambi i modelli
            configurazione.selections["GRU"] = {
              nome: modello,
              prezzo: prezzo
            };
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(prezzo)}`;
          } else {
            delete configurazione.selections["GRU"];
            document.getElementById("currentSelectionPrice").textContent =
              `Prezzo Selezione Corrente: ${formatCurrency(0)}`;
          }
          aggiornaPrezzo(false);
        });
      break;

    // Implementa gli altri step seguendo questo schema
    // ...

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

  // Controlli specifici per ogni step
  if (stepCorrente === "automezzi") {
    if (!configurazione.selections["AUTOMEZZI"]) {
      showWarningModal("Per continuare devi selezionare un'automezzo!");
      return;
    }
  }

  if (stepCorrente === "allestimento") {
    if (!configurazione.selections["Allestimento"]) {
      showWarningModal("Per continuare devi selezionare un allestimento!");
      return;
    }
  }

  // Aggiungi altri controlli per gli altri step se necessario

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
      } else if (extra.type === "fisso") { // Modificato da 'valore' a 'fisso'
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
      } else if (extra.type === "fisso") { // Modificato da 'valore' a 'fisso'
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
  const logoURL = "../Logo.jpg"; // Assicurati che il percorso sia corretto

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
        if (configurazione.customer.extra_discount.type === "percentuale") {
          doc.text(
            `Sconto Extra: -${configurazione.customer.extra_discount.value}% (${formatCurrency(configurazione.scontoExtra)})`,
            20,
            y
          );
        } else if (configurazione.customer.extra_discount.type === "fisso") { // Modificato da 'valore' a 'fisso'
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
      const toEmail = "ayoub.majdouli@esa-italy.com"; // Sostituisci con la tua email
      const subject = encodeURIComponent("Nuova Configurazione Mezzo");

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
        if (configurazione.customer.extra_discount.type === "percentuale") {
          body += `\nSconto Extra: -${configurazione.customer.extra_discount.value}% (${formatCurrency(configurazione.scontoExtra)})`;
        } else if (configurazione.customer.extra_discount.type === "fisso") { // Modificato da 'valore' a 'fisso'
          body += `\nSconto Extra: -${formatCurrency(configurazione.scontoExtra)}`;
        }
      }
      body += `\nPrezzo Totale Scontato: ${formatCurrency(configurazione.prezzoTotaleScontato)}`;

      const encodedBody = encodeURIComponent(body);
      const mailtoLink = `mailto:${toEmail}?subject=${subject}&body=${encodedBody}`;
      const emailLink = document.getElementById("emailLink");
      emailLink.href = mailtoLink;

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
  const sel = configurazione.selections["AUTOMEZZI"];
  if (!sel) return null;
  // Estrai le specifiche dal nome, ad esempio "2 assi (18 Ton)"
  const match = sel.nome.match(/\((.*?)\)/);
  return match ? match[1] : null;
}

/* ----------------------------------------------
   MODALS per avvisi e successi
----------------------------------------------- */
function showWarningModal(message) {
  const warningModal = document.getElementById("warningModal");
  const warningMessageText = document.getElementById("warningMessageText");
  warningMessageText.textContent = message;
  warningModal.style.display = "block";
}

function closeWarningModal() {
  const warningModal = document.getElementById("warningModal");
  warningModal.style.display = "none";
}

function openModal() {
  const modal = document.getElementById("messageModal");
  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("messageModal");
  modal.style.display = "none";
}

/* ----------------------------------------------
   Event Listener per chiudere i Modal cliccando fuori
----------------------------------------------- */
window.onclick = function(event) {
  const warningModal = document.getElementById("warningModal");
  const messageModal = document.getElementById("messageModal");
  if (event.target === warningModal) {
    warningModal.style.display = 'none';
  }
  if (event.target === messageModal) {
    messageModal.style.display = 'none';
  }
}
