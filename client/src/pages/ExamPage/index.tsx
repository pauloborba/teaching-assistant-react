import React, { useState } from "react";
import { useParams } from "react-router-dom"; // 🔥 IMPORTANTE
import Header from "../../components/Header";
import CustomButton from "../../components/CustomButton";
import CollapsibleTable, {
  Column,
  DetailColumn,
} from "../../components/CollapsibleTable";
import Dropdown from "../../components/DropDown";

import "./ExamPage.css";
import ExamCreatePopup from "./ExamPagePopup";

const columns: Column[] = [
  { id: "studentName", label: "Aluno", align: "left" },
  { id: "examID", label: "ID Prova", align: "right" },
  { id: "qtdAberta", label: "Quantidade Aberta", align: "right" },
  { id: "qtdFechada", label: "Quantidade Fechada", align: "right" },
  { id: "ativo", label: "Ativo", align: "right" },
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
    ativo: "Sim",
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
    ativo: "Sim",
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
    ativo: "Sim",
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
  const [popupOpen, setPopupOpen] = useState(false);

  const { id } = useParams();

  const classID = id;

  const subjects = [
    "Requirements",
    "Configuration Management",
    "Project Management",
    "Design",
  ];

  return (
    <div className="exam-page">
      <Header />

      {/* Linha com caixa de texto + dropdown + botão */}
      <div
        className="top-controls"
        style={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          gap: "15px",
        }}
      >
        {/* 🔥 CAIXA DE TEXTO COM classID */}
        <input
          type="text"
          value={classID || ""}
          readOnly
          style={{
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            width: "150px",
            fontSize: "14px",
            backgroundColor: "#f5f5f5",
          }}
        />

        <Dropdown
          subjects={subjects}
          onSelect={(s) => alert(s)}
          initialText={"Selecione uma prova:"}
        />

        <div style={{ marginLeft: "auto" }}>
          <CustomButton
            label="Criar Prova"
            onClick={() => setPopupOpen(true)}
          />
        </div>
      </div>

      {/* TABELA */}
      <CollapsibleTable
        columns={columns}
        detailColumns={detailColumns}
        rows={rows}
        detailTitle="Questões"
        computeDetailRow={(detail, parent) => ({
          ...detail,
          total: detail.tipoQuestao === "Aberta" ? 2 : 1,
        })}
      />

      {/* POPUP */}
      <ExamCreatePopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSubmit={(data) => {
          console.log("Prova criada:", data, "Turma:", classID);
          setPopupOpen(false);
        }}
      />
    </div>
  );
}
