/* KI-Detektive – gemeinsame Funktionen
   Datenschutz: Es werden keine Daten an einen Server gesendet.
   Alles bleibt nur auf diesem iPad (localStorage). */
const KI = (() => {
  const mem = {};
  function get(k, d) {
    try { const v = localStorage.getItem(k); if (v !== null) return JSON.parse(v); } catch (e) {}
    return (k in mem) ? mem[k] : d;
  }
  function set(k, v) {
    mem[k] = v;
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  /* ---------- Niveau ★ / ★★ / ★★★ ---------- */
  const nvListeners = [];
  function niveau() { return get('kiNiveau', 2); }
  function applyNiveau(fire) {
    const n = String(niveau());
    document.querySelectorAll('[data-nv]').forEach(el => {
      el.hidden = !el.dataset.nv.split(' ').includes(n);
    });
    document.querySelectorAll('.niveau button').forEach(b => b.classList.toggle('on', b.dataset.n === n));
    if (fire) nvListeners.forEach(f => f(+n));
  }
  function initNiveau() {
    const box = document.querySelector('.niveau');
    if (box) {
      box.innerHTML = '<span>Niveau</span>' + [1, 2, 3].map(n =>
        `<button data-n="${n}" aria-label="Niveau ${n}">${'★'.repeat(n)}</button>`).join('');
      box.querySelectorAll('button').forEach(b => b.onclick = () => { set('kiNiveau', +b.dataset.n); applyNiveau(true); });
    }
    applyNiveau();
  }
  function onNiveau(f) { nvListeners.push(f); }

  /* ---------- Schritte ---------- */
  function initSteps() {
    const btns = [...document.querySelectorAll('nav.steps button')];
    btns.forEach(b => b.onclick = () => showStep(+b.dataset.step));
    showStep(1);
  }
  function showStep(n) {
    document.querySelectorAll('section.step').forEach(s => s.hidden = s.dataset.step != n);
    document.querySelectorAll('nav.steps button').forEach(b => b.classList.toggle('on', +b.dataset.step === n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function markDone(n) {
    const b = document.querySelector(`nav.steps button[data-step="${n}"]`);
    if (b) b.classList.add('done');
  }

  /* ---------- Quiz ---------- */
  function quiz(el, qs, done) {
    let i = 0, score = 0;
    function render() {
      if (i >= qs.length) {
        el.innerHTML = `<div class="card center"><div class="big">${score === qs.length ? '🏆' : '🕵️'}</div>
          <h3>${score} von ${qs.length} gleich beim ersten Versuch richtig!</h3>
          <p>${score === qs.length ? 'Stark, Detektiv:in!' : 'Gut gemacht! Mit den Tipps hast du alle Antworten gefunden.'}</p></div>`;
        if (done) done(score);
        return;
      }
      const q = qs[i];
      el.innerHTML = `<div class="card"><div class="qcount">Frage ${i + 1} von ${qs.length}</div>
        <div class="progress"><div style="width:${i / qs.length * 100}%"></div></div>
        <h3>${q.q}</h3><div class="answers"></div><div class="feedback" hidden></div></div>`;
      const box = el.querySelector('.answers');
      const buttons = q.a.map((t, j) => {
        const b = document.createElement('button');
        b.className = 'answer'; b.textContent = t;
        b.onclick = () => pick(j);
        box.appendChild(b); return b;
      });
      let tries = 0;
      const fb = el.querySelector('.feedback');
      function pick(j) {
        fb.hidden = false;
        if (j !== q.c) {
          /* Falsch: nur diese Antwort ausgrauen, Tipp geben, nochmal versuchen */
          tries++;
          buttons[j].disabled = true;
          buttons[j].classList.add('wrong');
          const left = buttons.filter(b => !b.disabled).length;
          fb.innerHTML = `<b>🤔 Noch nicht.</b> ${tries === 1
            ? '💡 <b>Tipp:</b> ' + (q.h || 'Lies die Frage noch einmal ganz genau.')
            : '💡 <b>Noch ein Tipp:</b> ' + (q.h2 || q.h || 'Lies die Frage noch einmal genau.') + (left === 1 ? ' Jetzt bleibt nur noch 1 Antwort übrig.' : ` Es bleiben nur noch ${left} Antworten übrig.`)}
            <br><i>Versuch es nochmal!</i>`;
          return;
        }
        buttons.forEach(b => b.disabled = true);
        buttons[j].classList.add('right');
        if (tries === 0) score++;
        fb.innerHTML = `<b>${tries === 0 ? '✅ Richtig – gleich beim ersten Versuch!' : '✅ Richtig – gut nachgedacht!'}</b> ${q.e}<br>
          <button class="btn" style="margin-top:10px">${i + 1 < qs.length ? 'Nächste Frage ➜' : 'Ergebnis ansehen'}</button>`;
        fb.querySelector('button').onclick = () => { i++; render(); };
      }
    }
    render();
  }

  /* ---------- Exit-Ticket + Stempel ---------- */
  function exitTicket(el, week, q, prompt) {
    const saved = get('exit_w' + week, '');
    el.innerHTML = `<div class="qbox"></div>
      <div class="card" id="exitText" hidden><h3>✍️ ${prompt}</h3>
        <div class="hint" data-nv="1">Satzanfang: <i>„Mich hat überrascht, dass …“</i></div>
        <textarea placeholder="Schreib hier…">${saved.replace(/</g, '&lt;')}</textarea>
        <p style="font-size:15px;color:#5b6382">🔒 Dein Text bleibt nur auf diesem iPad.</p>
        <button class="btn green">Exit-Ticket abgeben 🎫</button></div>
      <div class="card center" id="exitDone" hidden></div>`;
    applyNiveau();
    quiz(el.querySelector('.qbox'), [q], () => { el.querySelector('#exitText').hidden = false; });
    el.querySelector('#exitText button').onclick = () => {
      const t = el.querySelector('textarea').value.trim();
      if (t.length < 3) { alertBox(el, 'Schreib bitte mindestens einen kurzen Satz.'); return; }
      set('exit_w' + week, t);
      stamp(week);
      el.querySelector('#exitText').hidden = true;
      const d = el.querySelector('#exitDone');
      d.hidden = false;
      d.innerHTML = `<p>Woche ${week} geschafft!</p><div class="stamp">🕵️ GELÖST · WOCHE ${week}</div>
        <div class="hint" style="margin-top:20px;text-align:left">🔐 <b>Dein neuer Sicherungs-Code:</b> <span style="font-size:26px;font-weight:800;letter-spacing:2px">${stampsToCode()}</span><br>📸 Mach jetzt einen <b>Screenshot</b>! Mit dem Code bekommst du deine Stempel zurück, falls sie einmal verschwinden.</div>
        <p style="margin-top:12px"><a class="btn yellow" href="ausweis.html">Zu meinem Ausweis ➜</a></p>`;
      markDone(4);
    };
  }
  function alertBox(el, msg) {
    let a = el.querySelector('.inline-alert');
    if (!a) { a = document.createElement('div'); a.className = 'hint inline-alert'; el.appendChild(a); }
    a.textContent = msg;
  }
  function stamp(week) {
    const s = get('kiStempel', {});
    s[week] = new Date().toLocaleDateString('de-DE');
    set('kiStempel', s);
  }
  function stamps() { return get('kiStempel', {}); }


  /* ---------- Sicherungs-Code für die Stempel ----------
     Die Stempel stecken verschlüsselt in einem kurzen Code (z. B. KD-7F3Q).
     Mit dem Code lassen sich die Stempel auf jedem Gerät wiederherstellen.
     Kein Server, keine Namen: Der Code enthält nur, welche Wochen gelöst sind. */
  const ABC = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // ohne 0/O/1/I
  function stampsToCode() {
    const s = stamps(); let n = 0;
    for (let w = 1; w <= 10; w++) if (s[w]) n |= 1 << (w - 1);
    const chk = (n * 397 + 113) % 1021;            // 10-Bit-Prüfzahl
    let v = ((n ^ 0x2B5) << 10) | chk, out = '';
    for (let i = 0; i < 4; i++) { out = ABC[v & 31] + out; v >>= 5; }
    return 'KD-' + out;
  }
  function codeToWeeks(code) {
    const c = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^KD/, '');
    if (c.length !== 4) return null;
    let v = 0;
    for (const ch of c) { const i = ABC.indexOf(ch); if (i < 0) return null; v = (v << 5) | i; }
    const n = (v >> 10) ^ 0x2B5, chk = v & 1023;
    if (n < 0 || n > 1023 || (n * 397 + 113) % 1021 !== chk) return null;
    const weeks = [];
    for (let w = 1; w <= 10; w++) if (n & (1 << (w - 1))) weeks.push(w);
    return weeks;
  }
  function restoreFromCode(code) {
    const weeks = codeToWeeks(code);
    if (!weeks) return null;
    const s = stamps();
    weeks.forEach(w => { if (!s[w]) s[w] = 'wiederhergestellt'; });
    set('kiStempel', s);
    return weeks;
  }

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  return { stampsToCode, codeToWeeks, restoreFromCode, get, set, niveau, initNiveau, onNiveau, applyNiveau, initSteps, showStep, markDone, quiz, exitTicket, stamps, shuffle };
})();
