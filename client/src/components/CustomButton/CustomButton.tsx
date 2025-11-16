import React from 'react';
import './CustomButton.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

interface CustomButtonProps {
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    fullWidth?: boolean;
    className?: string;
}

export default function CustomButton({
    label,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    onClick,
    type = 'button',
    fullWidth = false,
    className = ''
}: CustomButtonProps) {
    const buttonClasses = [
        'custom-button',
        `custom-button--${variant}`,
        `custom-button--${size}`,
        fullWidth ? 'custom-button--full-width' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={buttonClasses}
            onClick={onClick}
            disabled={disabled}
            type={type}
        >
            {label}
        </button>
    );
}

