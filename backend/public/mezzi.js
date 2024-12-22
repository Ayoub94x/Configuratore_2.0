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
const editCustomerId = document.getElementById('editCustomerId'); // Aggiunto
const editCorpoContenitore = document.getElementById('editCorpoContenitore'); // Aggiunto
const editBascule = document.getElementById('editBascule'); // Aggiunto
const editGancio = document.getElementById('editGancio'); // Aggiunto
const editBocche = document.getElementById('editBocche'); // Aggiunto
const editGuidaATerra = document.getElementById('editGuidaATerra'); // Aggiunto
const editAdesivo = document.getElementById('editAdesivo'); // Aggiunto
const editOptional = document.getElementById('editOptional'); // Aggiunto
const editExtraType = document.getElementById('editExtraType'); // Aggiunto
const editExtraValue = document.getElementById('editExtraValue'); // Aggiunto

// Seleziona gli elementi HTML dei Modali Mezzo
const editMezzoModal = document.getElementById('editMezzoModal');
const closeEditMezzoModalButton = document.getElementById('closeEditMezzoModal');
const editMezzoForm = document.getElementById('editMezzoForm');

const deleteMezzoModal = document.getElementById('deleteMezzoModal');
const closeDeleteMezzoModalButton = document.getElementById('closeDeleteMezzoModal');
const confirmDeleteMezzoCodeInput = document.getElementById('confirmDeleteMezzoId');
const confirmDeleteMezzoButton = document.getElementById('confirmDeleteMezzoButton');

// Seleziona gli elementi per "Invia Ordine"
const inviaOrdineBtn = document.getElementById("inviaOrdineBtn");
const messageModal = document.getElementById("messageModal");
const closeMessageModalButton = document.getElementById("closeMessageModal");

// Variabili per eliminazione
let mezzoIdToDelete = null;

// Variabili per selezione e navigazione passi
const mandatorySteps = ["AUTOMEZZI", "Allestimento", "GRU", "Compattatore"];
let currentStep = null; // Identificatore del passo corrente
const summaryStep = "Riepilogo";

// Assumiamo che ogni passo abbia un contenitore con un ID corrispondente
const stepContainers = {
    "AUTOMEZZI": document.getElementById("stepAUTOMEZZI"),
    "Allestimento": document.getElementById("stepAllestimento"),
    "GRU": document.getElementById("stepGRU"),
    "Compattatore": document.getElementById("stepCompattatore"),
    // Altri passi...
    "Riepilogo": document.getElementById("stepRiepilogo")
};

// Seleziona tutti i pulsanti "Avanti" nei passi
const avantiButtons = document.querySelectorAll(".avanti-btn");

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

// Chiudi message modal
closeMessageModalButton.addEventListener('click', () => {
    messageModal.style.display = 'none';
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
    if (event.target === messageModal) {
        messageModal.style.display = 'none';
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
    editCorpoContenitore.value = sconto.discounts.corpo_contenitore;
    editBascule.value = sconto.discounts.bascule;
    editGancio.value = sconto.discounts.gancio;
    editBocche.value = sconto.discounts.bocche;
    editGuidaATerra.value = sconto.discounts.guida_a_terra;
    editAdesivo.value = sconto.discounts.adesivo;
    editOptional.value = sconto.discounts.optional;
    editExtraType.value = sconto.extra_discount.type;
    editExtraValue.value = sconto.extra_discount.value;

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
    // Reimposta il campo di input
    mezzoIdToDelete = sconto._id;
    mezzoCodeToDelete = sconto.code; // Aggiunto
    confirmDeleteMezzoCodeInput.value = '';
    confirmDeleteMezzoButton.disabled = true;
    deleteMezzoModal.style.display = 'block';
}

// Gestisci la conferma di eliminazione sconto
confirmDeleteMezzoCodeInput.addEventListener('input', () => {
    const enteredCode = confirmDeleteMezzoCodeInput.value.trim();
    const expectedCode = mezzoCodeToDelete || '';
    if (enteredCode === expectedCode) {
        confirmDeleteMezzoButton.disabled = false;
    } else {
        confirmDeleteMezzoButton.disabled = true;
    }
});

confirmDeleteMezzoButton.addEventListener('click', async () => {
    if (!mezzoIdToDelete) return;

    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers/' + mezzoIdToDelete, {
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
            showPopup('Cliente eliminato con successo!');
            deleteMezzoModal.style.display = 'none';
            resetDeleteMezzoModal();
            loadSconti();
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
        const response = await fetch('https://configuratore-2-0.onrender.com/api/mezzi/' + id, {
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
        const response = await fetch('https://configuratore-2-0.onrender.com/api/mezzi/' + id, {
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
    mezzoCodeToDelete = mezzo.code; // Assicurati di dichiarare questa variabile
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
        const response = await fetch('https://configuratore-2-0.onrender.com/api/mezzi/' + mezzoIdToDelete, {
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

/* ----------------------------------------------
   Funzione di capitalizzazione di una stringa
----------------------------------------------- */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ----------------------------------------------
   Oggetto di Configurazione Globale
----------------------------------------------- */
let configurazione = {
    userInfo: {
        nome: "Mario",
        cognome: "Rossi",
        azienda: "Esempio SRL"
    },
    customer: {
        code: "SC2023",
        name: "Mario Rossi",
        discounts: {
            corpo_contenitore: 10,
            bascule: 15,
            gancio: 5,
            bocche: 20,
            guida_a_terra: 10,
            adesivo: 5,
            optional: 0
        },
        extra_discount: {
            type: "percentuale",
            value: 5,
            active: true
        },
        usage_limit: 100,
        is_active: true,
        usage_count: 10
    },
    selections: {
        AUTOMEZZI: {
            nome: "Automezzo Tipo A",
            prezzo: 10000.00,
            sconto: 10
        },
        Allestimento: {
            nome: "Allestimento Base",
            prezzo: 5000.00,
            sconto: 15
        },
        GRU: {
            nome: "GRU Tipo X",
            prezzo: 8000.00,
            sconto: 5
        },
        Compattatore: {
            nome: "Compattatore Standard",
            prezzo: 7000.00,
            sconto: 20
        },
        Lavacontenitori: {
            nome: "Lavacontenitori Pro",
            prezzo: 6000.00,
            sconto: 10
        },
        Contenitori: {
            nome: "Contenitore Standard",
            prezzo: 4000.00,
            sconto: "Varie",
            scontoDettaglio: "Corpo: 10%, Gancio: 5%"
        },
        Accessori: {
            nome: "Antenna UHF",
            prezzo: 6693.00,
            sconto: 0
        },
        PLUS: {
            nome: "Trasporto",
            prezzo: 1000.00,
            sconto: 0
        }
    },
    prezzoTotale: 0,               // Prezzo totale base (senza quantità/sconti finali)
    scontoExtra: 0,                // Valore in €
    prezzoTotaleScontato: 0,       // Prezzo totale scontato finale
    currentStep: null,             // Passo corrente
    quantità: 1,                    // Quantità selezionata
    modifiedSteps: []              // Array per tracciare i passi modificati
};

/* ----------------------------------------------
   Formattazione della Valuta
----------------------------------------------- */
function formatCurrency(value) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}

/* ----------------------------------------------
   Gestione del Pulsante "Invia Ordine"
----------------------------------------------- */
if (inviaOrdineBtn) {
    inviaOrdineBtn.addEventListener("click", async () => {
        // Procedi con l'invio dell'ordine
        await inviaConfigurazione();
    });
}

/* ----------------------------------------------
   Invia la configurazione: genera PDF + mailto + aggiorna uso del codice sconto
----------------------------------------------- */
async function inviaConfigurazione() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const logoURL = "Logo.jpg"; // Assicurati che il percorso sia corretto

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
                if (categoria === "optional") {
                    if (configurazione.selections.optional && configurazione.selections.optional.items && configurazione.selections.optional.items.length > 0) {
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
            doc.save("resoconto.pdf");

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
                showPopup(`Errore: ${error.message}`, true);
                return;
            }

            // Prepara il mailto
            const toEmail = "ayoub.majdouli@esa-italy.com"; // Sostituisci con la tua email
            const subject = encodeURIComponent("Nuova Configurazione Utente");

            let body = `Nome: ${configurazione.userInfo.nome}\nCognome: ${configurazione.userInfo.cognome}\nAzienda: ${configurazione.userInfo.azienda}\nQuantità: ${configurazione.quantità}\n\nSelezioni:\n`;

            for (let categoria in configurazione.selections) {
                if (categoria === "optional") {
                    if (configurazione.selections.optional && configurazione.selections.optional.items && configurazione.selections.optional.items.length > 0) {
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
            
            // Creare un link temporaneo per avviare il client di posta
            const tempLink = document.createElement('a');
            tempLink.href = mailtoLink;
            tempLink.click();

            // Mostra il modale di conferma
            messageModal.style.display = 'block';
        };
        img.onerror = function () {
            showPopup("Errore nel caricamento del logo.", true);
        };
    } catch (error) {
        console.error("Errore durante la generazione del PDF:", error);
        showPopup("Errore durante la generazione del PDF.", true);
    }
}

/* ----------------------------------------------
   Gestione dei Passi del Configuratore
----------------------------------------------- */
avantiButtons.forEach(button => {
    button.addEventListener('click', () => {
        const stepId = button.getAttribute('data-step'); // Assumiamo che ogni pulsante abbia un data-step attribuito
        handleAvanti(stepId);
    });
});

/**
 * Gestisce il click su un pulsante "Avanti"
 * @param {string} stepId - L'ID del passo corrente
 */
function handleAvanti(stepId) {
    currentStep = stepId;

    // Se il passo è uno dei passi obbligatori, verifica che una selezione sia stata fatta
    if (mandatorySteps.includes(currentStep)) {
        const selectedOption = getSelectedOption(currentStep);
        if (!selectedOption) {
            showPopup(`Per procedere, devi effettuare una selezione nel passo "${capitalize(currentStep)}".`, true);
            return;
        }
    }

    // Determina il prossimo passo
    let nextStep = getNextStep(currentStep);

    // Se l'utente ha appena modificato una selezione, vai direttamente al riepilogo
    if (isStepModified(currentStep)) {
        nextStep = summaryStep;
    }

    // Nascondi il passo corrente
    if (stepContainers[currentStep]) {
        stepContainers[currentStep].style.display = 'none';
    }

    // Mostra il prossimo passo
    if (stepContainers[nextStep]) {
        stepContainers[nextStep].style.display = 'block';
    }

    // Se il prossimo passo è riepilogo, resetta i passi modificati
    if (nextStep === summaryStep) {
        resetModifiedSteps();
    }
}

/**
 * Ottiene la prossima step dato il passo corrente
 * @param {string} currentStep
 * @returns {string} nextStep
 */
function getNextStep(currentStep) {
    const stepOrder = ["AUTOMEZZI", "Allestimento", "GRU", "Compattatore", "Lavacontenitori", "Contenitori", "Accessori", "PLUS", "Riepilogo"];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
        return summaryStep;
    }
    return stepOrder[currentIndex + 1];
}

/**
 * Verifica se un passo è stato modificato
 * @param {string} stepId
 * @returns {boolean}
 */
function isStepModified(stepId) {
    // Implementa la logica per verificare se il passo è stato modificato
    // Ad esempio, potresti tenere traccia dei passi modificati in un array
    // Per semplicità, supponiamo che ogni volta che "Avanti" viene premuto dopo una modifica, il passo sia considerato modificato
    return configurazione.modifiedSteps && configurazione.modifiedSteps.includes(stepId);
}

/**
 * Ottiene l'opzione selezionata in un passo
 * @param {string} stepId
 * @returns {string|null} selectedOption
 */
function getSelectedOption(stepId) {
    // Implementa la logica per ottenere l'opzione selezionata per un dato passo
    // Ad esempio, supponiamo che ogni passo abbia un set di radio buttons con name corrispondente al passo
    const radios = document.getElementsByName(stepId);
    for (let radio of radios) {
        if (radio.checked) {
            return radio.value;
        }
    }
    return null;
}

/**
 * Segna un passo come modificato
 * @param {string} stepId
 */
function markStepAsModified(stepId) {
    if (!configurazione.modifiedSteps) {
        configurazione.modifiedSteps = [];
    }
    if (!configurazione.modifiedSteps.includes(stepId)) {
        configurazione.modifiedSteps.push(stepId);
    }
}

/**
 * Reset dei passi modificati
 */
function resetModifiedSteps() {
    configurazione.modifiedSteps = [];
}

/* ----------------------------------------------
   Gestione del Pulsante "Modifica" nella Configurazione
----------------------------------------------- */
// Dichiarazione unica
const modificaButtons = document.querySelectorAll(".modifica-btn");
modificaButtons.forEach(button => {
    button.addEventListener('click', () => {
        const stepId = button.getAttribute('data-step'); // Assumiamo che ogni pulsante abbia un data-step attribuito
        openEditStep(stepId);
    });
});

/**
 * Apre la schermata di modifica per un passo specifico
 * @param {string} stepId
 */
function openEditStep(stepId) {
    // Nascondi il riepilogo se visibile
    if (stepContainers[summaryStep]) {
        stepContainers[summaryStep].style.display = 'none';
    }

    // Mostra il passo di modifica
    if (stepContainers[stepId]) {
        stepContainers[stepId].style.display = 'block';
    }

    // Imposta currentStep
    currentStep = stepId;
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
    const messageModal = document.getElementById("messageModal");
    if (warningModal && event.target === warningModal) {
        warningModal.style.display = 'none';
    }
    if (messageModal && event.target === messageModal) {
        messageModal.style.display = 'none';
    }
};
