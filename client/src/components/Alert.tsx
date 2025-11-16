import React from 'react';
import MuiAlert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Snackbar from '@mui/material/Snackbar';

export interface AlertProps {
    message: string;
    severity?: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    variant?: 'filled' | 'outlined' | 'standard';
    onClose?: () => void;
    autoHideDuration?: number;
    open?: boolean;
}

export default function Alert({
    message,
    severity = 'info',
    title,
    variant = 'filled',
    onClose,
    autoHideDuration,
    open = true
}: AlertProps) {
    // If autoHideDuration is provided, use Snackbar
    if (autoHideDuration) {
        return (
            <Snackbar
                open={open}
                autoHideDuration={autoHideDuration}
               onClose={onClose}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <MuiAlert
                   // onClose={onClose}
                    severity={severity}
                    variant={variant}
                    sx={{ width: '100%' }}
                >
                    {title && <AlertTitle>{title}</AlertTitle>}
                    {message}
                </MuiAlert>
            </Snackbar>
        );
    }

    // Otherwise render a static alert
    return (
        <MuiAlert 
            //onClose={onClose} 
            severity={severity} 
            variant={variant}
        >
            {title && <AlertTitle>{title}</AlertTitle>}
            {message}
        </MuiAlert>
    );
}
