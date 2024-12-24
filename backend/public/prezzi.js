// public/admin/prezz.js

document.addEventListener('DOMContentLoaded', () => {
  caricaPrezzi();

  const aggiungiForm = document.getElementById('aggiungiPrezzoForm');
  aggiungiForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoria = document.getElementById('categoria').value.trim();
    const prezzo = parseFloat(document.getElementById('prezzo').value);

    if (!categoria || isNaN(prezzo) || prezzo < 0) {
      showWarningModal("Per favore, inserisci una categoria valida e un prezzo positivo.");
      return;
    }

    try {
      const response = await fetch('/api/prezzi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, prezzo })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Errore nell\'aggiunta del prezzo.');
      }

      showSuccessModal('Prezzo aggiunto con successo!');
      aggiungiForm.reset();
      caricaPrezzi();
    } catch (error) {
      showWarningModal(`Errore: ${error.message}`);
    }
  });
});

// Funzione per caricare e mostrare i prezzi nella tabella
async function caricaPrezzi() {
  const prezzi = await fetchPrezzi();
  const tbody = document.querySelector('#prezziTable tbody');
  tbody.innerHTML = '';

  prezzi.forEach(prezzo => {
    const tr = document.createElement('tr');

    const tdCategoria = document.createElement('td');
    tdCategoria.textContent = prezzo.categoria;
    tr.appendChild(tdCategoria);

    const tdPrezzo = document.createElement('td');
    tdPrezzo.textContent = prezzo.prezzo.toFixed(2);
    tr.appendChild(tdPrezzo);

    const tdAzioni = document.createElement('td');

    const btnModifica = document.createElement('button');
    btnModifica.textContent = 'Modifica';
    btnModifica.classList.add('edit-btn');
    btnModifica.onclick = () => apriModificaPrezzo(prezzo);
    tdAzioni.appendChild(btnModifica);

    const btnElimina = document.createElement('button');
    btnElimina.textContent = 'Elimina';
    btnElimina.classList.add('delete-btn');
    btnElimina.onclick = () => eliminaPrezzo(prezzo.categoria);
    tdAzioni.appendChild(btnElimina);

    tr.appendChild(tdAzioni);

    tbody.appendChild(tr);
  });
}

// Funzione per aprire un prompt di modifica del prezzo
async function apriModificaPrezzo(prezzo) {
  const nuovoPrezzo = prompt(`Inserisci il nuovo prezzo per "${prezzo.categoria}":`, prezzo.prezzo);
  if (nuovoPrezzo === null) return; // Cancellato

  const prezzoNumero = parseFloat(nuovoPrezzo);
  if (isNaN(prezzoNumero) || prezzoNumero < 0) {
    showWarningModal("Inserisci un prezzo valido e positivo.");
    return;
  }

  try {
    const response = await fetch('/api/prezzi', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria: prezzo.categoria, prezzo: prezzoNumero })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Errore nell\'aggiornamento del prezzo.');
    }

    showSuccessModal('Prezzo aggiornato con successo!');
    caricaPrezzi();
  } catch (error) {
    showWarningModal(`Errore: ${error.message}`);
  }
}

// Funzione per eliminare un prezzo
async function eliminaPrezzo(categoria) {
  if (!confirm(`Sei sicuro di voler eliminare il prezzo per "${categoria}"?`)) return;

  try {
    // Potresti voler implementare un endpoint DELETE se necessario
    // Altrimenti, considera di utilizzare PUT per settare il prezzo a 0 o simile
    // Per questa risposta, supponiamo di implementare un endpoint DELETE

    const response = await fetch(`/api/prezzi/${categoria}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Errore nell\'eliminazione del prezzo.');
    }

    showSuccessModal('Prezzo eliminato con successo!');
    caricaPrezzi();
  } catch (error) {
    showWarningModal(`Errore: ${error.message}`);
  }
}

// Funzioni per gestire i modali
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

function showSuccessModal(message) {
  const successModal = document.getElementById("successModal");
  const successMessageText = document.getElementById("successMessageText");
  successMessageText.textContent = message;
  successModal.style.display = "block";
}

function closeSuccessModal() {
  const successModal = document.getElementById("successModal");
  successModal.style.display = "none";
}

// Event Listener per chiudere i Modal cliccando fuori
window.onclick = function(event) {
  const warningModal = document.getElementById("warningModal");
  const successModal = document.getElementById("successModal");
  if (event.target === warningModal) {
    warningModal.style.display = "none";
  }
  if (event.target === successModal) {
    successModal.style.display = "none";
  }
}
