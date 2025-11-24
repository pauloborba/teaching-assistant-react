// client/src/components/GeneratePdfDialog/index.tsx

import React, { useState, useEffect } from 'react';
import { Typography, TextField } from '@mui/material';
import { SharedDialog } from './SharedDialog';
import ExamsService from '../services/ExamsService';

export interface GeneratePDFButtonProps {
  open: boolean;
  
  onClose: () => void;
  
  examId: string | null;
}

export const GeneratePDFButton: React.FC<GeneratePDFButtonProps> = ({ open, onClose, examId }) => {
  
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantity(1);
      setIsLoading(false);
      setErrorMessage(null);
    }
  }, [open]);

  const handleInternalClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleConfirmGeneration = async () => {
    if (!examId) {
      setErrorMessage("Erro: Nenhum ID de prova foi fornecido.");
      return;
    }

    if (quantity < 1 || isNaN(quantity)) {
      setErrorMessage("A quantidade deve ser 1 ou mais.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log(`Iniciando download de ${quantity} PDF(s) para o ID: ${examId}`);
      
      if (quantity == 1) {
        await ExamsService.downloadExamPDF(examId);
      } else {
        await ExamsService.downloadExamZIP(examId, quantity);
      }
      
      handleInternalClose();

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SharedDialog
      open={open}
      onClose={handleInternalClose}
      onConfirm={handleConfirmGeneration}
      title="Testar Geração de PDF"
      confirmText={isLoading ? "Gerando..." : "Gerar"}
      cancelText="Cancelar"
    >
      <Typography gutterBottom>
        Quantas versões da prova (com ordem randomizada) você deseja gerar?
      </Typography>
      
      <TextField
        autoFocus
        margin="dense"
        id="quantidade"
        label="Quantidade"
        type="number"
        fullWidth
        variant="outlined"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
        InputProps={{ inputProps: { min: 1 } }}
      />
      
      {errorMessage && (
        <Typography color="error" style={{ marginTop: '10px' }}>
          {errorMessage}
        </Typography>
      )}
    </SharedDialog>
  );
};