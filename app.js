/* ============================================================
   Sparks Líder – app.js
   Lógica principal: frases, favoritos, export, premium, UI
   ============================================================ */

'use strict';

/* ─── Estado global ─── */
const State = {
  frases:      [],      // todas as frases carregadas
  currentId:   null,    // id da frase exibida
  history:     [],      // histórico de ids já vistos
  favorites:   [],      // ids favoritados
  username:    '',      // nome do usuário
  isPremium:   false,   // status premium
  view:        'home',  // 'home' | 'favorites'
  toastTimer:  null,    // timer do toast
};

/* ─── Seletores de DOM ─── */
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

/* ─── Carregar frases do JSON ─── */
async function loadFrases() {
  try {
    const res = await fetch('./data/frases.json');
    if (!res.ok) throw new Error('Falha ao carregar frases.');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('JSON vazio.');
    State.frases = data;
  } catch (err) {
    console.error('[Sparks] Erro ao carregar frases.json:', err);
    /* Fallback mínimo para não travar o app */
    State.frases = [
      { id: 1, text: "Exemplo inspira mais que discurso.\nAção valida palavras.\nSeja o padrão." },
      { id: 2, text: "Responsabilidade liberta.\nCulpa aprisiona.\nAssuma o controle." },
      { id: 3, text: "Coragem abre caminhos.\nMedo fecha portas.\nDê o primeiro passo." }
    ];
  }

  /* Sempre garante a tela do app configurada com listeners */
  showScreen('app');
  setupAppScreen();

  if (!State.username) {
    /* Mostra tela de boas-vindas por cima */
    showScreen('welcome');
    setupWelcomeScreen();
  } else {
    showRandomFrase();
  }
}

/* ─── Telas ─── */
function showScreen(screen) {
  const welcome = $('#screen-welcome');
  const app     = $('#screen-app');
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
  /* Saudação */
  updateGreeting();

  /* Evita registrar listeners duplicados */
  if (appScreenReady) return;
  appScreenReady = true;

  /* Botões de ação */
  $('#btn-next').addEventListener('click', showRandomFrase);
  $('#btn-fav').addEventListener('click', toggleFavorite);
  $('#btn-share').addEventListener('click', handleShare);
  $('#btn-export').addEventListener('click', handleExport);

  /* Nav */
  $('#nav-home').addEventListener('click', () => switchView('home'));
  $('#nav-favs').addEventListener('click', () => switchView('favorites'));
  $('#nav-premium').addEventListener('click', openPremiumModal);

  /* Premium modal */
  $('#modal-close').addEventListener('click', closePremiumModal);
  $('#btn-buy').addEventListener('click', handleBuyPremium);
  $('#btn-demo-premium').addEventListener('click', handleDemoPremium);
  $('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === $('#modal-overlay')) closePremiumModal();
  });

  /* Botão premium no banner */
  const bannerBtn = $('#btn-banner-premium');
  if (bannerBtn) bannerBtn.addEventListener('click', openPremiumModal);

  /* Atualiza UI de premium */
  updatePremiumUI();
}

/* ─── Saudação ─── */
function updateGreeting() {
  const el = $('#greeting-name');
  if (el) el.textContent = `Bom foco, ${State.username}.`;
}

/* ─── Exibir frase aleatória ─── */
function showRandomFrase() {
  if (!State.frases.length) return;

  /* Pool = frases ainda não vistas neste ciclo */
  let available = State.frases.filter(f => !State.history.includes(f.id));

  /* Se todas já foram vistas, reinicia o ciclo */
  if (available.length === 0) {
    State.history = [];
    available = State.frases.slice();
    saveHistory();
  }

  /* Garante que nunca repete a frase atual imediatamente */
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

/* ─── Renderizar frase no card ─── */
function renderFrase(frase) {
  /* Split FIRST, then escape each line individually */
  const raw   = frase.text || '';
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const sparkEl = $('#spark-text');

  /* Each line gets its own <p> so they always stack vertically */
  sparkEl.innerHTML = lines
    .map((line, i) => `<p class="line line-${i + 1}">${escapeHtml(line)}</p>`)
    .join('');

  const idEl = $('#spark-id');
  if (idEl) idEl.textContent = `#${String(frase.id).padStart(3, '0')} de ${State.frases.length}`;
}

/* ─── Favoritar ─── */
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

  /* Atualiza lista de favoritos se visível */
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

/* ─── Compartilhar ─── */
async function handleShare() {
  if (State.currentId === null) return;
  const frase = State.frases.find(f => f.id === State.currentId);
  if (!frase) return;

  const text = `✨ Spark do dia:\n\n${frase.text}\n\n— Sparks Líder`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Sparks Líder', text });
    } catch (_) { /* usuário cancelou */ }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Copiado para a área de transferência');
    } catch (_) {
      showToast('Compartilhamento não suportado');
    }
  }
}

/* ─── Exportar como imagem (Canvas) ─── */
function handleExport() {
  if (State.currentId === null) return;
  const frase = State.frases.find(f => f.id === State.currentId);
  if (!frase) return;

  exportToCanvas(frase, State.isPremium);
}

function exportToCanvas(frase, premium) {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  /* ── Fundo branco ── */
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  /* ── Borda colorida topo ── */
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, '#1565C0');
  grad.addColorStop(1, '#42A5F5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 10);

  /* ── Logo texto ── */
  ctx.font = 'bold 36px Segoe UI, system-ui, sans-serif';
  ctx.fillStyle = '#1565C0';
  ctx.textAlign = 'left';
  ctx.fillText('Sparks Líder', 80, 90);

  /* ── Linhas da frase ── */
  const lines = frase.text.split('\n').map(l => l.trim()).filter(Boolean);
  const lineStyles = [
    { size: 64, weight: 'bold',   color: '#0D47A1' },
    { size: 54, weight: 'normal', color: '#4A5568' },
    { size: 58, weight: '600',    color: '#1A1A2E' },
  ];

  let y = 390;
  const lineH = 120;

  lines.forEach((line, i) => {
    const style = lineStyles[i] || lineStyles[2];
    ctx.font       = `${style.weight} ${style.size}px Segoe UI, system-ui, sans-serif`;
    ctx.fillStyle  = style.color;
    ctx.textAlign  = 'center';

    /* Quebra de linha automática para linhas longas */
    const words = line.split(' ');
    let row = '';
    let rowY = y;

    for (let w = 0; w < words.length; w++) {
      const test = row ? `${row} ${words[w]}` : words[w];
      if (ctx.measureText(test).width > 920 && row) {
        ctx.fillText(row, W / 2, rowY);
        row  = words[w];
        rowY += style.size * 1.25;
      } else {
        row = test;
      }
    }
    ctx.fillText(row, W / 2, rowY);
    y = rowY + lineH;
  });

  /* ── Linha decorativa ── */
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(80, 150);
  ctx.lineTo(W - 80, 150);
  ctx.stroke();

  /* ── Rodapé ── */
  if (premium) {
    /* Premium: assinatura com nome do usuário, dourada e elegante */
    const name = State.username || 'Líder';

    /* Linha divisória dourada */
    ctx.strokeStyle = '#E8D5A3';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 120, H - 130);
    ctx.lineTo(W / 2 + 120, H - 130);
    ctx.stroke();

    /* Label pequeno */
    ctx.font      = '26px Segoe UI, system-ui, sans-serif';
    ctx.fillStyle = '#B0BEC5';
    ctx.textAlign = 'center';
    ctx.fillText('compartilhado por', W / 2, H - 92);

    /* Nome em dourado */
    ctx.font      = 'bold 44px Segoe UI, system-ui, sans-serif';
    ctx.fillStyle = '#C9963A';
    ctx.fillText(name, W / 2, H - 44);

  } else {
    /* Free: marca d'água genérica */
    ctx.font      = '26px Segoe UI, system-ui, sans-serif';
    ctx.fillStyle = '#CBD5E0';
    ctx.textAlign = 'center';
    ctx.fillText('Gerado no Sparks Líder', W / 2, H - 60);
  }

  /* ── Download ── */
  const link = document.createElement('a');
  link.download = `sparks-lider-${frase.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  showToast(premium ? '🖼️ Imagem exportada!' : '🖼️ Imagem exportada (free)');
}

/* ─── Navegação entre views ─── */
function switchView(view) {
  State.view = view;

  const homeSection = $('#home-section');
  const favsSection = $('#favorites-section');
  const navHome     = $('#nav-home');
  const navFavs     = $('#nav-favs');

  if (view === 'home') {
    homeSection.style.display = 'contents';
    favsSection.classList.remove('visible');
    navHome.classList.add('active');
    navFavs.classList.remove('active');
  } else {
    homeSection.style.display = 'none';
    favsSection.classList.add('visible');
    navFavs.classList.add('active');
    navHome.classList.remove('active');
    renderFavoritesList();
  }
}

/* ─── Lista de favoritos ─── */
function renderFavoritesList() {
  const list    = $('#favorites-list');
  const counter = $('#favorites-count');
  if (!list) return;

  const total = State.favorites.length;
  if (counter) counter.textContent = `${total} spark${total !== 1 ? 's' : ''}`;

  if (!total) {
    list.innerHTML = `<p class="empty-favorites">Nenhum spark favoritado ainda.<br>Toque em ⭐ para salvar.</p>`;
    return;
  }

  list.innerHTML = State.favorites
    .map(id => {
      const frase = State.frases.find(f => f.id === id);
      if (!frase) return '';
      
      /* Split text into lines like main card */
      const lines = frase.text.split('\n').map(l => l.trim()).filter(Boolean);
      const linesHtml = lines
        .map((line, i) => `<p class="line line-${i + 1}">${escapeHtml(line)}</p>`)
        .join('');
      
      return `
        <div class="fav-card">
          <div class="fav-card-header">
            <span class="fav-card-id">#${String(id).padStart(3, '0')} de ${State.frases.length}</span>
          </div>
          <div class="fav-card-text">${linesHtml}</div>
          <button class="fav-card-remove" title="Remover" onclick="removeFavorite(${id})">
            ${svgTrash()}
          </button>
        </div>`;
    })
    .join('');
}

/* Exposta globalmente para uso em onclick inline */
window.removeFavorite = function(id) {
  const idx = State.favorites.indexOf(id);
  if (idx !== -1) {
    State.favorites.splice(idx, 1);
    saveFavorites();
    renderFavoritesList();
    showToast('Removido dos favoritos');
  }
};

/* ─── Modal Premium ─── */
function openPremiumModal() {
  $('#modal-overlay').classList.add('open');
}

function closePremiumModal() {
  $('#modal-overlay').classList.remove('open');
}

function handleBuyPremium() {
  /* Ponto de integração com Google Play Billing ou outro sistema */
  /* Por ora: simula compra bem-sucedida */
  activatePremium(true);
  updatePremiumUI();
  closePremiumModal();
  showToast('🎉 Premium ativado! Obrigado!');
}

function handleDemoPremium() {
  /* Toggle para demo */
  const newStatus = !State.isPremium;
  activatePremium(newStatus);
  updatePremiumUI();
  closePremiumModal();
  showToast(newStatus ? '⚡ Modo Premium ativado (demo)' : 'Modo free ativado');
}

/* ─── Atualiza toda a UI com base no status premium ─── */
function updatePremiumUI() {
  const adsContainer = $('#ads-container');
  const premiumBanner = $('#premium-banner');
  const navPremiumLabel = $('#nav-premium-label');
  const demoBtn = $('#btn-demo-premium');

  if (State.isPremium) {
    /* Esconde anúncios */
    if (adsContainer) adsContainer.style.display = 'none';
    /* Esconde banner de upgrade */
    if (premiumBanner) premiumBanner.style.display = 'none';
    /* Atualiza label do nav */
    if (navPremiumLabel) navPremiumLabel.textContent = '★ Pro';
    /* Texto do botão demo */
    if (demoBtn) demoBtn.textContent = 'Desativar Premium (demo)';
  } else {
    if (adsContainer) adsContainer.style.display = 'flex';
    if (premiumBanner) premiumBanner.style.display = 'flex';
    if (navPremiumLabel) navPremiumLabel.textContent = 'Premium';
    if (demoBtn) demoBtn.textContent = 'Ativar Premium (modo demo)';
  }
}

/* ─── Toast ─── */
function showToast(msg, duration = 2400) {
  const toast = $('#toast');
  if (!toast) return;
  if (State.toastTimer) clearTimeout(State.toastTimer);

  toast.textContent = msg;
  toast.classList.add('show');

  State.toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/* ─── Utilitários ─── */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── SVGs inline ─── */
function svgTrash() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>`;
}

/* ─── AdMob Integration ─── */
function initAdMob() {
  if (typeof adsbygoogle !== 'undefined') {
    try {
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('[AdMob] Erro ao carregar anúncio:', e);
    }
  } else {
    setTimeout(initAdMob, 1000);
  }
}

// Inicializa anúncios se não for premium
if (!State.isPremium) {
  window.addEventListener('load', initAdMob);
}
