import * as React from "react";
import "./FlashcardList.css";

export default function FlashcardList({
  flashcards,
  onDelete,
}: {
  flashcards: any[];
  onDelete: (id: number) => void;
}) {
  // Armazena quais cards estão virados
  const [flipped, setFlipped] = React.useState<Set<number>>(new Set());
  
  // Armazena o ID do card sendo deletado
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  // Alterna entre virado e não virado
  const toggleFlip = (id: number) => {
    const newFlipped = new Set(flipped);
    if (newFlipped.has(id)) {
      newFlipped.delete(id);
    } else {
      newFlipped.add(id);
    }
    setFlipped(newFlipped);
  };

  // Deleta um flashcard com animação
  const handleDelete = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      onDelete(id);
      setDeletingId(null);
    }, 300);
  };

  // Mostra mensagem quando não há flashcards
  if (flashcards.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📚</div>
        <h3>Nenhum flashcard ainda</h3>
        <p>Comece adicionando seu primeiro flashcard acima!</p>
      </div>
    );
  }

  return (
    <div className="flashcard-container">
      <h3 className="list-title">📚 Seus Flashcards ({flashcards.length})</h3>
      
      {/* Grid de flashcards */}
      <div className="flashcards-grid">
        {flashcards.map((fc) => (
          <div
            key={fc.id}
            className={`flashcard-wrapper ${
              flipped.has(fc.id) ? "flipped" : ""
            } ${deletingId === fc.id ? "deleting" : ""}`}
          >
            {/* Card com efeito de flip 3D */}
            <div className="flashcard" onClick={() => toggleFlip(fc.id)}>
              {/* Lado da frente */}
              <div className="flashcard-face flashcard-front">
                <div className="flashcard-content">
                  <span className="flip-hint">↻ Clique para virar</span>
                  <p>{fc.front}</p>
                </div>
              </div>

              {/* Lado do verso */}
              <div className="flashcard-face flashcard-back">
                <div className="flashcard-content">
                  <span className="flip-hint">↻ Clique para virar</span>
                  <p>{fc.back}</p>
                </div>
              </div>
            </div>

            {/* Botões de ação do card */}
            <div className="flashcard-actions">
              <button
                className="btn-delete"
                onClick={() => handleDelete(fc.id)}
                title="Deletar flashcard"
              >
                🗑️ Deletar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export {}; 
