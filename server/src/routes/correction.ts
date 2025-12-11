import { Router } from "express";
import { Correction } from "../models/Correction";


const router = Router();

router.post("/correct/:examId", (req, res) => {
  try {
    const { examId } = req.params;

    const result = Correction.correctExam(Number(examId));

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/grades/:examId", (req, res) => {
  try {
    const { examId } = req.params;

    const grades = Correction.getAnswersForExam(Number(examId));

    res.json(grades);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;