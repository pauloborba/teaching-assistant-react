export class FlashcardService {
  private baseUrl = "http://localhost:3005/api/flashcards";

  async getAll() {
    try {
      const res = await fetch(this.baseUrl);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const text = await res.text();
      if (!text) {
        return [];
      }
      return JSON.parse(text);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      throw error;
    }
  }

  async add(front: string, back: string) {
    try {
      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front, back }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const text = await res.text();
      if (!text) {
        return null;
      }
      return JSON.parse(text);
    } catch (error) {
      console.error("Error adding flashcard:", error);
      throw error;
    }
  }

  async delete(id: number) {
    try {
      const res = await fetch(`${this.baseUrl}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const text = await res.text();
      if (!text) {
        return { success: true };
      }
      return JSON.parse(text);
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      throw error;
    }
  }
}

export {};
