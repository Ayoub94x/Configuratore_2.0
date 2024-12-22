// admin/admin_list.js

// Seleziona gli elementi HTML
const reloadButton = document.getElementById('reloadButton');
const customersTableBody = document.querySelector('#customersTable tbody');
const popupModal = document.getElementById('popupModal');
const popupMessageText = document.getElementById('popupMessageText');
const popupCloseButton = document.getElementById('closePopupModal');

const editModal = document.getElementById('editModal');
const closeEditModalButton = document.getElementById('closeEditModal');
const editForm = document.getElementById('editForm');

// Campi del form di modifica
const editCustomerId = document.getElementById('editCustomerId');
const editCorpoContenitore = document.getElementById('editCorpoContenitore');
const editBascule = document.getElementById('editBascule');
const editGancio = document.getElementById('editGancio');
const editBocche = document.getElementById('editBocche');
const editGuidaATerra = document.getElementById('editGuidaATerra');
const editAdesivo = document.getElementById('editAdesivo');
const editOptional = document.getElementById('editOptional');
const editExtraType = document.getElementById('editExtraType');
const editExtraValue = document.getElementById('editExtraValue');

// Elementi per il Modal di Eliminazione
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalButton = document.getElementById('closeDeleteModal');
const confirmDeleteCodeInput = document.getElementById('confirmDeleteCode');
const confirmDeleteButton = document.getElementById('confirmDeleteButton');

// Variabile per memorizzare l'ID del cliente da eliminare
let customerIdToDelete = null;
let customerCodeToDelete = '';

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

// Chiudi delete modal
closeDeleteModalButton.addEventListener('click', () => {
    deleteModal.style.display = 'none';
    resetDeleteModal();
});

// Reset del Modal di Eliminazione
function resetDeleteModal() {
    customerIdToDelete = null;
    customerCodeToDelete = '';
    confirmDeleteCodeInput.value = '';
    confirmDeleteButton.disabled = true;
}

// Chiudi modali cliccando fuori
window.addEventListener('click', (event) => {
    if (event.target === popupModal) {
        popupModal.style.display = 'none';
    }
    if (event.target === editModal) {
        editModal.style.display = 'none';
    }
    if (event.target === deleteModal) {
        deleteModal.style.display = 'none';
        resetDeleteModal();
    }
});

// Carica i clienti dal server
async function loadCustomers() {
    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/');
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Errore nel recupero dei clienti:', errorText);
            showPopup('Errore nel recupero dei clienti.', true);
            return;
        }
        const customers = await response.json();
        renderCustomers(customers);
    } catch (error) {
        console.error('Errore nel recupero dei clienti:', error);
        showPopup('Errore nel recupero dei clienti.', true);
    }
}

// Renderizza i clienti nella tabella
function renderCustomers(customers) {
    customersTableBody.innerHTML = '';
    customers.forEach(customer => {
        const tr = document.createElement('tr');

        // Codice
        const tdCode = document.createElement('td');
        tdCode.textContent = customer.code;
        tr.appendChild(tdCode);

        // Nome
        const tdName = document.createElement('td');
        tdName.textContent = customer.name;
        tr.appendChild(tdName);

        // Sconti (%)
        const tdDiscounts = document.createElement('td');
        const d = customer.discounts;
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
        const ed = customer.extra_discount;
        tdExtra.innerHTML = `
            <strong>Tipo:</strong> ${capitalizeFirstLetter(ed.type)}<br>
            <strong>Valore:</strong> ${ed.type === 'percentuale' ? ed.value + '%' : ed.value}<br>
            <strong>Active:</strong> ${ed.active ? 'Sì' : 'No'}
        `;
        tr.appendChild(tdExtra);

        // Utilizzi
        const tdUsage = document.createElement('td');
        tdUsage.innerHTML = `
            <strong>Usati:</strong> ${customer.usage_count}<br>
            <strong>Limite:</strong> ${customer.usage_limit !== null ? customer.usage_limit : 'Illimitato'}
        `;
        tr.appendChild(tdUsage);

        // Stato
        const tdStatus = document.createElement('td');
        tdStatus.innerHTML = `
            <span class="${customer.is_active ? 'status-active' : 'status-inactive'}">
                ${customer.is_active ? 'Attivo' : 'Inattivo'}
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
        toggleButton.textContent = customer.is_active ? 'Disattiva' : 'Attiva';
        toggleButton.classList.add('btn-toggle');
        toggleButton.addEventListener('click', () => toggleCustomerStatus(customer._id, !customer.is_active));
        actionButtonsDiv.appendChild(toggleButton);

        // Bottone modifica
        const editButton = document.createElement('button');
        editButton.textContent = 'Modifica';
        editButton.classList.add('btn-edit');
        editButton.addEventListener('click', () => openEditModal(customer));
        actionButtonsDiv.appendChild(editButton);

        // Bottone elimina
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Elimina';
        deleteButton.classList.add('btn-delete');
        deleteButton.addEventListener('click', () => openDeleteModal(customer));
        actionButtonsDiv.appendChild(deleteButton);

        tdActions.appendChild(actionButtonsDiv);
        tr.appendChild(tdActions);

        customersTableBody.appendChild(tr);
    });
}

// Funzione per capitalizzare la prima lettera
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Toggle stato cliente
async function toggleCustomerStatus(id, newStatus) {
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
            loadCustomers();
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore nell\'aggiornamento dello stato del cliente:', error);
        showPopup('Errore di connessione al server.', true);
    }
}

// Apri il modal di modifica
function openEditModal(customer) {
    editCustomerId.value = customer._id;
    editCorpoContenitore.value = customer.discounts.corpo_contenitore;
    editBascule.value = customer.discounts.bascule;
    editGancio.value = customer.discounts.gancio;
    editBocche.value = customer.discounts.bocche;
    editGuidaATerra.value = customer.discounts.guida_a_terra;
    editAdesivo.value = customer.discounts.adesivo;
    editOptional.value = customer.discounts.optional;
    editExtraType.value = customer.extra_discount.type;
    editExtraValue.value = customer.extra_discount.value;

    editModal.style.display = 'block';
}

// Gestisci la sottomissione del form di modifica
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
            loadCustomers();
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore nella modifica del cliente:', error);
        showPopup('Errore di connessione al server.', true);
    }
});

// Funzione per aprire il modal di eliminazione
function openDeleteModal(customer) {
    customerIdToDelete = customer._id;
    customerCodeToDelete = customer.code;
    confirmDeleteCodeInput.value = '';
    confirmDeleteButton.disabled = true;
    deleteModal.style.display = 'block';
}

// Verifica il codice inserito per abilitare il pulsante di eliminazione
confirmDeleteCodeInput.addEventListener('input', () => {
    const enteredCode = confirmDeleteCodeInput.value.trim();
    if (enteredCode === customerCodeToDelete) {
        confirmDeleteButton.disabled = false;
    } else {
        confirmDeleteButton.disabled = true;
    }
});

// Gestisci la conferma di eliminazione
confirmDeleteButton.addEventListener('click', async () => {
    if (!customerIdToDelete) return;

    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/' + customerIdToDelete, {
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
            deleteModal.style.display = 'none';
            resetDeleteModal();
            return;
        }

        if (response.ok) {
            showPopup('Cliente eliminato con successo!');
            deleteModal.style.display = 'none';
            resetDeleteModal();
            loadCustomers();
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore nell\'eliminazione del cliente:', error);
        showPopup('Errore di connessione al server.', true);
        deleteModal.style.display = 'none';
        resetDeleteModal();
    }
});

// Carica i clienti all'avvio
reloadButton.addEventListener('click', loadCustomers);
window.addEventListener('load', loadCustomers);
