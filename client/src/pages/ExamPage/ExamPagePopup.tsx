import React, { useState } from "react";
import Modal from "../../components/Modal";
import CustomButton from "../../components/CustomButton";
import "./ExamCreatePopup.css";

interface ExamCreatePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export default function ExamCreatePopup({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}: ExamCreatePopupProps) {
  const [form, setForm] = useState({
    codProva: "",
    nomeProva: "",
    temas: "",
    abertas: "",
    fechadas: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
  };

  return (
    <Modal title="Criar Prova" isOpen={isOpen} onClose={onClose}>
      <div className="popup-form">
        {/* Cod. Prova */}
        <label>
          Código da Prova
          <input
            type="text"
            name="codProva"
            value={form.codProva}
            onChange={handleChange}
          />
        </label>

        {/* Nome Prova */}
        <label>
          Nome da Prova
          <input
            type="text"
            name="nomeProva"
            value={form.nomeProva}
            onChange={handleChange}
          />
        </label>

        {/* Temas das questões */}
        <label>
          Temas das questões
          <input
            type="text"
            name="temas"
            value={form.temas}
            onChange={handleChange}
          />
        </label>

        {/* Abertas / Fechadas */}
        <div className="popup-row">
          <label>
            Quantidade de questões abertas
            <input
              type="number"
              name="abertas"
              min={0}
              value={form.abertas}
              onChange={handleChange}
            />
          </label>

          <label>
            Quantidade de questões fechadas
            <input
              type="number"
              name="fechadas"
              min={0}
              value={form.fechadas}
              onChange={handleChange}
            />
          </label>
        </div>

        <CustomButton
          label={loading ? "Gerando..." : "CRIAR PROVA"}
          onClick={handleSubmit}
          disabled={loading}
        />
      </div>
    </Modal>
  );
}
