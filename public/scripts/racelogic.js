let currentGameLoop = null;

export async function setupRace(app, horseCount) {
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
                console.error('Failed to load texture:', path, error);
                throw error;
            }
        }
        
        // Calculate spacing
        const verticalSpacing = app.screen.height / (horseCount + 2);
        
        // Create horses
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
            horse.behavior = config.behavior;
            horse.personality = config.personality;
            
            app.stage.addChild(horse);
            app.stage.addChild(speedText);
            horses.push(horse);
        }
        
        // Show race button after setup
        const raceControls = document.getElementById('race-controls');
        raceControls.classList.remove('hidden');
        
        // Setup race button click handler
        const raceBtn = document.getElementById('race-btn');
        raceBtn.addEventListener('click', () => startRace(horses, app));
        
        return horses;
    } catch (error) {
        console.error('Setup race failed:', error);
        throw error;
    }
}

function startRace(horses, app) {
    console.log('Race starting...');  // Debug log
    const raceBtn = document.getElementById('race-btn');
    raceBtn.disabled = true;
    
    // Remove previous game loop if it exists
    if (currentGameLoop) {
        app.ticker.remove(currentGameLoop);
    }
    
    const finishLine = app.screen.width - 300; // Adjusted finish line
    let winner = false;
    let lastTime = performance.now();
    
    // Initialize horses with race-specific properties
    horses.forEach(horse => {
        horse.baseSpeed = Math.random() * 1 + 0.5; // Reduced base speed (0.5-1.5)
        horse.timer = 0;
        horse.speed = horse.baseSpeed;
        horse.progressRatio = 0; // Track race progress
        horse.visible = true; // Ensure visibility
        console.log(`Horse initialized - behavior: ${horse.behavior}, visible: ${horse.visible}`);
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
    
    switch (horse.behavior) {
        case 'steady':
            return (horse.baseSpeed + baseVariation * 0.3) * horse.personality.consistency;
            
        case 'sprinter':
            const sprintBoost = Math.random() > horse.personality.burstChance ? 2.5 : 0;
            return (horse.baseSpeed + sprintBoost + baseVariation) * horse.personality.acceleration;
            
        case 'finisher':
            const finishBoost = horse.progressRatio * 2 * horse.personality.acceleration;
            return (horse.baseSpeed + finishBoost + baseVariation) * staminaFactor;
            
        case 'frontrunner':
            const frontBoost = (1 - horse.progressRatio) * 2 * horse.personality.acceleration;
            return (horse.baseSpeed + frontBoost + baseVariation) * staminaFactor;
            
        default:
            return horse.baseSpeed;
    }
}

function announceWinner(horse, horseNumber) {
    alert(`${horse.name} (Horse #${horseNumber}) wins!`);
}

function resetRace(horses) {
    console.log('Resetting race...');
    horses.forEach(horse => {
        horse.x = 50;
        horse.speedText.x = horse.x + horse.width + 10;
        horse.speed = 0;
        horse.visible = true;
        horse.speedText.text = 'Speed: 0';
    });
}