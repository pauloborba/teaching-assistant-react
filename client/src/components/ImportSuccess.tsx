import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LocationState {
  imported: number;
  rejected: number;
}

const ImportSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { imported, rejected } = location.state as LocationState;

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="import-result-container">
      <div className="import-result-card success">
        <div className="import-result-icon">✓</div>
        <h2>Import Successful!</h2>
        <div className="import-result-stats">
          <div className="stat-item">
            <span className="stat-number">{imported || 0}</span>
            <span className="stat-label">Students Imported</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{rejected || 0}</span>
            <span className="stat-label">Students Rejected</span>
          </div>
        </div>
        <p className="import-result-message">
          Importação concluída: {imported || 0} alunos foram importados com sucesso e {rejected || 0} foram rejeitados
        </p>
        <button className="back-btn" onClick={handleGoBack}>
          Voltar
        </button>
      </div>
    </div>
  );
};

export default ImportSuccess;
