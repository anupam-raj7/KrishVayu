// public/chat.js  (new file) - the "Ask Chatbot" tab
import { t, getLang } from './i18n.js';

// Styles live here so style.css does not need to change.
document.head.insertAdjacentHTML('beforeend', `<style>
.dash-buttons { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 650px) { .dash-buttons { grid-template-columns: 1fr 1fr; } }
.chat-log { height: 320px; overflow-y: auto; background: #f9fbf8; border: 1px solid var(--border); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.msg { max-width: 85%; padding: 8px 12px; border-radius: 12px; white-space: pre-wrap; }
.msg.bot { background: #fff; border: 1px solid var(--border); align-self: flex-start; }
.msg.user { background: var(--green); color: #fff; align-self: flex-end; }
.msg.err { background: #fdecea; border-color: #c62828; }
.chat-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.chip { width: auto; min-height: auto; padding: 6px 12px; background: #eef5ee; color: var(--green); border: 1px solid #c8e6c9; border-radius: 16px; font-size: .85rem; font-weight: 600; }
.chat-form { display: flex; gap: 8px; }
.chat-form input { width: auto; flex: 1; margin: 0; }
.chat-form button { width: auto; padding: 0 18px; }
</style>`);

const history = []; // kept between tab switches: [{ role: 'user' | 'assistant', content }]
let busy = false;

// box = the #result element, getContext = () => latest dashboard data (or null)
export function renderChat(box, getContext) {
  box.innerHTML = `
    <div class="tab-content">
      <h2>💬 ${t('chatTitle')}</h2>
      <div id="chatLog" class="chat-log"></div>
      <div class="chat-chips">${['chatQ1', 'chatQ2', 'chatQ3'].map(k => `<button type="button" class="chip" data-q="${k}">${t(k)}</button>`).join('')}</div>
      <form id="chatForm" class="chat-form">
        <input id="chatInput" maxlength="300" autocomplete="off" placeholder="${t('chatPlaceholder')}">
        <button>${t('chatSend')}</button>
      </form>
      <p class="note">${t('chatNote')}</p>
    </div>`;

  const log = box.querySelector('#chatLog');
  const add = (role, text) => {
    const div = document.createElement('div');
    div.className = 'msg ' + role;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  };
  add('bot', t('chatHello'));
  history.forEach(m => add(m.role === 'user' ? 'user' : 'bot', m.content));

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    add('user', text);
    const reply = add('bot', t('chatWait'));
    const d = getContext();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') },
        body: JSON.stringify({
          message: text, history: history.slice(-6), lang: getLang(),
          ...(d && { block: d.place.block, village: d.place.village, date: d.date })
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'generic');
      reply.textContent = data.reply;
      history.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
    } catch (err) {
      // Chatbot down: still show the dashboard's rainfall so the farmer gets something useful.
      reply.textContent = err.message === 'chat_limit'
        ? t('chatLimit')
        : t('chatError') + (d ? `\n${t('predTitle')}: ${d.prediction.rainfall} mm` : '');
      reply.classList.add('err');
    }
    busy = false;
  }

  box.querySelector('#chatForm').onsubmit = e => {
    e.preventDefault();
    const input = box.querySelector('#chatInput');
    const value = input.value;
    input.value = '';
    send(value);
  };
  box.querySelectorAll('.chip').forEach(b => (b.onclick = () => send(t(b.dataset.q))));
}