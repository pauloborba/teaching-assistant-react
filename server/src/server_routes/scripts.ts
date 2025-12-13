import { Express, Request, Response } from 'express';

export function setupScriptRoutes(app: Express, scripts: any) {
  const scripturl = '/api/scripts/';

  // POST /api/scripts - Create a new script
  app.post(scripturl+'', (req: Request, res: Response) => {
    try {
    const script = scripts.addScript(req.body);
    res.status(201).json(script.toJSON());
  }
  catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
  });

// DELETE /api/scripts/:id - Delete a script
  app.delete(scripturl+':id', (req: Request, res: Response) => {
    const { id } = req.params;
    const scriptIndex = scripts.getAllScripts().findIndex((s: any) => s.getId() === id);
    if (scriptIndex === -1) {
      return res.status(404).json({ error: 'Script not found' });
    }
    scripts.getAllScripts().splice(scriptIndex, 1);
    res.status(204).send();
  });

// DELETE /api/scripts - Delete all scripts
  app.delete(scripturl, (req: Request, res: Response) => {
    scripts.getAllScripts().length = 0;
    res.status(204).send();
  });

  // GET /api/scripts/:id - Get one script by ID
  app.get(scripturl+':id', (req: Request, res: Response) => {
    const { id } = req.params;
    const script = scripts.findById(id);
    if (!script) {
      return res.status(404).json({ error: 'Script not found' });
    }
    res.json(script.toJSON());
  });

  // GET /api/scripts - Get all scripts
  app.get(scripturl+'', (req: Request, res: Response) => {
    try {
      const allScripts = scripts.getAllScripts();
      res.json(allScripts.map((s: any) => s.toJSON()));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch scripts' });
    }
  });

  // PUT /api/scripts/:id - Update a script
  app.put(scripturl+':id', (req: Request, res: Response) => {
    const { id } = req.params;
    const script = scripts.updateScript(id, req.body);

    if (!script) return res.status(404).json({ error: 'Script not found' });
    res.json(script.toJSON());
  });
}