import { ICONS } from './icons.js';
import {
  getStations, setStations, DEFAULT_STATIONS,
  getRemindMin, getDiscardMin, setRemindMin, setDiscardMin,
} from './settings.js';

document.querySelectorAll('[data-icon]').forEach((el) => {
  const name = el.dataset.icon;
  if (ICONS[name]) el.innerHTML = ICONS[name](Number(el.dataset.size) || 20);
});

const $ = (id) => document.getElementById(id);
const form = $('settings-form');
const status = $('set-status');

function load() {
  const s = getStations();
  $('home-cn').value = s.home.cn;
  $('home-en').value = s.home.en;
  $('office-cn').value = s.office.cn;
  $('office-en').value = s.office.en;
  $('remind-min').value = getRemindMin();
  $('discard-min').value = getDiscardMin();
  $('home-cn').placeholder = DEFAULT_STATIONS.home.cn;
  $('office-cn').placeholder = DEFAULT_STATIONS.office.cn;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const stations = {
    home: { cn: $('home-cn').value.trim() || DEFAULT_STATIONS.home.cn, en: ($('home-en').value.trim() || DEFAULT_STATIONS.home.en).toUpperCase() },
    office: { cn: $('office-cn').value.trim() || DEFAULT_STATIONS.office.cn, en: ($('office-en').value.trim() || DEFAULT_STATIONS.office.en).toUpperCase() },
  };
  setStations(stations);

  const remind = Math.round(Number($('remind-min').value));
  let discard = Math.round(Number($('discard-min').value));
  let note = '已儲存。';
  if (Number.isFinite(remind) && remind > 0) setRemindMin(remind);
  if (Number.isFinite(discard) && discard > 0) {
    // Discard must be strictly greater than the reminder, else it could
    // auto-discard before/at the reminder. Clamp before persisting.
    if (Number.isFinite(remind) && remind > 0 && discard <= remind) {
      discard = remind + 1;
      note = `已儲存。「捨棄時間」已自動調整為 ${discard} 分(需大於提醒時間)。`;
    }
    setDiscardMin(discard);
  }
  status.textContent = note;
  load();
  setTimeout(() => { if (status.textContent.startsWith('已儲存')) status.textContent = ''; }, 2600);
});

load();
