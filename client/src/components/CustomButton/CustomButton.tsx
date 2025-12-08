import React from 'react';
import './CustomButton.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
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
    className = '',
    ...rest  // <-- captura data-testid e outros atributos
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
            {...rest}  // <-- repassa para o DOM!
        >
            {label}
        </button>
    );
}
