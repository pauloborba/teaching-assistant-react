import { Flashcard } from "./Flashcard";

export class FlashcardSet {
  private flashcards: Flashcard[] = [];
  private nextId = 1;

  getAll() {
    return this.flashcards.map(fc => fc.toJSON());
  }

  add(front: string, back: string) {
    const flashcard = new Flashcard(this.nextId++, front, back);
    this.flashcards.push(flashcard);
    return flashcard.toJSON();
  }

  delete(id: number) {
    const index = this.flashcards.findIndex(fc => fc.getId() === id);
    if (index === -1) return false;
    this.flashcards.splice(index, 1);
    return true;
  }
}
