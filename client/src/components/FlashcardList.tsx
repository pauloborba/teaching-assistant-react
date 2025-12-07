import * as React from "react";

export default function FlashcardList({
  flashcards,
  onDelete,
}: {
  flashcards: any[];
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      {flashcards.map((fc) => (
        <div
          key={fc.id}
          style={{
            border: "1px solid #ccc",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <strong>Frente:</strong> {fc.front} <br />
          <strong>Verso:</strong> {fc.back} <br />
          <button onClick={() => onDelete(fc.id)}>Excluir</button>
        </div>
      ))}
    </div>
  );
}

export {}; 
