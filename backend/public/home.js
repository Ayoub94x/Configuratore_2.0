// Inizializzazione di AOS
AOS.init({
    duration: 1200, // Durata dell'animazione
});

// Effetti aggiuntivi con JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const productCards = document.querySelectorAll('.product-card');

    // Effetto parallax leggero al passaggio del mouse
    productCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const { width, height } = card.getBoundingClientRect();
            const xAxis = (width / 2 - e.offsetX) / 50; // Ridotto l'intensità
            const yAxis = (height / 2 - e.offsetY) / 50; // Ridotto l'intensità
            card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `rotateY(0deg) rotateX(0deg)`;
        });
    });

    // Animazione di caricamento delle immagini
    const images = document.querySelectorAll('.product-image');
    images.forEach(img => {
        img.addEventListener('load', () => {
            img.classList.add('loaded');
        });
    });
});
