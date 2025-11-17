import { Router } from "express";
import { Correction } from "../models/Correction";


const router = Router();

router.post("/correct/:studentCPF/:examId", (req, res) => {
  try {
    const { studentCPF, examId } = req.params;

    const result = Correction.correctExam(
      studentCPF,
      Number(examId)
    );

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;