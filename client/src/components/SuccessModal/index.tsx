import React from 'react';
import Modal from '../Modal';
import CustomButton from '../CustomButton';
import './SuccessModal.css';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: string;
  estimatedTime: string;
  totalStudentExams: number;
  totalOpenQuestions: number;
  queuedMessages: number;
}

export default function SuccessModal({
  isOpen,
  onClose,
  model,
  estimatedTime,
  totalStudentExams,
  totalOpenQuestions,
  queuedMessages
}: SuccessModalProps) {
  return (
    <Modal
      title="Correção Iniciada com Sucesso"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="success-modal-content" data-testid="success-modal-content">
        <div className="success-icon">✓</div>
        
        <p className="success-message">
          A correção das questões abertas foi iniciada com sucesso usando o modelo <strong>{model}</strong>.
        </p>

        <div className="success-details">
          <div className="success-detail-item">
            <span className="success-detail-label">Tempo estimado:</span>
            <span className="success-detail-value">{estimatedTime}</span>
          </div>
          <div className="success-detail-item">
            <span className="success-detail-label">Respostas encontradas:</span>
            <span className="success-detail-value">{totalStudentExams}</span>
          </div>
          <div className="success-detail-item">
            <span className="success-detail-label">Questões abertas:</span>
            <span className="success-detail-value">{totalOpenQuestions}</span>
          </div>
          <div className="success-detail-item">
            <span className="success-detail-label">Mensagens enfileiradas:</span>
            <span className="success-detail-value">{queuedMessages}</span>
          </div>
        </div>

        <div className="success-modal-actions">
          <CustomButton
            label="Fechar"
            variant="primary"
            onClick={onClose}
            fullWidth
          />
        </div>
      </div>
    </Modal>
  );
}

