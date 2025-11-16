import React, { useState } from "react";

type InfoButtonProps = {
    text: string;
};

const InfoButton: React.FC<InfoButtonProps> = ({ text }) => {
    const [show, setShow] = useState(false);

    return (
        <div style={{ position: "relative", display: "inline-block", marginLeft: "4px" }}>
            <div
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                style={{
                    width: "16px",
                    height: "16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="#555"
                    style={{ display: "block" }}
                >
                    <circle cx="12" cy="12" r="10" stroke="#555" strokeWidth="2" fill="none" />
                    <line x1="12" y1="10" x2="12" y2="16" stroke="#555" strokeWidth="2" />
                    <circle cx="12" cy="7" r="1.5" fill="#555" />
                </svg>
            </div>

            {show && (
                <div
                    style={{
                        position: "absolute",
                        top: "-35px",
                        left: "0",
                        background: "#333",
                        color: "white",
                        padding: "6px 8px",
                        fontSize: "11px",
                        borderRadius: "4px",
                        whiteSpace: "nowrap",
                        boxShadow: "0px 2px 6px rgba(0,0,0,0.25)",
                        zIndex: 999,
                    }}
                >
                    {text}
                </div>
            )}
        </div>
    );
};

export default InfoButton;
