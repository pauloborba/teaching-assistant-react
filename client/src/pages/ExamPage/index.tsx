import React from "react";
import Header from "../../components/Header";
import CustomButton from "../../components/CustomButton";
import CollapsibleTable, {
  Column,
  DetailColumn,
} from "../../components/CollapsibleTable";

const columns: Column[] = [
  { id: "studentName", label: "Aluno", align: "left" },
  { id: "examID", label: "ID Prova", align: "right" },
  { id: "timestamp", label: "Data de geração", align: "right" },
  { id: "qtdAberta", label: "Quantidade Aberta", align: "right" },
  { id: "qtdFechada", label: "Quantidade Fechada", align: "right" },
];

const detailColumns: DetailColumn[] = [
  { id: "idQuestion", label: "ID Questão" },
  { id: "tipoQuestao", label: "Tipo da questão" },
  { id: "textoPergunta", label: "Texto da Pergunta", align: "left" },
];

const rows = [
  {
    studentName: "Maria Silva",
    examID: 10221,
    timestamp: "2025-02-05 14:32",
    qtdAberta: 3,
    qtdFechada: 7,
    details: [
      {
        idQuestion: 1,
        tipoQuestao: "Aberta",
        textoPergunta: "Explique o conceito de fotossíntese.",
      },
      {
        idQuestion: 2,
        tipoQuestao: "Fechada",
        textoPergunta: "Qual elemento é essencial para a respiração celular?",
      },
      {
        idQuestion: 3,
        tipoQuestao: "Fechada",
        textoPergunta: "O que é uma molécula?",
      },
    ],
  },
  {
    studentName: "João Pereira",
    examID: 10222,
    timestamp: "2025-02-05 15:10",
    qtdAberta: 2,
    qtdFechada: 8,
    details: [
      {
        idQuestion: 1,
        tipoQuestao: "Aberta",
        textoPergunta: "Descreva como ocorre a digestão de proteínas.",
      },
      {
        idQuestion: 7,
        tipoQuestao: "Fechada",
        textoPergunta: "Qual é o órgão responsável pela filtração do sangue?",
      },
    ],
  },
  {
    studentName: "Ana Costa",
    examID: 10223,
    timestamp: "2025-02-05 16:20",
    qtdAberta: 4,
    qtdFechada: 6,
    details: [
      {
        idQuestion: 3,
        tipoQuestao: "Aberta",
        textoPergunta: "Compare o sistema circulatório aberto e fechado.",
      },
      {
        idQuestion: 8,
        tipoQuestao: "Fechada",
        textoPergunta: "Qual destes é um tecido conjuntivo?",
      },
      {
        idQuestion: 12,
        tipoQuestao: "Fechada",
        textoPergunta: "O que é homeostase?",
      },
    ],
  },
];


export default function ExamPage() {
  return (
    <>
      <div className="App">
        <Header />
        <CustomButton label="Click me" />

        <CollapsibleTable
          columns={columns}
          detailColumns={detailColumns}
          rows={rows}
          detailTitle="Questões"
          computeDetailRow={(detail, parent) => ({
            ...detail,
            total: detail.tipoQuestao === "Aberta" ? 2 : 1, // exemplo arbitrário
          })}
        />
      </div>
    </>
  );
}
