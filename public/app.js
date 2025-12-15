// DokiResearch Frontend
const queryInput = document.getElementById('query');
const searchBtn = document.getElementById('searchBtn');
const results = document.getElementById('results');
const agentsStatus = document.getElementById('agentsStatus');

// Enter para buscar
queryInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') research();
});

async function research() {
  const query = queryInput.value.trim();
  if (!query) return;

  // UI: loading state
  searchBtn.disabled = true;
  searchBtn.querySelector('.btn-text').style.display = 'none';
  searchBtn.querySelector('.btn-loading').style.display = 'inline';
  
  agentsStatus.style.display = 'flex';
  results.innerHTML = '<p class="loading-text">🔬 Investigando...</p>';
  results.classList.add('loading');

  // Simular progreso de agentes
  simulateAgentProgress();

  try {
    const response = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.success) {
      results.innerHTML = markdownToHtml(data.result);
      completeAllAgents();
    } else {
      results.innerHTML = `<p class="error">❌ ${data.error}</p>`;
    }
  } catch (error) {
    results.innerHTML = `<p class="error">❌ Error de conexión: ${error.message}</p>`;
  }

  results.classList.remove('loading');
  searchBtn.disabled = false;
  searchBtn.querySelector('.btn-text').style.display = 'inline';
  searchBtn.querySelector('.btn-loading').style.display = 'none';
}

function simulateAgentProgress() {
  const agents = ['supervisor', 'buscador', 'lector', 'sintetizador', 'escritor'];
  const delays = [0, 2000, 8000, 15000, 20000];

  // Reset all agents
  document.querySelectorAll('.agent').forEach(el => {
    el.classList.remove('active', 'done');
    el.querySelector('.status').textContent = '';
  });

  agents.forEach((agent, i) => {
    setTimeout(() => {
      // Previous agent done
      if (i > 0) {
        const prev = document.querySelector(`[data-agent="${agents[i-1]}"]`);
        prev.classList.remove('active');
        prev.classList.add('done');
        prev.querySelector('.status').textContent = '✓';
      }
      // Current agent active
      const current = document.querySelector(`[data-agent="${agent}"]`);
      current.classList.add('active');
      current.querySelector('.status').textContent = 'trabajando...';
    }, delays[i]);
  });
}

function completeAllAgents() {
  document.querySelectorAll('.agent').forEach(el => {
    el.classList.remove('active');
    el.classList.add('done');
    el.querySelector('.status').textContent = '✓';
  });
}

// Markdown simple a HTML
function markdownToHtml(md) {
  return md
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p>${match}</p>`;
    })
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[123]>)/g, '$1')
    .replace(/(<\/h[123]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<li>)/g, '$1')
    .replace(/(<\/li>)<\/p>/g, '$1');
}
