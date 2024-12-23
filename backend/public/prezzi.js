// admin.js

/**
 * Funzione per mostrare il modal di avviso
 * @param {string} message - Il messaggio da mostrare
 */
function showWarningModal(message) {
    const warningModal = document.getElementById("warningModal");
    const warningMessageText = document.getElementById("warningMessageText");
    warningMessageText.textContent = message;
    warningModal.style.display = "block";
  }
  
  /**
   * Funzione per chiudere il modal di avviso
   */
  function closeWarningModal() {
    const warningModal = document.getElementById("warningModal");
    warningModal.style.display = "none";
  }
  
  /**
   * Funzione per mostrare il modal di successo
   * @param {string} message - Il messaggio da mostrare
   */
  function showSuccessModal(message) {
    const successModal = document.getElementById("successModal");
    const successMessageText = document.getElementById("successMessageText");
    successMessageText.textContent = message;
    successModal.style.display = "block";
  }
  
  /**
   * Funzione per chiudere il modal di successo
   */
  function closeSuccessModal() {
    const successModal = document.getElementById("successModal");
    successModal.style.display = "none";
  }
  
  /**
   * Event Listener per chiudere i modali cliccando fuori
   */
  window.onclick = function(event) {
    const warningModal = document.getElementById("warningModal");
    const successModal = document.getElementById("successModal");
    if (warningModal && event.target === warningModal) {
      warningModal.style.display = 'none';
    }
    if (successModal && event.target === successModal) {
      successModal.style.display = 'none';
    }
  }
  
  /**
   * Gestisce il login dell'admin
   */
  document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();
  
    const username = 'admin';
    const password = '123';
  
    if (!username || !password) {
      showWarningModal("Per favore, inserisci username e password.");
      return;
    }
  
    try {
      // Chiamata al server per autenticazione
      const response = await fetch('https://configuratore-2-0.onrender.com/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore durante il login.');
      }
  
      const data = await response.json();
      // Supponiamo che il server ritorni un token di autenticazione
      localStorage.setItem('adminToken', data.token);
  
      // Nascondi la sezione di login e mostra quella admin
      document.getElementById("login-section").style.display = "none";
      document.getElementById("admin-section").style.display = "block";
  
      // Carica i prezzi
      loadPrices();
    } catch (error) {
      console.error(error);
      showWarningModal(`Errore: ${error.message}`);
    }
  });
  
  /**
   * Carica i prezzi dalle API e popola le tabelle
   */
  async function loadPrices() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      showWarningModal("Token di autenticazione mancante.");
      return;
    }
  
    try {
      // Fetch prezzi per Contenitori
      const responseContenitori = await fetch('https://configuratore-2-0.onrender.com/api/admin/get-contenitori-prices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!responseContenitori.ok) {
        const errorData = await responseContenitori.json();
        throw new Error(errorData.message || 'Errore nel recupero dei prezzi dei Contenitori.');
      }
  
      const contenitoriData = await responseContenitori.json();
      populateTable('contenitori-table', contenitoriData);
  
      // Fetch prezzi per Mezzi
      const responseMezzi = await fetch('https://configuratore-2-0.onrender.com/api/admin/get-mezzi-prices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!responseMezzi.ok) {
        const errorData = await responseMezzi.json();
        throw new Error(errorData.message || 'Errore nel recupero dei prezzi dei Mezzi.');
      }
  
      const mezziData = await responseMezzi.json();
      populateTable('mezzi-table', mezziData);
    } catch (error) {
      console.error(error);
      showWarningModal(`Errore: ${error.message}`);
    }
  }
  
  /**
   * Popola una tabella con i dati dei prezzi
   * @param {string} tableId - L'ID della tabella da popolare
   * @param {object} data - I dati dei prezzi
   */
  function populateTable(tableId, data) {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    tableBody.innerHTML = ""; // Svuota la tabella
  
    for (let categoria in data) {
      const opzioni = data[categoria];
      for (let opzione in opzioni) {
        const prezzo = opzioni[opzione];
        const row = document.createElement('tr');
  
        const categoriaCell = document.createElement('td');
        categoriaCell.textContent = categoria;
  
        const opzioneCell = document.createElement('td');
        opzioneCell.textContent = opzione;
  
        const prezzoCell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '0.01';
        input.value = prezzo;
        input.classList.add('table-input');
        input.dataset.categoria = categoria;
        input.dataset.opzione = opzione;
        prezzoCell.appendChild(input);
  
        row.appendChild(categoriaCell);
        row.appendChild(opzioneCell);
        row.appendChild(prezzoCell);
  
        tableBody.appendChild(row);
      }
    }
  }
  
  /**
   * Salva le modifiche ai prezzi
   */
  document.getElementById("save-contenitori").addEventListener("click", async () => {
    await savePrices('contenitori-table', 'contenitori');
  });
  
  document.getElementById("save-mezzi").addEventListener("click", async () => {
    await savePrices('mezzi-table', 'mezzi');
  });
  
  /**
   * Salva i prezzi aggiornati al server
   * @param {string} tableId - L'ID della tabella da salvare
   * @param {string} tipo - 'contenitori' o 'mezzi'
   */
  async function savePrices(tableId, tipo) {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      showWarningModal("Token di autenticazione mancante.");
      return;
    }
  
    const table = document.getElementById(tableId);
    const inputs = table.querySelectorAll('input.table-input');
  
    let updatedPrices = {};
  
    inputs.forEach(input => {
      const categoria = input.dataset.categoria;
      const opzione = input.dataset.opzione;
      const prezzo = parseFloat(input.value);
  
      if (!updatedPrices[categoria]) {
        updatedPrices[categoria] = {};
      }
      updatedPrices[categoria][opzione] = prezzo;
    });
  
    try {
      const endpoint = tipo === 'contenitori' 
        ? 'https://configuratore-2-0.onrender.com/api/admin/update-contenitori-prices'
        : 'https://configuratore-2-0.onrender.com/api/admin/update-mezzi-prices';
  
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedPrices)
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore nel salvataggio dei prezzi.');
      }
  
      showSuccessModal("I prezzi sono stati aggiornati con successo!");
    } catch (error) {
      console.error(error);
      showWarningModal(`Errore: ${error.message}`);
    }
  }
  
  /**
   * Gestisce la navigazione tra le tab
   */
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Rimuovi la classe active da tutti i bottoni
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // Aggiungi la classe active al bottone cliccato
      button.classList.add('active');
  
      const target = button.dataset.target;
  
      // Nascondi tutti i contenuti delle tab
      tabContents.forEach(content => content.classList.remove('active'));
      // Mostra il contenuto della tab selezionata
      document.getElementById(target).classList.add('active');
    });
  });
  