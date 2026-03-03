'use strict';

/* ─── Estado global ─── */
const State = {
  frases:      [],      
  currentId:   null,    
  history:     [],      
  favorites:   [],      
  username:    '',      
  isPremium:   false,   
  view:        'home',  
  toastTimer:  null,    
};

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);

/* ─── Inicialização ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  loadFrases();
  registerServiceWorker();
});

/* ─── Service Worker ─── */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('[SW] Registrado com sucesso.'))
      .catch((err) => console.warn('[SW] Falha:', err));
  }
}

/* ─── LocalStorage helpers ─── */
function loadFromStorage() {
  State.username  = localStorage.getItem('sl_username')  || '';
  State.isPremium = localStorage.getItem('sl_premium') === 'true';
  State.favorites = JSON.parse(localStorage.getItem('sl_favorites') || '[]');
  State.history   = JSON.parse(localStorage.getItem('sl_history')   || '[]');
}

function saveUsername(name) {
  localStorage.setItem('sl_username', name);
  State.username = name;
}

function saveFavorites() {
  localStorage.setItem('sl_favorites', JSON.stringify(State.favorites));
}

function saveHistory() {
  localStorage.setItem('sl_history', JSON.stringify(State.history));
}

function activatePremium(bool) {
  State.isPremium = bool;
  localStorage.setItem('sl_premium', bool ? 'true' : 'false');
}

/* ─── CARREGAR FRASES (CORRIGIDO PARA VERCEL E ARQUIVO NA RAIZ) ─── */
async function loadFrases() {
  try {
    // REMOVIDO O /data/ pois o arquivo está solto na raiz
    const res = await fetch('./frases.json?v=' + Date.now());
    
    if (!res.ok) throw new Error('Arquivo frases.json não encontrado.');
    
    const data = await res.json();
    State.frases = data;
    console.log('[Sparks] Sucesso! ' + data.length + ' frases carregadas da raiz.');

  } catch (err) {
    console.error('[Sparks] Erro crítico:', err);
    State.frases = [
      { id: 1, text: "Erro ao carregar frases.\nVerifique se o arquivo está na raiz do GitHub.\nToque para tentar novamente." },
      { id: 2, text: "Responsabilidade liberta.\nCulpa aprisiona.\nAssuma o controle." },
      { id: 3, text: "Coragem abre caminhos.\nMedo fecha portas.\nDê o primeiro passo." }
    ];
  }

  showScreen('app');
  setupAppScreen();

  if (!State.username) {
    showScreen('welcome');
    setupWelcomeScreen();
  } else {
    showRandomFrase();
  }
}

/* ─── Telas ─── */
function showScreen(screen) {
  const welcome = $('#screen-welcome');
  const app      = $('#screen-app');
  if (!welcome || !app) return;
  if (screen === 'welcome') {
    welcome.style.display = 'flex';
    app.style.display     = 'none';
  } else {
    welcome.style.display = 'none';
    app.style.display     = 'flex';
  }
}

/* ─── Tela de Boas-vindas ─── */
function setupWelcomeScreen() {
  const input  = $('#welcome-input');
  const btnStart = $('#btn-start');
  if (!input || !btnStart) return;

  input.focus();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleStart();
  });

  btnStart.addEventListener('click', handleStart);

  function handleStart() {
    const name = input.value.trim();
    if (!name) return;
    saveUsername(name);
    showScreen('app');
    setupAppScreen();
    showRandomFrase();
  }
}

/* ─── Tela Principal ─── */
let appScreenReady = false;
function setupAppScreen() {
  updateGreeting();
  if (appScreenReady) return;
  appScreenReady = true;

  $('#btn-next')?.addEventListener('click', showRandomFrase);
  $('#btn-fav')?.addEventListener('click', toggleFavorite);
  $('#btn-share')?.addEventListener('click', handleShare);
  $('#btn-export')?.addEventListener('click', handleExport);

  $('#nav-home')?.addEventListener('click', () => switchView('home'));
  $('#nav-favs')?.addEventListener('click', () => switchView('favorites'));
  $('#nav-premium')?.addEventListener('click', openPremiumModal);
  $('#modal-close')?.addEventListener('click', closePremiumModal);
  $('#btn-buy')?.addEventListener('click', handleBuyPremium);
  $('#btn-demo-premium')?.addEventListener('click', handleDemoPremium);

  updatePremiumUI();
}

function updateGreeting() {
  const el = $('#greeting-name');
  if (el) el.textContent = `Bom foco, ${State.username}.`;
}

function showRandomFrase() {
  if (!State.frases.length) return;
  let available = State.frases.filter(f => !State.history.includes(f.id));
  if (available.length === 0) {
    State.history = [];
    available = State.frases.slice();
  }
  const pool = available.length > 1 ? available.filter(f => f.id !== State.currentId) : available;
  const frase = pool[Math.floor(Math.random() * pool.length)];
  State.currentId = frase.id;
  State.history.push(frase.id);
  saveHistory();
  renderFrase(frase);
  updateFavButton();
}

function renderFrase(frase) {
  const lines = (frase.text || '').split('\n').filter(Boolean);
  const sparkEl = $('#spark-text');
  if (sparkEl) {
    sparkEl.innerHTML = lines.map((l, i) => `<p class="line line-${i+1}">${escapeHtml(l)}</p>`).join('');
  }
  const idEl = $('#spark-id');
  if (idEl) idEl.textContent = `#${String(frase.id).padStart(3, '0')} de ${State.frases.length}`;
}

function toggleFavorite() {
  if (State.currentId === null) return;
  const idx = State.favorites.indexOf(State.currentId);
  if (idx === -1) {
    State.favorites.push(State.currentId);
    showToast('⭐ Adicionado');
  } else {
    State.favorites.splice(idx, 1);
    showToast('Removido');
  }
  saveFavorites();
  updateFavButton();
}

function updateFavButton() {
  const btn = $('#btn-fav');
  if (!btn) return;
  const isFav = State.favorites.includes(State.currentId);
  btn.classList.toggle('active', isFav);
}

async function handleShare() {
  if (State.currentId === null) return;
  const frase = State.frases.find(f => f.id === State.currentId);
  const text = `${frase.text}\n\n— Sparks Líder`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Sparks', text }); } catch(e){}
  } else {
    navigator.clipboard.writeText(text);
    showToast('📋 Copiado');
  }
}

function handleExport() {
  const frase = State.frases.find(f => f.id === State.currentId);
  if (frase) exportToCanvas(frase, State.isPremium);
}

/* ─── EXPORTAÇÃO CORRIGIDA (WRAP TEXT / SEM CORTES) ─── */
function exportToCanvas(frase, premium) {
  const W = 1080; const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fundo
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Barra Topo
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#1565C0'); grad.addColorStop(1, '#42A5F5');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 20);

  // Logo superior
  ctx.font = 'bold 40px sans-serif'; ctx.fillStyle = '#1565C0';
  ctx.textAlign = 'left'; ctx.fillText('Sparks Líder', 60, 100);

  // Função interna para desenhar texto com quebra de linha
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
    return y; // Retorna a última posição Y usada
  }

  const lines = frase.text.split('\n').filter(Boolean);
  let currentY = 400;
  const maxWidth = 900; // Margem de segurança

  ctx.textAlign = 'center';

  lines.forEach((txt, i) => {
    if (i === 0) {
      ctx.font = 'bold 65px sans-serif'; ctx.fillStyle = '#0D47A1';
      currentY = wrapText(ctx, txt, W/2, currentY, maxWidth, 80) + 120;
    } else {
      ctx.font = '50px sans-serif'; ctx.fillStyle = '#4A5568';
      currentY = wrapText(ctx, txt, W/2, currentY, maxWidth, 70) + 100;
    }
  });

  // Assinatura Rodapé
  if (premium) {
    ctx.fillStyle = '#C9963A'; ctx.font = 'bold 48px sans-serif';
    ctx.fillText(State.username || 'Líder', W / 2, H - 100);
  } else {
    ctx.fillStyle = '#CBD5E0'; ctx.font = '30px sans-serif';
    ctx.fillText('Gerado no Sparks Líder', W / 2, H - 80);
  }

  const link = document.createElement('a');
  link.download = `spark-${frase.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function switchView(view) {
  State.view = view;
  $('#home-section').style.display = (view === 'home') ? 'contents' : 'none';
  $('#favorites-section').classList.toggle('visible', view !== 'home');
}

function openPremiumModal() { $('#modal-overlay').classList.add('open'); }
function closePremiumModal() { $('#modal-overlay').classList.remove('open'); }
function handleBuyPremium() { activatePremium(true); updatePremiumUI(); closePremiumModal(); }
function handleDemoPremium() { activatePremium(!State.isPremium); updatePremiumUI(); closePremiumModal(); }

function updatePremiumUI() {
  const isP = State.isPremium;
  if ($('#ads-container')) $('#ads-container').style.display = isP ? 'none' : 'flex';
  if ($('#premium-banner')) $('#premium-banner').style.display = isP ? 'none' : 'flex';
}

function showToast(msg) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
