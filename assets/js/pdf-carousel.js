// PDF carousel: renders a PDF one page at a time, LinkedIn document-post style.
// Usage in a post:
//   <div class="pdf-carousel" data-src="/assets/images/file.pdf" data-title="Optional title"></div>
//   <script type="module" src="/assets/js/pdf-carousel.js"></script>

const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/legacy/build/';
const pdfjsLib = await import(PDFJS + 'pdf.min.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.mjs';

const svg = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  prev: svg('<path d="M15 18l-6-6 6-6"/>'),
  next: svg('<path d="M9 18l6-6-6-6"/>'),
  download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  expand: svg('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
  collapse: svg('<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>'),
};

document.querySelectorAll('.pdf-carousel[data-src]').forEach(init);

async function init(root) {
  const src = root.dataset.src;
  root.tabIndex = 0;
  root.setAttribute('role', 'region');
  root.innerHTML = `
    <div class="pdfc-head"><span class="pdfc-title"></span><span class="pdfc-count"></span></div>
    <div class="pdfc-stage">
      <canvas></canvas>
      <button type="button" class="pdfc-nav pdfc-prev" aria-label="Previous page">${ICONS.prev}</button>
      <button type="button" class="pdfc-nav pdfc-next" aria-label="Next page">${ICONS.next}</button>
    </div>
    <div class="pdfc-foot">
      <span class="pdfc-pos" aria-live="polite"></span>
      <input class="pdfc-range" type="range" min="1" max="1" value="1" aria-label="Page">
      <a class="pdfc-btn pdfc-dl" download aria-label="Download PDF">${ICONS.download}</a>
      <button type="button" class="pdfc-btn pdfc-fs" aria-label="Full screen">${ICONS.expand}</button>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const stage = $('.pdfc-stage'), range = $('.pdfc-range'), pos = $('.pdfc-pos');
  const prev = $('.pdfc-prev'), next = $('.pdfc-next'), fs = $('.pdfc-fs');
  $('.pdfc-dl').href = src;

  let doc;
  try {
    doc = await pdfjsLib.getDocument({ url: src }).promise;
  } catch (e) {
    console.error('pdf-carousel:', e);
    root.innerHTML = `<p class="pdfc-error">Could not load the document. <a href="${src}">Download the PDF</a>.</p>`;
    return;
  }

  const total = doc.numPages;
  const filename = decodeURIComponent(src.split('/').pop());
  const title = root.dataset.title || filename;
  $('.pdfc-title').textContent = title;
  $('.pdfc-count').textContent = ` • ${total} page${total === 1 ? '' : 's'}`;
  root.setAttribute('aria-label', `${title}, PDF document`);
  range.max = total;

  const first = (await doc.getPage(1)).getViewport({ scale: 1 });
  stage.style.aspectRatio = `${first.width} / ${first.height}`;

  let page = 1, task = null, lastSize = '';

  async function render() {
    const n = page;
    const p = await doc.getPage(n);
    const base = p.getViewport({ scale: 1 });
    const scale = Math.min(stage.clientWidth / base.width, stage.clientHeight / base.height);
    const dpr = window.devicePixelRatio || 1;
    const vp = p.getViewport({ scale: scale * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(vp.width);
    canvas.height = Math.floor(vp.height);
    canvas.style.width = `${Math.floor(base.width * scale)}px`;
    canvas.style.height = `${Math.floor(base.height * scale)}px`;
    if (task) task.cancel();
    task = p.render({ canvas, canvasContext: canvas.getContext('2d'), viewport: vp });
    try {
      await task.promise;
    } catch (e) {
      if (e?.name === 'RenderingCancelledException') return;
      throw e;
    }
    if (n !== page) return;
    stage.querySelector('canvas').replaceWith(canvas);
  }

  function go(n) {
    n = Math.max(1, Math.min(total, n));
    page = n;
    range.value = n;
    range.style.setProperty('--p', total > 1 ? `${((n - 1) / (total - 1)) * 100}%` : '100%');
    pos.textContent = `${n} / ${total}`;
    prev.hidden = n === 1;
    next.hidden = n === total;
    render();
  }

  prev.addEventListener('click', () => go(page - 1));
  next.addEventListener('click', () => go(page + 1));
  range.addEventListener('input', () => go(+range.value));
  root.addEventListener('keydown', (e) => {
    if (e.target === range) return;
    if (e.key === 'ArrowLeft') { go(page - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { go(page + 1); e.preventDefault(); }
    if (e.key === 'Escape' && root.classList.contains('is-fs')) toggleFs();
  });

  // Swipe on touch screens
  let x0 = null;
  stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') x0 = e.clientX; });
  stage.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 40) go(page + (dx < 0 ? 1 : -1));
  });

  // Full screen; iPhone Safari has no element fullscreen, so fall back to a fixed overlay
  const isFs = () => document.fullscreenElement === root || document.webkitFullscreenElement === root || root.classList.contains('is-fs');
  function toggleFs() {
    if (document.fullscreenElement === root) document.exitFullscreen();
    else if (document.webkitFullscreenElement === root) document.webkitExitFullscreen();
    else if (root.classList.contains('is-fs')) root.classList.remove('is-fs');
    else if (root.requestFullscreen) root.requestFullscreen();
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    else root.classList.add('is-fs');
    setTimeout(syncFs, 50);
  }
  function syncFs() {
    const on = isFs();
    fs.innerHTML = on ? ICONS.collapse : ICONS.expand;
    fs.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
    document.documentElement.style.overflow = root.classList.contains('is-fs') ? 'hidden' : '';
  }
  fs.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);

  // Re-render sharp when the frame changes size (window resize, rotation, full screen)
  new ResizeObserver(() => {
    const size = `${stage.clientWidth}x${stage.clientHeight}`;
    if (size !== lastSize) { lastSize = size; render(); }
  }).observe(stage);

  go(1);
}
