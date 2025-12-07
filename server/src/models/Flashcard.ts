export class Flashcard {
  constructor(
    private id: number,
    private front: string,
    private back: string
  ) {}

  getId() {
    return this.id;
  }

  getFront() {
    return this.front;
  }

  getBack() {
    return this.back;
  }

  setFront(front: string) {
    this.front = front;
  }

  setBack(back: string) {
    this.back = back;
  }

  toJSON() {
    return {
      id: this.id,
      front: this.front,
      back: this.back
    };
  }

  static fromJSON(json: any): Flashcard {
    return new Flashcard(json.id, json.front, json.back);
  }
}
