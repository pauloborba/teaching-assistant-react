import express, { Express } from 'express';
import cors from 'cors';
import { StudentSet } from './models/StudentSet';
import { Classes } from './models/Classes';
import { AppStateRepository } from './persistence/AppStateRepository';
import { studentRoutes } from './routes/students';
import { classRoutes } from './routes/classes';
import { enrollmentRoutes } from './routes/enrollments';
import { reportRoutes } from './routes/reports';
import { gradeImportRoutes } from './routes/gradeImport';
import { errorHandler } from './routes/HttpError';
import { Clock, SettableClock, SystemClock } from './services/Clock';
import { Services } from './services/Services';
import { selfAssessmentRoutes } from './routes/selfAssessment';
import { discrepancyRoutes } from './routes/discrepancies';
import { testSupportRoutes } from './routes/testSupport';

/** Everything the HTTP application needs, injected by the composition root. */
export interface AppDependencies {
  students: StudentSet;
  classes: Classes;
  repository: AppStateRepository;
  /** Where the application reads today's date; the system clock by default. */
  clock?: Clock;
  /**
   * Only for the acceptance tests: when given, the application also exposes
   * PUT /api/test/clock, which fixes the date this clock tells.
   */
  testClock?: SettableClock;
}

/**
 * Builds the Express application that exposes the REST API.
 *
 * The application owns no state of its own: it operates on the given
 * collections and asks the repository to persist them after each change.
 * Persistence is deferred (setImmediate) so that responses are not delayed
 * by disk access.
 */
export function createApp({ students, classes, repository, clock, testClock }: AppDependencies): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const onStateChanged = (): void => {
    setImmediate(() => repository.save(students, classes));
  };

  app.use('/api/students', studentRoutes(students, onStateChanged));
  app.use('/api/classes', classRoutes(classes, onStateChanged));
  app.use('/api/classes', enrollmentRoutes(classes, students, onStateChanged));
  app.use('/api/classes', reportRoutes(classes));
  const services = new Services(classes, testClock ?? clock ?? new SystemClock());
  app.use('/api/classes', selfAssessmentRoutes(services, onStateChanged));
  app.use('/api/classes', discrepancyRoutes(services, onStateChanged));
  if (testClock) {
    app.use('/api/test', testSupportRoutes(testClock));
  }
  app.use('/api/classes', gradeImportRoutes());
  app.use(errorHandler);

  return app;
}
