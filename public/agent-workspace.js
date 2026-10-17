(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const send = (action, value) => parent.postMessage({ source: 'papaya-workspace', action, value }, location.origin);
  let state = { loading: false, canSend: false, tools: {}, messages: [], images: [], lang: 'de', agent: 'papaya' };
  let signature = '';
  const names = { papaya: 'Papaya', mango: 'Mango', kiwi: 'Kiwi', sync: 'Sync (Alle 3)' };
  const keys = { syntax: 'papaya', neo: 'papaya', vega: 'papaya', pulse: 'mango', globe: 'mango', chronos: 'kiwi', oracle: 'kiwi', odin: 'kiwi' };
  const roles = { papaya: 'KI · Analyse · Entwicklung', mango: 'Kommunikation · Recherche', kiwi: 'Organisation · Finanzen · Sicherheit', sync: 'Papaya + Mango + Kiwi' };
  const descriptions = {
    papaya: 'Verbindet Wissen, Strategie, Bildschirm-Kontext und Softwareentwicklung.',
    mango: 'Unterstützt Nachrichten, Content, Recherche und die verbundenen Kommunikations-Tools.',
    kiwi: 'Unterstützt Ziele, Termine, Planung, Finanzen und Sicherheitsprüfungen.',
    sync: 'Drei Perspektiven auf deine Aufgabe: Papaya analysiert, Mango kommuniziert und Kiwi plant. Du erhältst anschließend eine gemeinsame Zusammenfassung.',
  };
  document.querySelectorAll('img[data-m]').forEach(img => { img.src = IMG[img.dataset.m]; });
  document.querySelectorAll('.langbar').forEach(el => el.remove()); // Language belongs to the existing app header.
  document.querySelectorAll('.ac-tab[data-target]').forEach(button => button.addEventListener('click', () => send('agent', button.dataset.target)));
  $('ac-llm-select').addEventListener('change', event => send('model', event.target.value));
  $('ac-input').addEventListener('input', event => send('input', event.target.value));
  $('ac-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!state.loading && state.canSend && ($('ac-input').value.trim() || state.images.length)) send('send', $('ac-input').value);
  });
  document.querySelectorAll('.ac-prompt-chip').forEach(button => button.addEventListener('click', () => {
    $('ac-input').value = button.dataset.q || button.textContent;
    send('input', $('ac-input').value); $('ac-input').focus();
  }));
  function text(tag, content, className) {
    const element = document.createElement(tag); element.textContent = content || '';
    if (className) element.className = className;
    return element;
  }
  function append(key, content, model, message) {
    const row = text('div', '', 'ac-msg ' + (key === 'user' ? 'user' : 'agent'));
    const avatar = text('div', '', 'ac-msg-ava');
    if (key === 'user') avatar.textContent = state.lang === 'de' ? 'DU' : 'YOU';
    else { const img = document.createElement('img'); img.src = IMG[key] || IMG.papaya; img.alt = names[key] || 'Papaya'; avatar.append(img); }
    const bubble = text('div', '', 'ac-msg-bubble');
    if (key !== 'user') bubble.append(text('div', (names[key] || 'Papaya') + (model ? ' · ' + model : ''), 'ac-msg-meta'));
    bubble.append(text('div', content));
    const images = [...new Set([message?.imageUrl, ...(message?.imageUrls || [])].filter(Boolean))];
    images.forEach(url => { if (!/^(data:image\/|https?:\/\/|\/)/.test(url)) return; const img = document.createElement('img'); img.src = url; img.alt = 'Anhang'; bubble.append(img); });
    [message?.videoUrl, ...(message?.videoUrls || [])].filter(Boolean).forEach(url => { if (!/^(data:video\/|https?:\/\/|\/)/.test(url)) return; const video = document.createElement('video'); video.src = url; video.controls = true; bubble.append(video); });
    if (key !== 'user' && message?.id) {
      const copy = text('button', state.lang === 'de' ? 'Kopieren' : 'Copy', 'ac-prompt-chip'); copy.type = 'button';
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(content); copy.textContent = state.lang === 'de' ? 'Kopiert' : 'Copied'; } catch { copy.textContent = state.lang === 'de' ? 'Kopieren fehlgeschlagen' : 'Copy failed'; } });
      const voice = text('button', state.lang === 'de' ? 'Vorlesen' : 'Read aloud', 'ac-prompt-chip'); voice.type = 'button'; voice.addEventListener('click', () => send('speak', message.id)); bubble.append(copy, voice);
    }
    row.append(avatar, bubble); $('ac-messages').append(row);
  }
  function render() {
    const de = state.lang === 'de'; const active = state.agent || 'papaya';
    document.documentElement.lang = state.lang;
    document.querySelectorAll('.ac-tab[data-target]').forEach(button => { button.setAttribute('aria-selected', String(button.dataset.target === active)); button.disabled = state.loading; });
    $('ac-prof-single').style.display = active === 'sync' ? 'none' : 'flex';
    $('ac-prof-trio').style.display = active === 'sync' ? 'flex' : 'none';
    $('ac-prof-img').src = IMG[active] || IMG.papaya;
    $('ac-prof-name').textContent = names[active]; $('ac-prof-role').textContent = roles[active]; $('ac-prof-desc').textContent = descriptions[active];
    $('ac-prof-mods').replaceChildren(...roles[active].split(' · ').map(role => text('span', role, 'ac-mod-chip')));
    $('ac-llm-select').value = state.model; $('ac-llm-select').disabled = state.loading;
    $('ac-llm-select').previousElementSibling.textContent = de ? 'Sprachmodell für neue Nachrichten' : 'Model for new messages';
    const last = [...state.messages].reverse().find(message => message.modelUsed);
    $('model-status').textContent = last ? (de ? 'Zuletzt verwendet: ' : 'Last used: ') + last.modelUsed : (de ? 'Tatsächliches Modell erscheint nach der Antwort.' : 'Actual model appears after the reply.');
    if ($('ac-input').value !== state.input) $('ac-input').value = state.input || '';
    $('ac-input').placeholder = de ? 'Nachricht an ' + names[active] + ' schreiben…' : 'Message ' + names[active] + '…';
    const submit = document.querySelector('.ac-send-btn'); submit.disabled = state.loading || !state.canSend;
    submit.querySelector('span').textContent = state.loading ? (de ? 'Antwort läuft…' : 'Responding…') : (de ? 'Senden' : 'Send');
    $('workspace-tools').replaceChildren();
    const labels = { plugins: 'Plugin Store', memory: 'Memory', calendar: de ? 'Kalender' : 'Calendar', goals: de ? 'Ziele' : 'Goals', history: de ? 'Verlauf' : 'History', attach: de ? 'Anhang' : 'Attach', mic: state.micActive ? (de ? 'Mikrofon stoppen' : 'Stop microphone') : (de ? 'Mikrofon' : 'Microphone') };
    Object.entries(labels).forEach(([action,label]) => { if (!state.tools[action]) return; const button = text('button', label, 'ac-prompt-chip'); button.type = 'button'; button.addEventListener('click', () => send(action)); if (action === 'mic') button.setAttribute('aria-pressed', String(state.micActive)); $('workspace-tools').append(button); });
    $('workspace-attachments').replaceChildren();
    state.images.forEach((url,index) => { const button = text('button', '×', 'ac-prompt-chip'); button.type = 'button'; button.setAttribute('aria-label', de ? 'Anhang entfernen' : 'Remove attachment'); const img = document.createElement('img'); img.src = url; img.alt = ''; img.style.cssText = 'width:44px;height:44px;object-fit:cover'; button.prepend(img); button.addEventListener('click', () => send('removeImage', index)); $('workspace-attachments').append(button); });
    const next = JSON.stringify([state.messages, active, state.loading]);
    if (next !== signature) {
      signature = next;
      const messages = $('ac-messages'); const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 90;
      messages.replaceChildren();
      state.messages.forEach(message => {
        if (message.id?.startsWith("greet-")) return;
        if (message.isMultiAgent && message.multiResponses?.length) {
          message.multiResponses.forEach(part => append(keys[part.agentId] || 'papaya', part.response, part.modelUsed, part));
          append('papaya', (de ? 'Gemeinsame Antwort\n' : 'Team summary\n') + message.content, message.modelUsed, { id: message.id });
        } else append(message.role === 'user' ? 'user' : keys[message.role] || 'papaya', message.content, message.modelUsed, message);
      });
      if (!state.messages.length) append(active === 'sync' ? 'papaya' : active, de ? 'Wobei können wir dir helfen?' : 'How can we help?');
      if (state.loading) messages.append(text('div', de ? 'Antwort wird erstellt…' : 'Preparing reply…', 'ac-msg-meta'));
      if (nearBottom) messages.scrollTop = messages.scrollHeight;
    }
  }
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.source !== 'papaya-host' || !event.data.state) return;
    state = event.data.state; render();
  });
  send('ready');
})();
