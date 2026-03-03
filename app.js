'use strict';

const State = {
  frases:      [],      
  currentId:   null,    
  history:     [],      
  favorites:   [],      
  username:    '',      
  isPremium:   false,   
  view:        'home'
};

const $ = (sel) => document.querySelector(sel);

/* ─── Inicialização ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  loadFrases();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js?v=' + Date.now());
  }
}

function loadFromStorage() {
  State.username  = localStorage.getItem('sl_username')  || '';
  State.isPremium = localStorage.getItem('sl_premium') === 'true';
  State.favorites = JSON.parse(localStorage.getItem('sl_favorites') || '[]');
  State.history   = JSON.parse(localStorage.getItem('sl_history')   || '[]');
}

/* ─── CARREGAR FRASES (BUSCA NA RAIZ) ─── */
async function loadFrases() {
  try {
    // Buscando na RAIZ para evitar o problema da pasta oculta
    const res = await fetch('./frases.json?v=' + Date.now());
    if (!res.ok) throw new Error('Arquivo não encontrado');
    const data = await res.json();
    State.frases = data;
    console.log('Frases carregadas:', data.length);
  } catch (err) {
    console.error('Erro:', err);
    State.frases = [{ id: 1, text: "Erro ao carregar.\nVerifique o arquivo frases.json na raiz do GitHub." }];
  }
  showScreen(State.username ? 'app' : 'welcome');
  if (State.username) { setupAppScreen(); showRandomFrase(); }
  else { setupWelcomeScreen(); }
}

/* ─── EXPORTAÇÃO (CORREÇÃO DEFINITIVA DO CORTE) ─── */
function exportToCanvas(frase, premium) {
  const W = 1080; const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Função interna para quebrar o texto e evitar cortes
  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        context.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, y);
    return y;
  }

  const lines = frase.text.split('\n').filter(Boolean);
  let currentY = 400;
  const maxWidth = 850; // Margem bem segura para não cortar nas bordas

  ctx.textAlign = 'center';
  lines.forEach((txt, i) => {
    if (i === 0) {
      ctx.font = 'bold 65px sans-serif'; ctx.fillStyle = '#0D47A1';
      currentY = wrapText(ctx, txt, W/2, currentY, maxWidth, 85) + 120;
    } else {
      ctx.font = '50px sans-serif'; ctx.fillStyle = '#4A5568';
      currentY = wrapText(ctx, txt, W/2, currentY, maxWidth, 75) + 100;
    }
  });

  // Nome do Usuário (Sua assinatura)
  ctx.fillStyle = premium ? '#C9963A' : '#CBD5E0';
  ctx.font = premium ? 'bold 48px sans-serif' : '30px sans-serif';
  ctx.fillText(premium ? (State.username || 'Líder') : 'Sparks Líder', W / 2, H - 100);

  const link = document.createElement('a');
  link.download = `spark-${frase.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Funções de apoio
function showScreen(s) { 
  $('#screen-welcome').style.display = s === 'welcome' ? 'flex' : 'none'; 
  $('#screen-app').style.display = s === 'app' ? 'flex' : 'none'; 
}
function setupWelcomeScreen() {
  $('#btn-start').onclick = () => {
    const name = $('#welcome-input').value.trim();
    if (name) { localStorage.setItem('sl_username', name); location.reload(); }
  };
}
function setupAppScreen() {
  $('#greeting-name').textContent = `Bom foco, ${State.username}.`;
  $('#btn-next').onclick = showRandomFrase;
  $('#btn-export').onclick = () => exportToCanvas(State.frases.find(f => f.id === State.currentId), State.isPremium);
}
function showRandomFrase() {
  const frase = State.frases[Math.floor(Math.random() * State.frases.length)];
  State.currentId = frase.id;
  const lines = frase.text.split('\n');
  $('#spark-text').innerHTML = lines.map(l => `<p>${l}</p>`).join('');
}
