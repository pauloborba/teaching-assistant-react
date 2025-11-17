import { Router } from "express";
import { CorrectionService } from "../services/correctionService";


const router = Router();

router.post("/student-exams/:studentCPF/:examId/correct", (req, res) => {
  try {
    const { studentCPF, examId } = req.params;

    const result = CorrectionService.correctExam(
      studentCPF,
      Number(examId)
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;