import React, { useState } from 'react';
import { Alternative, Question } from '../types/Question';
import { questionService } from '../services/QuestionService';

interface QuestionFormProps {
    onCreated: (question: Question) => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onCreated }) => {
    const [subject, setSubject] = useState('');
    const [statement, setStatement] = useState('');

    const [alternatives, setAlternatives] = useState<Alternative[]>([
        { text: '', isTrue: true }
    ]);

    const [error, setError] = useState('');
    const [success, setSucess] = useState('');
    const [saving, setSaving] = useState(false);

    // Adiciona um campo no formulário, não no backend
    const addDraftAlternative = () => {
        setAlternatives(previous => [
            ...previous,
            { text: '', isTrue: true }
        ]);
    };

    // Atualiza o texto ou a classificação de uma alternativa
    const updateAlternative = (
        index: number,
        changes: Partial<Alternative>
    ) => {
        setAlternatives(previous => 
            previous.map((alternative, i) =>
                i == index
                ? { ...alternative, ...changes }
                : alternative
            )
        );
    };

    // Remove apenas um campo temporário do formulário.
    const removeDraftAlternative = (index: number) => {
        setAlternatives(previous =>
            previous.filter((_, i) => i !== index)
        );
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setError('');
        setSucess('');

        if (!subject.trim()) {
            setError('É preciso definir o assunto da questão');
            return;
        }

        if (
            alternatives.length === 0 || alternatives.every(a => !a.text.trim())
        ) {
            setError('É preciso adicionar alternativas para a questão');
            return;
        }

        if (!statement.trim()) {
            setError('É preciso definir o enunciado da questão');
        }

        if (alternatives.some(a => !a.text.trim())) {
            setError('Alternativa inválida');
            return;
        }

        setSaving(true);

        try {
            const created = await questionService.createQuestion({
                subject,
                statement,
                alternatives
            });

            onCreated(created);

            setSubject('');
            setStatement('');
            setAlternatives([{ text: '', isTrue: true }]);

            setSucess('Questão criada com sucesso!');
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Não foi possível criar a questão'
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <form
        className="student-form question-form"
        onSubmit={handleSubmit}
        >
        <h2>Criar questão</h2>

        <div className="form-group">
            <label htmlFor="question-subject">Assunto</label>
            <input
            id="question-subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={saving}
            />
        </div>

        <div className="form-group">
            <label htmlFor="question-statement">Enunciado</label>
            <textarea
            id="question-statement"
            rows={3}
            value={statement}
            onChange={e => setStatement(e.target.value)}
            disabled={saving}
            />
        </div>

        <h3>Alternativas</h3>

        {alternatives.map((alternative, index) => (
            <div className="question-alternative" key={index}>
            <div className="form-group">
                <label htmlFor={`alternative-${index}`}>
                Alternativa {index + 1}
                </label>

                <input
                id={`alternative-${index}`}
                value={alternative.text}
                disabled={saving}
                onChange={e =>
                    updateAlternative(index, {
                    text: e.target.value
                    })
                }
                />
            </div>

            <div className="form-group">
                <label htmlFor={`alternative-type-${index}`}>
                Classificação da alternativa {index + 1}
                </label>

                <select
                id={`alternative-type-${index}`}
                value={String(alternative.isTrue)}
                disabled={saving}
                onChange={e =>
                    updateAlternative(index, {
                    isTrue: e.target.value === 'true'
                    })
                }
                >
                <option value="true">Verdadeira</option>
                <option value="false">Falsa</option>
                </select>
            </div>

            <button
                type="button"
                disabled={saving}
                onClick={() => removeDraftAlternative(index)}
            >
                Remover alternativa {index + 1}
            </button>
            </div>
        ))}

        <div className="form-buttons">
            <button
            type="button"
            onClick={addDraftAlternative}
            disabled={saving}
            >
            Adicionar alternativa
            </button>

            <button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar questão'}
            </button>
        </div>

        {error && <p role="alert" className="error-message">{error}</p>}

        {success && <p role="status">{success}</p>}
        </form>
    );
};

export default QuestionForm;
