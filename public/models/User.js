import { Utils } from "./Utils.js";

const defaultJockeyNames = [
  "Neil Gallops",
  "Hayden Trotter",
  "Saddle McSwift",
  "Gallop O’Hara",
  "Whinny Houston",
  "Hoof Hefner",
  "Buck Rogers",
  "Canter B. Stopped",
  "Clip Clopson",
  "Colt Cabana",
  "Stirrup Stanley",
  "Rein Beau",
  "Trotter Swift",
  "Marey Carey",
  "Jockey Chan"
];

class User {
  constructor(id) {
    this.id = id;
    this.coins = 10;
    this.name = defaultJockeyNames[Utils.getRandomInt(0, defaultJockeyNames.length - 1)];
  }

  IsValid() {
    return this.id != -1;
  }

  toString() {
    return `{ id: ${this.id} }`
  }
}

export default User;