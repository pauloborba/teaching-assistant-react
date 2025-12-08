import React, { useState, useEffect } from 'react';
import { Typography, TextField } from '@mui/material';
import { SharedDialog } from './SharedDialog';
import ExamsService from '../services/ExamsService';

export interface GeneratePDFButtonProps {
  open: boolean;
  onClose: () => void;
  examId: string | null;
  classId: string;
  defaultQuantity?: number;
  onSuccess?: () => void;
}

export const GeneratePDFButton: React.FC<GeneratePDFButtonProps> = ({
  open,
  onClose,
  examId,
  classId,
  defaultQuantity = 1,
  onSuccess
}) => {

  const [quantity, setQuantity] = useState(defaultQuantity);
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantity(defaultQuantity > 0 ? defaultQuantity : 1);
      setExamDate(new Date().toISOString().split('T')[0]);
      setIsLoading(false);
      setErrorMessage(null);
    }
  }, [open, defaultQuantity]);

  const handleConfirmGeneration = async () => {
    if (!examId || !classId) {
      setErrorMessage("Erro: ID da prova ou turma faltando.");
      return;
    }

    if (quantity <= 0) {
      setErrorMessage("Quantidade deve ser maior que 0.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log(`Baixando lote: ExamID=${examId}, Qtd=${quantity}, ClassID=${classId}`);

      await ExamsService.downloadExamsZIP(examId, quantity, classId, examDate);

      if (onSuccess) {
        onSuccess();
      }

      onClose();

    } catch (error: any) {
      console.error(error);
      setErrorMessage("Erro ao gerar arquivos. Verifique se há questões cadastradas.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SharedDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirmGeneration}
      title="Gerar Lote de Provas"
      confirmText={isLoading ? "Gerando..." : "Baixar ZIP"}
      cancelText="Cancelar"
    >
      <Typography gutterBottom>
        Configure os detalhes para a geração dos arquivos:
      </Typography>

      <TextField
        autoFocus
        margin="dense"
        label="Quantidade de Versões"
        type="number"
        fullWidth
        variant="outlined"
        value={quantity}
        onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
        InputProps={{ inputProps: { min: 1 } }}
      />

      <TextField
        margin="dense"
        label="Data da Aplicação"
        type="date"
        fullWidth
        variant="outlined"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
        InputLabelProps={{
          shrink: true,
        }}
      />

      <Typography variant="caption" color="textSecondary" style={{ marginTop: 10, display: 'block' }}>
        * Será gerado um ZIP contendo os PDFs das provas e os gabaritos correspondentes.
      </Typography>

      {errorMessage && (
        <Typography color="error" style={{ marginTop: '10px' }}>
          {errorMessage}
        </Typography>
      )}
    </SharedDialog>
  );
};