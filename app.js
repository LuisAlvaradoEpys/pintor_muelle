// ===================================
// EL PINTOR DEL MUELLE - JUEGO COMPLETO
// ===================================

// ============ ESTADO DEL JUEGO ============
const gameState = {
    money: 0,
    reputation: 0,
    paintings: [],
    currentCanvas: null,
    canvasStartTime: Date.now(),
    strokeCount: 0,
    colorsUsed: new Set(),
    missionProgress: 0,
    missionCompleted: false,
    undoStack: [],
    redoStack: [],
};

// ============ CONFIGURACIÓN DEL CANVAS ============
let canvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentTool = 'pluma';
let currentColor = '#000000';
let brushSize = 5;
let opacity = 1;

// ============ EFECTOS DE SONIDO ============
let audioContext;

function initSounds() {
    // Inicializar contexto de audio
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(soundName) {
    if (!audioContext) return;
    
    if (soundName === 'burn') {
        playBurnSound();
    } else if (soundName === 'sell') {
        playSellSound();
    }
}

function playBurnSound() {
    // Crear un sonido de fuego/quemado usando osciladores
    const duration = 2.0;
    const now = audioContext.currentTime;
    
    // Oscilador principal (ruido de fuego)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, now);
    oscillator.frequency.exponentialRampToValueAtTime(50, now + duration);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + duration);
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
    
    // Agregar crepitar del fuego
    for (let i = 0; i < 20; i++) {
        const crackTime = now + Math.random() * duration;
        const crackOsc = audioContext.createOscillator();
        const crackGain = audioContext.createGain();
        
        crackOsc.type = 'square';
        crackOsc.frequency.value = 1000 + Math.random() * 2000;
        
        crackGain.gain.setValueAtTime(0, crackTime);
        crackGain.gain.linearRampToValueAtTime(0.1, crackTime + 0.01);
        crackGain.gain.exponentialRampToValueAtTime(0.01, crackTime + 0.1);
        
        crackOsc.connect(crackGain);
        crackGain.connect(audioContext.destination);
        
        crackOsc.start(crackTime);
        crackOsc.stop(crackTime + 0.1);
    }
}

function playSellSound() {
    // Crear un sonido de monedas/dinero
    const now = audioContext.currentTime;
    
    // Sonido de caja registradora
    for (let i = 0; i < 3; i++) {
        const coinTime = now + i * 0.15;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800 + i * 200, coinTime);
        oscillator.frequency.exponentialRampToValueAtTime(600 + i * 200, coinTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, coinTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, coinTime + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(coinTime);
        oscillator.stop(coinTime + 0.2);
    }
    
    // Sonido de satisfacción (tono ascendente)
    const successOsc = audioContext.createOscillator();
    const successGain = audioContext.createGain();
    
    successOsc.type = 'triangle';
    successOsc.frequency.setValueAtTime(400, now + 0.5);
    successOsc.frequency.exponentialRampToValueAtTime(800, now + 0.8);
    
    successGain.gain.setValueAtTime(0.2, now + 0.5);
    successGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    successOsc.connect(successGain);
    successGain.connect(audioContext.destination);
    
    successOsc.start(now + 0.5);
    successOsc.stop(now + 0.8);
}

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', () => {
    initIntro();
    loadGameData();
    initSounds();
});

// ============ ANIMACIÓN DE INTRODUCCIÓN ============
function initIntro() {
    const introScreen = document.getElementById('intro-screen');
    const storyLines = document.querySelectorAll('.story-line');
    const startBtn = document.getElementById('start-game-btn');
    const buttonsContainer = document.getElementById('buttons-container');
    let introSkipped = false;

    // Función para saltar la introducción
    const skipIntro = () => {
        if (introSkipped) return;
        introSkipped = true;
        
        // Mostrar todo inmediatamente
        document.querySelector('.intro-title').style.opacity = '1';
        storyLines.forEach(line => line.style.opacity = '1');
        if (buttonsContainer) {
            buttonsContainer.style.opacity = '1';
        }
        if (startBtn && !buttonsContainer) {
            startBtn.style.opacity = '1';
        }
    };

    // Permitir saltar con ESPACIO o ENTER
    const skipHandler = (e) => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            skipIntro();
            document.removeEventListener('keydown', skipHandler);
        }
    };
    document.addEventListener('keydown', skipHandler);

    // Animar título (más rápido)
    setTimeout(() => {
        if (introSkipped) return;
        document.querySelector('.intro-title').style.opacity = '1';
        document.querySelector('.intro-title').style.transition = 'opacity 0.8s ease-in';
    }, 300);

    // Animar líneas de historia (mucho más rápido)
    storyLines.forEach((line, index) => {
        setTimeout(() => {
            if (introSkipped) return;
            line.style.opacity = '1';
            line.style.transition = 'opacity 0.5s ease-in';
        }, 800 + (index * 200)); // Reducido de 800ms a 200ms entre líneas
    });

    // Mostrar botones de inicio (aparecen más rápido)
    const showButtonsDelay = 800 + (storyLines.length * 200) + 300;
    setTimeout(() => {
        if (introSkipped) return;
        if (buttonsContainer) {
            buttonsContainer.style.opacity = '1';
            buttonsContainer.style.transition = 'opacity 0.8s ease-in';
        }
        // Fallback para el botón individual si no existe el contenedor
        if (startBtn && !buttonsContainer) {
            startBtn.style.opacity = '1';
            startBtn.style.transition = 'opacity 0.8s ease-in';
        }
    }, showButtonsDelay);

    // Evento de inicio
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            document.removeEventListener('keydown', skipHandler);
            anime({
                targets: introScreen,
                opacity: [1, 0],
                duration: 800,
                easing: 'easeInOutQuad',
                complete: () => {
                    introScreen.style.display = 'none';
                    document.getElementById('game-screen').classList.remove('hidden');
                    initGame();
                }
            });
        });
    }
}

// ============ INICIALIZAR JUEGO ============
function initGame() {
    canvas = document.getElementById('drawing-canvas');
    ctx = canvas.getContext('2d');
    
    // Configurar canvas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Eventos de dibujo
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Eventos táctiles
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Inicializar controles
    initControls();
    
    // Actualizar UI
    updateUI();
    
    // Iniciar contador de tiempo
    startCanvasTimer();
    
    // Verificar misión pendiente
    checkMissionStatus();
    
    // Guardar estado inicial para deshacer
    saveState();
}

// ============ CONTROLES ============
function initControls() {
    // Herramientas
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
        });
    });
    
    // Colores predefinidos
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentColor = btn.dataset.color;
            document.getElementById('custom-color').value = currentColor;
        });
    });
    
    // Selector de color personalizado
    const customColorInput = document.getElementById('custom-color');
    const colorHexDisplay = document.getElementById('color-hex');
    
    customColorInput.addEventListener('input', (e) => {
        currentColor = e.target.value;
        if (colorHexDisplay) {
            colorHexDisplay.textContent = e.target.value.toUpperCase();
        }
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    });
    
    // Actualizar el hex display cuando se selecciona un color predefinido
    document.querySelectorAll('.color-btn').forEach(btn => {
        const originalListener = btn.onclick;
        btn.addEventListener('click', () => {
            if (customColorInput && colorHexDisplay) {
                customColorInput.value = currentColor;
                colorHexDisplay.textContent = currentColor.toUpperCase();
            }
        });
    });
    
    // Tamaño del pincel
    const brushSizeInput = document.getElementById('brush-size');
    brushSizeInput.addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        document.getElementById('brush-size-display').textContent = brushSize;
    });
    
    // Opacidad
    const opacityInput = document.getElementById('opacity');
    opacityInput.addEventListener('input', (e) => {
        opacity = parseInt(e.target.value) / 100;
        document.getElementById('opacity-display').textContent = e.target.value;
    });
    
    // Botones de acción
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('clear-btn').addEventListener('click', clearCanvas);
    document.getElementById('newspaper-bg-btn').addEventListener('click', applyNewspaperBackground);
    document.getElementById('save-btn').addEventListener('click', savePainting);
    document.getElementById('sell-btn').addEventListener('click', showSellModal);
    document.getElementById('burn-btn').addEventListener('click', showBurnModal);
    document.getElementById('gallery-btn').addEventListener('click', showGallery);
    document.getElementById('missions-btn').addEventListener('click', showMissions);
    
    // Modales
    document.getElementById('cancel-sell-btn').addEventListener('click', () => {
        document.getElementById('sell-modal').classList.add('hidden');
    });
    
    document.getElementById('confirm-sell-btn').addEventListener('click', confirmSell);
    
    document.getElementById('cancel-burn-btn').addEventListener('click', () => {
        document.getElementById('burn-modal').classList.add('hidden');
    });
    
    document.getElementById('confirm-burn-btn').addEventListener('click', confirmBurn);
    
    document.getElementById('close-gallery-btn').addEventListener('click', () => {
        document.getElementById('gallery-modal').classList.add('hidden');
    });
    
    document.getElementById('close-missions-btn').addEventListener('click', () => {
        document.getElementById('missions-modal').classList.add('hidden');
    });
    
    document.getElementById('start-repair-btn').addEventListener('click', startRepairMission);
    document.getElementById('skip-repair-btn').addEventListener('click', skipRepair);
    
    // Botón de reinicio
    document.getElementById('reset-btn').addEventListener('click', showResetModal);
    document.getElementById('cancel-reset-btn').addEventListener('click', () => {
        document.getElementById('reset-modal').classList.add('hidden');
    });
    document.getElementById('confirm-reset-btn').addEventListener('click', confirmReset);
}

// ============ DIBUJO ============
function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    
    gameState.strokeCount++;
    gameState.colorsUsed.add(currentColor);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = currentColor;
    
    switch(currentTool) {
        case 'pluma':
            drawPluma(x, y);
            break;
        case 'pelusa':
            drawPelusa(x, y);
            break;
        case 'boligrafo':
            drawBoligrafo(x, y);
            break;
    }
    
    lastX = x;
    lastY = y;
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveState();
    }
}

// Herramienta: Pluma (trazo variable)
function drawPluma(x, y) {
    const dx = x - lastX;
    const dy = y - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.min(distance / 2, 10);
    const size = Math.max(brushSize - speed, brushSize / 2);
    
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
}

// Herramienta: Pelusa (trazo texturizado)
function drawPelusa(x, y) {
    const particles = 15;
    const spread = brushSize * 2;
    
    for (let i = 0; i < particles; i++) {
        const offsetX = (Math.random() - 0.5) * spread;
        const offsetY = (Math.random() - 0.5) * spread;
        const size = Math.random() * brushSize;
        
        ctx.fillStyle = currentColor;
        ctx.globalAlpha = opacity * (Math.random() * 0.3 + 0.2);
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = opacity;
}

// Herramienta: Bolígrafo (trazo fino y nítido)
function drawBoligrafo(x, y) {
    ctx.lineWidth = Math.min(brushSize, 3);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = opacity;
}

// Soporte táctil
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
    isDrawing = true;
    gameState.strokeCount++;
    gameState.colorsUsed.add(currentColor);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    draw(mouseEvent);
}

// ============ ACCIONES DE CANVAS ============
function saveState() {
    gameState.undoStack.push(canvas.toDataURL());
    if (gameState.undoStack.length > 20) {
        gameState.undoStack.shift();
    }
    gameState.redoStack = [];
}

function undo() {
    if (gameState.undoStack.length <= 1) return;
    
    gameState.redoStack.push(gameState.undoStack.pop());
    const previousState = gameState.undoStack[gameState.undoStack.length - 1];
    
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = previousState;
}

function redo() {
    if (gameState.redoStack.length === 0) return;
    
    const nextState = gameState.redoStack.pop();
    gameState.undoStack.push(nextState);
    
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = nextState;
}

function clearCanvas() {
    if (confirm('¿Estás seguro de que quieres limpiar el canvas?')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        gameState.canvasStartTime = Date.now();
        gameState.strokeCount = 0;
        gameState.colorsUsed.clear();
        saveState();
    }
}

function applyNewspaperBackground() {
    // Crear textura de papel periódico
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Color base beige/crema
    tempCtx.fillStyle = '#F5F5DC';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Añadir textura con líneas aleatorias
    tempCtx.strokeStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < 200; i++) {
        tempCtx.lineWidth = Math.random() * 0.5;
        tempCtx.beginPath();
        tempCtx.moveTo(Math.random() * tempCanvas.width, Math.random() * tempCanvas.height);
        tempCtx.lineTo(Math.random() * tempCanvas.width, Math.random() * tempCanvas.height);
        tempCtx.stroke();
    }
    
    // Aplicar al canvas principal
    ctx.drawImage(tempCanvas, 0, 0);
    saveState();
    showToast('Fondo de periódico aplicado');
}

// ============ GUARDAR PINTURA ============
function savePainting() {
    const dataURL = canvas.toDataURL('image/png');
    const timeSpent = Math.floor((Date.now() - gameState.canvasStartTime) / 1000);
    
    const painting = {
        id: Date.now(),
        image: dataURL,
        timestamp: new Date().toISOString(),
        timeSpent: timeSpent,
        strokeCount: gameState.strokeCount,
        colorsUsed: Array.from(gameState.colorsUsed)
    };
    
    gameState.paintings.push(painting);
    saveGameData();
    
    showToast('¡Pintura guardada en la galería!');
    
    // Descargar automáticamente
    const link = document.createElement('a');
    link.download = `pintura_${painting.id}.png`;
    link.href = dataURL;
    link.click();
}

// ============ VENDER PINTURA ============
function showSellModal() {
    if (gameState.strokeCount < 10) {
        showToast('Debes trabajar más en tu obra antes de venderla');
        return;
    }
    
    const timeSpent = Math.floor((Date.now() - gameState.canvasStartTime) / 1000);
    const timeMinutes = Math.floor(timeSpent / 60);
    
    // Calcular precio
    const qualityScore = Math.min(gameState.strokeCount / 10, 100);
    const timeScore = Math.min(timeMinutes * 10, 200);
    const varietyScore = gameState.colorsUsed.size * 20;
    const reputationBonus = gameState.reputation * 0.5;
    
    const totalPrice = Math.floor(qualityScore + timeScore + varietyScore + reputationBonus);
    
    // Mostrar detalles
    document.getElementById('sell-quality').textContent = `$${Math.floor(qualityScore)}`;
    document.getElementById('sell-time').textContent = `$${Math.floor(timeScore)}`;
    document.getElementById('sell-variety').textContent = `$${Math.floor(varietyScore)}`;
    document.getElementById('sell-bonus').textContent = `$${Math.floor(reputationBonus)}`;
    document.getElementById('sell-price').textContent = `$${totalPrice}`;
    
    document.getElementById('sell-modal').classList.remove('hidden');
    
    // Almacenar precio temporalmente
    gameState.tempSellPrice = totalPrice;
}

function confirmSell() {
    const price = gameState.tempSellPrice || 100;
    const repGain = Math.floor(price / 20);
    
    // Reproducir sonido de venta
    playSound('sell');
    
    document.getElementById('sell-modal').classList.add('hidden');
    
    // Efecto de dinero flotante
    const burnEffect = document.getElementById('burn-effect');
    const moneyCanvas = document.getElementById('burn-canvas');
    const moneyCtx = moneyCanvas.getContext('2d');
    
    moneyCanvas.width = window.innerWidth;
    moneyCanvas.height = window.innerHeight;
    
    burnEffect.classList.remove('hidden');
    
    // Variables para la animación
    let moneyProgress = 0;
    const moneyDuration = 120; // frames de duración
    
    // Crear partículas de dinero
    const moneyParticles = [];
    const canvasRect = canvas.getBoundingClientRect();
    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top + canvasRect.height / 2;
    
    // Crear billetes flotantes
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 100;
        moneyParticles.push({
            x: canvasCenterX + Math.cos(angle) * radius,
            y: canvasCenterY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 6,
            vy: -(Math.random() * 5 + 3),
            life: Math.random() * 80 + 60,
            maxLife: Math.random() * 80 + 60,
            size: Math.random() * 20 + 15,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            type: Math.random() > 0.5 ? 'bill' : 'coin'
        });
    }
    
    // Crear monedas brillantes
    for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 120;
        moneyParticles.push({
            x: canvasCenterX + Math.cos(angle) * radius,
            y: canvasCenterY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 8,
            vy: -(Math.random() * 8 + 4),
            life: Math.random() * 90 + 70,
            maxLife: Math.random() * 90 + 70,
            size: Math.random() * 8 + 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            type: 'coin'
        });
    }
    
    function animateMoney() {
        moneyCtx.clearRect(0, 0, moneyCanvas.width, moneyCanvas.height);
        
        moneyProgress++;
        
        // Animar partículas de dinero
        moneyParticles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // Gravedad
            p.vx *= 0.99; // Fricción del aire
            p.rotation += p.rotationSpeed;
            p.life--;
            
            const alpha = Math.min(p.life / p.maxLife, 1);
            
            moneyCtx.save();
            moneyCtx.translate(p.x, p.y);
            moneyCtx.rotate(p.rotation);
            moneyCtx.globalAlpha = alpha;
            
            if (p.type === 'bill') {
                // Dibujar billete
                const gradient = moneyCtx.createLinearGradient(-p.size, -p.size/2, p.size, p.size/2);
                gradient.addColorStop(0, '#2D5016');
                gradient.addColorStop(0.5, '#4CAF50');
                gradient.addColorStop(1, '#2D5016');
                
                moneyCtx.fillStyle = gradient;
                moneyCtx.fillRect(-p.size, -p.size/2, p.size * 2, p.size);
                
                // Borde del billete
                moneyCtx.strokeStyle = '#1B5E20';
                moneyCtx.lineWidth = 2;
                moneyCtx.strokeRect(-p.size, -p.size/2, p.size * 2, p.size);
                
                // Símbolo de dólar
                moneyCtx.fillStyle = '#FFFFFF';
                moneyCtx.font = `bold ${p.size * 0.8}px Arial`;
                moneyCtx.textAlign = 'center';
                moneyCtx.textBaseline = 'middle';
                moneyCtx.fillText('$', 0, 0);
            } else {
                // Dibujar moneda
                const gradient = moneyCtx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                gradient.addColorStop(0, '#FFD700');
                gradient.addColorStop(0.5, '#FFA500');
                gradient.addColorStop(1, '#FF8C00');
                
                moneyCtx.fillStyle = gradient;
                moneyCtx.beginPath();
                moneyCtx.arc(0, 0, p.size, 0, Math.PI * 2);
                moneyCtx.fill();
                
                // Borde de la moneda
                moneyCtx.strokeStyle = '#B8860B';
                moneyCtx.lineWidth = 2;
                moneyCtx.beginPath();
                moneyCtx.arc(0, 0, p.size, 0, Math.PI * 2);
                moneyCtx.stroke();
                
                // Brillo
                moneyCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                moneyCtx.beginPath();
                moneyCtx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.4, 0, Math.PI * 2);
                moneyCtx.fill();
            }
            
            moneyCtx.restore();
            
            if (p.life <= 0) {
                moneyParticles.splice(index, 1);
            }
        });
        
        // Generar nuevas partículas durante la primera mitad
        if (moneyProgress < moneyDuration / 2 && Math.random() > 0.8) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 80;
            moneyParticles.push({
                x: canvasCenterX + Math.cos(angle) * radius,
                y: canvasCenterY + Math.sin(angle) * radius,
                vx: (Math.random() - 0.5) * 6,
                vy: -(Math.random() * 6 + 3),
                life: Math.random() * 70 + 50,
                maxLife: Math.random() * 70 + 50,
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                type: 'coin'
            });
        }
        
        if (moneyProgress < moneyDuration || moneyParticles.length > 0) {
            requestAnimationFrame(animateMoney);
        } else {
            burnEffect.classList.add('hidden');
        }
    }
    
    animateMoney();
    
    // Actualizar estado del juego después de la animación
    setTimeout(() => {
        gameState.money += price;
        gameState.reputation += repGain;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        gameState.canvasStartTime = Date.now();
        gameState.strokeCount = 0;
        gameState.colorsUsed.clear();
        
        updateUI();
        saveGameData();
        
        showToast(`¡Vendido! +$${price} +${repGain} reputación 💰`);
    }, 2000);
}

// ============ QUEMAR PINTURA ============
function showBurnModal() {
    document.getElementById('burn-modal').classList.remove('hidden');
}

function confirmBurn() {
    document.getElementById('burn-modal').classList.add('hidden');
    
    // Reproducir sonido de quemar
    playSound('burn');
    
    // Efecto de quemado
    const burnEffect = document.getElementById('burn-effect');
    const burnCanvas = document.getElementById('burn-canvas');
    const burnCtx = burnCanvas.getContext('2d');
    
    burnCanvas.width = window.innerWidth;
    burnCanvas.height = window.innerHeight;
    
    burnEffect.classList.remove('hidden');
    
    // Variables para la animación
    let burnProgress = 0;
    const burnDuration = 150; // frames de duración
    
    // Crear más partículas de fuego (triplicado)
    const particles = [];
    const canvasRect = canvas.getBoundingClientRect();
    const canvasCenterX = canvasRect.left + canvasRect.width / 2;
    const canvasCenterY = canvasRect.top + canvasRect.height / 2;
    
    for (let i = 0; i < 300; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 150;
        particles.push({
            x: canvasCenterX + Math.cos(angle) * radius,
            y: canvasCenterY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 4,
            vy: -(Math.random() * 8 + 5),
            life: Math.random() * 80 + 70,
            maxLife: Math.random() * 80 + 70,
            size: Math.random() * 8 + 3,
            hue: Math.random() * 60 // Para variación de color
        });
    }
    
    function animateBurn() {
        burnCtx.clearRect(0, 0, burnCanvas.width, burnCanvas.height);
        
        burnProgress++;
        
        // Oscurecer progresivamente el canvas principal
        const blackness = Math.min(burnProgress / burnDuration, 1);
        ctx.globalAlpha = blackness * 0.15;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        
        // Animar partículas de fuego
        particles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.1; // Gravedad inversa
            p.life--;
            p.size *= 0.98;
            
            // Crear llamas con gradientes más intensos
            const alpha = p.life / p.maxLife;
            const gradient = burnCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            
            // Colores de fuego intensos: amarillo -> naranja -> rojo -> negro
            if (alpha > 0.7) {
                gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`); // Amarillo brillante
                gradient.addColorStop(0.3, `rgba(255, 200, 50, ${alpha * 0.9})`);
                gradient.addColorStop(0.6, `rgba(255, 100, 30, ${alpha * 0.7})`);
                gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
            } else if (alpha > 0.4) {
                gradient.addColorStop(0, `rgba(255, 150, 50, ${alpha})`); // Naranja
                gradient.addColorStop(0.4, `rgba(255, 80, 30, ${alpha * 0.8})`);
                gradient.addColorStop(0.7, `rgba(200, 50, 20, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'rgba(100, 0, 0, 0)');
            } else {
                gradient.addColorStop(0, `rgba(200, 50, 30, ${alpha})`); // Rojo oscuro
                gradient.addColorStop(0.5, `rgba(100, 20, 10, ${alpha * 0.6})`);
                gradient.addColorStop(1, 'rgba(50, 0, 0, 0)');
            }
            
            burnCtx.fillStyle = gradient;
            burnCtx.beginPath();
            burnCtx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            burnCtx.fill();
            
            // Añadir chispas brillantes ocasionales
            if (Math.random() > 0.95 && p.life > 20) {
                burnCtx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
                burnCtx.beginPath();
                burnCtx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                burnCtx.fill();
            }
            
            if (p.life <= 0) {
                particles.splice(index, 1);
            }
        });
        
        // Generar nuevas partículas continuamente durante la primera mitad
        if (burnProgress < burnDuration / 2 && Math.random() > 0.7) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 100;
            particles.push({
                x: canvasCenterX + Math.cos(angle) * radius,
                y: canvasCenterY + Math.sin(angle) * radius,
                vx: (Math.random() - 0.5) * 3,
                vy: -(Math.random() * 7 + 4),
                life: Math.random() * 60 + 50,
                maxLife: Math.random() * 60 + 50,
                size: Math.random() * 6 + 2,
                hue: Math.random() * 60
            });
        }
        
        if (burnProgress < burnDuration || particles.length > 0) {
            requestAnimationFrame(animateBurn);
        } else {
            burnEffect.classList.add('hidden');
        }
    }
    
    animateBurn();
    
    // Limpiar canvas después de la animación
    setTimeout(() => {
        // Llenar de negro completamente antes de limpiar
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        setTimeout(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            gameState.canvasStartTime = Date.now();
            gameState.strokeCount = 0;
            gameState.colorsUsed.clear();
            
            gameState.reputation += 5;
            updateUI();
            saveGameData();
            
            showToast('La obra ha sido consumida por las llamas... +5 reputación');
        }, 500);
    }, 2500);
}

// ============ GALERÍA ============
function showGallery() {
    const galleryGrid = document.getElementById('gallery-grid');
    const emptyGallery = document.getElementById('empty-gallery');
    
    galleryGrid.innerHTML = '';
    
    if (gameState.paintings.length === 0) {
        emptyGallery.style.display = 'block';
    } else {
        emptyGallery.style.display = 'none';
        
        gameState.paintings.forEach((painting, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            const timeMin = Math.floor(painting.timeSpent / 60);
            const timeSec = painting.timeSpent % 60;
            
            item.innerHTML = `
                <img src="${painting.image}" alt="Pintura ${index + 1}">
                <div class="p-4">
                    <div class="text-sm text-gray-400 mb-2">
                        <div>Tiempo: ${timeMin}:${timeSec.toString().padStart(2, '0')}</div>
                        <div>Trazos: ${painting.strokeCount}</div>
                        <div>Colores: ${painting.colorsUsed.length}</div>
                    </div>
                    <div class="gallery-actions">
                        <button class="bg-blue-600 hover:bg-blue-700" onclick="downloadPainting(${index})">
                            💾
                        </button>
                        <button class="bg-green-600 hover:bg-green-700" onclick="sellFromGallery(${index})">
                            💵
                        </button>
                        <button class="bg-orange-600 hover:bg-orange-700" onclick="burnFromGallery(${index})">
                            🔥
                        </button>
                        <button class="bg-red-600 hover:bg-red-700" onclick="deleteFromGallery(${index})">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
            
            galleryGrid.appendChild(item);
        });
    }
    
    document.getElementById('gallery-modal').classList.remove('hidden');
}

function downloadPainting(index) {
    const painting = gameState.paintings[index];
    const link = document.createElement('a');
    link.download = `pintura_${painting.id}.png`;
    link.href = painting.image;
    link.click();
    showToast('Pintura descargada');
}

function sellFromGallery(index) {
    const painting = gameState.paintings[index];
    const price = 150 + painting.colorsUsed.length * 20 + painting.strokeCount;
    const repGain = Math.floor(price / 20);
    
    // Reproducir sonido de venta
    playSound('sell');
    
    // Cerrar galería
    document.getElementById('gallery-modal').classList.add('hidden');
    
    // Efecto de dinero flotante
    const burnEffect = document.getElementById('burn-effect');
    const moneyCanvas = document.getElementById('burn-canvas');
    const moneyCtx = moneyCanvas.getContext('2d');
    
    moneyCanvas.width = window.innerWidth;
    moneyCanvas.height = window.innerHeight;
    
    burnEffect.classList.remove('hidden');
    
    // Variables para la animación
    let moneyProgress = 0;
    const moneyDuration = 120;
    
    // Crear partículas de dinero en el centro de la pantalla
    const moneyParticles = [];
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Crear billetes flotantes
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 100;
        moneyParticles.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 6,
            vy: -(Math.random() * 5 + 3),
            life: Math.random() * 80 + 60,
            maxLife: Math.random() * 80 + 60,
            size: Math.random() * 20 + 15,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            type: Math.random() > 0.5 ? 'bill' : 'coin'
        });
    }
    
    // Crear monedas brillantes
    for (let i = 0; i < 100; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 120;
        moneyParticles.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: (Math.random() - 0.5) * 8,
            vy: -(Math.random() * 8 + 4),
            life: Math.random() * 90 + 70,
            maxLife: Math.random() * 90 + 70,
            size: Math.random() * 8 + 4,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            type: 'coin'
        });
    }
    
    function animateMoney() {
        moneyCtx.clearRect(0, 0, moneyCanvas.width, moneyCanvas.height);
        
        moneyProgress++;
        
        // Animar partículas de dinero
        moneyParticles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // Gravedad
            p.vx *= 0.99; // Fricción del aire
            p.rotation += p.rotationSpeed;
            p.life--;
            
            const alpha = Math.min(p.life / p.maxLife, 1);
            
            moneyCtx.save();
            moneyCtx.translate(p.x, p.y);
            moneyCtx.rotate(p.rotation);
            moneyCtx.globalAlpha = alpha;
            
            if (p.type === 'bill') {
                // Dibujar billete
                const gradient = moneyCtx.createLinearGradient(-p.size, -p.size/2, p.size, p.size/2);
                gradient.addColorStop(0, '#2D5016');
                gradient.addColorStop(0.5, '#4CAF50');
                gradient.addColorStop(1, '#2D5016');
                
                moneyCtx.fillStyle = gradient;
                moneyCtx.fillRect(-p.size, -p.size/2, p.size * 2, p.size);
                
                // Borde del billete
                moneyCtx.strokeStyle = '#1B5E20';
                moneyCtx.lineWidth = 2;
                moneyCtx.strokeRect(-p.size, -p.size/2, p.size * 2, p.size);
                
                // Símbolo de dólar
                moneyCtx.fillStyle = '#FFFFFF';
                moneyCtx.font = `bold ${p.size * 0.8}px Arial`;
                moneyCtx.textAlign = 'center';
                moneyCtx.textBaseline = 'middle';
                moneyCtx.fillText('$', 0, 0);
            } else {
                // Dibujar moneda
                const gradient = moneyCtx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                gradient.addColorStop(0, '#FFD700');
                gradient.addColorStop(0.5, '#FFA500');
                gradient.addColorStop(1, '#FF8C00');
                
                moneyCtx.fillStyle = gradient;
                moneyCtx.beginPath();
                moneyCtx.arc(0, 0, p.size, 0, Math.PI * 2);
                moneyCtx.fill();
                
                // Borde de la moneda
                moneyCtx.strokeStyle = '#B8860B';
                moneyCtx.lineWidth = 2;
                moneyCtx.beginPath();
                moneyCtx.arc(0, 0, p.size, 0, Math.PI * 2);
                moneyCtx.stroke();
                
                // Brillo
                moneyCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                moneyCtx.beginPath();
                moneyCtx.arc(-p.size * 0.3, -p.size * 0.3, p.size * 0.4, 0, Math.PI * 2);
                moneyCtx.fill();
            }
            
            moneyCtx.restore();
            
            if (p.life <= 0) {
                moneyParticles.splice(index, 1);
            }
        });
        
        // Generar nuevas partículas durante la primera mitad
        if (moneyProgress < moneyDuration / 2 && Math.random() > 0.8) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 80;
            moneyParticles.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius,
                vx: (Math.random() - 0.5) * 6,
                vy: -(Math.random() * 6 + 3),
                life: Math.random() * 70 + 50,
                maxLife: Math.random() * 70 + 50,
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                type: 'coin'
            });
        }
        
        if (moneyProgress < moneyDuration || moneyParticles.length > 0) {
            requestAnimationFrame(animateMoney);
        } else {
            burnEffect.classList.add('hidden');
        }
    }
    
    animateMoney();
    
    // Actualizar estado del juego después de la animación
    setTimeout(() => {
        gameState.money += price;
        gameState.reputation += repGain;
        gameState.paintings.splice(index, 1);
        
        updateUI();
        saveGameData();
        showToast(`¡Vendido! +$${price} +${repGain} reputación 💰`);
    }, 2000);
}

function burnFromGallery(index) {
    if (confirm('¿Estás seguro de quemar esta pintura?')) {
        // Reproducir sonido de quemar
        playSound('burn');
        
        gameState.paintings.splice(index, 1);
        gameState.reputation += 5;
        updateUI();
        saveGameData();
        showGallery();
        showToast('Pintura quemada... +5 reputación');
    }
}

function deleteFromGallery(index) {
    if (confirm('¿Estás seguro de eliminar esta pintura?')) {
        gameState.paintings.splice(index, 1);
        saveGameData();
        showGallery();
        showToast('Pintura eliminada');
    }
}

// ============ MISIONES ============
function showMissions() {
    updateMissionUI();
    document.getElementById('missions-modal').classList.remove('hidden');
}

function checkMissionStatus() {
    if (gameState.missionProgress === 0 && !gameState.missionCompleted) {
        document.getElementById('mission-badge').classList.remove('hidden');
    }
}

function updateMissionUI() {
    document.getElementById('mission-progress').textContent = gameState.missionProgress;
    const progressPercent = (gameState.missionProgress / 3) * 100;
    document.getElementById('mission-progress-bar').style.width = `${progressPercent}%`;
    
    const startBtn = document.getElementById('start-repair-btn');
    if (gameState.missionCompleted) {
        startBtn.textContent = 'Misión Completada ✓';
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        document.getElementById('mission-badge').classList.add('hidden');
    } else if (gameState.missionProgress >= 3) {
        completeMission();
    }
}

function completeMission() {
    gameState.missionCompleted = true;
    gameState.money += 500;
    gameState.reputation += 50;
    
    updateUI();
    saveGameData();
    
    showToast('¡Misión completada! +$500 +50 reputación');
    document.getElementById('mission-badge').classList.add('hidden');
}

// ============ MINI-JUEGO DE REPARACIÓN ============
let repairCanvas, repairCtx;
let repairTimer;
let currentRepairTask = 0;
let repairCompletion = 0;

const repairTasks = [
    {
        instruction: 'Rellena el área marcada con la pluma negra',
        targetX: 200,
        targetY: 150,
        targetWidth: 300,
        targetHeight: 200,
        requiredTool: 'pluma',
        requiredColor: '#000000'
    },
    {
        instruction: 'Usa la pelusa gris para difuminar las manchas',
        targetX: 350,
        targetY: 250,
        targetWidth: 200,
        targetHeight: 150,
        requiredTool: 'pelusa',
        requiredColor: '#757575'
    },
    {
        instruction: 'Dibuja líneas finas con el bolígrafo en el área dañada',
        targetX: 150,
        targetY: 200,
        targetWidth: 400,
        targetHeight: 100,
        requiredTool: 'boligrafo',
        requiredColor: '#000000'
    }
];

function startRepairMission() {
    document.getElementById('missions-modal').classList.add('hidden');
    document.getElementById('repair-modal').classList.remove('hidden');
    
    repairCanvas = document.getElementById('repair-canvas');
    repairCtx = repairCanvas.getContext('2d');
    
    currentRepairTask = gameState.missionProgress;
    if (currentRepairTask >= 3) return;
    
    setupRepairTask();
    startRepairTimer();
    
    // Eventos de dibujo
    let repairDrawing = false;
    let repairLastX = 0;
    let repairLastY = 0;
    
    repairCanvas.addEventListener('mousedown', (e) => {
        repairDrawing = true;
        const rect = repairCanvas.getBoundingClientRect();
        repairLastX = e.clientX - rect.left;
        repairLastY = e.clientY - rect.top;
    });
    
    repairCanvas.addEventListener('mousemove', (e) => {
        if (!repairDrawing) return;
        
        const rect = repairCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const task = repairTasks[currentRepairTask];
        
        // Verificar si está en el área correcta
        if (x >= task.targetX && x <= task.targetX + task.targetWidth &&
            y >= task.targetY && y <= task.targetY + task.targetHeight) {
            
            repairCtx.strokeStyle = currentColor;
            repairCtx.lineWidth = brushSize;
            repairCtx.lineCap = 'round';
            
            repairCtx.beginPath();
            repairCtx.moveTo(repairLastX, repairLastY);
            repairCtx.lineTo(x, y);
            repairCtx.stroke();
            
            repairCompletion += 0.5;
            updateRepairCompletion();
        }
        
        repairLastX = x;
        repairLastY = y;
    });
    
    repairCanvas.addEventListener('mouseup', () => {
        repairDrawing = false;
    });
}

function setupRepairTask() {
    const task = repairTasks[currentRepairTask];
    
    // Limpiar canvas
    repairCtx.fillStyle = '#F5F5DC';
    repairCtx.fillRect(0, 0, repairCanvas.width, repairCanvas.height);
    
    // Dibujar pintura "dañada"
    repairCtx.fillStyle = '#8B4513';
    repairCtx.fillRect(100, 100, 500, 300);
    
    // Dibujar área objetivo
    repairCtx.strokeStyle = '#FF0000';
    repairCtx.lineWidth = 3;
    repairCtx.setLineDash([10, 5]);
    repairCtx.strokeRect(task.targetX, task.targetY, task.targetWidth, task.targetHeight);
    repairCtx.setLineDash([]);
    
    // Mostrar instrucción
    document.getElementById('repair-instruction').textContent = task.instruction;
    document.getElementById('repair-number').textContent = currentRepairTask + 1;
    
    repairCompletion = 0;
    updateRepairCompletion();
}

function startRepairTimer() {
    let timeLeft = 60;
    document.getElementById('repair-timer').textContent = timeLeft;
    
    repairTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('repair-timer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(repairTimer);
            failRepair();
        }
    }, 1000);
}

function updateRepairCompletion() {
    const percent = Math.min(repairCompletion, 100);
    document.getElementById('repair-completion').textContent = Math.floor(percent);
    
    if (percent >= 70) {
        completeRepairTask();
    }
}

function completeRepairTask() {
    clearInterval(repairTimer);
    
    gameState.missionProgress++;
    saveGameData();
    
    showToast('¡Reparación completada!');
    
    setTimeout(() => {
        document.getElementById('repair-modal').classList.add('hidden');
        updateMissionUI();
    }, 1000);
}

function failRepair() {
    showToast('Tiempo agotado. Intenta de nuevo.');
    document.getElementById('repair-modal').classList.add('hidden');
}

function skipRepair() {
    clearInterval(repairTimer);
    document.getElementById('repair-modal').classList.add('hidden');
}

// ============ REINICIO DEL JUEGO ============
function showResetModal() {
    document.getElementById('reset-modal').classList.remove('hidden');
}

function confirmReset() {
    // Cerrar modal
    document.getElementById('reset-modal').classList.add('hidden');
    
    // Resetear estado del juego
    gameState.money = 0;
    gameState.reputation = 0;
    gameState.paintings = [];
    gameState.missionProgress = 0;
    gameState.missionCompleted = false;
    gameState.canvasStartTime = Date.now();
    gameState.strokeCount = 0;
    gameState.colorsUsed.clear();
    gameState.undoStack = [];
    gameState.redoStack = [];
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Guardar datos reseteados
    saveGameData();
    
    // Actualizar UI
    updateUI();
    updateMissionUI();
    
    // Mostrar notificación
    showToast('🔄 Progreso reiniciado. ¡Comienza de nuevo tu historia!');
    
    // Efecto visual de reinicio
    const resetEffect = anime({
        targets: '#game-screen',
        opacity: [0.5, 1],
        duration: 1000,
        easing: 'easeInOutQuad'
    });
}

// ============ UTILIDADES ============
function updateUI() {
    document.getElementById('money').textContent = `$${gameState.money}`;
    document.getElementById('reputation').textContent = gameState.reputation;
}

function startCanvasTimer() {
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameState.canvasStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('canvas-time').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ PERSISTENCIA ============
function saveGameData() {
    const data = {
        money: gameState.money,
        reputation: gameState.reputation,
        paintings: gameState.paintings,
        missionProgress: gameState.missionProgress,
        missionCompleted: gameState.missionCompleted
    };
    localStorage.setItem('pintorDelMuelle', JSON.stringify(data));
}

function loadGameData() {
    const saved = localStorage.getItem('pintorDelMuelle');
    if (saved) {
        const data = JSON.parse(saved);
        gameState.money = data.money || 0;
        gameState.reputation = data.reputation || 0;
        gameState.paintings = data.paintings || [];
        gameState.missionProgress = data.missionProgress || 0;
        gameState.missionCompleted = data.missionCompleted || false;
    }
}

// Exponer funciones globalmente para eventos de galería
window.downloadPainting = downloadPainting;
window.sellFromGallery = sellFromGallery;
window.burnFromGallery = burnFromGallery;
window.deleteFromGallery = deleteFromGallery;
