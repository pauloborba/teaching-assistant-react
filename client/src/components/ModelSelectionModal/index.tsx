import React from 'react';
import Modal from '../Modal';
import CustomButton from '../CustomButton';
import Dropdown from '../DropDown';
import './ModelSelectionModal.css';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (model: string) => void;
  selectedModel?: string;
}

const availableModels: string[] = [
  'Gemini 2.5 Flash'
];

export default function ModelSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedModel
}: ModelSelectionModalProps) {
  const [localSelectedModel, setLocalSelectedModel] = React.useState<string>(selectedModel || '');

  // Sincroniza o estado quando o modal abre ou quando selectedModel muda
  React.useEffect(() => {
    if (isOpen) {
      setLocalSelectedModel(selectedModel || '');
    }
  }, [isOpen, selectedModel]);

  const handleConfirm = () => {
    if (!localSelectedModel || localSelectedModel === 'Selecione um modelo') {
      // Validação: não permite confirmar sem selecionar um modelo
      // Passa string vazia para triggerar a validação no componente pai
      onSelect('');
      return;
    }
    onSelect(localSelectedModel);
    onClose();
  };

  const handleModelSelect = (model: string) => {
    setLocalSelectedModel(model);
  };

  return (
    <Modal
      title="Selecionar Modelo de IA"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="model-selection-content">
        <p className="model-selection-description">
          Selecione o modelo de IA que será usado para corrigir as questões abertas:
        </p>

        <div className="model-dropdown-container">
          <Dropdown
            subjects={availableModels}
            initialText={selectedModel || "Selecione um modelo"}
            onSelect={handleModelSelect}
            data-testid="model-selection-dropdown"
          />
        </div>

        <div className="model-selection-actions">
          <CustomButton
            label="Cancelar"
            variant="secondary"
            onClick={onClose}
            data-testid="model-selection-cancel-button"
          />
          <CustomButton
            label="Confirmar"
            variant="primary"
            onClick={handleConfirm}
            data-testid="model-selection-confirm-button"
          />
        </div>
      </div>
    </Modal>
  );
}

