import Button from "@mui/material/Button";

interface CustomButtonProps {
    label: string;
}

export default function CustomButton({ label }: CustomButtonProps) {
    return (
        <div>
            <Button variant="contained" color="primary">
                {label}
            </Button>
        </div>
    );
}