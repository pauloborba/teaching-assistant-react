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
// ele tem 2 estados, o de selecionar o arquivo e o outro de fazer o mapping das colunas
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
  
  const [session, setSession] = useState<number>(0);
  // -----------------------------
  // Funções a implementar
  // -----------------------------

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) setFileName(file.name);
    
  };

  // Vai mandar para o back para ele processar e retorna as colunas e os nomes das metas para fazer o mapeamento
  const processFileInBack = async () => {
      const formData = new FormData();
      formData.append('file', fileName);
    console.log(fileName);
      
      // TODO: tem de pegar o classesID do back quando selecionar no front
      // Nesse codigo nao ta mandando o arquivo, apenas nada aprentemente
      const response = await fetch('http://localhost:3005/api/classes/evaluationImport/1', {
        method: 'POST',
        body: formData,
      });
      const { sessionID } = await response.json();
    setSession(session as number);
    setStep(2);
  };

  const previousStep = () => {
    setStep(1);
  };

  // Vai mandar para o back o mapeamento
  const sendToBackendMapping = () => {
    
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
            onClick={processFileInBack} 
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
      {/*
       TODO: Mandar para o back, ele vai processar as colunas do arquivo inicialmente e Depois
       vai retornar as colunas da turma e as colunas do arquivo e salvar, ai na segunda parte, ele vai ler tudo isso e mandar para o back
       uma segunda parte com o mapping e a ref ao arquivo nessa parte
       TODO: Separar em 2 rotas no back ou 1, de ler as colunas e salvar o arquivo:
       [Front] Upload → [Back] lê só o cabeçalho → retorna colunas
       [Front] Mapeia colunas → [Back] faz parse completo (stream)
       Para isso devo moficiar o comportamento da classe de spreadsheetreader, para ele ler pacialmente
        */}
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
          <button style={{background: "#078d64", color: "white", margin: "3px"}} onClick={sendToBackendMapping}>Enviar</button>
        </div>
      )}
    </div>
  );
};
