// Servidor Express para DokiResearch
import 'dotenv/config';
import express from 'express';
import { createLLM } from './llm/github-models.js';
import { runResearch } from './graph/research-graph.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static('public'));

// Endpoint para investigación
app.post('/api/research', async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Se requiere una consulta' });
  }

  try {
    console.log(`\n🔍 Nueva investigación: ${query}`);
    const llm = createLLM();
    const { result } = await runResearch(llm, query);
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Error interno' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 DokiResearch servidor corriendo en http://localhost:${PORT}`);
});
