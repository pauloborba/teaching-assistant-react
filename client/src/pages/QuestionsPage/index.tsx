import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import QuestionService from '../../services/QuestionService';
import { Question, QuestionType } from '../../types/Question';
import CustomButton from '../../components/CustomButton';
import './QuestionsPage.css';

interface FormOption {
  option: string;
  isCorrect: boolean;
}

interface FormState {
  id?: number;
  question: string;
  topic: string;
  type: QuestionType;
  answer: string;
  options: FormOption[];
}

const createDefaultOptions = (): FormOption[] => [
  { option: '', isCorrect: false },
  { option: '', isCorrect: false },
];

const createDefaultForm = (): FormState => ({
  question: '',
  topic: '',
  type: 'open',
  answer: '',
  options: createDefaultOptions(),
});

const QuestionsPage: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState<FormState>(createDefaultForm());
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [filterTopic, setFilterTopic] = useState<string>('');

  const topics = useMemo<string[]>(() => {
    const topicSet = new Set<string>();
    questions.forEach((q: Question) => topicSet.add(q.topic));
    return Array.from(topicSet).sort();
  }, [questions]);

  const loadQuestions = async (topic?: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await QuestionService.getAllQuestions(topic);
      setQuestions(data);
    } catch (serviceError) {
      console.error('Error loading questions:', serviceError);
      setError(serviceError instanceof Error ? serviceError.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const resetForm = () => {
    setForm(createDefaultForm());
  };

  const handleTypeChange = (type: QuestionType) => {
    setForm((prev: FormState) => ({
      ...prev,
      type,
      answer: type === 'open' ? prev.answer : '',
      options:
        type === 'closed'
          ? (prev.options.length ? prev.options : createDefaultOptions())
          : prev.options,
    }));
  };

  const handleOptionChange = (index: number, field: 'option' | 'isCorrect', value: string | boolean) => {
    setForm((prev: FormState) => {
      const updated = prev.options.map((opt: FormOption, idx: number) =>
        idx === index ? { ...opt, [field]: value } : opt
      );
      return { ...prev, options: updated };
    });
  };

  const handleAddOption = () => {
    setForm((prev: FormState) => ({
      ...prev,
      options: [...prev.options, { option: '', isCorrect: false }],
    }));
  };

  const handleRemoveOption = (index: number) => {
    setForm((prev: FormState) => ({
      ...prev,
      options: prev.options.filter((_, idx: number) => idx !== index),
    }));
  };

  const populateFormForEdit = (question: Question) => {
    setForm({
      id: question.id,
      question: question.question,
      topic: question.topic,
      type: question.type,
      answer: question.answer ?? '',
      options:
        question.type === 'closed'
          ? (question.options ?? []).map((opt): FormOption => ({ option: opt.option, isCorrect: opt.isCorrect }))
          : createDefaultOptions(),
    });
    setSuccessMessage('');
  };

  const validateForm = (): string | null => {
    if (!form.question.trim()) {
      return 'Question text is required';
    }

    if (!form.topic.trim()) {
      return 'Topic is required';
    }

    if (form.type === 'open') {
      if (!form.answer.trim()) {
        return 'Answer is required for open questions';
      }
      return null;
    }

    const cleanedOptions = form.options.filter((opt: FormOption) => opt.option.trim().length > 0);
    if (cleanedOptions.length < 2) {
      return 'Closed questions require at least two options';
    }

    if (!cleanedOptions.some((opt: FormOption) => opt.isCorrect)) {
      return 'Mark at least one option as correct';
    }

    return null;
  };

  const buildPayload = () => {
    if (form.type === 'open') {
      return {
        question: form.question.trim(),
        topic: form.topic.trim(),
        type: 'open' as const,
        answer: form.answer.trim(),
      };
    }

    const options = form.options
      .map((opt: FormOption) => ({
        option: opt.option.trim(),
        isCorrect: opt.isCorrect,
      }))
      .filter((opt: FormOption) => opt.option.length > 0);

    return {
      question: form.question.trim(),
      topic: form.topic.trim(),
      type: 'closed' as const,
      options,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const payload = buildPayload();

    try {
      setSubmitting(true);
      if (form.id) {
        await QuestionService.updateQuestion(form.id, payload);
        setSuccessMessage('Question updated successfully');
      } else {
        await QuestionService.createQuestion(payload);
        setSuccessMessage('Question created successfully');
      }

      resetForm();
      loadQuestions(filterTopic || undefined);
    } catch (serviceError) {
      console.error('Error submitting question:', serviceError);
      setError(serviceError instanceof Error ? serviceError.message : 'Failed to save question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (question: Question) => {
    populateFormForEdit(question);
  };

  const handleDelete = async (question: Question) => {
    const confirmation = window.confirm(`Delete the question "${question.question}"?`);
    if (!confirmation) {
      return;
    }

    try {
      setSubmitting(true);
      await QuestionService.deleteQuestion(question.id);
      setSuccessMessage('Question deleted successfully');
      if (form.id === question.id) {
        resetForm();
      }
      loadQuestions(filterTopic || undefined);
    } catch (serviceError) {
      console.error('Error deleting question:', serviceError);
      setError(serviceError instanceof Error ? serviceError.message : 'Failed to delete question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilterChange = async (topicValue: string) => {
    setFilterTopic(topicValue);
    loadQuestions(topicValue || undefined);
  };

  return (
    <div className="questions-page">
      <h2>Question Bank</h2>

      {(error || successMessage) && (
        <div className={`feedback-message ${error ? 'error' : 'success'}`}>
          {error || successMessage}
        </div>
      )}

      <section className="questions-filter">
        <label htmlFor="topic-filter">Filter by topic:</label>
        <select
          id="topic-filter"
          value={filterTopic}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => handleFilterChange(event.target.value)}
        >
          <option value="">All topics</option>
          {topics.map((topic: string) => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
      </section>

      <section className="question-form">
        <h3>{form.id ? 'Edit question' : 'Create new question'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="question-text">Question</label>
              <textarea
                  id="question-text"
                  value={form.question}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setForm((prev: FormState) => ({ ...prev, question: event.target.value }))
                  }
                  placeholder="Enter question text"
                  required
              />
          </div>

          <div className="form-row">
            <label htmlFor="question-topic">Topic</label>
            <input
              id="question-topic"
              type="text"
              value={form.topic}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setForm((prev: FormState) => ({ ...prev, topic: event.target.value }))
              }
              placeholder="e.g. Engenharia de Software"
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="question-type">Type</label>
            <select
              id="question-type"
              value={form.type}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleTypeChange(event.target.value as QuestionType)
              }
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {form.type === 'open' && (
            <div className="form-row">
              <label htmlFor="question-answer">Answer</label>
              <textarea
                id="question-answer"
                value={form.answer}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setForm((prev: FormState) => ({ ...prev, answer: event.target.value }))
                }
                placeholder="Provide the model answer"
                required
              />
            </div>
          )}

          {form.type === 'closed' && (
            <div className="form-row">
              <label>Options</label>
              <div className="options-list">
                {form.options.map((option, index) => (
                  <div className="option-item" key={`option-${index}`}>
                    <input
                      type="text"
                      value={option.option}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        handleOptionChange(index, 'option', event.target.value)
                      }
                      placeholder={`Option ${index + 1}`}
                    />
                    <label className="option-correct">
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          handleOptionChange(index, 'isCorrect', event.target.checked)
                        }
                      />
                      Correct
                    </label>
                    {form.options.length > 2 && (
                      <button
                        type="button"
                        className="remove-option"
                        onClick={() => handleRemoveOption(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="add-option" onClick={handleAddOption}>
                Add option
              </button>
            </div>
          )}

          <div className="form-actions">
            <CustomButton
              label={form.id ? 'Update question' : 'Create question'}
              type="submit"
              disabled={submitting}
            />
            {form.id && (
              <button type="button" className="cancel-edit" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="questions-list">
        <h3>Registered questions</h3>
        {loading ? (
          <p>Loading questions...</p>
        ) : questions.length === 0 ? (
          <p>No questions found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Topic</th>
                <th>Question</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map(question => (
                <tr key={question.id}>
                  <td>{question.id}</td>
                  <td>{question.topic}</td>
                  <td>{question.question}</td>
                  <td>{question.type === 'open' ? 'Open' : 'Closed'}</td>
                  <td className="actions-cell">
                    <button type="button" onClick={() => handleEdit(question)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(question)} disabled={submitting}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default QuestionsPage;
