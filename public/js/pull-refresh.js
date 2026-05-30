// Pull-to-refresh: the bus rolls in from above as you pull at the top of
// the page; release past the threshold to refresh. Touch only.

const THRESHOLD = 120;

export function initPullRefresh(onRefresh) {
  const ind = document.getElementById('pull-indicator');
  if (!ind) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let startY = 0;
  let pulling = false;
  let dist = 0;

  const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  const pulled = () => Math.min(dist * 0.6, THRESHOLD + 24);

  window.addEventListener('touchstart', (e) => {
    if (!atTop() || e.touches.length !== 1) { pulling = false; return; }
    startY = e.touches[0].clientY;
    pulling = true;
    dist = 0;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    dist = e.touches[0].clientY - startY;
    if (dist <= 0) { ind.style.transform = ''; ind.classList.remove('ready'); return; }
    const p = pulled();
    ind.style.transform = `translateY(${p}px)`;
    ind.classList.toggle('ready', p >= THRESHOLD);
  }, { passive: true });

  window.addEventListener('touchend', async () => {
    if (!pulling) return;
    pulling = false;
    const trigger = pulled() >= THRESHOLD;
    ind.style.transition = reduce ? 'none' : 'transform 0.3s ease';
    if (trigger) {
      ind.classList.add('refreshing');
      ind.style.transform = `translateY(${THRESHOLD}px)`;
      try { await onRefresh(); } catch {}
      ind.classList.remove('refreshing', 'ready');
    }
    ind.style.transform = '';
    setTimeout(() => { ind.style.transition = ''; }, 340);
  }, { passive: true });
}
