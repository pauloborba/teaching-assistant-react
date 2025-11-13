import React, { useRef, useState, ChangeEvent, useEffect } from 'react';
import './InputFile.css';

interface CustomFileInputProps {
  accept?: string;
  multiple?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  className?: string;
  backColor?: string;
  resetState: any;
}

const CustomFileInput: React.FC<CustomFileInputProps> = ({
  accept,
  multiple = false,
  onChange,
  label = 'Escolher arquivo',
  className = '',
  backColor = '#FFFFFF',
  resetState = null,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setFileName(files && files.length > 0 ? getFileNames(files) : '');
    onChange?.(event);
  };

  const getFileNames = (files: FileList): string => {
    if (files.length === 1) {
      return files[0].name;
    }
    return `${files.length} arquivos selecionados`;
  };
  // quando muda algum state do elemento e fora, pode ser qualquer variavel
  useEffect(() => { 
    if (fileInputRef.current) {
      fileInputRef.current.value = "" as any;
      // console.log("a", fileInputRef.current.value)
      setFileName('');
    }
  }, [resetState]);
  
  return (
    <div className={`custom-file-input ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="file-input"
      />
      
      <button
        type="button"
        key={resetState}
        className={`file-button ${fileName ? 'has-file' : ''}`}
        onClick={handleButtonClick}
        style={{
          backgroundColor: backColor,
        }}
      >
        <span className={`file-icon ${fileName ? 'small' : ''}`}>📁</span>
        
        {!fileName ? (
          <span className="button-label">{label}</span>
        ) : (
          <span className="file-name-text">Arquivo selecionado: "{fileName}" </span>
        )}
      </button>
    </div>
  );
};

export default CustomFileInput;