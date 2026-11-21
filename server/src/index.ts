import * as path from 'path';
import { createApp } from './app';
import { StudentSet } from './models/StudentSet';
import { Classes } from './models/Classes';
import { QuestionBank } from './models/QuestionBank';
import { ExamBank } from './models/ExamBank';
import { JsonFileRepository } from './persistence/JsonFileRepository';
import { JsonQuestionRepository } from './persistence/JsonQuestionRepository';
import { JsonExamRepository } from './persistence/JsonExamRepository';


/**
 * Composition root: creates the collections, loads the persisted state and
 * starts the HTTP server.
 *
 * The port comes from the PORT environment variable (set by hosting
 * services and by the root package.json scripts); 3005 is the default.
 */
const PORT = Number(process.env.PORT) || 3005;

const students = new StudentSet();
const classes = new Classes();
const repository = new JsonFileRepository(path.resolve('./data/app-data.json'));
repository.load(students, classes);

const questionBank = new QuestionBank();
const questionRepository = new JsonQuestionRepository(path.resolve('./data/questions.json'));
questionRepository.load(questionBank);

const examBank = new ExamBank(questionBank);
const examRepository = new JsonExamRepository(
  path.resolve('./data/exams.json')
);
examRepository.load(examBank);

createApp({
  students,
  classes,
  repository,
  questionBank,
  onQuestionsChanged: () => {
    questionRepository.save(questionBank);
  },
  examBank,
  onExamsChanged: () => {
    examRepository.save(examBank);
  }
}).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
