import { Request, Response, Express } from 'express';

export function setupScriptRoutes(app: Express, scripts: any) {
  const scripturl = '/api/scripts/';

  // POST /api/scripts - Create a new script
  app.post(scripturl+'', (req: Request, res: Response) => {
    const script = scripts.addScript(req.body);
    res.status(201).json(script.toJSON());
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