import React, { useRef, useState } from "react";

interface UploadInputProps {
  label?: string;
  onFileSelected: (file: File) => void;
  accept?: string; // ex: ".csv, application/vnd.ms-excel"
}

const UploadInput: React.FC<UploadInputProps> = ({
  label = "Selecione um arquivo",
  onFileSelected,
  accept = ".csv, .xlsx"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("Nenhum arquivo selecionado");

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setFileName(file.name);
    onFileSelected(file);
  };

  return (
    <div style={styles.container}>
      <p style={styles.label}>{label}</p>

      <button type="button" onClick={handleClick} style={styles.button}>
        Escolher arquivo
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <p style={styles.fileName}>{fileName}</p>
    </div>
  );
};

export default UploadInput;

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    maxWidth: "300px"
  },
  label: {
    fontWeight: 500
  },
  button: {
    padding: "8px 12px",
    borderRadius: "6px",
    backgroundColor: "#3f51b5",
    color: "white",
    cursor: "pointer",
    border: "none",
    fontSize: "14px"
  },
  fileName: {
    fontSize: "14px",
    color: "#555"
  }
};