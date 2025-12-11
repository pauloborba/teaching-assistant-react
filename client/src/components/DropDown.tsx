import React, { useState, useEffect } from "react";

interface DropdownProps {
  subjects: string[];
  initialText: string;
  onSelect: (subject: string) => void;
  'data-testid'?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  subjects,
  initialText,
  onSelect,
  'data-testid': dataTestId,
}) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(initialText);

  // Sync with parent component's selectedExam state
  useEffect(() => {
    setSelected(initialText);
  }, [initialText]);

  const handleSelect = (subject: string) => {
    setSelected(subject);
    onSelect(subject);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", width: "220px" }}>
      {/* Botão principal */}
      <button
        data-testid={dataTestId || "dropdown-button"}
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "8px",
          background: "#ffffff",
          border: "1px solid #d1d5db",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {selected}

        <span style={{ fontSize: "12px", opacity: 0.7 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "6px 0",
            position: "absolute",
            width: "100%",
            background: "white",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.07)",
            zIndex: 20,
          }}
        >
          {subjects.map((subject) => (
            <li
              key={subject}
              data-testid={`dropdown-item-${subject}`}
              onClick={() => handleSelect(subject)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "14px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f3f4f6")
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

export default Dropdown;
