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
    
    const code = document.getElementById('code').value.trim();
    const name = document.getElementById('name').value.trim();
    const corpo_contenitore = parseFloat(document.getElementById('corpo_contenitore').value);
    const bascule = parseFloat(document.getElementById('bascule').value);
    const gancio = parseFloat(document.getElementById('gancio').value);
    const bocche = parseFloat(document.getElementById('bocche').value);
    const guida_a_terra = parseFloat(document.getElementById('guida_a_terra').value);
    const adesivo = parseFloat(document.getElementById('adesivo').value);
    const optional = parseFloat(document.getElementById('optional').value);
    
    const extra_type = document.getElementById('extra_type').value;
    const extra_value = parseFloat(document.getElementById('extra_value').value);
    const usage_limit_input = document.getElementById('usage_limit').value;
    const usage_limit = usage_limit_input ? parseInt(usage_limit_input) : null;

    if (!code || !name || isNaN(corpo_contenitore) || isNaN(bascule) || isNaN(gancio) || isNaN(bocche) || isNaN(guida_a_terra) || isNaN(adesivo) || isNaN(optional) || isNaN(extra_value)) {
        showPopup('Per favore, compila correttamente tutti i campi.', true);
        return;
    }

    const customerData = {
        code,
        name,
        discounts: {
            corpo_contenitore,
            bascule,
            gancio,
            bocche,
            guida_a_terra,
            adesivo,
            optional
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
        const response = await fetch('https://37dc-151-67-198-59.ngrok-free.app/api/customers', {
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
