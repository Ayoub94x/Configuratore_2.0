// Mouse movement parallax effect
document.addEventListener('mousemove', (e) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;

    // Calculate mouse position in percentage
    const x = clientX / innerWidth;
    const y = clientY / innerHeight;

    // Update glow position
    document.querySelector('.glow').style.setProperty('--x', clientX + 'px');
    document.querySelector('.glow').style.setProperty('--y', clientY + 'px');

    // Move logo
    const logo = document.getElementById('logoContainer');
    const moveX = (x - 0.5) * 30;
    const moveY = (y - 0.5) * 30;
    logo.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) rotateX(${-moveY}deg) rotateY(${moveX}deg)`;

    // Move title
    const title = document.getElementById('title');
    const titleMoveX = (x - 0.5) * 20;
    const titleMoveY = (y - 0.5) * 20;
    title.style.transform = `translate3d(${titleMoveX}px, ${titleMoveY}px, 0)`;

    // Move particles
    const particles = document.querySelectorAll('.particle');
    particles.forEach(particle => {
        const speed = particle.dataset.speed || (Math.random() * 0.5 + 0.5);
        const particleX = (x - 0.5) * 40 * speed;
        const particleY = (y - 0.5) * 40 * speed;
        particle.style.transform = `translate3d(${particleX}px, ${particleY}px, 0)`;
    });
});

// Create particles
const particlesContainer = document.getElementById('particles');
const particlesCount = 100;

for (let i = 0; i < particlesCount; i++) {
    createParticle();
}

function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';

    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = Math.random() * 4 + 2;
    const speed = Math.random() * 0.5 + 0.5;

    particle.style.left = x + '%';
    particle.style.top = y + '%';
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    particle.dataset.speed = speed;

    particlesContainer.appendChild(particle);
}

// Add hover effect to logo
const logoContainer = document.getElementById('logoContainer');
logoContainer.addEventListener('mousemove', (e) => {
    const rect = logoContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 10;
    const rotateY = -(x - centerX) / 10;

    document.getElementById('logo').style.transform =
        `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(50px)`;
});

logoContainer.addEventListener('mouseleave', () => {
    document.getElementById('logo').style.transform =
        'rotateX(0deg) rotateY(0deg) translateZ(0px)';
});