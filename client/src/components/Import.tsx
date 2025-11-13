import React, { useState, ChangeEvent, useEffect } from "react";
import CustomFileInput from "./shared/InputFile/InputFile";
const API_BASE_URL = 'http://localhost:3005';

// Campos alvo para o mapping

interface ImportComponentProps {
  classID: string
}
// componente especifico de de importacao de arquivos
// ele tem 2 estados, o de selecionar o arquivo e o outro de fazer o mapping das colunas
export const ImportComponent: React.FC<ImportComponentProps> = (
{classID = ""}
) => {
  // Estado do passo atual
  const [step, setStep] = useState<number>(1);

  // Arquivo selecionado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Nome do arquivo
  // const [fileName, setFileName] = useState<string>("");

  // Colunas detectadas
  const [columns, setColumns] = useState<string[]>([]);

  const [fields, setFields] = useState<string[]>([]);

  // Mapeamento colunas → TARGET_FIELDS
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});

  const [session, setSession] = useState<string>("");

  // sempre que classID mudar ele vai resetar tudo
  useEffect(() => {
    setStep(1);
    setSelectedFile(null);
    setColumns([]);
    setFields([]);
    setMapping({});
    setSession("");
  }, [classID]);
  // -----------------------------
  // Funções a implementar
  // -----------------------------

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    // if (file) setFileName(file.name);

  };

  // Vai mandar para o back para ele processar e retorna as colunas e os nomes das metas para fazer o mapeamento
  const processFileInBack = async () => {
    if (!selectedFile) {
      console.log("Erro na seleção de arquivo");
      return;
    }
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fileName', selectedFile.name);
      formData.append('fileType', selectedFile?.type);


      // TODO: tem de pegar o classesID do back quando selecionar no front
      try {
        const response = await fetch(API_BASE_URL + '/api/classes/evaluationImport/' + classID, {
          method: 'POST',
          body: formData,
        });

        console.log('Status Code:', response.status);
        console.log('Status Text:', response.statusText);

        if (response.status >= 200 && response.status < 300) {
          // Status code de sucesso (2xx)
          const resp_json = await response.json();
          const session_: string = resp_json.session_string || null;
          const file_columns: string[] = resp_json.file_columns || null;
          // campos que o backend retornou, que devem ser relacionados para o arquivo
          const mapping_colums: string[] = resp_json.mapping_colums || null;

          if (session_ && file_columns && mapping_colums) {
            console.log("Deu certo");
            setSession(session_ as string);
            setColumns(file_columns as string[]);
            setFields(mapping_colums as string[]);
            setStep(2);
          } else {
            console.error('Dados incompletos na resposta:', {
              session_string: session_,
              file_columns: file_columns,
              mapping_colums: mapping_colums
            });
          }
        } else {
          // Status code de erro
          console.error(`Erro HTTP: ${response.status} - ${response.statusText}`);

          // Tentar obter mensagem de erro do corpo da resposta
          try {
            const errorBody = await response.json();
            console.error('Detalhes do erro:', errorBody);
          } catch {
            console.error('Não foi possível ler o corpo da resposta de erro');
          }
        }
      } catch (error: any) {
        console.error('Erro na requisição:', error);
      }

  };

  const previousStep = () => {
    setMapping({});
    setStep(1);
  };

  // Vai mandar para o back o mapeamento
  const sendToBackendMapping = () => {
    // usando o session manda de volta para passar o mapping

    const cleanedMapping = Object.fromEntries(
        Object.entries(mapping).filter(([_, value]) => value !== '')
      );

    setMapping(cleanedMapping);
    console.log(cleanedMapping); // pois o useState e async, assim mais atualizado usar o clean
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
          <h2>Importar de Planilha de Notas</h2>
          <CustomFileInput backColor="#078d64" accept=".csv,.xlsl,.xls" onChange={onFileSelected} resetState={classID} />
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
                // col -> colunas do aquivo
                // opt -> colunas que queremos colocar
                // mapping[col] = opt, para relacionar um col com opt
                // Usando react fracgemt pois ele e o mesmo que <></>
                <React.Fragment key={col}>
                  <h4 style={{ margin: 0 }} key={`h4-${col}`}>
                    {col}
                  </h4>
                  <select
                    value={mapping[col] ?? ""}
                    onChange={e => updateMapping(col, e.target.value)}
                    key={`select-${col}`}
                  >
                    <option value="">--Selecione--</option>
                    {fields.map(opt => {
                      // Verifica se a opção já está sendo usada em outro select (exceto o atual)
                      // isAlreadyUsed é verdadeiro o some tem alguma saida verdadeira, ele basicamente vai varrer
                      // os mapeamentos e verificar se uma key diferente ja tem aquele opt
                      //
                      // As opcoes com selecione vao ser ignoradas pois so vai pegar oque ta definido
                      const isAlreadyUsed = Object.entries(mapping).some(
                        ([key, value]) => key !== col && value === opt
                      );
                      return (
                        <option
                          key={opt}
                          value={opt}
                          disabled={isAlreadyUsed}
                        >
                          {opt}
                        </option>
                      );
                    })}
                  </select>
                </React.Fragment>
            ))}
          </div>
          <button style={{background: "#078d64", color: "white", margin: "3px"}} onClick={previousStep}>Voltar</button>
          <button style={{background: "#078d64", color: "white", margin: "3px"}} onClick={sendToBackendMapping}>Enviar</button>
        </div>
      )}
    </div>
  );
};
