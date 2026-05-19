import { verifySecret, setSecret, clearSecret } from './api.js';

const form = document.getElementById('unlock-form');
const input = document.getElementById('secret-input');
const errSlot = document.getElementById('error-slot');
const button = form.querySelector('button');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const candidate = input.value.trim();
  if (!candidate) return;
  errSlot.textContent = '';
  input.setAttribute('aria-invalid', 'false');
  button.disabled = true;
  button.textContent = 'Checking…';
  setSecret(candidate);
  const ok = await verifySecret(candidate);
  if (ok) {
    button.textContent = 'Unlocked';
    setTimeout(() => location.replace('/index.html'), 200);
  } else {
    clearSecret();
    input.setAttribute('aria-invalid', 'true');
    input.value = '';
    errSlot.textContent = 'Incorrect secret.';
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 240);
    button.disabled = false;
    button.textContent = 'Unlock';
    input.focus();
  }
});
