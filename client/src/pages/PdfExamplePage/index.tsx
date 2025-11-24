import React, { useState } from 'react';
import { Button } from '@mui/material';
import { GeneratePDFButton } from '../../components/GeneratePDFButton'; 

const mockExamList = [
  { id: 'exam-id-123', title: 'Prova1_ESS (Mock de Sucesso)' },
  { id: 'non-existent-id-999', title: 'Prova Inexistente (Mock de Erro 404)' },
  { id: 'exam-final-vazia', title: 'Prova Final Vazia (Mock de Erro 400)' },
  { id: 'exam-id-456', title: 'Prova de Teste (Aluno) (Mock de Sucesso)' },
];

const ExamPage: React.FC = () => {
    
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const handleOpenPdfDialog = (examId: string) => {
    setSelectedExamId(examId); 
    setIsDialogOpen(true);     
  };

  const handleClosePdfDialog = () => {
    setIsDialogOpen(false);
    setSelectedExamId(null);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Página de Provas</h1>
      <hr />

      {mockExamList.map((exam) => (
        <div key={exam.id} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
          <span>{exam.title}</span>
          <Button 
            onClick={() => handleOpenPdfDialog(exam.id)}
            style={{ marginLeft: '20px' }}
          >
            Gerar PDF
          </Button>
        </div>
      ))}

      <GeneratePDFButton
        open={isDialogOpen}
        onClose={handleClosePdfDialog}
        examId={selectedExamId}
      />
    </div>
  );
};

export default ExamPage;