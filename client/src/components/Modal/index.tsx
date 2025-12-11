import React from 'react';
import './Modal.css';

interface ModalProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    showCloseButton?: boolean;
}

export default function Modal({
    title,
    children,
    isOpen,
    onClose,
    showCloseButton = true
}: ModalProps) {
    if (!isOpen) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick} data-testid="modal-overlay">
            <div className="modal-container" data-testid="modal-container">
                {showCloseButton && (
                    <button
                        className="modal-close-button"
                        onClick={onClose}
                        aria-label="Fechar modal"
                    >
                        ×
                    </button>
                )}
                <h1 className="modal-title" data-testid="modal-title">{title}</h1>
                <div className="modal-content">
                    {children}
                </div>
            </div>
        </div>
    );
}

