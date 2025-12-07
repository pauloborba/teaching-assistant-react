import * as React from "react";
import "./FlashcardForm.css";

export default function FlashcardForm({ onAdd }: { onAdd: Function }) {
  // Estado para armazenar o texto da frente do card
  const [front, setFront] = React.useState("");
  
  // Estado para armazenar o texto do verso do card
  const [back, setBack] = React.useState("");
  
  // Estado para controlar se está enviando o formulário
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Função que adiciona um novo flashcard
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    
    setIsSubmitting(true);
    onAdd(front, back);
    setFront("");
    setBack("");
    setIsSubmitting(false);
  };

  // Verifica se os campos estão preenchidos
  const isValid = front.trim().length > 0 && back.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flashcard-form">
      <div className="form-container">
        <h3 className="form-title">📝 Criar Novo Flashcard</h3>
        
        {/* Campo para a frente do card */}
        <div className="form-group">
          <label htmlFor="front">Frente (Pergunta)</label>
          <input
            id="front"
            type="text"
            placeholder="Ex: O que é recursão?"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            maxLength={200}
          />
          {/* Contador de caracteres */}
          <span className="char-count">{front.length}/200</span>
        </div>

        {/* Campo para o verso do card */}
        <div className="form-group">
          <label htmlFor="back">Verso (Resposta)</label>
          <input
            id="back"
            type="text"
            placeholder="Ex: Uma função que chama a si mesma..."
            value={back}
            onChange={(e) => setBack(e.target.value)}
            maxLength={200}
          />
          {/* Contador de caracteres */}
          <span className="char-count">{back.length}/200</span>
        </div>

        {/* Botão para adicionar o flashcard */}
        <button 
          type="submit" 
          className="btn-submit"
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? "Adicionando..." : "✨ Adicionar Flashcard"}
        </button>
      </div>
    </form>
  );
}

export {}; 