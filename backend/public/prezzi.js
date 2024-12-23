// admin.js

// Selettori di riferimento
const optionsTableDiv = document.getElementById("optionsTable");
const reloadBtn = document.getElementById("reloadBtn");
const saveBtn = document.getElementById("saveBtn");

const successModal = document.getElementById("successModal");
const closeModalBtn = document.getElementById("closeModalBtn");

const errorModal = document.getElementById("errorModal");
const errorMessage = document.getElementById("errorMessage");
const closeErrorModalBtn = document.getElementById("closeErrorModalBtn");

/* ----------------------------------------
   EVENT LISTENERS
---------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadPrices(); // Carica i prezzi al caricamento della pagina
});

reloadBtn.addEventListener("click", () => {
  loadPrices();
});

saveBtn.addEventListener("click", () => {
  savePrices();
});

closeModalBtn.addEventListener("click", () => {
  successModal.style.display = "none";
});

closeErrorModalBtn.addEventListener("click", () => {
  errorModal.style.display = "none";
});

// Chiudi i modali cliccando al di fuori del contenuto
window.onclick = (event) => {
  if (event.target === successModal) {
    successModal.style.display = "none";
  }
  if (event.target === errorModal) {
    errorModal.style.display = "none";
  }
};

/* ----------------------------------------
   FUNZIONI PER CHIAMATE AL SERVER (SIMULATE)
---------------------------------------- */

/**
 * Carica la lista opzioni e prezzi dal server (simulato)
 */
async function loadPrices() {
  try {
    // Simuliamo la chiamata al server con fetch
    // In un caso reale: fetch('/api/prices')
    // Qui usiamo un setTimeout per simulare un ritardo di rete
    const fakeServerResponse = await new Promise((resolve) => {
      setTimeout(() => {
        // Dati di esempio
        const data = [
          { id: 1, categoria: "Corpo Contenitore (1750L)", prezzo: 520.00 },
          { id: 2, categoria: "Corpo Contenitore (2100L)", prezzo: 550.00 },
          { id: 3, categoria: "Bascule Ferro (2100L)", prezzo: 290.00 },
          { id: 4, categoria: "Bascule HDPE (3000L)", prezzo: 155.00 },
          { id: 5, categoria: "Gancio F90 (2500L)", prezzo: 310.00 },
          { id: 6, categoria: "Feritoia Metallo (2100L)", prezzo: 205.00 },
          { id: 7, categoria: "Guida a Terra Metallo (2700L)", prezzo: 31.00 },
          { id: 8, categoria: "Adesivo", prezzo: 28.40 },
          { id: 9, categoria: "Pedale (Optional)", prezzo: 77.00 },
          { id: 10, categoria: "Elettronica (Optional)", prezzo: 850.00 }
        ];
        resolve({ ok: true, data });
      }, 600);
    });

    if (!fakeServerResponse.ok) {
      throw new Error("Errore nel caricamento dei prezzi dal server.");
    }

    // Renderizziamo la tabella
    renderOptionsTable(fakeServerResponse.data);

  } catch (error) {
    showErrorModal(error.message);
  }
}

/**
 * Salva i nuovi prezzi sul server (simulato)
 */
async function savePrices() {
  try {
    // Raccogli i dati correnti della tabella
    const updatedData = [];
    const rows = document.querySelectorAll(".option-row");
    rows.forEach((row) => {
      const id = parseInt(row.dataset.id, 10);
      const categoria = row.querySelector(".option-category").innerText.trim();
      const priceInput = row.querySelector(".price-input");
      const prezzo = parseFloat(priceInput.value);

      updatedData.push({ id, categoria, prezzo });
    });

    // Simuliamo la chiamata al server con fetch
    // Esempio reale: fetch('/api/prices', { method: 'PUT', body: JSON.stringify(updatedData), ... })
    const fakeUpdateResponse = await new Promise((resolve) => {
      setTimeout(() => {
        // Supponiamo che tutto sia andato a buon fine
        resolve({ ok: true });
      }, 800);
    });

    if (!fakeUpdateResponse.ok) {
      throw new Error("Errore nel salvataggio dei prezzi.");
    }

    // Se tutto ok, mostra modal di successo
    showSuccessModal();
  } catch (error) {
    showErrorModal(error.message);
  }
}

/* ----------------------------------------
   FUNZIONI DI RENDERING
---------------------------------------- */

/**
 * Crea l'HTML della tabella con i dati delle opzioni
 * @param {Array} data - array di oggetti { id, categoria, prezzo }
 */
function renderOptionsTable(data) {
  // Costruiamo la tabella
  let html = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Categoria/Opzione</th>
          <th>Prezzo (€)</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach((item) => {
    html += `
      <tr class="option-row" data-id="${item.id}">
        <td>${item.id}</td>
        <td class="option-category">${item.categoria}</td>
        <td>
          <input 
            type="number" 
            class="price-input" 
            value="${item.prezzo.toFixed(2)}" 
            step="0.01" 
            min="0" 
            required
          />
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  optionsTableDiv.innerHTML = html;
}

/* ----------------------------------------
   FUNZIONI PER I MODAL
---------------------------------------- */

function showSuccessModal() {
  successModal.style.display = "block";
}

function showErrorModal(msg) {
  errorMessage.textContent = msg;
  errorModal.style.display = "block";
}
