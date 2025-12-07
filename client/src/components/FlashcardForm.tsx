import * as React from "react";

export default function FlashcardForm({ onAdd }: { onAdd: Function }) {
  const [front, setFront] = React.useState("");
  const [back, setBack] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front || !back) return;
    onAdd(front, back);
    setFront("");
    setBack("");
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <input
        type="text"
        placeholder="Frente"
        value={front}
        onChange={(e) => setFront(e.target.value)}
      />

      <input
        type="text"
        placeholder="Verso"
        value={back}
        onChange={(e) => setBack(e.target.value)}
      />

      <button type="submit">Adicionar Flashcard</button>
    </form>
  );
}

export {}; 