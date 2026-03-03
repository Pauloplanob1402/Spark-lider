'use strict';

const State = {
  frases: [], currentId: null, username: localStorage.getItem('sl_username') || '',
  isPremium: localStorage.getItem('sl_premium') === 'true'
};

/* ─── Inicialização ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadFrases();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js?v=' + Date.now());
  }
});

/* ─── CARREGAR FRASES (FORÇANDO BUSCA NA RAIZ) ─── */
async function loadFrases() {
  try {
    // Forçamos o navegador a ignorar o cache com o timestamp ?v=
    const res = await fetch('./frases.json?v=' + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error();
    State.frases = await res.json();
  } catch (err) {
    State.frases = [{ id: 1, text: "Erro de conexão.\nVerifique o arquivo na raiz do GitHub." }];
  }
  renderFrase();
}

function renderFrase() {
  const f = State.frases[Math.floor(Math.random() * State.frases.length)];
  State.currentId = f.id;
  document.querySelector('#spark-text').innerHTML = f.text.split('\n').map(l => `<p>${l}</p>`).join('');
  document.querySelector('#greeting-name').textContent = `Bom foco, ${State.username}.`;
}

/* ─── EXPORTAÇÃO (ANTI-CORTE) ─── */
function exportToCanvas() {
  const frase = State.frases.find(f => f.id === State.currentId);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1080; canvas.height = 1080;

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 1080, 1080);
  ctx.fillStyle = '#1565C0'; ctx.fillRect(0, 0, 1080, 25); // Topo azul

  // Função para desenhar texto com quebra automática
  function drawWrappedText(text, x, y, maxWidth, lineHeight, font) {
    ctx.font = font;
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else { line = testLine; }
    }
    ctx.fillText(line, x, y);
    return y;
  }

  ctx.textAlign = 'center';
  const lines = frase.text.split('\n');
  let currentY = 400;

  lines.forEach((txt, i) => {
    if (i === 0) { // Título Azul
      ctx.fillStyle = '#0D47A1';
      currentY = drawWrappedText(txt, 540, currentY, 900, 90, 'bold 65px sans-serif') + 130;
    } else { // Subtítulos Cinza
      ctx.fillStyle = '#4A5568';
      currentY = drawWrappedText(txt, 540, currentY, 900, 75, '50px sans-serif') + 110;
    }
  });

  // Assinatura (Paulo Nascimento)
  ctx.fillStyle = '#C9963A'; ctx.font = 'bold 48px sans-serif';
  ctx.fillText(State.username || 'Líder', 540, 980);

  const link = document.createElement('a');
  link.download = `spark-${frase.id}.png`;
  link.href = canvas.toDataURL();
  link.click();
}

/* Eventos dos Botões */
document.querySelector('#btn-next').onclick = renderFrase;
document.querySelector('#btn-export').onclick = exportToCanvas;
