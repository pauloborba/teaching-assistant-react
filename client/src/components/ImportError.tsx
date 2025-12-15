import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LocationState {
  message: string;
}

const ImportError: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = location.state as LocationState;

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="import-result-container">
      <div className="import-result-card error">
        <div className="import-result-icon">✕</div>
        <h2>Import Failed</h2>
        <p className="import-error-message">
          {message || 'An error occurred during the import process.'}
        </p>
        <button className="back-btn" onClick={handleGoBack}>
          Tentar Novamente
        </button>
      </div>
    </div>
  );
};

export default ImportError;
