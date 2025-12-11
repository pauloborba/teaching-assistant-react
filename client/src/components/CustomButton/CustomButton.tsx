import React from 'react';
import './CustomButton.css';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export type ButtonSize = 'small' | 'medium' | 'large';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    color?: string;
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
    color,
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

    // 🔥 Estilos dinâmicos
    const dynamicStyle: React.CSSProperties = {};

    if (color) {
        if (variant === 'primary') {
            dynamicStyle.background = color;
            dynamicStyle.borderColor = color;
            dynamicStyle.color = '#fff';
        }
        if (variant === 'secondary') {
            dynamicStyle.background = `${color}20`; // 20% opacity
            dynamicStyle.borderColor = color;
            dynamicStyle.color = color;
        }
        if (variant === 'outline') {
            dynamicStyle.borderColor = color;
            dynamicStyle.color = color;
        }
        if (variant === 'text') {
            dynamicStyle.color = color;
        }
    }

    return (
        <button
            className={buttonClasses}
            onClick={onClick}
            disabled={disabled}
            type={type}
            style={dynamicStyle}
            {...rest}  // <-- repassa para o DOM!
        >
            {label}
        </button>
    );
}
