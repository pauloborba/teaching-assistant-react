import { Request, Response, Express } from 'express';

// --------------------------------------------------------------
// TASKS endpoints
// --------------------------------------------------------------

export function setupTaskRoutes(app: Express, taskset: any) {
  const taskurl = '/api/tasks/';

  
  
  // GET /api/tasks - Get all tasks
  app.get(taskurl+'', (req: Request, res: Response) => {
    try {
      const tasks = taskset.getAllTasks();
      res.json(tasks.map((t: any) => t.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });


  // GET /api/tasks/:id => get task by id
  app.get(taskurl+':id', (req: Request, res: Response) => {
    const { id } = req.params;
    const task = taskset.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task.toJSON());
  });
  
  // PUT /api/tasks/:id => update task
  app.put(taskurl+':id', (req: Request, res: Response) => {
    const { id } = req.params;
    const task = taskset.updateTask(id, req.body);
    
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task.toJSON());
  });
  
  // POST /api/tasks => create new task
  app.post(taskurl+'', (req: Request, res: Response) =>{
    const task = taskset.addTask(req.body);
    res.status(201).json(task);
  });
}