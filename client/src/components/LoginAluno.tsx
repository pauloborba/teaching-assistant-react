import React, { useState } from 'react';
import { Student } from '../types/Student';
import { studentService } from '../services/StudentService';

interface LoginAlunoProps {
  onLogin: (aluno: Student) => void;
}

const LoginAluno: React.FC<LoginAlunoProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    cpf: '',
    email: ''
  });
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCPF = (value: string) => {

    const digits = value.replace(/\D/g, '').slice(0, 11);

    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFormData(prev => ({
      ...prev,
      cpf: formatCPF(e.target.value)
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFormData(prev => ({
      ...prev,
      email: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.cpf.replace(/\D/g, '').length !== 11) {
      setError('Informe os 11 dígitos do CPF.');
      return;
    }

    setIsSubmitting(true);
    try {
      const aluno = await studentService.login(formData.cpf, formData.email.trim());
      onLogin(aluno);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="enrollment-overlay" data-testid="login-aluno-modal">
      <div className="enrollment-modal login-modal">
        <div className="enrollment-modal-header">
          <h3>Identificação do aluno</h3>
        </div>

        <div className="enrollment-modal-content">
          <p className="login-hint">
            Informe o CPF e o email cadastrados pelo professor para ver os seus roteiros.
          </p>

          {error && (
            <div className="error-message" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-cpf">CPF:</label>
              <input
                type="text"
                id="login-cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleCPFChange}
                required
                placeholder="000.000.000-00"
                maxLength={14}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-email">Email:</label>
              <input
                type="email"
                id="login-email"
                name="email"
                value={formData.email}
                onChange={handleEmailChange}
                required
                placeholder="aluno@cin.ufpe.br"
              />
            </div>

            <div className="form-buttons">
              <button type="submit" disabled={isSubmitting} data-testid="login-submit-button">
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginAluno;