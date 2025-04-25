export class Utils {
  static getRandomInt(x, y) {
    return Math.floor(Math.random() * (y - x + 1)) + x;
  }
}

