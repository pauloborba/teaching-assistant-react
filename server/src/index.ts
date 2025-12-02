import { app } from './server';

const PORT = 3005;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});