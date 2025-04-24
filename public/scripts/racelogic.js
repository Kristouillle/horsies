let currentGameLoop = null;
let app;
let actionText;
let socket;
let activeHorses = [];
let isRaceStarted = false; // Add race state tracking

export async function setupRace(pixiApp, horseCount) {
    app = pixiApp;
    socket = io();
    
    // Get restricted mode from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const restrictedMode = urlParams.get('restricted') === 'true';
    
    // Show race controls immediately
    const raceControls = document.getElementById('race-controls');
    if (raceControls) {
        raceControls.classList.remove('hidden');
    } else {
        console.error('Race controls element not found');
    }
    
    // Add socket handlers first
    socket.on('display text', (buttonText) => {
        displayText(buttonText);
    });
    
    socket.on('stim horse', (name) => {
        stim(name);
    });
    
    socket.on('sabotage horse', (name) => {
        sabotage(name);
    });

    try {
        // Load horse configurations and names
        const [horseConfigs, nameBank] = await Promise.all([
            fetch('/public/data/horses.json').then(r => r.json()),
            fetch('/public/data/horsenames.json').then(r => r.json())
        ]);
        
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
        
        // Helper function to generate random horse name
        function generateHorseName() {
            const prefix = nameBank.prefixes[Math.floor(Math.random() * nameBank.prefixes.length)];
            const suffix = nameBank.suffixes[Math.floor(Math.random() * nameBank.suffixes.length)];
            return `${prefix} ${suffix}`;
        }

        // Draft horses based on rarity
        function draftHorses(configs, count) {
            const drafted = [];
            const available = [...configs.horses];
            
            while (drafted.length < count && available.length > 0) {
                // First, determine the rarity using cumulative probability
                const random = Math.random();
                let selectedRarity;
                
                if (random < 0.04) selectedRarity = 5;        // 4% Legendary
                else if (random < 0.10) selectedRarity = 4;   // 6% Epic
                else if (random < 0.22) selectedRarity = 3;   // 12% Rare
                else if (random < 0.44) selectedRarity = 2;   // 22% Uncommon
                else selectedRarity = 1;                       // 56% Common
                
                // Get all horses of the selected rarity
                const rarityPool = available.filter(h => h.rarity === selectedRarity);
                
                if (rarityPool.length > 0) {
                    // Draft a random horse from the rarity pool
                    const index = Math.floor(Math.random() * rarityPool.length);
                    const horse = rarityPool[index];
                    drafted.push(horse);
                    available.splice(available.indexOf(horse), 1);
                } else {
                    // Create a generic horse with random stats
                    const genericSprites = [
                        '/horses/generic/americanquarter.png',
                        '/horses/generic/appaloosa.png',
                        '/horses/generic/brownhorse.png',
                        '/horses/generic/brownspothorse.png',
                        '/horses/generic/emohorse.png',
                        '/horses/generic/morgan.png',
                        '/horses/generic/stallion.png',
                        '/horses/generic/warmbloods.png',
                        '/horses/generic/whitehorse.png'
                    ];
                    const selectedSprite = genericSprites[Math.floor(Math.random() * genericSprites.length)];
                    const genericHorse = {
                        name: generateHorseName(),
                        spritePath: selectedSprite,  // Store the selected sprite path
                        rarity: selectedRarity,
                        personality: {
                            consistency: Math.random() * 0.5 + 0.5,
                            stamina: Math.random() * 0.5 + 0.5,
                            acceleration: Math.random() * 0.5 + 0.5,
                            burstChance: Math.random() * 0.3 + 0.2
                        }
                    };
                    drafted.push(genericHorse);
                }
            }
            
            return drafted;
        }
        
        const draftedHorses = draftHorses(horseConfigs, horseCount);
        const horses = [];
        
        // Create horses using drafted configs
        const BEHAVIORS = ['steady', 'sprinter', 'finisher', 'frontrunner'];
        const getRandomBehavior = () => BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)];

        for (let i = 0; i < draftedHorses.length; i++) {
            const config = draftedHorses[i];
            const horse = new PIXI.Sprite(textures[config.spritePath]);
            horse.anchor.set(0.5); // Set anchor point to center
            horse.x = 50 + horse.width/2; // Adjust initial position to account for anchor
            horse.y = verticalSpacing * (i + 1);
            horse.scale.set(0.5);
            
            const speedText = new PIXI.Text({
                text: `${config.name} - Speed: 0 (Stims: ${config.stimCount || 0}, Sabotages: ${config.sabotageCount || 0})`,
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
            horse.rarity = config.rarity; // Store rarity for reference
            
            app.stage.addChild(horse);
            app.stage.addChild(speedText);
            horses.push(horse);
        }
        activeHorses = horses; // Store horses globally
        
        // After creating horses, emit their names, sprite paths, and restricted mode
        const horseData = horses.map(horse => {
            const draftedHorse = draftedHorses.find(h => h.name === horse.name);
            return {
                name: horse.name,
                spritePath: draftedHorse?.spritePath || '/horses/generic/brownhorse.png'
            };
        });

        // Emit multiple times to ensure delivery
        socket.emit('horse names', horseData);
        socket.emit('race setup', { horses: horseData, restrictedMode });
        
        // Broadcast to force update all clients
        socket.emit('broadcast horse update', horseData);
        
        // Setup race button click handler
        const raceBtn = document.getElementById('race-btn');
        if (raceBtn) {
            raceBtn.addEventListener('click', () => startRace(horses, app));
        } else {
            console.error('Race button not found');
        }
        
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
        // Initialize counts if they don't exist
        if (typeof horse.stimCount === 'undefined') horse.stimCount = 0;
        if (typeof horse.sabotageCount === 'undefined') horse.sabotageCount = 0;
        
        horse.baseSpeed = Math.random() * 1 + 0.5;
        horse.timer = 0;
        // Adjust multiplier based on stims and sabotages
        horse.speedMultiplier = Math.max(0.2, 1 + (horse.stimCount * 0.2) - (horse.sabotageCount * 0.15));
        horse.speed = horse.baseSpeed * horse.speedMultiplier;
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
            
        case 'man':
            return (0) * multiplier;
                
        default:
            return horse.baseSpeed * multiplier;
    }
}

function announceWinner(horse, horseNumber) {
    alert(`${horse.name} (Horse #${horseNumber}) wins!`);
    socket.emit('race end'); // Emit race end event
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
        horse.sabotageCount = 0; // Reset sabotage count
        horse.speedMultiplier = 1;
        updateHorseText(horse);
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

function updateHorseText(horse) {
    if (horse.speedText) {
        horse.speedText.text = `${horse.name} - Speed: ${horse.speed?.toFixed(1) || 0} (Stims: ${horse.stimCount || 0}, Sabotages: ${horse.sabotageCount || 0})`;
    }
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
    updateHorseText(horse);
    console.log(`Stimulating horse ${horse.name}. New stim count: ${horse.stimCount}`);
}

export function sabotage(horseName) {
    if (isRaceStarted) {
        console.log('Cannot sabotage after race has started');
        return;
    }

    const horse = activeHorses.find(h => h.name === horseName);
    if (!horse) {
        console.error('Horse not found for sabotage:', horseName);
        return;
    }

    // Initialize sabotageCount if it doesn't exist
    if (typeof horse.sabotageCount !== 'number') {
        horse.sabotageCount = 0;
    }

    // Increment sabotage count
    horse.sabotageCount++;
    updateHorseText(horse);
    console.log(`Sabotageulating horse ${horse.name}. New sabotage count: ${horse.sabotageCount}`);
}
