const { JSDOM } = require('jsdom');

(async () => {
  const html = await (await fetch('http://localhost:3000/')).text();
  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/',
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  const errors = [];
  window.addEventListener('error', e => errors.push(e.message));

  // jsdom lacks fetch — bridge to node's fetch with a session cookie jar
  const jar = new Map();
  window.fetch = async (path, opts = {}) => {
    const url = new URL(path, 'http://localhost:3000').href;
    const headers = Object.assign({}, opts.headers || {});
    if (jar.size) headers.cookie = [...jar.entries()].map(([k, v]) => k + '=' + v).join('; ');
    // jsdom's AbortSignal is a different class than Node's — translate it or
    // undici rejects it and every request looks like "server unreachable".
    const { signal, ...rest } = opts;
    let nativeSignal;
    if (signal) {
      const ctrl = new AbortController();
      if (signal.aborted) ctrl.abort();
      else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
      nativeSignal = ctrl.signal;
    }
    const res = await fetch(url, { ...rest, headers, signal: nativeSignal });
    for (const c of (res.headers.getSetCookie ? res.headers.getSetCookie() : [])) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
    return res;
  };

  // load each script exactly like the browser does
  const scripts = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  for (const src of scripts) {
    const path = src.split('?')[0];
    const code = await (await fetch('http://localhost:3000' + path)).text();
    try { window.eval(code); } catch (e) { errors.push(`${path}: ${e.message}`); }
  }

  // inline <script> blocks (no src) — the head boot block defines APP_VERSION
  // and the window.onerror overlay. Run them exactly like the browser would;
  // without this step a broken inline block is invisible to this test (that is
  // how a stray '<script>' token once silently killed the whole boot block).
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { window.eval(m[1]); } catch (e) { errors.push('inline-script: ' + e.message); }
  }
  if (!String(window.APP_VERSION || '').trim()) errors.push('boot block did not run: APP_VERSION empty');
  if (typeof window.onerror !== 'function') errors.push('window.onerror boot-error overlay not installed');

  await new Promise(r => setTimeout(r, 1200)); // let async boot settle

  console.log('scripts loaded :', scripts.length);
  console.log('APP_VERSION    :', window.APP_VERSION, '| onerror overlay:', typeof window.onerror);
  console.log('VIEWS registered:', Object.keys(window.VIEWS || {}).length);
  console.log('App exists      :', !!window.App);
  console.log('rendered #app   :', window.document.getElementById('app').innerHTML.slice(0, 120).replace(/\s+/g, ' '));
  console.log('boot errors     :', errors.length ? errors : 'NONE');

  // simulate clicking demo login and verify a REAL authenticated dashboard renders
  // landing view uses #lp-demo* ids; the auth view uses #demo-btn — accept either
  let loginOk = false;
  const demoBtn = window.document.querySelector('#lp-demo, #lp-demo-top, #demo-btn');
  if (demoBtn) {
    try { await demoBtn.onclick(); }
    catch (e) { errors.push('login: ' + e.message); }
    await new Promise(r => setTimeout(r, 1500));
    const view = window.document.getElementById('view');
    loginOk = !!window.App.user && !!view && /Key metric trends|hero/i.test(view.innerHTML);
    console.log('after demo-login click:', loginOk ? 'DASHBOARD RENDERED ✓' : 'LOGIN/DASHBOARD FAILED');
  } else {
    console.log('after demo-login click: NO DEMO BUTTON FOUND');
  }
  const realErrors = errors.filter(x => !/getContext/.test(x));
  if (realErrors.length || !loginOk) { console.log('FAILURES:', realErrors); process.exit(1); }
})().catch(e => { console.error('HARNESS FAIL:', e.message); process.exit(1); });
