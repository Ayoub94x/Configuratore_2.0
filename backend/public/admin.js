// admin.js

const addCustomerForm = document.getElementById('addCustomerForm');
const modal = document.getElementById('popupModal');
const messageText = document.getElementById('popupMessageText');
const modalContent = modal.querySelector('.modal-content');
const closeButton = document.getElementById('closeModalButton');

function showPopup(message, isError = false) {
    modalContent.classList.remove('success', 'error');
    modalContent.classList.add(isError ? 'error' : 'success');
    messageText.textContent = message;
    modal.style.display = 'block';
}

closeButton.addEventListener('click', function() {
    modal.style.display = 'none';
});

window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

addCustomerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Raccolta dati cliente
    const code = document.getElementById('code').value.trim();
    const name = document.getElementById('name').value.trim();
    
    // Raccolta sconti per i Contenitori
    const corpo_contenitore = parseFloat(document.getElementById('corpo_contenitore').value);
    const bascule = parseFloat(document.getElementById('bascule').value);
    const gancio = parseFloat(document.getElementById('gancio').value);
    const bocche = parseFloat(document.getElementById('bocche').value);
    const guida_a_terra = parseFloat(document.getElementById('guida_a_terra').value);
    const adesivo = parseFloat(document.getElementById('adesivo').value);
    const optional = parseFloat(document.getElementById('optional').value);
    
    // Raccolta sconti per i Mezzi
    const AUTOMEZZI = parseFloat(document.getElementById('AUTOMEZZI').value);
    const Allestimento = parseFloat(document.getElementById('Allestimento').value);
    const GRU = parseFloat(document.getElementById('GRU').value);
    const Compattatore = parseFloat(document.getElementById('Compattatore').value);
    const Lavacontenitori = parseFloat(document.getElementById('Lavacontenitori').value);
    const Accessori = parseFloat(document.getElementById('Accessori').value);
    const PLUS = parseFloat(document.getElementById('PLUS').value);
    
    // Raccolta Extra Sconto
    const extra_type = document.getElementById('extra_type').value;
    const extra_value = parseFloat(document.getElementById('extra_value').value);
    const usage_limit_input = document.getElementById('usage_limit').value;
    const usage_limit = usage_limit_input ? parseInt(usage_limit_input) : null;

    // Validazione dei dati
    if (!code || !name ||
        isNaN(corpo_contenitore) || isNaN(bascule) || isNaN(gancio) ||
        isNaN(bocche) || isNaN(guida_a_terra) || isNaN(adesivo) ||
        isNaN(optional) || isNaN(AUTOMEZZI) || isNaN(Allestimento) ||
        isNaN(GRU) || isNaN(Compattatore) || isNaN(Lavacontenitori) ||
        isNaN(Accessori) || isNaN(PLUS) || isNaN(extra_value)) {
        showPopup('Per favore, compila correttamente tutti i campi.', true);
        return;
    }

    // Creazione dell'oggetto customerData con sconti per Contenitori e Mezzi
    const customerData = {
        code,
        name,
        discounts: {
            // Sconti per Contenitori
            corpo_contenitore,
            bascule,
            gancio,
            bocche,
            guida_a_terra,
            adesivo,
            optional,
            // Sconti per Mezzi
            AUTOMEZZI,
            Allestimento,
            GRU,
            Compattatore,
            Lavacontenitori,
            Accessori,
            PLUS
        },
        extra_discount: {
            type: extra_type,
            value: extra_value,
            active: true
        },
        usage_limit,
        is_active: true
    };

    try {
        const response = await fetch('https://configuratore-2-0.onrender.com/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });

        let result;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            result = await response.json();
        } else {
            const textResult = await response.text();
            result = { message: textResult };
        }

        if (response.ok) {
            showPopup('Il cliente è stato aggiunto con successo al database!');
            addCustomerForm.reset();
        } else {
            showPopup('Errore: ' + (result.message || 'Errore sconosciuto.'), true);
        }
    } catch (error) {
        console.error('Errore di connessione al server:', error);
        showPopup('Errore di connessione al server.', true);
    }
});
