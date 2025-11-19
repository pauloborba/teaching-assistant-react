import React, { useState } from "react";

const DropdownExams: React.FC<{
  subjects: string[];
  onSelect: (subject: string) => void;
}> = ({ subjects, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>("Selecione uma matéria");

  const handleSelect = (subject: string) => {
    setSelected(subject);
    onSelect(subject);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", width: "200px" }}>
      {/* Botão principal */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "6px",
          background: "#f0f0f0",
          border: "1px solid #ccc",
          cursor: "pointer",
          textAlign: "left"
        }}
      >
        {selected} ▼
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "5px 0",
            position: "absolute",
            width: "100%",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "6px",
            zIndex: 10
          }}
        >
          {subjects.map((subject) => (
            <li
              key={subject}
              onClick={() => handleSelect(subject)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#eee")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "white")
              }
            >
              {subject}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownExams;
