import React, { useState, ChangeEvent, useEffect } from "react";
import CustomFileInput from "./shared/InputFile/InputFile";

const API_BASE_URL = 'http://localhost:3005';

interface ImportGradeComponentProps {
        classID: string;
        toReset: () => Promise<void>;
}

/**
 * ImportGradeComponent - Two-step grade import flow from spreadsheet files
 * 
 * Step 1: User uploads a CSV/XLSX file → backend reads only the header and returns columns
 * Step 2: User maps file columns to expected fields → backend parses the full file and updates grades
 * 
 * The component maintains session state between steps using a session_string returned by the backend.
 */
export const ImportGradeComponent: React.FC<ImportGradeComponentProps> = ({ classID = "", toReset }) => {
        // ========== Component State ==========

        // Current step in the flow (1 = upload, 2 = mapping)
        const [step, setStep] = useState<number>(1);

        // File selected by the user (CSV or XLSX)
        const [selectedFile, setSelectedFile] = useState<File | null>(null);

        // Column headers detected in the uploaded file by the backend
        const [columns, setColumns] = useState<string[]>([]);

        // Expected fields for the class (evaluation goals + cpf)
        const [fields, setFields] = useState<string[]>([]);

        // Mapping from file column → expected field
        // Example: { "Student ID": "cpf", "Req Grade": "Requirements" }
        const [mapping, setMapping] = useState<{ [key: string]: string }>({});

        // Session identifier returned by backend (temporary file path used to locate the uploaded file)
        const [session, setSession] = useState<string>("");

        // ========== Effects ==========

        // Reset all state when classID changes (user switched to a different class)
        useEffect(() => {
                setStep(1);
                setSelectedFile(null);
                setColumns([]);
                setFields([]);
                setMapping({});
                setSession("");
        }, [classID]);
        // ========== Event Handlers ==========

        /**
         * Handles file selection from the input element
         * Stores the selected file in state for later upload
         */
        const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
        };

        /**
         * STEP 1 Handler: Uploads file to backend for header extraction
         * 
         * Backend processes the file and returns:
         * - session_string: session identifier (temporary file path on server)
         * - file_columns: column headers detected in the uploaded file
         * - mapping_colums: expected fields for this class (evaluation goals + cpf)
         * 
         * On success, advances to step 2 (mapping interface)
         */
        const processFileInBack = async () => {
                if (!selectedFile) {
                        alert("File selection error");
                        return;
                }

                // Prepare multipart form data with the file
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('fileName', selectedFile.name);
                formData.append('fileType', selectedFile.type);

                try {
                        const response = await fetch(`${API_BASE_URL}/api/classes/gradeImport/${classID}`, {
                                method: 'POST',
                                body: formData,
                        });

                        if (response.ok) {
                                const respJson = await response.json();
                                const sessionString: string = respJson.session_string;
                                const fileColumns: string[] = respJson.file_columns;
                                const mappingColumns: string[] = respJson.mapping_colums; // Note: typo in backend API

                                if (sessionString && fileColumns && mappingColumns) {
                                        // Store response data and advance to mapping step
                                        setSession(sessionString);
                                        setColumns(fileColumns);
                                        setFields(mappingColumns);
                                        setStep(2);
                                } else {
                                        console.error('Incomplete data in response:', respJson);
                                        alert('Error: Incomplete data returned by server');
                                }
                        } else {
                                // Handle HTTP error responses
                                const errorBody = await response.json().catch(() => ({}));
                                const errorMessage = errorBody.error || response.statusText;
                                console.error(`HTTP Error: ${response.status} - ${errorMessage}`);
                                alert(`Error processing file: ${errorMessage}`);
                        }
                } catch (error: any) {
                        console.error('Request error:', error);
                        alert(`Request error: ${error.message}`);
                }
        };

        /**
         * Returns to step 1 (upload) and clears the mapping state
         */
        const previousStep = () => {
                setMapping({});
                setStep(1);
        };

        /**
         * STEP 2 Handler: Sends column mapping to backend for full file processing
         * 
         * Backend uses:
         * - session_string: to locate the previously uploaded file
         * - mapping: to interpret which file column corresponds to which evaluation goal
         * 
         * On success, grades are imported and parent component is refreshed via toReset()
         */
        const sendToBackendMapping = async () => {
                // Remove empty entries from mapping (columns user didn't map)
                const cleanedMapping = Object.fromEntries(
                        Object.entries(mapping).filter(([_, value]) => value !== '')
                );

                try {
                        const payload = {
                                session_string: session,
                                mapping: cleanedMapping,
                        };

                        const response = await fetch(`${API_BASE_URL}/api/classes/gradeImport/${classID}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload)
                        });

                        console.log('Response status:', response.status);

                        if (!response.ok) {
                                const errorData = await response.json();
                                const errorMessage = `Error sending mapping: ${errorData.error || response.statusText}`;
                                alert(errorMessage);
                                throw new Error(errorMessage);
                        }

                        // Refresh parent component data after successful import
                        await toReset();
                } catch (error: any) {
                        console.error({ error });
                        if (error.message && !error.message.includes('Error sending mapping')) {
                                alert(`Error: ${error.message}`);
                        }
                }
        };

        /**
         * Updates the mapping when user selects a value in a dropdown
         * Stores the relationship: file column → expected field
         */
        const updateMapping = (col: string, value: string) => {
                setMapping(prev => ({ ...prev, [col]: value }));
        };

        // ========== Styles ==========

        // Shared button style used across the component
        const buttonStyle: React.CSSProperties = {
                background: "#078d64",
                color: "white",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen'",
                fontSize: "14px",
                fontWeight: "600",
                padding: "10px 20px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                margin: "3px"
        };

        // Grid layout for mapping interface: left column (file headers) + right column (dropdowns)
        const mappingGridStyle: React.CSSProperties = {
                display: "grid",
                gridTemplateColumns: "max-content 1fr",
                rowGap: "8px",
                columnGap: "8px",
        };

        // ========== Render ==========

        return (
                <div>
                        {/* ========== STEP 1: File Upload ========== */}
                        {step === 1 && (
                                <div>
                                        <h2>Importação de Notas Por Planilha</h2>
                                        <CustomFileInput
                                                backColor="#078d64"
                                                accept=".csv,.xlsx,.xls"
                                                onChange={onFileSelected}
                                                resetState={classID}
                                        />
                                        <button
                                                onClick={processFileInBack}
                                                disabled={!selectedFile}
                                                style={buttonStyle}
                                        >
                                                Continuar
                                        </button>
                                </div>
                        )}

                        {/* ========== STEP 2: Column Mapping ========== */}
                        {/* 
                        Implemented flow:
                        [Frontend] Upload → [Backend] reads only header → returns columns
                        [Frontend] Maps columns → [Backend] parses full file and updates enrollments

                        The backend will only add grades if they don't already exist (no overwrite policy).
                        Empty cells in the spreadsheet are ignored.
                        */}
                        {step === 2 && (
                                <div>
                                        <h1>Mapeamento de Colunas</h1>

                                        <div style={mappingGridStyle}>
                                                <h2 style={{ margin: 0, gridColumn: "1" }}>Colunas do Arquivo</h2>
                                                <h2 style={{ margin: 0, gridColumn: "2" }}>Campos Esperados pela Classe</h2>

                                                {columns.map(col => (
                                                        // Render a row for each file column with label + dropdown selector
                                                        // Using React.Fragment to avoid adding extra DOM nodes
                                                        <React.Fragment key={col}>
                                                                <h4 style={{ margin: 0 }}>{col}</h4>
                                                                <select
                                                                        value={mapping[col] ?? ""}
                                                                        onChange={e => updateMapping(col, e.target.value)}
                                                                >
                                                                        <option value="">--Selecionar--</option>
                                                                        {fields.map(opt => {
                                                                                // Check if this option is already used in another dropdown (except current)
                                                                                // to prevent duplicate mappings (each field should map to at most one column)
                                                                                const isAlreadyUsed = Object.entries(mapping).some(
                                                                                        ([key, value]) => key !== col && value === opt
                                                                                );
                                                                                return (
                                                                                        <option key={opt} value={opt} disabled={isAlreadyUsed}>
                                                                                                {opt}
                                                                                        </option>
                                                                                );
                                                                        })}
                                                                </select>
                                                        </React.Fragment>
                                                ))}
                                        </div>

                                        <div style={{ marginTop: "16px" }}>
                                                <button style={buttonStyle} onClick={previousStep}>
                                                        Voltar
                                                </button>
                                                <button style={buttonStyle} onClick={sendToBackendMapping}>
                                                        Enviar
                                                </button>
                                        </div>
                                </div>
                        )}
                </div>
        );
};
