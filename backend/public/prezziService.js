// public/js/prezziService.js
async function fetchPrezzi() {
    try {
      const response = await fetch('/api/prezzi');
      if (!response.ok) {
        throw new Error('Errore nel recupero dei prezzi.');
      }
      const prezzi = await response.json();
      return prezzi;
    } catch (error) {
      console.error(error);
      showWarningModal(`Errore: ${error.message}`);
      return [];
    }
  }
  