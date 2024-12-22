// public/admin/mezzi.js

// Seleziona gli elementi HTML
const reloadButton = document.getElementById('reloadButton');
const addMezzoButton = document.getElementById('addMezzoButton');
const mezziTableBody = document.querySelector('#mezziTable tbody');
const popupModal = document.getElementById('popupModal');
const popupMessageText = document.getElementById('popupMessageText');
const popupCloseButton = document.getElementById('closePopupModal');

const mezzoModal = document.getElementById('mezzoModal');
const closeMezzoModalButton = document.getElementById('closeMezzoModal');
const mezzoForm = document.getElementById('mezzoForm');

const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalButton = document.getElementById('closeDeleteModal');
const confirmDeleteNameInput = document.getElementById('confirmDeleteName');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');

// Campi del form di mezzo
const mezzoIdInput = document.getElementById('mezzoId');
const categoriaInput = document.getElementById('categoria');
const indicazioniInput = document.getElementById('indicazioni');
const prezzoBaseInput = document.getElementById('prezzo_base');
const scontoPercentualeInput = document.getElementById('sconto_percentuale');
const selezionatoInput = document.getElementById('selezionato');

// Variabili per gestire il delete
let mezzoIdToDelete = null;
let mezzoNomeToDelete = '';

// Funzione per mostrare il popup
function showPopup(message, isError = false) {
    popupMessageText.textContent = message;
    const modalContent = popupModal.querySelector('.modal-content');
    modalContent.style.borderColor = isError ? '#f5c6cb' : '#c3e6cb';
    popupModal.style.display = 'block';
}

// Chiudi popup
popupCloseButton.addEventListener('click', () => {
    popupModal.style.display = 'none';
});

// Chiudi mezzo modal
closeMezzoModalButton.addEventListener('click', () => {
    mezzoModal.style.display = 'none';
    resetMezzoForm();
});

// Chiudi delete modal
closeDeleteModalButton.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    resetDeleteModal();
});

// Reset del form di mezzo
function resetMezzoForm() {
    mezzoIdInput.value = '';
    categoriaInput.value = '';
    indicazioniInput.value = '';
    prezzoBaseInput.value = '';
    scontoPercentualeInput.value = '';
    selezionatoInput.checked = false;
    document.getElementById('mezzoModalTitle').textContent = 'Aggiungi Mezzo';
}

// Reset del modal di delete
function resetDeleteModal() {
    mezzoIdToDelete = null;
    mezzoNomeToDelete = '';
    confirmDeleteNameInput.value = '';
    confirmDeleteButton.disabled = true;
}

// Chiudi modali cliccando fuori
window.addEventListener('click', (event) => {
    if (event.target === popupModal) {
        popupModal.style.display = 'none';
    }
    if (event.target === mezzoModal) {
        mezzoModal.style.display = 'none';
        resetMezzoForm();
    }
    if (event.target === deleteModal) {
        deleteModal.style.display = 'none';
        resetDeleteModal();
    }
});

// Carica i mezzi dal server
async function loadMezzi() {
    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/mezzi/');
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Errore nel recupero dei mezzi:', errorText);
            showPopup('Errore nel recupero dei mezzi.', true);
            return;
        }
        const mezzi = await response.json();
        renderMezzi(mezzi);
    } catch (error) {
        console.error('Errore nel recupero dei mezzi:', error);
        showPopup('Errore nel recupero dei mezzi.', true);
    }
}

// Renderizza i mezzi nella tabella
function renderMezzi(mezzi) {
    mezziTableBody.innerHTML = '';
    mezzi.forEach(mezzo => {
        const tr = document.createElement('tr');

        // Categoria
        const tdCategoria = document.createElement('td');
        tdCategoria.textContent = mezzo.categoria;
        tr.appendChild(tdCategoria);

        // Indicazioni
        const tdIndicazioni = document.createElement('td');
        tdIndicazioni.textContent = mezzo.indicazioni;
        tr.appendChild(tdIndicazioni);

        // Prezzo Base
        const tdPrezzoBase = document.createElement('td');
        tdPrezzoBase.textContent = mezzo.prezzo_base.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
        tr.appendChild(tdPrezzoBase);

        // Sconto %
        const tdSconto = document.createElement('td');
        tdSconto.textContent = mezzo.sconto_percentuale + '%';
        tr.appendChild(tdSconto);

        // Prezzo Scontato
        const tdPrezzoScontato = document.createElement('td');
        tdPrezzoScontato.textContent = mezzo.prezzo_scontato.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
        tr.appendChild(tdPrezzoScontato);

        // Selezionato
        const tdSelezionato = document.createElement('td');
        tdSelezionato.textContent = mezzo.selezionato ? 'Sì' : 'No';
        tr.appendChild(tdSelezionato);

        // Azioni
        const tdAzioni = document.createElement('td');
        
        // Contenitore Flex per i pulsanti
        const actionButtonsDiv = document.createElement('div');
        actionButtonsDiv.classList.add('action-buttons');

        // Bottone modifica
        const editButton = document.createElement('button');
        editButton.textContent = 'Modifica';
        editButton.classList.add('btn', 'btn-edit');
        editButton.addEventListener('click', () => openMezzoModal(mezzo));
        actionButtonsDiv.appendChild(editButton);

        // Bottone elimina
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Elimina';
        deleteButton.classList.add('btn', 'btn-delete');
        deleteButton.addEventListener('click', () => openDeleteModal(mezzo));
        actionButtonsDiv.appendChild(deleteButton);

        tdAzioni.appendChild(actionButtonsDiv);
        tr.appendChild(tdAzioni);

        mezziTableBody.appendChild(tr);
    });
}

// Apri il modal di aggiunta/aggiornamento
function openMezzoModal(mezzo = null) {
    if (mezzo) {
        mezzoIdInput.value = mezzo._id;
        categoriaInput.value = mezzo.categoria;
        indicazioniInput.value = mezzo.indicazioni;
        prezzoBaseInput.value = mezzo.prezzo_base;
        scontoPercentualeInput.value = mezzo.sconto_percentuale;
        selezionatoInput.checked = mezzo.selezionato;
        document.getElementById('mezzoModalTitle').textContent = 'Aggiorna Mezzo';
    } else {
        resetMezzoForm();
    }
    mezzoModal.style.display = 'block';
}

// Gestisci la sottomissione del form di mezzo
mezzoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = mezzoIdInput.value;
    const categoria = categoriaInput.value.trim();
    const indicazioni = indicazioniInput.value.trim();
    const prezzo_base = parseFloat(prezzoBaseInput.value);
    const sconto_percentuale = parseFloat(scontoPercentualeInput.value);
    const selezionato = selezionatoInput.checked;

    if (!categoria || !indicazioni || isNaN(prezzo_base) || isNaN(sconto_percentuale)) {
        showPopup('Per favore, compila tutti i campi obbligatori.', true);
        return;
    }

    const mezzoData = {
        categoria,
        indicazioni,
        prezzo_base,
        sconto_percentuale,
        selezionato
    };

    try {
        let response;
        if (id) {
            // Aggiorna un mezzo esistente
            response = await fetch(`https://configuratore-2-0.onrender.com/api/mezzi/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mezzoData)
            });
        } else {
            // Aggiungi un nuovo mezzo
            response = await fetch('https://configuratore-2-0.onrender.com/api/mezzi/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mezzoData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            showPopup(`Errore: ${errorData.message}`, true);
            return;
        }

        const result = await response.json();
        showPopup(result.message || 'Operazione completata con successo!');
        mezzoModal.style.display = 'none';
        resetMezzoForm();
        loadMezzi();
    } catch (error) {
        console.error('Errore nella gestione del mezzo:', error);
        showPopup('Errore di connessione al server.', true);
    }
});

// Apri il modal di eliminazione
function openDeleteModal(mezzo) {
    mezzoIdToDelete = mezzo._id;
    mezzoNomeToDelete = mezzo.indicazioni;
    confirmDeleteNameInput.value = '';
    confirmDeleteButton.disabled = true;
    deleteModal.style.display = 'block';
}

// Verifica il nome inserito per abilitare il pulsante di eliminazione
confirmDeleteNameInput.addEventListener('input', () => {
    const enteredName = confirmDeleteNameInput.value.trim();
    if (enteredName === mezzoNomeToDelete) {
        confirmDeleteButton.disabled = false;
    } else {
        confirmDeleteButton.disabled = true;
    }
});

// Gestisci la conferma di eliminazione
confirmDeleteButton.addEventListener('click', async () => {
    if (!mezzoIdToDelete) return;

    try {
        const response = await fetch(`https://configuratore-2-0.onrender.com/api/mezzi/${mezzoIdToDelete}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorData = await response.json();
            showPopup(`Errore: ${errorData.message}`, true);
            deleteModal.style.display = 'none';
            resetDeleteModal();
            return;
        }

        const result = await response.json();
        showPopup(result.message || 'Mezzo eliminato con successo!');
        deleteModal.style.display = 'none';
        resetDeleteModal();
        loadMezzi();
    } catch (error) {
        console.error('Errore nell\'eliminazione del mezzo:', error);
        showPopup('Errore di connessione al server.', true);
        deleteModal.style.display = 'none';
        resetDeleteModal();
    }
});

// Carica i mezzi all'avvio
reloadButton.addEventListener('click', loadMezzi);
window.addEventListener('load', loadMezzi);

// Aggiungi mezzo
addMezzoButton.addEventListener('click', () => openMezzoModal());
