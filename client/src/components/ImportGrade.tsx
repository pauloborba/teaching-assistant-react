
interface ImportGradeComponentProps {
  classID: string
}

export const ImportGradeComponent: React.FC<ImportGradeComponentProps> = (
  { classID = "" }
) => { 
  return (<h1>Importação de Notas</h1>)
};