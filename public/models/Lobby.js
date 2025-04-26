
class Lobby {
  static SET_UP = 'set up';
  static IN_PROGRESS = 'in progress';
  static DONE = 'done';
  
  static MIN_TRACK_LENGTH = 1;
  static DEFAULT_TRACK_LENGTH = 5;
  static MAX_TRACK_LENGTH = 30;
  static MAX_HORSES = 5;
  static MAX_PARTICIPANTS = 100;
  static COSTS = {
    'Stim': 2,
    'Sabotage': 3,
    'Action 3': 5,
  };

  constructor(host) {
    this.host = host;
    this.participants = {};
    this.status = Lobby.SET_UP;
    this.raceTrackLength = Lobby.DEFAULT_TRACK_LENGTH;
    this.horses = [];
    this.bets = {};
    this.isRestrictedMode = false;

    this.power_queue = [];
  }

  IsInSetup() { return this.status === Lobby.SET_UP; }
  IsInProgress() { return this.status === Lobby.IN_PROGRESS; }
  IsDone() { return this.status === Lobby.DONE; }

  // RACE SPECIFIC
  SetRaceTrackLength(length) {
    if (this.IsInSetup()) {
      if (Lobby.MIN_TRACK_LENGTH < length && length > Lobby.MAX_TRACK_LENGTH) {
        this.raceTrackLength = length;
        return true;
      }
    }
    return false;
  }

  TryToAddHorse(horse) {
    if (this.IsInSetup()) { 
      if (this.horses.length < MAX_HORSES) {
        this.horses.push(horse);
        return true;
      }
    }
    return false;
  }

  TryToRemoveHorse(horseID) {
    if (this.IsInSetup()) { 
      if (0 <= horseID && horseID < this.horses.length) {
        array.splice(horseID, 1);
        return true;
      }
    }
    return false;
  }

  // LOBBY SPECIFIC
  ParticiapantTriesToJoin(participant) {
    console.log(participant);
    console.log(this.status);
    if (this.IsInSetup() && Object.keys(this.participants).length < Lobby.MAX_PARTICIPANTS) {
      participant.coins = 10;
      this.participants[participant.id] = [participant];
      return true;
    }
    return false;
  }
  
  ParticiapantTriesToUseAction(participant, horseName, action) {
    if (this.IsAParticipant(participant)) {
      let cost = Lobby.COSTS[action];

      if (cost == undefined) {
        return false;
      }

      if (participant.coins < cost) {
        return false;
      }
      
      for (let i = 0; i < this.horses.length; i++) {
        const horse = this.horses[i];
        if (horse.name === horseName) {
          participant.coins -= cost;

          if (action == 'Stim') {
            horse.stimCount++;
          }

          if (action == 'Sabotage') {
            horse.sabotageCount++;
          }
          console.log(horse)
          // horse.effects[action] = (horse.effects[action] || 0) + 1;
          return true;
        }
      }
    }
    return false;
  }

  ParticiapantTriesToLeave(participant) {
    delete this.participants[participant.id];
    return true;
  }

  StartRace(myUser) {
    if (this.IsInSetup() && this.host.id === myUser.id) {
      this.status = Lobby.IN_PROGRESS;
      return true;
    }
    return false;
  }
  
  EndRace(myUser) {
    if (this.IsInProgress() && this.host.id === myUser.id) {
      this.status = Lobby.DONE;
      return true;
    }
    return false;
  }
  
  ReturnToWaiting() {
    this.resetRace();
  }

  IsTheHost(user) {
    return this.host.id === user.id;
  }
  IsAParticipant(user) {
    return this.participants[user.id] != undefined;
  }

  resetRace() {
    console.log('Resetting race...');
    
    for (let i = 0; i < this.participants.length; i++) {
      const participant = this.participants[i];
      participant.coins = 10;
    }

    this.horses.forEach(horse => {
      horse.x = 50;
      horse.stimCount = 0; // Reset stim count
      horse.sabotageCount = 0; // Reset sabotage count
    });
  }

}

export default Lobby;