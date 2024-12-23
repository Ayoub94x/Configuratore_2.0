// public/admin_mezzi.js

// URL del backend
const API_URL = 'http://localhost:10000/api';

// Elementi DOM
const contenitoriConfigDiv = document.getElementById('contenitori-config');
const mezziConfigDiv = document.getElementById('mezzi-config');
const saveContenitoriBtn = document.getElementById('saveContenitoriBtn');
const saveMezziBtn = document.getElementById('saveMezziBtn');

// Modal
const warningModal = document.getElementById('warningModal');
const warningMessageText = document.getElementById('warningMessageText');
const successModal = document.getElementById('successModal');
const successMessageText = document.getElementById('successMessageText');

// Gestione dei Tab
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-tab');

    // Rimuovi attivi
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));

    // Aggiungi attivo
    button.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// Funzione per mostrare il modal di avviso
function showWarningModal(message) {
  warningMessageText.textContent = message;
  warningModal.style.display = 'block';
}

// Funzione per chiudere il modal di avviso
function closeWarningModal() {
  warningModal.style.display = 'none';
}

// Funzione per mostrare il modal di successo
function showSuccessModal(message) {
  successMessageText.textContent = message;
  successModal.style.display = 'block';
}

// Funzione per chiudere il modal di successo
function closeSuccessModal() {
  successModal.style.display = 'none';
}

// Event Listener per chiudere i Modal cliccando fuori
window.onclick = function(event) {
  if (event.target === warningModal) {
    warningModal.style.display = 'none';
  }
  if (event.target === successModal) {
    successModal.style.display = 'none';
  }
}

// Caricamento delle configurazioni dei Contenitori
async function loadContenitoriConfig() {
  try {
    const response = await fetch(`${API_URL}/contenitori`);
    const data = await response.json();
    if (data.length === 0) {
      contenitoriConfigDiv.innerHTML = '<p>Nessuna configurazione trovata.</p>';
      return;
    }
    const contenitore = data[0]; // Assumiamo un solo documento

    contenitore.categorie.forEach(categoria => {
      const group = document.createElement('div');
      group.classList.add('section-group');

      const title = document.createElement('h3');
      title.textContent = capitalize(categoria.nome);
      group.appendChild(title);

      categoria.prezzi.forEach(prezzo => {
        const label = document.createElement('label');
        label.textContent = `Prezzo per ${prezzo.volume}:`;

        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = prezzo.prezzo;
        input.dataset.categoria = categoria.nome;
        input.dataset.volume = prezzo.volume;

        group.appendChild(label);
        group.appendChild(input);
      });

      contenitoriConfigDiv.appendChild(group);
    });

    // Gestione degli Optional
    if (contenitore.optional && contenitore.optional.length > 0) {
      const group = document.createElement('div');
      group.classList.add('section-group');

      const title = document.createElement('h3');
      title.textContent = 'Optional';
      group.appendChild(title);

      contenitore.optional.forEach(opt => {
        const label = document.createElement('label');
        label.textContent = `Prezzo per ${capitalize(opt.nome)}:`;

        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = opt.prezzo;
        input.dataset.categoria = 'optional';
        input.dataset.opzione = opt.nome;

        group.appendChild(label);
        group.appendChild(input);
      });

      contenitoriConfigDiv.appendChild(group);
    }
  } catch (error) {
    showWarningModal('Errore nel caricamento delle configurazioni dei contenitori.');
    console.error(error);
  }
}

// Caricamento delle configurazioni dei Mezzi
async function loadMezziConfig() {
  try {
    const response = await fetch(`${API_URL}/mezzi`);
    const data = await response.json();
    if (data.length === 0) {
      mezziConfigDiv.innerHTML = '<p>Nessuna configurazione trovata.</p>';
      return;
    }
    const mezzo = data[0]; // Assumiamo un solo documento

    mezzo.categorie.forEach(categoria => {
      const group = document.createElement('div');
      group.classList.add('section-group');

      const title = document.createElement('h3');
      title.textContent = capitalize(categoria.nome.toLowerCase());
      group.appendChild(title);

      const indicazioni = document.createElement('p');
      indicazioni.textContent = categoria.indicazioni;
      group.appendChild(indicazioni);

      categoria.opzioni.forEach(opzione => {
        const label = document.createElement('label');
        label.textContent = `Prezzo per ${capitalize(opzione.nome)}:`;

        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = opzione.prezzo;
        input.dataset.categoria = categoria.nome;
        input.dataset.opzione = opzione.nome;

        group.appendChild(label);
        group.appendChild(input);
      });

      mezziConfigDiv.appendChild(group);
    });
  } catch (error) {
    showWarningModal('Errore nel caricamento delle configurazioni dei mezzi.');
    console.error(error);
  }
}

// Funzione di capitalizzazione
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Inizializza le configurazioni all'avvio
document.addEventListener('DOMContentLoaded', () => {
  loadContenitoriConfig();
  loadMezziConfig();
});

// Salva le configurazioni dei Contenitori
saveContenitoriBtn.addEventListener('click', async () => {
  try {
    const categorie = [];
    const groups = contenitoriConfigDiv.querySelectorAll('.section-group');
    groups.forEach(group => {
      const nome = group.querySelector('h3').textContent;
      if (nome === 'Optional') return; // Gestire gli optional separatamente

      const prezzi = [];
      const inputs = group.querySelectorAll('input');
      inputs.forEach(input => {
        prezzi.push({
          volume: input.dataset.volume,
          prezzo: parseFloat(input.value)
        });
      });

      categorie.push({ nome, prezzi });
    });

    // Gestione degli Optional
    const optionalGroup = Array.from(contenitoriConfigDiv.querySelectorAll('.section-group')).find(group => group.querySelector('h3').textContent === 'Optional');
    let optional = [];
    if (optionalGroup) {
      const optionalInputs = optionalGroup.querySelectorAll('input');
      optionalInputs.forEach(input => {
        optional.push({
          nome: input.dataset.opzione,
          prezzo: parseFloat(input.value)
        });
      });
    }

    // Aggiorna il backend
    for (const categoria of categorie) {
      await fetch(`${API_URL}/contenitori/categoria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoria)
      });
    }

    // Aggiorna gli optional
    for (const opt of optional) {
      await fetch(`${API_URL}/contenitori/optional`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opt)
      });
    }

    showSuccessModal('Configurazioni dei contenitori salvate con successo!');
  } catch (error) {
    showWarningModal('Errore nel salvataggio delle configurazioni dei contenitori.');
    console.error(error);
  }
});

// Salva le configurazioni dei Mezzi
saveMezziBtn.addEventListener('click', async () => {
  try {
    const categorie = [];
    const groups = mezziConfigDiv.querySelectorAll('.section-group');
    groups.forEach(group => {
      const nome = group.querySelector('h3').textContent;
      const indicazioni = group.querySelector('p').textContent;
      const opzioni = [];
      const inputs = group.querySelectorAll('input');
      inputs.forEach(input => {
        opzioni.push({
          nome: input.dataset.opzione,
          prezzo: parseFloat(input.value)
        });
      });

      categorie.push({ nome, indicazioni, opzioni });
    });

    // Aggiorna il backend
    for (const categoria of categorie) {
      await fetch(`${API_URL}/mezzi/categoria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoria)
      });
    }

    showSuccessModal('Configurazioni dei mezzi salvate con successo!');
  } catch (error) {
    showWarningModal('Errore nel salvataggio delle configurazioni dei mezzi.');
    console.error(error);
  }
});
