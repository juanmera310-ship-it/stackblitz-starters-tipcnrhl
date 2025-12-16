const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const progressEl = document.getElementById('progress');
const levelEl = document.getElementById('level');
const timeEl = document.getElementById('time');
const pauseBtn = document.getElementById('pauseBtn');
const levelOverlay = document.getElementById('levelOverlay');
const levelMsg = document.getElementById('levelMsg');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartBtn = document.getElementById('restartBtn');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Configuración Global ---
let isPaused = false;
let isGameOver = false;
let level = 1;
const MAX_LEVEL = 50;

// Configuración de Tiempo
const SECONDS_PER_FRUIT = 3.5; 

// --- CONFIGURACIÓN DE DISPARO AUTOMÁTICO ---
let lastShotTime = 0; 
const FIRE_RATE_MS = 300; // Velocidad de disparo (300ms)

let fruitsHitInThisLevel = 0;
let timeLeft = 0;
let currentTarget = 10;

let touchX = canvas.width / 2;
let bullets = [];
let fruits = [];
let particles = [];

const fruitEmojis = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍍', '🥑', '🥥', '🥭'];
const playerY = canvas.height - 90;

function getTarget(lvl) { return lvl * 10; }

function getDifficulty(lvl) {
    return {
        minSpeed: 3 + (lvl * 0.2), 
        maxSpeed: 5 + (lvl * 0.4),
        spawnRate: Math.min(0.03 + (lvl * 0.004), 0.25),
        rotSpeed: 0.05 + (lvl * 0.008)
    };
}

function startLevel(lvl) {
    level = lvl;
    fruitsHitInThisLevel = 0;
    currentTarget = getTarget(level);
    timeLeft = Math.ceil(currentTarget * SECONDS_PER_FRUIT);
    bullets = [];
    fruits = [];
    particles = [];
    levelEl.innerText = level;
    progressEl.innerText = `0/${currentTarget}`;
    timeEl.innerText = timeLeft;
    if (lvl > 1) showLevelUpMsg();
}

function restartGame() {
    isGameOver = false;
    isPaused = false;
    gameOverScreen.style.display = 'none';
    startLevel(1);
    lastTime = performance.now();
    gameLoop(lastTime);
}

// --- Dibujado ---
function drawPlayerShip(x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.fillStyle = '#1565C0';
    ctx.moveTo(0, -50);
    ctx.lineTo(50, 10); ctx.lineTo(40, 30);
    ctx.lineTo(15, 40); ctx.lineTo(-15, 40);
    ctx.lineTo(-40, 30); ctx.lineTo(-50, 10);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#42A5F5';
    ctx.stroke();

    ctx.fillStyle = '#FFAB00';
    ctx.font = '900 28px Arial Black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FF3D00'; 
    ctx.shadowBlur = 20;
    ctx.fillText("JAM", 0, 10);
    ctx.shadowBlur = 0;
    ctx.restore();
}

// --- Controles ---
pauseBtn.addEventListener('click', () => {
    if (isGameOver) return;
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "▶️" : "⏸️";
});

restartBtn.addEventListener('click', restartGame);

window.addEventListener('mousemove', (e) => { if(!isPaused && !isGameOver) touchX = e.clientX; });

// Solo movemos la nave, NO disparamos al tocar
window.addEventListener('touchmove', (e) => { 
    if(!isPaused && !isGameOver) touchX = e.touches[0].clientX; 
    e.preventDefault();
}, { passive: false });

function shoot() {
    bullets.push({
        x: touchX,
        y: playerY - 60,
        size: 40,
        emoji: '🔪',
        speed: 18, 
        rotation: -Math.PI / 4
    });
}

function createSliceEffect(x, y, emoji, size) {
    for (let i = 0; i < 2; i++) {
        particles.push({
            x: x, y: y,
            speedX: (i === 0 ? -1 : 1) * (Math.random() * 6 + 4), 
            speedY: -Math.random() * 6 - 3,
            gravity: 0.4,
            emoji: emoji,
            size: size * 0.7,
            rotation: Math.random() * Math.PI,
            rotSpeed: (i === 0 ? -0.25 : 0.25),
            alpha: 1.0,
            decay: 0.03
        });
    }
}

function triggerGameOver() {
    isGameOver = true;
    gameOverScreen.style.display = 'flex';
}

function showLevelUpMsg() {
    levelOverlay.style.display = 'block';
    levelMsg.innerText = `¡NIVEL ${level}!`;
    setTimeout(() => {
        levelOverlay.style.display = 'none';
    }, 1500);
}

// --- Bucle Principal ---
let lastTime = 0;
startLevel(1);

function gameLoop(timestamp) {
    if (isPaused || isGameOver) {
        requestAnimationFrame(gameLoop);
        lastTime = timestamp;
        return;
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    const diff = getDifficulty(level);

    // Tiempo
    timeLeft -= deltaTime / 1000;
    timeEl.innerText = Math.ceil(timeLeft);

    if (timeLeft <= 0) {
        timeLeft = 0;
        timeEl.innerText = "0";
        triggerGameOver();
        return;
    }

    // --- AQUÍ ESTÁ EL DISPARO AUTOMÁTICO ---
    // Si ha pasado el tiempo (FIRE_RATE_MS), dispara
    if (timestamp - lastShotTime > FIRE_RATE_MS) {
        shoot();
        lastShotTime = timestamp; 
    }

    // Dibujar
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawPlayerShip(touchX, playerY);

    // Balas
    bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(bullet.rotation);
        ctx.font = `${bullet.size}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(bullet.emoji, 0, 0);
        ctx.restore();
        if (bullet.y + bullet.size < 0) bullets.splice(index, 1);
    });

    // Frutas
    if (Math.random() < diff.spawnRate) { 
        const size = Math.random() * 45 + 45;
        fruits.push({
            x: Math.random() * (canvas.width - size) + size/2,
            y: -100,
            size: size,
            speed: Math.random() * (diff.maxSpeed - diff.minSpeed) + diff.minSpeed,
            emoji: fruitEmojis[Math.floor(Math.random() * fruitEmojis.length)],
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * diff.rotSpeed * 2 
        });
    }

    fruits.forEach((fruit, fIndex) => {
        fruit.y += fruit.speed;
        fruit.rotation += fruit.rotSpeed;

        ctx.save();
        ctx.translate(fruit.x, fruit.y);
        ctx.rotate(fruit.rotation);
        ctx.font = `${fruit.size}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(fruit.emoji, 0, 0);
        ctx.restore();

        if (fruit.y - fruit.size > canvas.height) fruits.splice(fIndex, 1);

        bullets.forEach((bullet, bIndex) => {
            const dist = Math.hypot(bullet.x - fruit.x, bullet.y - fruit.y);
            if (dist < (fruit.size / 2.2) + (bullet.size / 3)) {
                
                fruitsHitInThisLevel++;
                progressEl.innerText = `${fruitsHitInThisLevel}/${currentTarget}`;

                if (fruitsHitInThisLevel >= currentTarget) {
                    if (level < MAX_LEVEL) {
                        startLevel(level + 1);
                    } else {
                         levelOverlay.innerText = "¡JAM MASTER SUPREMO!";
                         levelOverlay.style.display = 'block';
                         isGameOver = true;
                    }
                }

                createSliceEffect(fruit.x, fruit.y, fruit.emoji, fruit.size);
                fruits.splice(fIndex, 1);
                bullets.splice(bIndex, 1);
            }
        });
    });

    // Partículas
    particles.forEach((p, index) => {
        p.x += p.speedX; p.y += p.speedY;
        p.speedY += p.gravity; p.rotation += p.rotSpeed;
        p.alpha -= p.decay;
        if (p.alpha <= 0) particles.splice(index, 1);
        else {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.font = `${p.size}px serif`;
            ctx.fillText(p.emoji, 0, 0);
            ctx.restore();
        }
    });

    requestAnimationFrame(gameLoop);
}

lastTime = performance.now();
gameLoop(lastTime);

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});