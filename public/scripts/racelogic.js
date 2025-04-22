let currentGameLoop = null;
let app;
let actionText;
let socket;
let activeHorses = [];
let isRaceStarted = false; // Add race state tracking

export async function setupRace(pixiApp, horseCount) {
    app = pixiApp;
    socket = io();
    
    socket.on('display text', (buttonText) => {
        displayText(buttonText);
    });
    
    socket.on('stim horse', (name) => {
        stim(name);
    });

    try {
        // Load horse configurations
        const horseConfigs = await fetch('/public/data/horses.json').then(r => r.json());
        
        // Load background
        await PIXI.Assets.load('/public/env/sand.png');
        const bg = PIXI.Sprite.from('/public/env/sand.png');
        bg.width = app.screen.width;
        bg.height = app.screen.height;
        app.stage.addChild(bg);
        
        // Load horse textures first
        const textures = {};
        for (const path of new Set(horseConfigs.horses.map(h => h.spritePath))) {
            try {
                textures[path] = await PIXI.Assets.load(path);
                console.log('Loaded texture:', path);
            } catch (error) {
                console.warn('Failed to load texture:', path, 'Using fallback');
                textures[path] = await PIXI.Assets.load('/horses/generic/brownhorse.png');
            }
        }
        
        // Calculate spacing
        const verticalSpacing = app.screen.height / (horseCount + 2);
        
        // Create horses
        const BEHAVIORS = ['steady', 'sprinter', 'finisher', 'frontrunner'];
        const getRandomBehavior = () => BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)];

        const horses = [];
        for (let i = 0; i < horseCount; i++) {
            const config = horseConfigs.horses[i % horseConfigs.horses.length];
            const horse = new PIXI.Sprite(textures[config.spritePath]);
            horse.anchor.set(0.5); // Set anchor point to center
            horse.x = 50 + horse.width/2; // Adjust initial position to account for anchor
            horse.y = verticalSpacing * (i + 1);
            horse.scale.set(0.5);
            
            const speedText = new PIXI.Text({
                text: `${config.name} - Speed: 0`,
                style: {
                    fontFamily: 'Arial',
                    fontSize: 14,
                    fill: 0xFFFFFF,
                    stroke: {
                        color: 0x000000,
                        width: 4
                    }
                }
            });
            
            speedText.x = horse.x + horse.width + 10;
            speedText.y = horse.y + 10;
            
            horse.speedText = speedText;
            horse.visible = true;
            horse.name = config.name;
            horse.behavior = config.behavior || getRandomBehavior(); // Assign random behavior if none provided
            horse.personality = config.personality;
            
            app.stage.addChild(horse);
            app.stage.addChild(speedText);
            horses.push(horse);
        }
        activeHorses = horses; // Store horses globally
        
        // After creating horses, emit their names
        const horseNames = horses.map(horse => horse.name);
        socket.emit('horse names', horseNames);
        socket.emit('race setup', horseNames); // Add this line to store horses in server
        
        // Show race button after setup
        const raceControls = document.getElementById('race-controls');
        raceControls.classList.remove('hidden');
        
        // Setup race button click handler
        const raceBtn = document.getElementById('race-btn');
        raceBtn.addEventListener('click', () => startRace(horses, app));
        
        // Create action text last to ensure it's on top
        actionText = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 64,
            fill: 0xffffff,
            stroke: { color: 0x000000, width: 4 }, // Add stroke for better visibility
            align: 'center'
        });
        actionText.position.set(app.screen.width / 2, app.screen.height / 2);
        actionText.anchor.set(0.5);
        actionText.zIndex = 1000; // Ensure high z-index
        app.stage.sortableChildren = true; // Enable z-index sorting
        app.stage.addChild(actionText);

        return horses;
    } catch (error) {
        console.error('Setup race failed:', error);
        throw error;
    }
}

function startRace(horses, app) {
    console.log('Race starting...', horses);
    isRaceStarted = true;
    socket.emit('race start');
    const raceBtn = document.getElementById('race-btn');
    raceBtn.disabled = true;
    
    // Remove previous game loop if it exists
    if (currentGameLoop) {
        app.ticker.remove(currentGameLoop);
    }
    
    const finishLine = app.screen.width - 300;
    let winner = false;
    let lastTime = performance.now();
    
    // Initialize horses with race-specific properties
    horses.forEach(horse => {
        // Ensure stimCount exists and is a number
        if (!horse.stimCount) horse.stimCount = 0;
        
        horse.baseSpeed = Math.random() * 1 + 0.5;
        horse.timer = 0;
        horse.speedMultiplier = 1 + (horse.stimCount * 0.5);
        horse.speed = horse.baseSpeed * horse.speedMultiplier; // Set initial speed
        horse.progressRatio = 0;
        horse.visible = true;
        
        console.log(`Initializing horse ${horse.name}:`, {
            stimCount: horse.stimCount,
            baseSpeed: horse.baseSpeed,
            multiplier: horse.speedMultiplier,
            speed: horse.speed
        });
    });
    
    currentGameLoop = (delta) => {
        if (winner) return;
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;
        
        horses.forEach((horse, index) => {
            if (!horse.visible) {
                console.log(`Horse ${index} invisible!`); // Debug visibility
                horse.visible = true;
            }
            
            // Update timer and progress
            horse.timer += deltaTime;
            horse.progressRatio = (horse.x - 50) / (finishLine - 50); // 0 to 1 progress
            
            // Calculate and apply speed
            horse.speed = calculateHorseSpeed(horse);
            horse.x += horse.speed * deltaTime * 60; // Scale for 60fps equivalent
            
            // Add rotation wobble based on speed
            const maxRotation = 3 * (Math.PI / 180);
            horse.rotation = Math.sin(horse.timer * 10) * maxRotation * (horse.speed / horse.baseSpeed);
            
            // Update speed indicator with behavior
            horse.speedText.text = `${horse.behavior}: ${horse.speed.toFixed(1)}`;
            horse.speedText.x = horse.x + horse.width + 10;
            
            // Log position every 60 frames for the first horse
            if (index === 0 && Math.floor(app.ticker.lastTime) % 60 === 0) {
                console.log(`Horse 0 position: ${horse.x}`);
            }
            
            if (horse.x >= finishLine && !winner) {
                winner = true;
                console.log(`Winner found: Horse #${index + 1}`);
                announceWinner(horse, index + 1);
                raceBtn.disabled = false;
                resetRace(horses);
            }
        });
    };
    
    console.log('Adding ticker...');
    app.ticker.add(currentGameLoop);
}

function calculateHorseSpeed(horse) {
    const baseVariation = Math.sin(horse.timer * 0.05) * 0.75 * horse.personality.consistency;
    const staminaFactor = Math.pow(1 - horse.progressRatio, 1 - horse.personality.stamina);
    var multiplier = horse.speedMultiplier || 1;
    
    switch (horse.behavior) {
        case 'steady':
            return ((horse.baseSpeed + baseVariation * 0.3) * horse.personality.consistency) * multiplier;
            
        case 'sprinter':
            const sprintBoost = Math.random() > horse.personality.burstChance ? 2.5 : 0;
            return ((horse.baseSpeed + sprintBoost + baseVariation) * horse.personality.acceleration) * multiplier;
            
        case 'finisher':
            const finishBoost = horse.progressRatio * 2 * horse.personality.acceleration;
            return ((horse.baseSpeed + finishBoost + baseVariation) * staminaFactor) * multiplier;
            
        case 'frontrunner':
            const frontBoost = (1 - horse.progressRatio) * 2 * horse.personality.acceleration;
            return ((horse.baseSpeed + frontBoost + baseVariation) * staminaFactor) * multiplier;
            
        default:
            return horse.baseSpeed * multiplier;
    }
}

function announceWinner(horse, horseNumber) {
    alert(`${horse.name} (Horse #${horseNumber}) wins!`);
}

function resetRace(horses) {
    console.log('Resetting race...');
    isRaceStarted = false; // Reset race state
    horses.forEach(horse => {
        horse.x = 50;
        horse.speedText.x = horse.x + horse.width + 10;
        horse.speed = 0;
        horse.visible = true;
        horse.speedText.text = 'Speed: 0';
        horse.stimCount = 0; // Reset stim count
        horse.speedMultiplier = 1;
    });
}

export function displayText(buttonText) {
    actionText.text = buttonText;
    actionText.alpha = 1; // Ensure full opacity
    
    // Fade out animation
    setTimeout(() => {
        actionText.text = '';
    }, 1000);
}

export function stim(horseName) {
    if (isRaceStarted) {
        console.log('Cannot stim after race has started');
        return;
    }

    const horse = activeHorses.find(h => h.name === horseName);
    if (!horse) {
        console.error('Horse not found for stim:', horseName);
        return;
    }

    // Initialize stimCount if it doesn't exist
    if (typeof horse.stimCount !== 'number') {
        horse.stimCount = 0;
    }

    // Increment stim count
    horse.stimCount++;
    console.log(`Added stim to ${horseName}, total stims: ${horse.stimCount}`);
}
