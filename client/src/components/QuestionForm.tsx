import React, { useState } from 'react';
import { Alternative, Question } from '../types/Question';
import { questionService } from '../services/QuestionService';
import './QuestionForm.css';

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
    const [success, setSuccess] = useState('');
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
                i === index
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
        setSuccess('');

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
            return;
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

            setSuccess('Questão criada com sucesso!');
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
            className="student-form question-form question-form-modern"
            onSubmit={handleSubmit}
        >
            <header className="qf-header">
                <span className="qf-kicker">Banco de questões</span>
                <h2>Criar questão</h2>
                <p>Escreva o enunciado e classifique cada alternativa da questão.</p>
            </header>

            <div className="qf-body">
                <div className="form-group">
                    <label htmlFor="question-subject">Assunto</label>
                    <input
                        id="question-subject"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Ex.: Gerência de configuração"
                        disabled={saving}
                    />
                </div>

                <div className="form-group qf-statement">
                    <label htmlFor="question-statement">Enunciado</label>
                    <textarea
                        id="question-statement"
                        rows={5}
                        value={statement}
                        onChange={e => setStatement(e.target.value)}
                        placeholder="Digite o enunciado da questão..."
                        disabled={saving}
                    />
                </div>

                <section className="qf-alternatives" aria-labelledby="qf-alternatives-heading">
                    <div className="qf-section-heading">
                        <h3 id="qf-alternatives-heading">Alternativas</h3>
                        <span className="qf-count">{alternatives.length}</span>
                    </div>
                    <p className="qf-hint">Adicione os itens e indique se cada um é verdadeiro ou falso.</p>

                    <div className="qf-grid">
                        {alternatives.map((alternative, index) => (
                            <div className="question-alternative qf-alternative" key={index}>
                                <div className="qf-alternative-header">
                                    <label htmlFor={`alternative-${index}`}>
                                        Alternativa {index + 1}
                                    </label>
                                    <button
                                        type="button"
                                        className="qf-remove"
                                        disabled={saving}
                                        onClick={() => removeDraftAlternative(index)}
                                        aria-label={`Remover alternativa ${index + 1}`}
                                        title={`Remover alternativa ${index + 1}`}
                                    >
                                        <span aria-hidden="true">−</span>
                                        <span className="qf-sr-only">Remover alternativa {index + 1}</span>
                                    </button>
                                </div>

                                <input
                                    id={`alternative-${index}`}
                                    value={alternative.text}
                                    placeholder="Digite o texto da alternativa"
                                    disabled={saving}
                                    onChange={e => updateAlternative(index, {
                                        text: e.target.value
                                    })}
                                />

                                <div className="form-group qf-classification">
                                    <label htmlFor={`alternative-type-${index}`}>
                                        Classificação da alternativa {index + 1}
                                    </label>
                                    <select
                                        id={`alternative-type-${index}`}
                                        className={alternative.isTrue ? 'qf-true' : 'qf-false'}
                                        value={String(alternative.isTrue)}
                                        disabled={saving}
                                        onChange={e => updateAlternative(index, {
                                            isTrue: e.target.value === 'true'
                                        })}
                                    >
                                        <option value="true">Verdadeira</option>
                                        <option value="false">Falsa</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="qf-add"
                        onClick={addDraftAlternative}
                        disabled={saving}
                    >
                        <span className="qf-plus" aria-hidden="true">+</span>
                        Adicionar alternativa
                    </button>
                </section>
            </div>

            <footer className="qf-footer">
                {error && <p role="alert" className="error-message qf-error">{error}</p>}
                {success && <p role="status" className="qf-success">{success}</p>}
                <div className="form-buttons qf-actions">
                    <button type="submit" className="qf-save" disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar questão'}
                    </button>
                </div>
            </footer>
        </form>
    );
};

export default QuestionForm;
