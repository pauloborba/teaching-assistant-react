import React from "react";
import ExamsService from "../../services/ExamsService";
import { Student } from "../../types/Student";
import ExamList from "../../components/ExamList";
import Dropdown from "../../components/DropDown";
import Header from "../../components/Header";
import CustomButton from "../../components/CustomButton";

const Exam: React.FC = () => {
    const [students, setStudents] = React.useState<Student[]>([]);

    const testStudent: Student = {
        name: "Aluno Teste",
        cpf: "123.456.789-00",
        email: "aluno.teste@example.com"
    }

    const fetchStudents = async () => {
        try {
            const response = await ExamsService.correctExam("examId123", { answer1: "A", answer2: "B" });
            console.log("Exam corrected:", response);
            // Here you would typically update the students state with the fetched data
        } catch (error) {
            console.error("Error correcting exam:", error);
        }
    }

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px'}}>
            <Header/>
            <tr>
                <td><Dropdown subjects={["Teste1","Teste2"]} initialText="Selecione uma matéria" onSelect={(materia) => console.log("Selecionou:", materia)}/></td>
                <td><CustomButton label="Corrigir" onClick={() => {}}/></td>
            </tr>
            <ExamList students={[testStudent]} onCorrection={(student, examId) => console.log("Correcting", student, "for exam", examId)} loading={false} />
        </div>
    );
};

export default Exam;