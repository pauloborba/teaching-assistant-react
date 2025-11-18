import React, { useEffect } from "react";
import CorrectionService from "../../services/CorrectionService";
import { Student } from "../../types/Student";
import ExamList from "../../components/ExamList";
import Dropdown from "../../components/DropDown";
import Header from "../../components/Header";
import CustomButton from "../../components/CustomButton";
import { Exam } from "../../types/Exam";
import { useParams } from "react-router-dom";
import ExamsService from "../../services/ExamsService";
import { studentService } from "../../services/StudentService";

const Correction: React.FC = () => {
    const classId = useParams().id || "";
    const [students, setStudents] = React.useState<Student[]>([]);
    const [exams, setExams] = React.useState<Exam[]>([]);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [selectedSubject, setSelectedSubject] = React.useState<string>("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const studentsResponse = await studentService.findExams( exams.filter(exam => exam.title === selectedSubject));
                setStudents(studentsResponse || []);
            } catch (error) {
                console.error("Erro ao carregar alunos:", error);
                setStudents([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedSubject]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const examsResponse = await ExamsService.getExamsForClass(classId);
                setExams(examsResponse.data || []);
            } catch (error) {
                console.error("Erro ao carregar provas:", error);
                setExams([]);
            }
        };

        fetchData();
    }, []);

    const handleCorrection = async () => {
        if (!classId && !exams) return;

        try {
            const grades = await CorrectionService.correctAllExams(students, exams.find(exam => exam.title === selectedSubject)!);

            const updatedStudents = students.map(student => {
            const updated = grades.find((g: any) => g.cpf === student.cpf);
            if (!updated) return student;

            return {
                ...student,
                exam: student.exam
                    ? { ...student.exam, grade: updated.grade } 
                    : { ...exams.find(exam => exam.title === selectedSubject)!, grade: updated.grade } // cria um exam completo
            };
        });

            setStudents(updatedStudents);
        } catch (error) {
            console.error("Erro ao corrigir prova:", error);
        }
    };

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px'}}>
            <Header/>
            <div style={{ display: "flex", gap: "10px" }}>
                <Dropdown
                    subjects={exams.map(exam => exam.title)}
                    initialText="Selecione uma matéria"
                    onSelect={setSelectedSubject}
                />
                <CustomButton label="Corrigir" onClick={handleCorrection} />
            </div>
            <ExamList students={students} loading={loading}/>
        </div>
    );
};

export default Correction;