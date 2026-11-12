import * as path from 'path';
import { createApp } from './app';
import { StudentSet } from './models/StudentSet';
import { Classes } from './models/Classes';
import { JsonFileRepository } from './persistence/JsonFileRepository';
import { SettableClock } from './services/Clock';

/**
 * Composition root: creates the collections, loads the persisted state and
 * starts the HTTP server.
 *
 * The port comes from the PORT environment variable (set by hosting
 * services and by the root package.json scripts); 3005 is the default.
 *
 * DATA_FILE sets where the state is kept (./data/app-data.json by default).
 * ENABLE_TEST_ROUTES=true starts the server for the acceptance tests: it
 * then exposes PUT /api/test/clock, which fixes the date taken as today.
 * `npm run dev:acceptance` sets both, keeping the tests' data apart.
 */
const PORT = Number(process.env.PORT) || 3005;

const students = new StudentSet();
const classes = new Classes();
const repository = new JsonFileRepository(path.resolve(process.env.DATA_FILE || './data/app-data.json'));
repository.load(students, classes);

const testClock = process.env.ENABLE_TEST_ROUTES === 'true' ? new SettableClock() : undefined;

createApp({ students, classes, repository, testClock }).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}${testClock ? ' (acceptance test mode)' : ''}`);
});
