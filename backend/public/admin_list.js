// admin/admin_list.js

// Seleziona gli elementi HTML per Sconti
const reloadScontiButton = document.getElementById('reloadScontiButton');
const scontiTableBody = document.querySelector('#scontiTable tbody');

// Seleziona gli elementi HTML per Mezzi
const reloadMezziButton = document.getElementById('reloadMezziButton');
const mezziTableBody = document.querySelector('#mezziTable tbody');

// Seleziona gli elementi HTML dei Modali Sconto
const popupModal = document.getElementById('popupModal');
const popupMessageText = document.getElementById('popupMessageText');
const popupCloseButton = document.getElementById('closePopupModal');

const editModal = document.getElementById('editModal');
const closeEditModalButton = document.getElementById('closeEditModal');
const editForm = document.getElementById('editForm');

// Seleziona gli elementi HTML dei Modali Mezzo
const editMezzoModal = document.getElementById('editMezzoModal');
const closeEditMezzoModalButton = document.getElementById('closeEditMezzoModal');
const editMezzoForm = document.getElementById('editMezzoForm');

const deleteMezzoModal = document.getElementById('deleteMezzoModal');
const closeDeleteMezzoModalButton = document.getElementById('closeDeleteMezzoModal');
const confirmDeleteMezzoCodeInput = document.getElementById('confirmDeleteMezzoId');
const confirmDeleteMezzoButton = document.getElementById('confirmDeleteMezzoButton');

// Variabile per memorizzare l'ID del mezzo da eliminare
let mezzoIdToDelete = null;

// Funzione per mostrare il popup
function showPopup(message, isError = false) {
    popupMessageText.textContent = message;
    const modalContent = popupModal.querySelector('.modal-content');
    modalContent.classList.remove('success', 'error');
    modalContent.classList.add(isError ? 'error' : 'success');
    popupModal.style.display = 'block';
}

// Chiudi popup
popupCloseButton.addEventListener('click', () => {
    popupModal.style.display = 'none';
});

// Chiudi edit modal
closeEditModalButton.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// Chiudi edit mezzo modal
closeEditMezzoModalButton.addEventListener('click', () => {
    editMezzoModal.style.display = 'none';
});

// Chiudi delete mezzo modal
closeDeleteMezzoModalButton.addEventListener('click', () => {
    deleteMezzoModal.style.display = 'none';
    resetDeleteMezzoModal();
});

// Reset del Modal di Eliminazione Mezzo
function resetDeleteMezzoModal() {
    mezzoIdToDelete = null;
    confirmDeleteMezzoCodeInput.value = '';
    confirmDeleteMezzoButton.disabled = true;
}

// Chiudi modali cliccando fuori
window.addEventListener('click', (event) => {
    if (event.target === popupModal) {
        popupModal.style.display = 'none';
    }
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
    if (event.target === editMezzoModal) {
        editMezzoModal.style.display = 'none';
    }
    if (event.target === deleteMezzoModal) {
        deleteMezzoModal.style.display = 'none';
        resetDeleteMezzoModal();
    }
});

// Carica i clienti dal server
async function loadSconti() {
    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/');
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Errore nel recupero dei clienti:', errorText);
            showPopup('Errore nel recupero dei clienti.', true);
            return;
        }
        const sconti = await response.json();
        renderSconti(sconti);
    } catch (error) {
        console.error('Errore nel recupero dei clienti:', error);
        showPopup('Errore nel recupero dei clienti.', true);
    }
}

// Renderizza i clienti nella tabella
function renderSconti(sconti) {
    scontiTableBody.innerHTML = '';
    sconti.forEach(sconto => {
        const tr = document.createElement('tr');

        // Codice
        const tdCode = document.createElement('td');
        tdCode.textContent = sconto.code;
        tr.appendChild(tdCode);

        // Nome
        const tdName = document.createElement('td');
        tdName.textContent = sconto.name;
        tr.appendChild(tdName);

        // Sconti (%)
        const tdDiscounts = document.createElement('td');
        const d = sconto.discounts;
        tdDiscounts.innerHTML = `
            Corpo: ${d.corpo_contenitore}%<br>
            Bascule: ${d.bascule}%<br>
            Gancio: ${d.gancio}%<br>
            Bocche: ${d.bocche}%<br>
            Guida a Terra: ${d.guida_a_terra}%<br>
            Adesivo: ${d.adesivo}%<br>
            Optional: ${d.optional}%
        `;
        tr.appendChild(tdDiscounts);

        // Extra sconto
        const tdExtra = document.createElement('td');
        const ed = sconto.extra_discount;
        tdExtra.innerHTML = `
            <strong>Tipo:</strong> ${capitalizeFirstLetter(ed.type)}<br>
            <strong>Valore:</strong> ${ed.type === 'percentuale' ? ed.value + '%' : ed.value}<br>
            <strong>Active:</strong> ${ed.active ? 'Sì' : 'No'}
        `;
        tr.appendChild(tdExtra);

        // Utilizzi
        const tdUsage = document.createElement('td');
        tdUsage.innerHTML = `
            <strong>Usati:</strong> ${sconto.usage_count}<br>
            <strong>Limite:</strong> ${sconto.usage_limit !== null ? sconto.usage_limit : 'Illimitato'}
        `;
        tr.appendChild(tdUsage);

        // Stato
        const tdStatus = document.createElement('td');
        tdStatus.innerHTML = `
            <span class="${sconto.is_active ? 'status-active' : 'status-inactive'}">
                ${sconto.is_active ? 'Attivo' : 'Inattivo'}
            </span>
        `;
        tr.appendChild(tdStatus);

        // Azioni
        const tdActions = document.createElement('td');
        
        // Contenitore Flex per i pulsanti
        const actionButtonsDiv = document.createElement('div');
        actionButtonsDiv.classList.add('action-buttons');

        // Bottone attiva/disattiva
        const toggleButton = document.createElement('button');
        toggleButton.textContent = sconto.is_active ? 'Disattiva' : 'Attiva';
        toggleButton.classList.add('btn-toggle');
        toggleButton.addEventListener('click', () => toggleScontoStatus(sconto._id, !sconto.is_active));
        actionButtonsDiv.appendChild(toggleButton);

        // Bottone modifica
        const editButton = document.createElement('button');
        editButton.textContent = 'Modifica';
        editButton.classList.add('btn-edit');
        editButton.addEventListener('click', () => openEditModal(sconto));
        actionButtonsDiv.appendChild(editButton);

        // Bottone elimina
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Elimina';
        deleteButton.classList.add('btn-delete');
        deleteButton.addEventListener('click', () => openDeleteModal(sconto));
        actionButtonsDiv.appendChild(deleteButton);

        tdActions.appendChild(actionButtonsDiv);
        tr.appendChild(tdActions);

        scontiTableBody.appendChild(tr);
    });
}

// Funzione per capitalizzare la prima lettera
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Toggle stato sconto
async function toggleScontoStatus(id, newStatus) {
    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newStatus })
        });

        // Controlla il content-type prima di parsare come JSON
        const contentType = response.headers.get('content-type');
        let result;
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const textResult = await response.text();
            console.error('Risposta non JSON:', textResult);
            showPopup('Errore nel server.', true);
            return;
        }

        if (response.ok) {
            showPopup('Stato cliente aggiornato con successo!');
            loadSconti();
            loadMezzi(); // Aggiorna anche la sezione mezzi se necessario
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento dello stato del cliente:', error);
        showPopup('Errore di connessione al server.', true);
    }
}

// Apri il modal di modifica sconto
function openEditModal(sconto) {
    editForm.reset();
    editCustomerId.value = sconto._id;
    // Imposta i valori dei campi
    // ... (come nel tuo codice originale) ...

    editModal.style.display = 'block';
}

// Gestisci la sottomissione del form di modifica sconto
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editCustomerId.value;
    const body = {
        discounts: {
            corpo_contenitore: parseFloat(editCorpoContenitore.value),
            bascule: parseFloat(editBascule.value),
            gancio: parseFloat(editGancio.value),
            bocche: parseFloat(editBocche.value),
            guida_a_terra: parseFloat(editGuidaATerra.value),
            adesivo: parseFloat(editAdesivo.value),
            optional: parseFloat(editOptional.value)
        },
        extra_discount: {
            type: editExtraType.value,
            value: parseFloat(editExtraValue.value),
            active: true // Puoi gestire l'attivazione separatamente se necessario
        }
    };

    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Controlla il content-type prima di parsare come JSON
        const contentType = response.headers.get('content-type');
        let result;
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const textResult = await response.text();
            console.error('Risposta non JSON:', textResult);
            showPopup('Errore nel server.', true);
            return;
        }

        if (response.ok) {
            showPopup('Cliente aggiornato con successo!');
            editModal.style.display = 'none';
            loadSconti();
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore nella modifica del cliente:', error);
        showPopup('Errore di connessione al server.', true);
    }
});

// Apri il modal di eliminazione sconto
function openDeleteModal(sconto) {
    mezzoIdToDelete = null; // Reset della variabile
    customerIdToDelete = null; // Mantiene per sconti
    // Reimposta il campo di input
    // ... (come nel tuo codice originale) ...
    deleteModal.style.display = 'block';
}

// Gestisci la conferma di eliminazione sconto
// ... (come nel tuo codice originale) ...

// Carica i mezzi dal server
async function loadMezzi() {
    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/');
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

        // ID
        const tdId = document.createElement('td');
        tdId.textContent = mezzo._id;
        tr.appendChild(tdId);

        // Nome
        const tdNome = document.createElement('td');
        tdNome.textContent = mezzo.nome;
        tr.appendChild(tdNome);

        // Prezzo
        const tdPrezzo = document.createElement('td');
        tdPrezzo.textContent = mezzo.prezzo.toFixed(2) + ' €';
        tr.appendChild(tdPrezzo);

        // Stato
        const tdStato = document.createElement('td');
        tdStato.innerHTML = `
            <span class="${mezzo.is_active ? 'status-active' : 'status-inactive'}">
                ${mezzo.is_active ? 'Attivo' : 'Inattivo'}
            </span>
        `;
        tr.appendChild(tdStato);

        // Azioni
        const tdAzioni = document.createElement('td');
        
        // Contenitore Flex per i pulsanti
        const actionButtonsDiv = document.createElement('div');
        actionButtonsDiv.classList.add('action-buttons');

        // Bottone attiva/disattiva
        const toggleMezzoButton = document.createElement('button');
        toggleMezzoButton.textContent = mezzo.is_active ? 'Disattiva' : 'Attiva';
        toggleMezzoButton.classList.add('btn-toggle-mezzo');
        toggleMezzoButton.addEventListener('click', () => toggleMezzoStatus(mezzo._id, !mezzo.is_active));
        actionButtonsDiv.appendChild(toggleMezzoButton);

        // Bottone modifica
        const editMezzoButton = document.createElement('button');
        editMezzoButton.textContent = 'Modifica';
        editMezzoButton.classList.add('btn-edit-mezzo');
        editMezzoButton.addEventListener('click', () => openEditMezzoModal(mezzo));
        actionButtonsDiv.appendChild(editMezzoButton);

        // Bottone elimina
        const deleteMezzoButton = document.createElement('button');
        deleteMezzoButton.textContent = 'Elimina';
        deleteMezzoButton.classList.add('btn-delete-mezzo');
        deleteMezzoButton.addEventListener('click', () => openDeleteMezzoModal(mezzo));
        actionButtonsDiv.appendChild(deleteMezzoButton);

        tdAzioni.appendChild(actionButtonsDiv);
        tr.appendChild(tdAzioni);

        mezziTableBody.appendChild(tr);
    });
}

// Toggle stato mezzo
async function toggleMezzoStatus(id, newStatus) {
    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: newStatus })
        });

        // Controlla il content-type prima di parsare come JSON
        const contentType = response.headers.get('content-type');
        let result;
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const textResult = await response.text();
            console.error('Risposta non JSON:', textResult);
            showPopup('Errore nel server.', true);
            return;
        }

        if (response.ok) {
            showPopup('Stato mezzo aggiornato con successo!');
            loadMezzi();
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento dello stato del mezzo:', error);
        showPopup('Errore di connessione al server.', true);
    }
}

// Apri il modal di modifica mezzo
function openEditMezzoModal(mezzo) {
    editMezzoForm.reset();
    document.getElementById('editMezzoId').value = mezzo._id;
    document.getElementById('editMezzoNome').value = mezzo.nome;
    document.getElementById('editMezzoPrezzo').value = mezzo.prezzo;

    editMezzoModal.style.display = 'block';
}

// Gestisci la sottomissione del form di modifica mezzo
editMezzoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editMezzoId').value;
    const body = {
        nome: document.getElementById('editMezzoNome').value.trim(),
        prezzo: parseFloat(document.getElementById('editMezzoPrezzo').value)
    };

    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Controlla il content-type prima di parsare come JSON
        const contentType = response.headers.get('content-type');
        let result;
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const textResult = await response.text();
            console.error('Risposta non JSON:', textResult);
            showPopup('Errore nel server.', true);
            return;
        }

        if (response.ok) {
            showPopup('Mezzo aggiornato con successo!');
            editMezzoModal.style.display = 'none';
            loadMezzi();
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore nella modifica del mezzo:', error);
        showPopup('Errore di connessione al server.', true);
    }
});

// Apri il modal di eliminazione mezzo
function openDeleteMezzoModal(mezzo) {
    mezzoIdToDelete = mezzo._id;
    confirmDeleteMezzoCodeInput.value = '';
    confirmDeleteMezzoButton.disabled = true;
    deleteMezzoModal.style.display = 'block';
}

// Verifica l'ID inserito per abilitare il pulsante di eliminazione mezzo
confirmDeleteMezzoCodeInput.addEventListener('input', () => {
    const enteredId = confirmDeleteMezzoCodeInput.value.trim();
    if (enteredId === mezzoIdToDelete) {
        confirmDeleteMezzoButton.disabled = false;
    } else {
        confirmDeleteMezzoButton.disabled = true;
    }
});

// Gestisci la conferma di eliminazione mezzo
confirmDeleteMezzoButton.addEventListener('click', async () => {
    if (!mezzoIdToDelete) return;

    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/costumers/' + mezzoIdToDelete, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        // Controlla il content-type prima di parsare come JSON
        const contentType = response.headers.get('content-type');
        let result;
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const textResult = await response.text();
            console.error('Risposta non JSON:', textResult);
            showPopup('Errore nel server.', true);
            deleteMezzoModal.style.display = 'none';
            resetDeleteMezzoModal();
            return;
        }

        if (response.ok) {
            showPopup('Mezzo eliminato con successo!');
            deleteMezzoModal.style.display = 'none';
            resetDeleteMezzoModal();
            loadMezzi();
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore nell\'eliminazione del mezzo:', error);
        showPopup('Errore di connessione al server.', true);
        deleteMezzoModal.style.display = 'none';
        resetDeleteMezzoModal();
    }
});

// Carica i mezzi all'avvio
reloadMezziButton.addEventListener('click', loadMezzi);
window.addEventListener('load', () => {
    loadSconti();
    loadMezzi();
});
