import fs  from 'fs/promises';

async function loadJSON(fileName) {
  try {
    const jsonString = await fs.readFile(fileName, 'utf-8');
    const data = JSON.parse(jsonString);
    // console.log("Parsed JSON:", data);
    return data;
  } catch (err) {
    console.error("Failed to load JSON:", err);
  }

  return {};
}

async function writeFile(content) {
  try {
    await fs.writeFile('output.csv', content);
    console.log('File written successfully');
  } catch (err) {
    console.error(err);
  }
}

export async function simulate() {
  try {
    const BEHAVIORS = ['steady', 'sprinter', 'finisher', 'frontrunner'];
    let horseConfigs = await loadJSON('../horsies/public/data/horses.json');
    horseConfigs = horseConfigs.horses;

    let simulation_horses = [];
    console.log(horseConfigs.length);
    // console.log(horseConfigs);
    
    // create one horse for each behavior
    for (let index = 0; index < 20; index++) {
      for (let i = 0; i < horseConfigs.length + 5; i++) {
        for (let j = 0; j < BEHAVIORS.length; j++) {
          const horse = i < horseConfigs.length  ? horseConfigs[i] : createHorse(i);
          const clone = { ...horse };
          clone.behavior = BEHAVIORS[j];
          clone.baseSpeed = Math.random() * 1 + 0.5;
          clone.progressRatio = 0;
          clone.finishTime = 0;
          clone.x = 0;
          clone.timer = 0;
          clone.time_at_500 = 0;
          clone.time_at_1000 = 0;
          clone.time_at_1500 = 0;
          clone.time_at_2000 = 0;
          simulation_horses.push(clone);
        }
      }
    }
    // console.log(simulation_horses);
    // for each horse run the race (a few times) and note down time to complete (maybe position at time x)

    start_race_time = performance.now();
    lastTime = performance.now();
    while(number_of_finished_horses < simulation_horses.length) {
      raceUpdate(simulation_horses);
      await sleep(1000);
    }

    // output finish info
    let csv_data = 'name,behavior,time_500,time_1000,time_1500,time_2000\n';
    for (let i = 0; i < simulation_horses.length; i++) {
      const horse = simulation_horses[i];
      console.log(horse.name, horse.behavior, horse.finishTime)
      csv_data += `${horse.name}, ${horse.behavior}, ${horse.time_at_500}, ${horse.time_at_1000}, ${horse.time_at_1500}, ${horse.time_at_2000}\n`;
    }
    writeFile(csv_data);

  } catch (error) {
    console.error('Setup race failed:', error);
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createHorse(index) {
  return {
    name: `${index}`,
    personality: {
      consistency: Math.random() * 0.5 + 0.5,
      stamina: Math.random() * 0.5 + 0.5,
      acceleration: Math.random() * 0.5 + 0.5,
      burstChance: Math.random() * 0.3 + 0.2
    }
  }
}

function calculateHorseSpeed(horse) {
  // console.log(horse);

  const a1 = horse.timer * 0.05; 
  const a2 = Math.sin(a1); 
  const a3 = horse.personality.consistency;
  
  const b1 = 1 - horse.progressRatio; 
  const b2 = 1 - horse.personality.stamina; 
  const b3 = Math.pow(b1, b2);

  // console.log(a1,a2,a3);
  // console.log(b1,b2,b3);

  const baseVariation = a2 * 0.75 * a3;
  const staminaFactor = Math.pow(1 - horse.progressRatio, 1 - horse.personality.stamina);
  var multiplier = horse.speedMultiplier || 1;

  // console.log(`calculateHorseSpeed ${baseVariation} ${staminaFactor} ${multiplier}`)
  
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

let start_race_time = performance.now();
let number_of_finished_horses = 0;
let lastTime = 0;
let finishLine = 2000;
let iteration_number = 0;

function raceUpdate(horses) {
  iteration_number++;
  number_of_finished_horses = 0;
  const currentTime = performance.now();
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  let last_horse_position = horses[0].x;

  horses.forEach((horse, index) => {
    if (horse.x >= finishLine) {
      number_of_finished_horses++;
      return;  // Skip movement for finished horses
    }
    
    // Update timer and progress
    horse.timer += deltaTime;
    horse.progressRatio = (horse.x) / (finishLine); // 0 to 1 progress
    
    // Calculate and apply speed
    horse.speed = calculateHorseSpeed(horse);
    horse.x += horse.speed * deltaTime * 60; // Scale for 60fps equivalent

    last_horse_position = Math.min(last_horse_position, horse.x);

    if (horse.time_at_500 == 0 && horse.x >= 500) {
      horse.time_at_500 = currentTime - start_race_time;
    }

    if (horse.time_at_1000 == 0 && horse.x >= 1000) {
      horse.time_at_1000 = currentTime - start_race_time;
    }

    if (horse.time_at_1500 == 0 && horse.x >= 1500) {
      horse.time_at_1500 = currentTime - start_race_time;
    }

    if (horse.time_at_2000 == 0 && horse.x >= 2000) {
      horse.time_at_2000 = currentTime - start_race_time;
    }

    if (horse.x >= finishLine) {
      horse.finishTime = currentTime - start_race_time;
    }
  });
  
  // if (iteration_number % 10000 === 0) {
    // console.log(`updated race ${currentTime}, ${deltaTime}`);
    // console.log(`horse ${horses[0].x} ${horses[0].speed} ${horses[0].behavior}`);
    console.log(`race updated - ${currentTime} - ${number_of_finished_horses} / ${horses.length} horses done - last horse is at ${last_horse_position}`);
  // }
}