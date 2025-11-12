import React, { useState, ChangeEvent } from "react";
import CustomFileInput from "./shared/InputFile/InputFile";

// Campos alvo para o mapping
// TODO: Pegar isso com base na turma do back
const TARGET_FIELDS = [
  "Requirements",
  "Configuration Management",
  "Project Management",
  "Design",
  "Tests",
  "Refactoring",
];

// componente especifico de de importacao de arquivos

export const ImportComponent: React.FC = () => {
  // Estado do passo atual
  const [step, setStep] = useState<number>(2);

  // Arquivo selecionado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Nome do arquivo
  const [fileName, setFileName] = useState<string>("");

  // Colunas detectadas
  const [columns, setColumns] = useState<string[]>(["ahj", "b", "c"]);

  // Mapeamento colunas → TARGET_FIELDS
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  
  // -----------------------------
  // Funções a implementar
  // -----------------------------

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) setFileName(file.name);
    
  };

  const processFile = () => {
    // Aqui você vai processar o arquivo, extrair as colunas
    // e atualizar 'columns' e 'mapping'
    // Depois mudar o passo: setStep(2)
    setStep(2);
  };

  const previousStep = () => {
    setStep(1);
  };

  const sendToBackend = () => {
    // Aqui você envia 'selectedFile' + 'mapping' para o backend
    console.log("Send to back")
  };

  // Atualiza o mapping quando o usuário seleciona um valor
  const updateMapping = (col: string, value: string) => {
    setMapping(prev => ({ ...prev, [col]: value }));
  };

  // -----------------------------
  // Render JSX
  // -----------------------------
  return (
    
    <div>
      {/* Passo 1: Upload */}
      {step === 1 && (
        <div>
          <h2>Importar Arquivo</h2>
          <CustomFileInput backColor="#078d64" accept=".csv,.xlsl,.xls" onChange={onFileSelected}/>
          <button 
            onClick={processFile} 
            disabled={!selectedFile}
            style={{
              background: "#078d64",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen'",
              color: "white",
              fontSize: "14px",
              fontWeight: "600",
              padding: "10px 20px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Continuar
          </button>
        </div>
      )}

      {/* Passo 2: Mapping */}
      {step === 2 && (
        <div>
          <h2>Mapeamento de colunas</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "max-content 1fr",
              rowGap: "8px", 
              columnGap: "8px",
            }}
          >
            {columns.map(col => (
              <>
                <h4 style={{ margin: 0 }} key={`h4-${col}`}>
                  {col}
                </h4>
                <select
                  value={mapping[col] ?? ""}
                  onChange={e => updateMapping(col, e.target.value)}
                  key={`select-${col}`}
                >
                  <option value="">--Selecione--</option>
                  {TARGET_FIELDS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </>
            ))}
          </div>
          <button style={{background: "#078d64", color: "white", margin: "3px"}} onClick={previousStep}>Voltar</button>
          <button style={{background: "#078d64", color: "white", margin: "3px"}} onClick={sendToBackend}>Enviar</button>
        </div>
      )}
    </div>
  );
};
