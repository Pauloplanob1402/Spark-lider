'use strict';

const State = {
  frases: [], 
  currentId: null, 
  username: localStorage.getItem('sl_username') || '',
  isPremium: localStorage.getItem('sl_premium') === 'true'
};

/* ─── Inicialização ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadFrases();
  if ('serviceWorker' in navigator) {
    // Registra com versão para forçar atualização do cache antigo
    navigator.serviceWorker.register('./service-worker.js?v=100');
  }
});

/* ─── CARREGAR FRASES (BUSCA NA RAIZ E ANTI-CACHE) ─── */
async function loadFrases() {
  try {
    // O nocache=Date.now() obriga o navegador a pegar o arquivo novo do GitHub
    const res = await fetch('./frases.json?nocache=' + Date.now(), { 
      cache: "no-store" 
    });
    
    if (!res.ok) throw new Error('Não encontrou frases.json');
    
    State.frases = await res.json();
    console.log('Frases carregadas:', State.frases.length);
    renderFrase();
  } catch (err) {
    console.error('Erro ao carregar frases:', err);
    document.querySelector('#spark-text').innerHTML = 
      `<p style="color:red">Erro ao carregar frases.<br>Verifique se frases.json está na raiz do seu GitHub.</p>`;
  }
}

function renderFrase() {
  if (State.frases.length === 0) return;
  
  const f = State.frases[Math.floor(Math.random() * State.frases.length)];
  State.currentId = f.id;
  
  // Renderiza no HTML separando as linhas
  document.querySelector('#spark-text').innerHTML = f.text
    .split('\n')
    .map(l => `<p>${l}</p>`)
    .join('');
    
  document.querySelector('#greeting-name').textContent = `Bom foco, ${State.username}.`;
}

/* ─── EXPORTAÇÃO (ANTI-CORTE DEFINITIVO) ─── */
function exportToCanvas() {
  if (!State.currentId) return;
  const frase = State.frases.find(f => f.id === State.currentId);
  if (!frase) return;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1080; 
  canvas.height = 1080;

  // Fundo Branco
  ctx.fillStyle = '#FFFFFF'; 
  ctx.fillRect(0, 0, 1080, 1080);
  
  // Detalhe Azul no topo
  ctx.fillStyle = '#1565C0'; 
  ctx.fillRect(0, 0, 1080, 20); 

  // Função interna de quebra de linha (Word Wrap)
  function drawWrappedText(text, x, y, maxWidth, lineHeight, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    const words = text.split(' ');
    let line = '';
    
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
    return y;
  }

  ctx.textAlign = 'center';
  const lines = frase.text.split('\n');
  let currentY = 380; // Posição inicial do texto
  const safeWidth = 860; // Margem para não encostar nas bordas

  lines.forEach((txt, i) => {
    if (i === 0) { 
      // Título em destaque (Azul)
      currentY = drawWrappedText(txt, 540, currentY, safeWidth, 90, 'bold 68px sans-serif', '#0D47A1') + 130;
    } else { 
      // Corpo do texto (Cinza)
      currentY = drawWrappedText(txt, 540, currentY, safeWidth, 75, '52px sans-serif', '#4A5568') + 110;
    }
  });

  // Assinatura (Rodapé) - Ajustado para não cortar o nome
  ctx.fillStyle = '#C9963A'; 
  ctx.font = 'bold 46px sans-serif';
  ctx.fillText(State.username || 'Paulo Nascimento', 540, 1000);

  // Download da Imagem
  const link = document.createElement('a');
  link.download = `spark-lider-${frase.id}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/* Eventos dos Botões */
const btnNext = document.querySelector('#btn-next');
const btnExport = document.querySelector('#btn-export');

if (btnNext) btnNext.onclick = renderFrase;
if (btnExport) btnExport.onclick = exportToCanvas;
