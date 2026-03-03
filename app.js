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

/* ─── CARREGAR FRASES (CORRIGIDO PARA EVITAR AS 3 FRASES DE TESTE) ─── */
async function loadFrases() {
  try {
    // ADICIONADO: ?v= + Date.now() para forçar o GitHub/Vercel a entregar o arquivo novo
    const res = await fetch('./data/frases.json?v=' + Date.now());
    
    if (!res.ok) throw new Error('Arquivo frases.json não encontrado no servidor.');
    
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('JSON vazio ou inválido.');
    
    State.frases = data;
    console.log('[Sparks] Sucesso! ' + data.length + ' frases carregadas.');

  } catch (err) {
    console.error('[Sparks] Erro crítico ao carregar frases.json:', err);
    
    /* Fallback (Só aparece se o arquivo real falhar) */
    State.frases = [
      { id: 1, text: "Erro ao carregar frases.\nVerifique a pasta /data/ no GitHub.\nArraste para atualizar." },
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
    if (!name) {
      input.focus();
      input.style.borderColor = '#E53E3E';
      setTimeout(() => { input.style.borderColor = ''; }, 1200);
      return;
    }
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

  const btnNext = $('#btn-next');
  const btnFav = $('#btn-fav');
  const btnShare = $('#btn-share');
  const btnExport = $('#btn-export');

  if(btnNext) btnNext.addEventListener('click', showRandomFrase);
  if(btnFav) btnFav.addEventListener('click', toggleFavorite);
  if(btnShare) btnShare.addEventListener('click', handleShare);
  if(btnExport) btnExport.addEventListener('click', handleExport);

  $('#nav-home')?.addEventListener('click', () => switchView('home'));
  $('#nav-favs')?.addEventListener('click', () => switchView('favorites'));
  $('#nav-premium')?.addEventListener('click', openPremiumModal);

  $('#modal-close')?.addEventListener('click', closePremiumModal);
  $('#btn-buy')?.addEventListener('click', handleBuyPremium);
  $('#btn-demo-premium')?.addEventListener('click', handleDemoPremium);
  $('#modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === $('#modal-overlay')) closePremiumModal();
  });

  $('#btn-banner-premium')?.addEventListener('click', openPremiumModal);

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
    saveHistory();
  }

  const pool = available.length > 1
    ? available.filter(f => f.id !== State.currentId)
    : available;

  const frase = pool[Math.floor(Math.random() * pool.length)];

  State.currentId = frase.id;
  State.history.push(frase.id);
  saveHistory();

  renderFrase(frase);
  updateFavButton();
}

function renderFrase(frase) {
  const raw   = frase.text || '';
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const sparkEl = $('#spark-text');
  if (!sparkEl) return;

  sparkEl.innerHTML = lines
    .map((line, i) => `<p class="line line-${i + 1}">${escapeHtml(line)}</p>`)
    .join('');

  const idEl = $('#spark-id');
  if (idEl) idEl.textContent = `#${String(frase.id).padStart(3, '0')} de ${State.frases.length}`;
}

function toggleFavorite() {
  if (State.currentId === null) return;
  const idx = State.favorites.indexOf(State.currentId);
  if (idx === -1) {
    State.favorites.push(State.currentId);
    showToast('⭐ Adicionado aos favoritos');
  } else {
    State.favorites.splice(idx, 1);
    showToast('Removido dos favoritos');
  }
  saveFavorites();
  updateFavButton();
  if (State.view === 'favorites') renderFavoritesList();
}

function updateFavButton() {
  const btn = $('#btn-fav');
  if (!btn) return;
  const isFav = State.favorites.includes(State.currentId);
  btn.classList.toggle('active', isFav);
  const svg = btn.querySelector('svg');
  if (svg) svg.style.fill = isFav ? 'var(--fav-active)' : 'none';
}

async function handleShare() {
  if (State.currentId === null) return;
  const frase = State.frases.find(f => f.id === State.currentId);
  if (!frase) return;
  const text = `✨ Spark do dia:\n\n${frase.text}\n\n— Sparks Líder`;
  if (navigator.share) {
    try { await navigator.share({ title: 'Sparks Líder', text }); } catch (_) {}
  } else {
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Copiado para a área de transferência');
    } catch (_) { showToast('Não suportado'); }
  }
}

function handleExport() {
  if (State.currentId === null) return;
  const frase = State.frases.find(f => f.id === State.currentId);
  if (frase) exportToCanvas(frase, State.isPremium);
}

function exportToCanvas(frase, premium) {
  const W = 1080; const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#1565C0'); grad.addColorStop(1, '#42A5F5');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 10);
  ctx.font = 'bold 36px sans-serif'; ctx.fillStyle = '#1565C0';
  ctx.textAlign = 'left'; ctx.fillText('Sparks Líder', 80, 90);
  const lines = frase.text.split('\n').map(l => l.trim()).filter(Boolean);
  let y = 390;
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 64px sans-serif' : '54px sans-serif';
    ctx.fillStyle = i === 0 ? '#0D47A1' : '#4A5568';
    ctx.textAlign = 'center';
    ctx.fillText(line, W / 2, y);
    y += 120;
  });
  if (premium) {
    ctx.fillStyle = '#C9963A'; ctx.font = 'bold 44px sans-serif';
    ctx.fillText(State.username || 'Líder', W / 2, H - 80);
  } else {
    ctx.fillStyle = '#CBD5E0'; ctx.font = '26px sans-serif';
    ctx.fillText('Gerado no Sparks Líder', W / 2, H - 60);
  }
  const link = document.createElement('a');
  link.download = `spark-${frase.id}.png`;
  link.href = canvas.toDataURL(); link.click();
}

function switchView(view) {
  State.view = view;
  const home = $('#home-section');
  const favs = $('#favorites-section');
  if (view === 'home') {
    home.style.display = 'contents';
    favs.classList.remove('visible');
  } else {
    home.style.display = 'none';
    favs.classList.add('visible');
    renderFavoritesList();
  }
}

function renderFavoritesList() {
  const list = $('#favorites-list');
  if (!list) return;
  if (!State.favorites.length) {
    list.innerHTML = '<p>Nenhum favorito.</p>';
    return;
  }
  list.innerHTML = State.favorites.map(id => {
    const f = State.frases.find(x => x.id === id);
    return f ? `<div class="fav-card"><p>${f.text.replace(/\n/g, '<br>')}</p></div>` : '';
  }).join('');
}

function openPremiumModal() { $('#modal-overlay').classList.add('open'); }
function closePremiumModal() { $('#modal-overlay').classList.remove('open'); }

function handleBuyPremium() {
  activatePremium(true);
  updatePremiumUI();
  closePremiumModal();
  showToast('🎉 Premium ativado!');
}

function handleDemoPremium() {
  const status = !State.isPremium;
  activatePremium(status);
  updatePremiumUI();
  closePremiumModal();
  showToast(status ? '⚡ Modo Premium' : 'Modo Free');
}

function updatePremiumUI() {
  const isP = State.isPremium;
  if ($('#ads-container')) $('#ads-container').style.display = isP ? 'none' : 'flex';
  if ($('#premium-banner')) $('#premium-banner').style.display = isP ? 'none' : 'flex';
  const label = $('#nav-premium-label');
  if (label) label.textContent = isP ? '★ Pro' : 'Premium';
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

function svgTrash() { return `[SVG-TRASH]`; }
