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
    // Forçamos a atualização do SW com um timestamp
    navigator.serviceWorker.register('./service-worker.js?v=' + Date.now())
      .then(reg => {
        console.log('[SW] Registrado.');
        // Se houver uma atualização, ele avisa
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Novo conteúdo disponível, por favor atualize.');
            }
          };
        };
      })
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

/* ─── CARREGAR FRASES (FIX DEFINITIVO) ─── */
async function loadFrases() {
  try {
    // Usamos './frases.json' sem a pasta data e com um cache breaker v=Date.now()
    const res = await fetch('./frases.json?nocache=' + Date.now(), {
      cache: 'no-store' // Força o navegador a não usar cache nenhum
    });
    
    if (!res.ok) throw new Error('Não foi possível encontrar frases.json na raiz.');
    
    const data = await res.json();
    State.frases = data;
    console.log('[Sparks] Sucesso! ' + data.length + ' frases carregadas.');

  } catch (err) {
    console.error('[Sparks] Erro crítico ao carregar:', err);
    // Fallback de segurança
    State.frases = [
      { id: 1, text: "Erro ao conectar com o servidor.\nArraste para baixo ou reinicie o app.\nVerifique se frases.json está na raiz." },
      { id: 2, text: "Responsabilidade liberta.\nCulpa aprisiona.\nAssuma o controle." }
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
  welcome.style.display = (screen === 'welcome') ? 'flex' : 'none';
  app.style.display     = (screen === 'welcome') ? 'none' : 'flex';
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

/* ─── EXPORTAÇÃO COM WRAP TEXT (CORREÇÃO DE CORTE) ─── */
function exportToCanvas(frase, premium) {
  const W = 1080; const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#1565C0'); grad.addColorStop(1, '#42A5F5');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 25);

  ctx.font = 'bold 42px sans-serif'; ctx.fillStyle = '#1565C0';
  ctx.textAlign = 'left'; ctx.fillText('Sparks Líder', 70, 110);

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
  const maxWidth = 880; 

  ctx.textAlign = 'center';
  lines.forEach((txt, i) => {
    if (i === 0) {
      ctx.font = 'bold 68px sans-serif'; ctx.fillStyle = '#0D47A1';
      currentY = wrapText(ctx, txt, W/2, currentY, maxWidth, 90) + 130;
    } else {
      ctx.font = '52px sans-serif'; ctx.fillStyle = '#4A5568';
      currentY = wrapText(ctx, txt, W/2, currentY, maxWidth, 75) + 110;
    }
  });

  ctx.textAlign = 'center';
  if (premium) {
    ctx.fillStyle = '#C9963A'; ctx.font = 'bold 50px sans-serif';
    ctx.fillText(State.username || 'Líder', W / 2, H - 110);
  } else {
    ctx.fillStyle = '#CBD5E0'; ctx.font = '32px sans-serif';
    ctx.fillText('Gerado no Sparks Líder', W / 2, H - 90);
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
