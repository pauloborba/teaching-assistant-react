import { Express } from 'express';
import { createApp } from '../../app';
import { StudentSet } from '../../models/StudentSet';
import { Classes } from '../../models/Classes';
import { ExamBank } from '../../models/ExamBank';
import { QuestionBank } from '../../models/QuestionBank';
import { InMemoryOnlyRepository } from '../../persistence/AppStateRepository';

/** Builds a fresh, empty application that persists nothing. */
export function newTestApp(): Express {
  const questionBank = new QuestionBank();
  const examBank = new ExamBank(questionBank);
  return createApp({
    students: new StudentSet(),
    classes: new Classes(),
    repository: new InMemoryOnlyRepository(),
    questionBank,
    onQuestionsChanged: () => {},
    examBank,
    onExamsChanged: () => {}
  });
}
