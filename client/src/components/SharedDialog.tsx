// client/src/components/SharedDialog/index.tsx

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface SharedDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
}

export const SharedDialog: React.FC<SharedDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth
      maxWidth="sm"
    >
      {}
      <DialogTitle sx={{ m: 0, p: 2 }}>
        {}
        <Typography variant="h6" component="div">
          {title}
        </Typography>

        {}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,             
            top: 8,               
            color: (theme) => theme.palette.grey[500], 
            backgroundColor: 'transparent !important', 
            '&:hover': {
              backgroundColor: 'transparent !important'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {children}
      </DialogContent>

      <DialogActions sx={{ padding: '16px' }}>
        {}
        <Button 
          onClick={onClose} 
          variant="contained"
          sx={{ 
            backgroundColor: '#e0e0e0',
            color: 'rgba(0, 0, 0, 0.87)',
            '&:hover': {
              backgroundColor: '#d5d5d5'
            }
          }}
        >
          {cancelText}
        </Button>
        
        {}
        <Button 
          onClick={onConfirm} 
          variant="contained"
          sx={{ 
            bgcolor: '#673ab7 !important',
            color: 'white !important',
            '&:hover': { bgcolor: '#512da8 !important' }
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}