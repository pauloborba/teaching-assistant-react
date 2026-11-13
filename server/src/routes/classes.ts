import { Router } from 'express';
import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { DEFAULT_AVERAGE_CALCULATION_SPECIFICATION } from '../models/AverageCalculationSpecification';
import { badRequest, notFound } from './HttpError';
import { isInteger, isNonEmptyString } from './validation';
import { BuildCorrelation, CORRELATION_VARIABLES, CorrelationVariable } from '../models/BuildCorrelation';

/**
 * Routes for creating, listing, updating and removing classes.
 * Mounted at /api/classes.
 *
 * @param classes the class collection to operate on
 * @param onStateChanged called after every successful modification
 */
interface ClassFields {
  topic: string;
  semester: number;
  year: number;
}

/** Checks that a request body carries the fields that identify a class. */
function requireClassFields(body: any): ClassFields {
  const { topic, semester, year } = body;
  if (!topic || !semester || !year) {
    throw badRequest('Topic, semester, and year are required');
  }
  if (!isNonEmptyString(topic)) {
    throw badRequest('Topic must be a non-empty string');
  }
  if (!isInteger(semester) || !isInteger(year)) {
    throw badRequest('Semester and year must be integers');
  }
  return { topic, semester, year };
}

export function classRoutes(classes: Classes, onStateChanged: () => void): Router {
  const router = Router();

  // GET /api/classes - Get all classes
  router.get('/', (req, res) => {
    res.json(classes.getAllClasses().map(c => c.toJSON()));
  });

  router.post('/correlation', (req, res) => {
    const { classIds, variables } = req.body;
    const knownVariables = new Set<string>(CORRELATION_VARIABLES.map(option => option.value));
    if (!Array.isArray(classIds) || classIds.length < 2 || classIds.some(id => !isNonEmptyString(id))) {
      throw badRequest('Select at least two classes');
    }
    if (!Array.isArray(variables) || variables.length !== 2 || variables.some(variable => !knownVariables.has(variable))) {
      throw badRequest('Select two valid variables');
    }
    if (variables[0] === variables[1]) {
      throw badRequest('Select two different variables');
    }
    res.json(BuildCorrelation(classes.getAllClasses(), classIds, variables as [CorrelationVariable, CorrelationVariable]));
  });

  // POST /api/classes - Add a new class
  router.post('/', (req, res) => {
    const { topic, semester, year } = requireClassFields(req.body);
    const newClass = classes.addClass(new Class(topic, semester, year, DEFAULT_AVERAGE_CALCULATION_SPECIFICATION));
    onStateChanged();
    res.status(201).json(newClass.toJSON());
  });

  // PUT /api/classes/:id - Update a class
  router.put('/:id', (req, res) => {
    const { topic, semester, year } = requireClassFields(req.body);
    if (!classes.findClassById(req.params.id)) {
      throw notFound('Class not found');
    }
    const updatedClass = classes.updateClassIdentification(req.params.id, topic, semester, year);
    onStateChanged();
    res.json(updatedClass.toJSON());
  });

  // DELETE /api/classes/:id - Delete a class
  router.delete('/:id', (req, res) => {
    const removed = classes.removeClass(req.params.id);
    if (!removed) {
      throw notFound('Class not found');
    }
    onStateChanged();
    res.status(204).send();
  });

  return router;
}
