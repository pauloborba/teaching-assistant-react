import React, { useState, useRef, useEffect } from "react";

type InfoButtonProps = {
    text: string;
};

const InfoButton: React.FC<InfoButtonProps> = ({ text }) => {
    const [show, setShow] = useState(false);
    const [side, setSide] = useState<"right" | "left">("right");

    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!show || !tooltipRef.current || !wrapperRef.current) return;

        const tooltip = tooltipRef.current.getBoundingClientRect();
        const anchor = wrapperRef.current.getBoundingClientRect();
        const table = wrapperRef.current.closest("table")?.getBoundingClientRect();

        if (!table) return;

        if (anchor.right + tooltip.width < table.right) {
            setSide("right");
        } else if (anchor.left - tooltip.width > table.left) {
            setSide("left");
        } else {
            setSide("right");
        }
    }, [show]);

    return (
        <div
            ref={wrapperRef}
            style={{
                position: "relative",
                display: "inline-block",
                marginLeft: "4px",
            }}
        >
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
                    zIndex: 5
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#555">
                    <circle cx="12" cy="12" r="10" stroke="#555" strokeWidth="2" fill="none" />
                    <line x1="12" y1="10" x2="12" y2="16" stroke="#555" strokeWidth="2" />
                    <circle cx="12" cy="7" r="1.5" fill="#555" />
                </svg>
            </div>

            {show && (
                <div
                    ref={tooltipRef}
                    style={{
                        position: "absolute",
                        top: "30%",                 
                        transform: "translateY(-70%)",
                        left: side === "right" ? "20px" : "auto",
                        right: side === "left" ? "20px" : "auto",
                        width: "100px",
                        background: "#333",
                        color: "white",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        lineHeight: "1.3",
                        boxShadow: "0px 2px 6px rgba(0,0,0,0.25)",
                        zIndex: 9999,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                    }}
                >
                    {text}
                </div>
            )}
        </div>
    );
};

export default InfoButton;
