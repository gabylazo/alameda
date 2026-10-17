// app.js — interfaz de NutriHome: Semana, Compra, En casa, Recetas, Nosotros, el micrófono, las recetas propias y el escáner.
// Los datos (productos de Mercadona, recetas, menú y perfiles) llegan cifrados en datos.enc; lo que cambiáis
// (platos cambiados, lista tachada, lo que hay en casa, vuestras recetas…) se guarda en este móvil.
import * as L from './logica.js';

const CLAVE = 'alameda.clave', ESTADO = 'alameda.estado.v1';   // nombres de antes de NutriHome: así no se pierde lo guardado
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lee = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: se pierde al cerrar */ } };
const leeTexto = k => { try { return localStorage.getItem(k); } catch { return null; } };
const guardaTexto = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* nada */ } };
const r0 = n => Math.round(n);
const euros = n => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

let D, E, fac, obj, recetas, NOM = { G: '', P: '' };
const V = { pestana: 'semana', dia: null, filtro: 'todas', busca: '' };

// ——— Fechas ———
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const hoy = () => iso(new Date());
const fecha = f => new Date(f + 'T12:00:00');
const masDias = (f, n) => { const d = fecha(f); d.setDate(d.getDate() + n); return iso(d); };
const DS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const capital = s => s[0].toUpperCase() + s.slice(1);

// ——— Iconos y dibujos ———
const ic = d => `<svg class="i" viewBox="0 0 24 24">${d}</svg>`;
const SVG = {
  semana: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  compra: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  casa: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  recetas: '<svg viewBox="0 0 24 24"><path d="M6 4h10a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4Z"/><path d="M6 18a2 2 0 0 1 2-2h11M10 8h5M10 11h4"/></svg>',
  nosotros: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.6-.2 1.3-.3 2-.3 2.2 0 3.9 1.5 4.4 4.2"/></svg>',
  micro: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cambiar: '<svg viewBox="0 0 24 24"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>',
  fuera: '<svg viewBox="0 0 24 24"><path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v5M9 3v5M17 21V3c2.2 0 3.5 3 3.5 6.5S19.2 14 17 14"/></svg>',
  mas: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
};
const I = {
  buscar: ic('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  chispas: ic('<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  caja: ic('<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  papelera: ic('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  lapiz: ic('<path d="M4 20h4L20 8l-4-4L4 16v4z"/>'),
  enviar: ic('<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13l5-5"/>'),
  carro: ic('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>'),
  calendario: ic('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
};
const PESTANAS = [['semana', 'Semana'], ['compra', 'Compra'], ['casa', 'En casa'], ['recetas', 'Recetas'], ['nosotros', 'Nosotros']];
const APARATO = { airfryer: 'Air fryer', plancha: 'Plancha', micro: 'Micro', sin: 'Sin fuego', batidora: 'Batidora' };
const APARATO_EMO = { airfryer: '🌀', plancha: '🍳', micro: '⚡', sin: '🥄', batidora: '🥤' };
const COMIDA_EMO = { desayuno: '☀️', comida: '🍽️', merienda: '🍎', cena: '🌙' };
const CAT_EMO = { 'Fruta y verdura': '🥬', 'Panadería y pastelería': '🥖', 'Carne': '🥩', 'Marisco y pescado': '🐟', 'Charcutería y quesos': '🧀',
  'Huevos, leche y mantequilla': '🥚', 'Postres y yogures': '🥛', 'Arroz, legumbres y pasta': '🍚', 'Conservas, caldos y cremas': '🥫',
  'Aceite, especias y salsas': '🫒', 'Cereales y galletas': '🥣', 'Aperitivos': '🥜', 'Congelados': '❄️', 'Otros': '🛒' };
const emojiReceta = r => r?.e || L.emojiDe(r?.n || '');

// Anillo de progreso (SVG) con el número en el centro.
function anillo(pct, color, centro, sub, tam = 74) {
  const r = 32, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
  return `<div class="anillo" style="width:${tam}px;height:${tam}px;flex-basis:${tam}px"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" class="pista"/>
    <circle cx="40" cy="40" r="${r}" class="valor" style="stroke:${color};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${off.toFixed(1)};--c:${c.toFixed(1)}"/></svg>
    <div class="centro"><div><b>${centro}</b><span>${sub}</span></div></div></div>`;
}
const miniBarra = (pct, color) => `<div class="mini-barra"><i style="width:${Math.max(0, Math.min(100, pct))}%;background:${color}"></i></div>`;

// ——— Datos cifrados ———
const b64 = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
async function descifra(clave) {
  const r = await fetch('datos.enc', { cache: 'no-cache' });
  if (!r.ok) throw new Error('No se pudieron descargar los datos (' + r.status + ').');
  const { s, i, n, d } = await r.json();
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave.trim().toLowerCase()), 'PBKDF2', false, ['deriveKey']);
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(s), iterations: n, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  let claro;
  try { claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(i) }, k, b64(d)); } catch { throw new Error('clave'); }
  return JSON.parse(new TextDecoder().decode(claro));
}

// ——— Estado guardado en el móvil ———
function estadoNuevo() { return { v: 1, semanas: {}, planes: [], casa: null, consumidos: {}, creatina: {}, perfiles: {}, gimnasio: null, avisos: {}, fijos: null, propias: [], escaneos: [] }; }
const salva = () => guarda(ESTADO, E);
function est(id) {
  if (!E.semanas[id]) E.semanas[id] = { cambios: {}, hechos: {}, marcados: {}, extra: [], quitados: {}, faltaDespensa: id === D.semana.id ? Object.fromEntries((D.semana.falta || []).map(k => [k, true])) : {}, compraHecha: false };
  const s = E.semanas[id];
  s.recetasLista ||= []; s.otrosHechos ||= {}; s.fijosHechos ||= {};
  return s;
}
function perfiles() {
  const p = JSON.parse(JSON.stringify(D.perfiles));
  for (const q of L.QUIEN) Object.assign(p[q], E.perfiles[q] || {});
  const gym = E.gimnasio ?? p.gimnasio;
  if (gym) for (const q of L.QUIEN) p[q].actividad = Math.max(p[q].actividad, 1.45);
  return p;
}
function recalcula() { const p = perfiles(); fac = L.factores(p); obj = { G: L.objetivos(p.G), P: L.objetivos(p.P) }; NOM = { G: p.G.nombre || 'G', P: p.P.nombre || 'P' }; }
const todasRecetas = () => [...(E.propias || []), ...D.recetas];
function reconstruyeRecetas() { recetas = Object.fromEntries(todasRecetas().map(r => [r.id, r])); }
const ini = q => esc((NOM[q] || q)[0]);

// Planes: el que llega con los datos y los que se preparan en el móvil con «Preparar la siguiente semana».
function planes() {
  const lista = [D.semana, ...E.planes.filter(p => p.id > D.semana.id)];
  return lista.sort((a, b) => a.id.localeCompare(b.id));
}
function planActivo() {
  const ps = planes(), h = hoy();
  return ps.find(p => h >= p.dias[0].f && h <= p.dias.at(-1).f) || (h < ps[0].dias[0].f ? ps[0] : ps.at(-1));
}
function efectivo(p) {
  const s = est(p.id);
  return { ...p, dias: p.dias.map(d => { const n = { ...d }; for (const c of L.COMIDAS) { const k = d.f + '|' + c; if (k in s.cambios) n[c] = s.cambios[k]; } return n; }) };
}

// Lo que se ha comido sale de «En casa»: al marcar «Hecho» o, si no se marca, al pasar el día.
function descuentaReceta(r) {
  if (!r) return;
  for (const ing of r.ing) for (const q of L.QUIEN) {
    const g = L.gramos(ing, q, fac);
    if (g && E.casa[ing[0]] != null) E.casa[ing[0]] = Math.max(0, E.casa[ing[0]] - g);
  }
  for (const k of Object.keys(E.casa)) if (E.casa[k] <= 0.5) delete E.casa[k];
}
function consumePasados() {
  const h = hoy();
  for (const p of planes()) {
    const pe = efectivo(p);
    for (const d of pe.dias) {
      if (d.f >= h) continue;
      for (const c of L.COMIDAS) {
        const clave = p.id + '|' + d.f + '|' + c;
        if (E.consumidos[clave]) continue;
        E.consumidos[clave] = 1;
        descuentaReceta(recetas[L.idDe(d[c])]);
      }
    }
  }
  salva();
}

// ——— Arranque ———
async function inicio() {
  E = Object.assign(estadoNuevo(), lee(ESTADO, {}));
  E.propias ||= []; E.escaneos ||= [];
  const m = location.hash.match(/^#clave=(.+)$/);
  if (m) { guardaTexto(CLAVE, decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); }
  const clave = leeTexto(CLAVE);
  if (!clave) return puerta();
  try { D = await descifra(clave); }
  catch (e) { if (e.message === 'clave') { guardaTexto(CLAVE, null); return puerta('Esa clave no abre los datos. Vuelve a escribirla.'); } return puerta(e.message); }
  reconstruyeRecetas();
  if (!E.casa) E.casa = { ...(D.casa_inicial || {}) };
  if (!E.fijos) E.fijos = [...(D.fijos || [])];
  recalcula();
  consumePasados();
  pintaMarco();
  window.addEventListener('hashchange', () => { V.pestana = (location.hash.slice(1) || 'semana').split('/')[0]; pinta(); });
  V.pestana = PESTANAS.some(([k]) => k === location.hash.slice(1)) ? location.hash.slice(1) : 'semana';
  pinta();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

const marcaHTML = '<span class="nombre-app"><span class="nutri">Nutri</span><span class="home">Home</span></span>';
function puerta(error = '') {
  document.body.innerHTML = `
    <div class="puerta">
      <img class="logo" src="iconos/icono-192.png" alt="">
      <h1>${marcaHTML}</h1>
      <p>La app de nuestra cocina. Escribe la clave de casa: solo se pide una vez en cada móvil.</p>
      <form id="f-clave"><label class="sr" for="clave">Clave de casa</label>
        <input id="clave" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="clave de casa" required>
        <div class="error">${esc(error)}</div>
        <button class="boton principal ancho">Entrar</button></form>
    </div>`;
  $('#f-clave').addEventListener('submit', e => { e.preventDefault(); guardaTexto(CLAVE, $('#clave').value.trim().toLowerCase()); location.reload(); });
}

function pintaMarco() {
  document.body.innerHTML = `
    <header class="cabecera" id="cab"></header>
    <main id="vista"></main>
    <button class="micro" id="b-micro" aria-label="Hablar o escribir">${SVG.micro}</button>
    <nav class="pestanas" aria-label="Secciones"><div class="dentro">
      ${PESTANAS.map(([k, t]) => `<button data-p="${k}"><span class="ic">${SVG[k]}</span><span>${t}</span></button>`).join('')}
    </div></nav>
    <div class="tostada" id="tostada" role="status"></div>`;
  $$('.pestanas button').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.p; }));
  $('#b-micro').addEventListener('click', abrirMicro);
}

let tEntra;
function pinta() {
  $$('.pestanas button').forEach(b => b.setAttribute('aria-current', b.dataset.p === V.pestana ? 'page' : 'false'));
  const f = { semana: vSemana, compra: vCompra, casa: vCasa, recetas: vRecetas, nosotros: vNosotros }[V.pestana] || vSemana;
  const vista = $('#vista');
  vista.classList.add('entra');
  f();
  $$('#vista > *').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 12)));
  clearTimeout(tEntra); tEntra = setTimeout(() => vista.classList.remove('entra'), 1100);
  window.scrollTo({ top: 0 });
}
function cabecera(titulo, sub = '') {
  const d = new Date();
  $('#cab').innerHTML = `<div class="marca"><span class="logo-mini">🥗</span>${marcaHTML}<span class="fecha-chip">${DS[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()].slice(0, 3)}</span></div>
    <h1>${titulo}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}`;
}

let tTostada;
function tostada(txt) { const t = $('#tostada'); t.textContent = txt; t.classList.add('visible'); clearTimeout(tTostada); tTostada = setTimeout(() => t.classList.remove('visible'), 2600); }

// ——— Hoja inferior ———
function hoja(html, alAbrir) {
  cierraHoja(true);
  const fondo = document.createElement('div'); fondo.className = 'fondo-hoja';
  const h = document.createElement('div'); h.className = 'hoja'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true');
  h.innerHTML = `<div class="asa"></div><button class="cerrar" aria-label="Cerrar">×</button>${html}`;
  document.body.append(fondo, h);
  requestAnimationFrame(() => { fondo.classList.add('abierto'); h.classList.add('abierta'); });
  fondo.addEventListener('click', () => cierraHoja()); h.querySelector('.cerrar').addEventListener('click', () => cierraHoja());
  if (alAbrir) alAbrir(h);
  return h;
}
function cierraHoja(rapido) {
  $$('.hoja, .fondo-hoja').forEach(el => { el.classList.remove('abierta', 'abierto'); setTimeout(() => el.remove(), rapido ? 0 : 300); });
  if (window.__rec) { try { window.__rec.abort(); } catch { /* nada */ } window.__rec = null; }
}

// ——— Dictado: el micrófono del navegador si existe; si no, el del teclado ———
const Reconocimiento = () => window.SpeechRecognition || window.webkitSpeechRecognition;
function dictar(boton, campo, alTerminar) {
  const R = Reconocimiento();
  if (window.__rec) { try { window.__rec.stop(); } catch { /* nada */ } return; }
  if (!R) { campo.focus(); tostada('Toca el 🎙️ del teclado para dictar'); return; }
  try {
    const rec = new R(); window.__rec = rec;
    rec.lang = 'es-ES'; rec.interimResults = true; rec.continuous = campo.tagName === 'TEXTAREA';
    const base = campo.value.trim() ? campo.value.replace(/\s*$/, '') + (campo.tagName === 'TEXTAREA' ? '\n' : ' ') : '';
    rec.onresult = e => { let t = ''; for (const r of e.results) t += r[0].transcript; campo.value = base + t; campo.dispatchEvent(new Event('input')); };
    rec.onerror = () => { boton.classList.remove('escuchando'); };
    rec.onend = () => { boton.classList.remove('escuchando'); window.__rec = null; if (alTerminar && campo.value.trim() !== base.trim()) alTerminar(campo.value); };
    boton.classList.add('escuchando'); rec.start();
  } catch { campo.focus(); tostada('Toca el 🎙️ del teclado para dictar'); }
}

// ——— Semana ———
function horaComida() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 11 ? 'desayuno' : h < 16.5 ? 'comida' : h < 19.5 ? 'merienda' : 'cena'; }
function vSemana() {
  const p = planActivo(), pe = efectivo(p), s = est(p.id), h = hoy();
  const ultimo = p.dias.at(-1).f;
  if (!V.dia || !p.dias.some(d => d.f === V.dia)) V.dia = p.dias.find(d => d.f === h)?.f || (h < p.dias[0].f ? p.dias[0].f : p.dias.at(-1).f);
  const i = pe.dias.findIndex(d => d.f === V.dia), d = pe.dias[i];
  const fd = fecha(d.f);
  cabecera(d.f === h ? 'Hoy' : capital(DL[fd.getDay()]), `${fd.getDate()} de ${MES[fd.getMonth()]} · ${esc(p.titulo || 'Menú de la semana')}`);
  const banners = [];
  if (!E.avisos.nutrihome) banners.push(`<div class="aviso verde"><span class="emo">🎉</span><div><b>Esto es NutriHome.</b> Ahora podéis crear vuestras recetas, añadir productos hablando y escanear lo que compréis fuera del menú.</div><button class="cerrar-aviso" data-cerrar-aviso="nutrihome" aria-label="Cerrar">×</button></div>`);
  if (h > ultimo) banners.push(`<div class="aviso"><span class="emo">🗓️</span><div><b>Semana terminada.</b><div class="botones" style="margin-top:8px"><button class="boton principal" id="b-siguiente">${I.chispas}Preparar la siguiente</button></div></div></div>`);
  if (!s.compraHecha && h <= p.dias[1].f) banners.push(`<a class="aviso" href="#compra" style="text-decoration:none;color:inherit"><span class="emo">🛒</span><div><b>Toca compra.</b> La lista ya está hecha →</div></a>`);
  const tot = q => L.totalesDia(d, q, recetas, D.productos, fac);
  const tG = tot('G'), tP = tot('P');
  const caja = (q, t) => {
    const o = obj[q], color = q === 'G' ? 'var(--persona-g)' : 'var(--persona-p)';
    return `<div class="anillo-caja">${anillo(t.kcal / o.kcal, color, r0(t.kcal), 'de ' + o.kcal, 84)}<div class="quien ${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(NOM[q])}</div>
      <div class="meta">💪 ${r0(t.p)} de ${o.prot} g</div>${miniBarra(t.p / o.prot * 100, color)}</div>`;
  };
  const faltaG = obj.G.kcal - tG.kcal, faltaP = obj.P.kcal - tP.kcal;
  const pista = tG.fuera ? '🍽️ Lo de fuera no cuenta aquí: mejor plancha y ensalada.'
    : tG.libre ? '🏠 Lo que no tiene plato no cuenta.'
    : (faltaG > 150 || faltaP > 200) ? '🍎 Os quedáis algo cortos: una fruta o 20 g de almendras.' : '✨ Día completo y equilibrado.';
  const puntos = x => L.COMIDAS.map(c => { const v = x[c]; return `<i class="${s.hechos[x.f + '|' + c] ? 'h' : v && v.fuera ? 'f' : ''}"></i>`; }).join('');
  $('#vista').innerHTML = `
    ${banners.join('')}
    <div class="dias" role="tablist">${pe.dias.map(x => { const dd = fecha(x.f); return `<button class="dia-btn${x.f === h ? ' hoy' : ''}" data-f="${x.f}" aria-pressed="${x.f === V.dia}"><span class="ds">${x.f === h ? 'hoy' : DS[dd.getDay()]}</span><span class="dn">${dd.getDate()}</span><span class="puntos">${puntos(x)}</span></button>`; }).join('')}</div>
    <div class="tarjeta anillos">${caja('G', tG)}${caja('P', tP)}<div class="pista-dia">${pista}</div></div>
    ${consejosDia(pe, i)}
    ${L.COMIDAS.map(c => tarjetaComida(p, d, i, c, s, d.f === h && c === horaComida())).join('')}
    <div class="botones" style="margin:14px 0 18px;justify-content:center"><button class="boton" id="b-proponer">${I.chispas}Proponer otra semana</button></div>`;
  $$('.dia-btn').forEach(b => b.addEventListener('click', () => { V.dia = b.dataset.f; vSemana(); }));
  $$('[data-abrir]').forEach(b => b.addEventListener('click', () => abrirReceta(b.dataset.abrir, { plan: p.id, f: b.dataset.f, c: b.dataset.c })));
  $$('[data-cambiar]').forEach(b => b.addEventListener('click', () => abrirCambiar(p, i, b.dataset.cambiar)));
  $$('[data-fuera]').forEach(b => b.addEventListener('click', () => alternaFuera(p, d.f, b.dataset.fuera)));
  $$('[data-hecho]').forEach(b => b.addEventListener('click', () => alternaHecho(p, d.f, b.dataset.hecho)));
  $$('[data-cerrar-aviso]').forEach(b => b.addEventListener('click', () => { E.avisos[b.dataset.cerrarAviso] = 1; salva(); vSemana(); }));
  $('#b-proponer').addEventListener('click', () => proponer(p));
  $('#b-siguiente')?.addEventListener('click', siguienteSemana);
  $('.dia-btn[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function tarjetaComida(p, d, i, c, s, ahora) {
  const v = d[c], clave = d.f + '|' + c, r = recetas[L.idDe(v)];
  const mom = `<div class="momento">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}${ahora ? '<span class="ahora-pill">AHORA</span>' : ''}</div>`;
  const btn = (cls, data, lab, svg, pressed) => `<button class="icono ${cls}" ${data}="${c}" aria-label="${lab}" title="${lab}"${pressed != null ? ` aria-pressed="${pressed}"` : ''}>${svg}</button>`;
  if (v && v.fuera) return `<article class="tarjeta comida c-${c} fuera"><div class="tile">🍽️</div><div class="cuerpo">${mom}<div class="nombre">Coméis fuera</div></div>
    <div class="acciones-v">${btn('fuera', 'data-fuera', 'Quitar «fuera»', SVG.fuera, true)}${btn('', 'data-cambiar', 'Poner un plato', SVG.cambiar)}</div></article>`;
  if (!r) return `<article class="tarjeta comida c-${c} fuera"><div class="tile">🏠</div><div class="cuerpo">${mom}<div class="nombre">${esc(v && v.libre ? v.libre : 'Sin plato')}</div></div>
    <div class="acciones-v">${btn('', 'data-cambiar', 'Poner un plato', SVG.cambiar)}${btn('fuera', 'data-fuera', 'Comer fuera', SVG.fuera, false)}</div></article>`;
  const mg = L.macrosReceta(r, 'G', D.productos, fac), mp = L.macrosReceta(r, 'P', D.productos, fac);
  const hecho = !!s.hechos[clave];
  return `<article class="tarjeta comida c-${c}${hecho ? ' hecha' : ''}${ahora && !hecho ? ' ahora' : ''}">
    <button class="tile" data-abrir="${r.id}" data-f="${d.f}" data-c="${c}" aria-label="Ver receta">${emojiReceta(r)}</button>
    <div class="cuerpo">${mom}
      <button class="nombre" data-abrir="${r.id}" data-f="${d.f}" data-c="${c}">${esc(r.n)}</button>
      <div class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span><span class="pill g">${ini('G')} ${r0(mg.kcal)}</span><span class="pill p">${ini('P')} ${r0(mp.kcal)}</span>${r.propia ? '<span class="pill">⭐ vuestra</span>' : ''}</div>
    </div>
    <div class="acciones-v">${btn('hecho', 'data-hecho', hecho ? 'Desmarcar' : 'Hecho', SVG.check, hecho)}${btn('', 'data-cambiar', 'Cambiar plato', SVG.cambiar)}${btn('fuera', 'data-fuera', 'Comer fuera', SVG.fuera, false)}</div>
  </article>`;
}

// Consejos de congelador: lo fresco que se usa a partir del cuarto día, al congelador al llegar;
// y la noche antes, sacar lo que toque.
const PROTE_FRESCA = ['Carne', 'Marisco y pescado'];
function usosPorProducto(pe) {
  const usos = {};
  pe.dias.forEach((d, i) => L.COMIDAS.forEach(c => {
    const r = recetas[L.idDe(d[c])];
    if (r) for (const ing of r.ing) (usos[ing[0]] ||= []).push({ i, f: d.f, c, r });
  }));
  return usos;
}
const PESCADO_CONGELADO = /salm|merluza/i;   // viene congelado y hay que descongelarlo en la nevera (las gambas, no)
function consejosDia(pe, i) {
  const usos = usosPorProducto(pe), partes = [];
  const fresca = k => PROTE_FRESCA.includes(D.productos[k]?.cat);
  const nombre = k => nombreCorto(D.productos[k]).toLowerCase();
  if (i === 0) {
    const cong = Object.entries(usos).filter(([k]) => fresca(k)).map(([k, u]) => {
      const tarde = [...new Set(u.filter(v => v.i >= 3).map(v => DS[fecha(v.f).getDay()]))];
      return tarde.length ? `${nombre(k)} (${tarde.join(', ')})` : null;
    }).filter(Boolean);
    if (cong.length) partes.push(`<b>Al volver de la compra, al congelador:</b> ${esc(cong.join(' · '))}. La noche antes, a la nevera.`);
  }
  if (pe.dias[i + 1]) {
    const sacar = Object.entries(usos).filter(([k, u]) => u.some(v => v.i === i + 1) &&
      ((D.productos[k].cat === 'Congelados' && PESCADO_CONGELADO.test(D.productos[k].n)) || (fresca(k) && i + 1 >= 3))).map(([k]) => nombre(k));
    if (sacar.length) partes.push(`<b>Esta noche:</b> del congelador a la nevera ${esc(sacar.join(' y '))}, para mañana.`);
  }
  return partes.map(t => `<div class="aviso hielo"><span class="emo">❄️</span><div>${t}</div></div>`).join('');
}

function alternaFuera(p, f, c) {
  const s = est(p.id), k = f + '|' + c, actual = efectivo(p).dias.find(d => d.f === f)[c];
  if (actual && actual.fuera) { const orig = p.dias.find(d => d.f === f)[c]; if (orig && orig.fuera) s.cambios[k] = null; else delete s.cambios[k]; }
  else s.cambios[k] = { fuera: true };
  salva(); vSemana();
}
function alternaHecho(p, f, c) {
  const s = est(p.id), k = f + '|' + c, ck = p.id + '|' + k;
  if (s.hechos[k]) { delete s.hechos[k]; tostada('Desmarcado'); }
  else {
    s.hechos[k] = 1;
    if (!E.consumidos[ck]) { E.consumidos[ck] = 1; descuentaReceta(recetas[L.idDe(efectivo(p).dias.find(d => d.f === f)[c])]); }
    tostada('¡Hecho! 🎉 Descontado de «En casa»');
  }
  salva(); vSemana();
  $(`[data-hecho="${c}"]`)?.classList.add('pop');
}
function proponer(p) {
  if (!confirm('¿Cambio todos los platos de la semana por otra propuesta? Lo que esté marcado como «fuera» se queda igual.')) return;
  const s = est(p.id), pe = efectivo(p);
  const nuevo = L.proponerSemana(pe, recetas, D.productos, fac, obj.G);
  for (const d of nuevo.dias) for (const c of L.COMIDAS) {
    const orig = pe.dias.find(x => x.f === d.f)[c];
    if (typeof orig === 'string' || orig === null) s.cambios[d.f + '|' + c] = d[c];
  }
  salva(); vSemana(); tostada('✨ Semana nueva propuesta');
}
function siguienteSemana() {
  const ult = planActivo(), inicio = masDias(ult.dias.at(-1).f, 1);
  const dias = Array.from({ length: 7 }, (_, n) => {
    const f = masDias(inicio, n), dow = fecha(f).getDay(), d = { f };
    for (const c of L.COMIDAS) d[c] = null;
    if (dow === 0) d.comida = { fuera: true };
    if (dow === 5) d.cena = { fuera: true };
    return d;
  });
  const base = { id: inicio, titulo: `Semana del ${fecha(inicio).getDate()} de ${MES[fecha(inicio).getMonth()]}`, dias };
  const plan = L.proponerSemana(base, recetas, D.productos, fac, obj.G);
  E.planes = [...E.planes.filter(x => x.id !== plan.id), plan];
  V.dia = inicio; salva(); vSemana(); tostada('🗓️ Semana preparada');
}

function filaReceta(r, extra = '') {
  const g = L.macrosReceta(r, 'G', D.productos, fac), q = L.macrosReceta(r, 'P', D.productos, fac);
  return `<button class="alternativa" data-id="${r.id}"><span class="emo">${emojiReceta(r)}</span><span style="min-width:0"><span class="nombre" style="display:block">${esc(r.n)}</span>
    <span class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span><span class="pill g">${ini('G')} ${r0(g.kcal)}</span><span class="pill p">${ini('P')} ${r0(q.kcal)}</span>${r.propia ? '<span class="pill">⭐ vuestra</span>' : ''}${extra}</span></span></button>`;
}
function abrirCambiar(p, i, c) {
  const pe = efectivo(p), d = pe.dias[i];
  const alts = L.alternativas(pe, i, c, recetas, D.productos, fac, obj.G);
  hoja(`<h2>${COMIDA_EMO[c]} Cambiar ${L.NOMBRE_COMIDA[c].toLowerCase()}</h2><div class="nota">${capital(DL[fecha(d.f).getDay()])} ${fecha(d.f).getDate()} · primero, lo que mejor encaja</div>
    ${alts.map(r => filaReceta(r)).join('')}
    <div class="botones" style="margin-top:10px"><button class="boton" data-otro="fuera">🍽️ Coméis fuera</button><button class="boton" data-otro="libre">🏠 Lo que haya</button></div>`, h => {
    $$('[data-id]', h).forEach(b => b.addEventListener('click', () => { est(p.id).cambios[d.f + '|' + c] = b.dataset.id; salva(); cierraHoja(); vSemana(); tostada('Plato cambiado'); }));
    $$('[data-otro]', h).forEach(b => b.addEventListener('click', () => {
      est(p.id).cambios[d.f + '|' + c] = b.dataset.otro === 'fuera' ? { fuera: true } : { libre: 'Lo que haya en casa' };
      salva(); cierraHoja(); vSemana();
    }));
  });
}

// ——— Receta ———
function abrirReceta(id, ctx) {
  const r = recetas[id];
  if (!r) return;
  const mg = L.macrosReceta(r, 'G', D.productos, fac), mp = L.macrosReceta(r, 'P', D.productos, fac);
  const filas = r.ing.map(ing => {
    const x = D.productos[ing[0]], g = L.gramos(ing, 'G', fac), q = L.gramos(ing, 'P', fac);
    return `<div class="ing-fila"><span>${esc(nombreCorto(x))}</span><span class="c persona-g">${g ? esc(L.cantidadTexto(ing[0], g, D.productos)) : '—'}</span><span class="c persona-p">${q ? esc(L.cantidadTexto(ing[0], q, D.productos)) : '—'}</span></div>`;
  }).join('') + [...(r.otros || []), ...(r.basicos || [])].map(t => `<div class="ing-fila"><span class="otro">${esc(t)}</span><span class="c">·</span><span class="c">·</span></div>`).join('');
  const m = (q, x) => {
    const o = obj[q], color = q === 'G' ? 'var(--persona-g)' : 'var(--persona-p)';
    const bm = (e, v, max, u = 'g') => `<div class="bm"><span>${e}</span>${miniBarra(v / max * 100, color)}<span>${r0(v)} ${u}</span></div>`;
    return `<div class="m ${q.toLowerCase()}"><b class="${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(NOM[q])}</b><span class="k">${r0(x.kcal)} <small style="font-size:13px">kcal</small></span>
      <div class="barras">${bm('💪', x.p, o.prot * 0.4)}${bm('🍞', x.hc, o.hc * 0.4)}${bm('🥑', x.g, o.grasa * 0.4)}</div>
      <div class="nota" style="margin-top:6px">${euros(x.coste)} por ración</div></div>`;
  };
  const plan = planActivo();
  const tipoPrincipal = r.tipo?.[0] || 'comida';
  hoja(`<div class="portada-hoja c-${tipoPrincipal}"><span class="emo">${emojiReceta(r)}</span><div><h2>${esc(r.n)}</h2>
      <div class="botones" style="margin-top:8px"><span class="pill verde">${APARATO_EMO[r.ap] || '🍴'} ${APARATO[r.ap] || 'Cocina'}</span><span class="pill">⏱ ${r.min}′</span>${r.propia ? '<span class="pill">⭐ vuestra</span>' : ''}</div></div></div>
    ${r.sub ? `<div class="nota">${esc(r.sub)}</div>` : ''}
    <div class="macros">${m('G', mg)}${m('P', mp)}</div>
    <h3>🥕 Ingredientes</h3>
    <div class="ing-lista"><div class="ing-fila cab"><span>Ingrediente</span><span class="c persona-g">${esc(NOM.G)}</span><span class="c persona-p">${esc(NOM.P)}</span></div>${filas}</div>
    <h3>👩‍🍳 Cómo se hace</h3><ol class="pasos">${r.pasos.map(x => `<li><span>${esc(x)}</span></li>`).join('') || '<li><span>Sin pasos apuntados.</span></li>'}</ol>
    ${r.nota ? `<div class="aviso"><span class="emo">💡</span><div>${esc(r.nota)}</div></div>` : ''}
    <div class="botones" style="margin-top:14px"><button class="boton suave" id="b-a-lista">${I.carro}A la lista</button>
      ${r.propia ? `<button class="boton" id="b-editar">${I.lapiz}Editar</button><button class="boton" id="b-claude-receta">${I.enviar}A Claude</button><button class="boton peligro" id="b-borrar-receta">${I.papelera}</button>` : ''}</div>
    ${ctx ? '' : `<h3>${I.calendario} Ponerla en el menú</h3><div class="botones">
      <select id="s-dia" class="boton">${plan.dias.map(d => `<option value="${d.f}">${DS[fecha(d.f).getDay()]} ${fecha(d.f).getDate()}</option>`).join('')}</select>
      <select id="s-com" class="boton">${(r.tipo || L.COMIDAS).map(c => `<option value="${c}">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}</option>`).join('')}</select>
      <button class="boton principal" id="b-poner">Poner</button></div>`}
    <div class="nota" style="margin-top:14px">Valores aproximados (etiquetas de Mercadona, Open Food Facts y tablas para lo fresco).</div>`, h => {
    $('#b-poner', h)?.addEventListener('click', () => {
      est(plan.id).cambios[$('#s-dia', h).value + '|' + $('#s-com', h).value] = r.id;
      salva(); cierraHoja(); tostada('📅 Puesta en el menú'); if (V.pestana === 'semana') vSemana();
    });
    $('#b-a-lista', h).addEventListener('click', () => elegirRaciones(r));
    $('#b-editar', h)?.addEventListener('click', () => editorReceta(r));
    $('#b-claude-receta', h)?.addEventListener('click', () => mandarAClaude(textoReceta(r)));
    $('#b-borrar-receta', h)?.addEventListener('click', () => {
      if (!confirm(`¿Borro la receta «${r.n}» de este móvil?`)) return;
      E.propias = E.propias.filter(x => x.id !== r.id); reconstruyeRecetas(); salva(); cierraHoja(); tostada('Receta borrada'); pinta();
    });
  });
}
const nombreCorto = x => x.n.replace(/ Hacendado| ultracongelad[oa]s?| lavad[oa]s?| IGP/g, '').replace(/\s+/g, ' ');
const textoReceta = r => `Receta para NutriHome: ${r.n}\n\nIngredientes (una ración):\n${r.txt?.ing || r.ing.map(i => `${i[1]} g de ${nombreCorto(D.productos[i[0]])}`).join('\n')}\n\nCómo se hace:\n${r.txt?.pasos || r.pasos.join('\n')}`;

// Receta a la lista de la compra: sus ingredientes se suman a lo que pide el menú.
function elegirRaciones(r) {
  hoja(`<h2>🛒 ${esc(r.n)}</h2><div class="nota">¿Para quién? Sus ingredientes se suman a la lista.</div>
    <div class="botones" style="margin-top:14px;flex-direction:column">
      <button class="boton principal ancho" data-quien="GP">👫 Para los dos</button>
      <button class="boton ancho" data-quien="G"><span class="persona-g">●</span> Solo ${esc(NOM.G)}</button>
      <button class="boton ancho" data-quien="P"><span class="persona-p">●</span> Solo ${esc(NOM.P)}</button></div>`, h => {
    $$('[data-quien]', h).forEach(b => b.addEventListener('click', () => {
      const s = est(planActivo().id);
      s.recetasLista.push({ id: uid(), r: r.id, quien: b.dataset.quien });
      salva(); cierraHoja(); tostada(`🛒 ${r.n}: a la lista`);
      if (V.pestana === 'compra') vCompra(); else location.hash = 'compra';
    }));
  });
}
function elegirRecetaParaLista() {
  const pintaLista = (h, t) => {
    const n = L.normaliza(t);
    $('#lista-recetas', h).innerHTML = todasRecetas().filter(r => !n || L.normaliza(r.n).includes(n)).slice(0, 40).map(r => filaReceta(r)).join('') || '<div class="vacio">No encuentro esa receta.</div>';
    $$('#lista-recetas [data-id]', h).forEach(b => b.addEventListener('click', () => elegirRaciones(recetas[b.dataset.id])));
  };
  hoja(`<h2>🍲 Receta a la lista</h2>
    <button class="nueva-receta" id="b-crear"><span class="emo">✍️</span><span><b>Crear una nueva</b><span>Escríbela o díctala</span></span></button>
    <div class="buscador">${I.buscar}<input id="i-busca-r" type="search" placeholder="Buscar receta…" autocomplete="off"></div>
    <div id="lista-recetas"></div>`, h => {
    pintaLista(h, '');
    $('#i-busca-r', h).addEventListener('input', e => pintaLista(h, e.target.value));
    $('#b-crear', h).addEventListener('click', () => editorReceta(null, true));
  });
}

// ——— Vuestras recetas: escritas o dictadas ———
function editorReceta(r, aLaLista = false, inicial = {}) {
  const nueva = !r;
  const v = { n: r?.n || inicial.n || '', ing: r?.txt?.ing || inicial.ing || '', pasos: r?.txt?.pasos || inicial.pasos || '',
    tipo: r?.tipo || ['comida', 'cena'], ap: r?.ap || 'airfryer', min: r?.min || 20 };
  const mic = id => `<button type="button" class="icono mic" data-mic="${id}" aria-label="Dictar">${SVG.micro.replace('<svg', '<svg class="i"')}</button>`;
  hoja(`<h2>${nueva ? '✍️ Nueva receta' : '✏️ Editar receta'}</h2>
    <div class="nota">Escríbela o díctala con el 🎙️. Cantidades para una ración (${esc(NOM.G)}); la de ${esc(NOM.P)} sale sola.</div>
    <h3>📛 Nombre</h3><div class="con-micro"><input class="campo-texto" id="r-nombre" placeholder="Pollo con ñoquis" value="${esc(v.n)}" style="padding-right:56px">${mic('r-nombre')}</div>
    <h3>🥕 Ingredientes</h3><div class="con-micro"><textarea class="campo-texto" id="r-ing" placeholder="150 g de pechuga de pollo&#10;125 g de ñoquis&#10;100 g de tomate cherry&#10;1 cucharadita de aceite">${esc(v.ing)}</textarea>${mic('r-ing')}</div>
    <div class="reconocidos" id="r-reco"></div>
    <h3>👩‍🍳 Cómo se hace</h3><div class="con-micro"><textarea class="campo-texto" id="r-pasos" placeholder="Pollo en dados con sal. Air fryer 180 °C, 12 minutos…">${esc(v.pasos)}</textarea>${mic('r-pasos')}</div>
    <h3>🕐 ¿Cuándo?</h3><div class="botones" id="r-tipo">${L.COMIDAS.map(c => `<button type="button" class="chip" data-tipo="${c}" aria-pressed="${v.tipo.includes(c)}">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}</button>`).join('')}</div>
    <h3>🍳 ¿Con qué?</h3><div class="botones" id="r-ap">${['airfryer', 'plancha', 'micro', 'sin'].map(a => `<button type="button" class="chip" data-ap="${a}" aria-pressed="${v.ap === a}">${APARATO_EMO[a]} ${APARATO[a]}</button>`).join('')}
      <label class="chip">⏱ <input id="r-min" type="number" inputmode="numeric" value="${v.min}" style="width:42px;border:0;background:none;font-weight:800;padding:0"> min</label></div>
    <button class="boton principal ancho" id="r-guardar" style="margin-top:18px">💾 Guardar receta</button>`, h => {
    const reco = () => {
      const x = L.interpretaReceta($('#r-ing', h).value, '', D.productos);
      $('#r-reco', h).innerHTML = x.detalle.map(d => d.k
        ? `<span class="pill bueno">✓ ${esc(nombreCorto(D.productos[d.k]))} · ${r0(d.g)} g${d.aprox ? ' ≈' : ''}</span>`
        : d.basico ? `<span class="pill">🏠 ${esc(d.texto)}</span>` : `<span class="pill regular">＋ ${esc(d.texto)}</span>`).join('') + (x.otros.length ? '<div class="nota" style="width:100%">Lo amarillo no está en la app: irá a la lista como texto.</div>' : '');
    };
    reco();
    $('#r-ing', h).addEventListener('input', reco);
    $$('[data-mic]', h).forEach(b => b.addEventListener('click', () => dictar(b, $('#' + b.dataset.mic, h))));
    $$('[data-tipo]', h).forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    $$('[data-ap]', h).forEach(b => b.addEventListener('click', () => { $$('[data-ap]', h).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); }));
    $('#r-guardar', h).addEventListener('click', () => {
      const n = $('#r-nombre', h).value.trim(), ingT = $('#r-ing', h).value.trim(), pasosT = $('#r-pasos', h).value.trim();
      if (!n) { $('#r-nombre', h).focus(); tostada('Ponle un nombre'); return; }
      if (!ingT) { $('#r-ing', h).focus(); tostada('Faltan los ingredientes'); return; }
      const x = L.interpretaReceta(ingT, pasosT, D.productos);
      const tipo = $$('[data-tipo][aria-pressed="true"]', h).map(b => b.dataset.tipo);
      const nuevaR = { id: r?.id || 'p-' + uid(), n, e: L.emojiDe(n + ' ' + ingT), tipo: tipo.length ? tipo : ['comida', 'cena'],
        ap: $('[data-ap][aria-pressed="true"]', h)?.dataset.ap || 'plancha', min: Math.max(1, parseInt($('#r-min', h).value, 10) || 20), prot: 'propia',
        ing: x.ing, otros: x.otros, basicos: x.basicos, pasos: x.pasos, txt: { ing: ingT, pasos: pasosT }, propia: true, creada: r?.creada || new Date().toISOString() };
      E.propias = [...E.propias.filter(y => y.id !== nuevaR.id), nuevaR];
      reconstruyeRecetas(); salva();
      tostada(nueva ? '🎉 Receta guardada' : 'Receta actualizada');
      if (V.pestana === 'recetas') vRecetas();
      if (aLaLista) elegirRaciones(nuevaR); else abrirReceta(nuevaR.id);
    });
  });
}

// ——— Compra ———
const BASICOS = /^(sal|agua|hielo|pimienta|pimienta negra|sal y pimienta|cilantro|perejil|albahaca|oregano|pimenton|canela|comino)$/;
function lineaCompra() {
  const p = planActivo(), s = est(p.id), h = hoy();
  const desde = h > p.dias[0].f ? h : null, pe = efectivo(p);
  const nec = L.necesidades(pe, recetas, fac, desde);
  for (const f of E.fijos) if (f.k && D.productos[f.k]) nec[f.k] = (nec[f.k] || 0) + (f.n || 1) * D.productos[f.k].util;
  const otros = new Map();
  const sumaOtros = (r, para) => { for (const t of r.otros || []) {
    const b = L.normaliza(t).replace(/\b(al gusto|una pizca de|un poco de|pizca de|un chorrito de)\b/g, '').trim(), kk = 'o:' + b;
    if (b && !BASICOS.test(b) && !s.otrosHechos[kk] && !otros.has(kk)) otros.set(kk, { texto: t, para });
  } };
  for (const x of s.recetasLista) {
    const r = recetas[x.r]; if (!r) continue;
    for (const ing of r.ing) for (const q of x.quien.split('')) { const g = L.gramos(ing, q, fac); if (g) nec[ing[0]] = (nec[ing[0]] || 0) + g; }
    sumaOtros(r, r.n);
  }
  for (const d of pe.dias) { if (desde && d.f < desde) continue; for (const c of L.COMIDAS) { const r = recetas[L.idDe(d[c])]; if (r?.otros) sumaOtros(r, r.n); } }
  const { filas, despensa, total } = L.listaCompra(nec, D.productos, E.casa || {});
  const vistas = filas.filter(f => !s.quitados[f.k]).map(f => ({ ...f, clave: f.k, fijo: E.fijos.some(x => x.k === f.k) }));
  for (const k of Object.keys(s.faltaDespensa)) if (s.faltaDespensa[k] && D.productos[k]) vistas.push({ k, clave: k, envases: 1, precio: D.productos[k].precio, despensa: true });
  for (const x of s.extra) {
    const enLista = x.k && vistas.find(v => v.k === x.k);
    if (enLista) { enLista.envases += x.n || 1; enLista.precio += (x.n || 1) * D.productos[x.k].precio; (enLista.extras ||= []).push(x.id); enLista.manual = true; continue; }
    vistas.push(x.k ? { k: x.k, clave: 'x:' + x.id, envases: x.n || 1, precio: (x.n || 1) * D.productos[x.k].precio, extra: x.id, manual: true }
      : { k: null, clave: 'x:' + x.id, texto: x.texto, n: x.n, extra: x.id, manual: true, nivel: x.v, img: x.img });
  }
  for (const f of E.fijos) if (!f.k && !s.fijosHechos['f:' + f.texto]) vistas.push({ k: null, clave: 'f:' + f.texto, texto: f.texto, fijo: true });
  for (const [kk, o] of otros) vistas.push({ k: null, clave: kk, texto: o.texto, otro: true, para: o.para });
  vistas.sort((a, b) => ((a.k ? D.productos[a.k].orden : 98) - (b.k ? D.productos[b.k].orden : 98)) || (a.k ? D.productos[a.k].n : a.texto).localeCompare(b.k ? D.productos[b.k].n : b.texto, 'es'));
  const quitar = Object.keys(s.quitados).filter(k => s.quitados[k]);
  return { p, s, filas: vistas, despensa: despensa.filter(f => !s.faltaDespensa[f.k]), total: vistas.reduce((t, f) => t + (f.precio || 0), 0), totalMenu: total, quitados: quitar };
}
const nivelDe = f => f.k ? L.veredicto(L.nutrientesDe(D.productos[f.k])).nivel : f.nivel || null;
const pillNivel = n => n ? `<span class="pill ${n}">${L.NIVEL[n].e} ${L.NIVEL[n].t}</span>` : '';

function vCompra() {
  const { p, s, filas, despensa, total, quitados } = lineaCompra();
  const hechos = filas.filter(f => s.marcados[f.clave]).length;
  cabecera('Compra', `Mercadona · ${esc(p.titulo || '')}`);
  let cat = '', html = '';
  const cuenta = {};
  for (const f of filas) { const c = f.k ? D.productos[f.k].cat : 'Otros'; cuenta[c] = (cuenta[c] || 0) + 1; }
  for (const f of filas) {
    const x = f.k ? D.productos[f.k] : null, c = x ? x.cat : 'Otros';
    if (c !== cat) { if (cat) html += '</div>'; cat = c; html += `<div class="cat"><span class="emo">${CAT_EMO[c] || '🛒'}</span>${esc(c)}<span class="num">${cuenta[c]}</span></div><div class="lista">`; }
    const marcado = !!s.marcados[f.clave];
    const etiquetas = [f.fijo ? '<span class="pill">⭐ de siempre</span>' : '', f.despensa ? '<span class="pill">🫙 despensa</span>' : '', f.otro ? `<span class="pill">📝 ${esc(f.para)}</span>` : '', f.manual ? pillNivel(nivelDe(f)) : ''].join('');
    html += `<div class="producto${marcado ? ' marcado' : ''}" data-clave="${esc(f.clave)}">
      <button class="check" data-marca="${esc(f.clave)}" aria-label="${marcado ? 'Desmarcar' : 'En el carro'}">${SVG.check}</button>
      ${x && x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy" width="50" height="50">` : f.img ? `<img src="${esc(f.img)}" alt="" loading="lazy" width="50" height="50" style="object-fit:contain">` : `<div class="sinfoto">${f.otro ? '📝' : '🛒'}</div>`}
      <button class="info" data-info="${esc(f.clave)}"><div class="pn">${esc(x ? nombreCorto(x) : f.texto)}</div><div class="pc">${x ? esc(L.cantidadCompra(f, D.productos)) : f.n && f.n !== 1 ? esc(String(f.n)) : ''}${etiquetas}</div></button>
      <div class="pp">${f.precio ? euros(f.precio) : ''}</div></div>`;
  }
  if (cat) html += '</div>';
  const recetasLista = s.recetasLista.map(x => recetas[x.r] ? `<button class="chip" data-quitar-receta="${x.id}">${emojiReceta(recetas[x.r])} ${esc(recetas[x.r].n)} ✕</button>` : '').join('');
  $('#vista').innerHTML = `
    <div class="hero"><div><div class="grande">${euros(total)}</div><div class="sub">aprox. · ${filas.length} productos</div></div>${anillo(filas.length ? hechos / filas.length : 0, '#fff', `${hechos}/${filas.length}`, 'en el carro', 78)}</div>
    <div class="rapidas">
      <button class="rapida" id="b-dictar-lista"><span class="emo">🎙️</span>Dictar</button>
      <button class="rapida" id="b-receta-lista"><span class="emo">🍲</span>Receta</button>
      <button class="rapida" id="b-escanear"><span class="emo">🔎</span>¿Es bueno?</button>
      <button class="rapida" id="b-compartir"><span class="emo">📤</span>Enviar</button>
    </div>
    <form class="anadir" id="f-anadir"><div class="caja"><input id="i-anadir" placeholder="Añadir: huevos, yuca, leche…" autocomplete="off" enterkeyhint="done">
      <button type="button" class="icono mic" id="b-mic-anadir" aria-label="Dictar">${SVG.micro.replace('<svg', '<svg class="i"')}</button>
      <button class="icono mas" aria-label="Añadir">${SVG.mas.replace('<svg', '<svg class="i"')}</button></div></form>
    ${E.avisos.ticket ? '' : `<div class="aviso"><span class="emo">🧾</span><div><b>En caja, ticket digital:</b> dad el móvil y os piden el correo por WhatsApp.</div><button class="cerrar-aviso" id="b-aviso-ticket" aria-label="Cerrar">×</button></div>`}
    ${recetasLista ? `<div class="cat"><span class="emo">🍲</span>Recetas añadidas</div><div class="chips-despensa">${recetasLista}</div>` : ''}
    ${html || '<div class="vacio"><span class="emo">🎉</span>No falta nada para el menú de esta semana.</div>'}
    ${despensa.length ? `<div class="cat"><span class="emo">🫙</span>¿Os queda?</div><div class="chips-despensa">${despensa.map(f => `<button class="chip" data-falta="${f.k}">${CAT_EMO[D.productos[f.k].cat] || '🫙'} ${esc(nombreCorto(D.productos[f.k]))}</button>`).join('')}</div><div class="nota" style="margin-top:6px">Toca lo que falte y pasa a la lista.</div>` : ''}
    ${quitados.length ? `<div class="cat"><span class="emo">↩️</span>Quitados</div><div class="chips-despensa">${quitados.map(k => `<button class="chip" data-volver="${k}">${esc(nombreCorto(D.productos[k] || { n: k }))} ↺</button>`).join('')}</div>` : ''}
    <button class="boton principal ancho" id="b-a-casa" style="margin-top:20px"${hechos ? '' : ' disabled'}>${I.caja}Pasar lo comprado a «En casa»</button>
    <div class="botones" style="margin:10px 0 18px;justify-content:center">
      <label class="boton" for="i-foto">📷 Foto del ticket a Claude</label><input id="i-foto" type="file" accept="image/*" class="sr">
    </div>`;
  $('#b-aviso-ticket')?.addEventListener('click', () => { E.avisos.ticket = 1; salva(); vCompra(); });
  $$('[data-marca]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.marca; s.marcados[k] = !s.marcados[k]; salva(); vCompra(); $(`[data-marca="${CSS.escape(k)}"]`)?.classList.add('pop'); }));
  $$('[data-info]').forEach(b => b.addEventListener('click', () => infoProducto(b.dataset.info, filas.find(f => f.clave === b.dataset.info))));
  $$('[data-falta]').forEach(b => b.addEventListener('click', () => { s.faltaDespensa[b.dataset.falta] = true; salva(); vCompra(); tostada('Añadido a la lista'); }));
  $$('[data-volver]').forEach(b => b.addEventListener('click', () => { delete s.quitados[b.dataset.volver]; salva(); vCompra(); }));
  $$('[data-quitar-receta]').forEach(b => b.addEventListener('click', () => { s.recetasLista = s.recetasLista.filter(x => x.id !== b.dataset.quitarReceta); salva(); vCompra(); }));
  $('#f-anadir').addEventListener('submit', e => { e.preventDefault(); anadeTexto($('#i-anadir').value); });
  $('#b-mic-anadir').addEventListener('click', e => dictar(e.currentTarget, $('#i-anadir'), t => anadeTexto(t)));
  $('#b-dictar-lista').addEventListener('click', () => { const b = $('#b-mic-anadir'); b.scrollIntoView({ block: 'center' }); dictar(b, $('#i-anadir'), t => anadeTexto(t)); });
  $('#b-receta-lista').addEventListener('click', elegirRecetaParaLista);
  $('#b-escanear').addEventListener('click', abrirEscaner);
  $('#b-a-casa').addEventListener('click', () => pasarACasa(filas));
  $('#b-compartir').addEventListener('click', () => compartirLista(filas));
  $('#i-foto').addEventListener('change', e => mandarFoto(e.target.files[0]));
}

// Lo que se escribe o se dicta en la caja de la lista: varios productos de una vez, o una orden («quita…», «tenemos…»).
function anadeTexto(t) {
  t = (t || '').trim();
  if (!t) return;
  const o = L.interpretar(t, D.productos);
  if (!['desconocida', 'ir', 'nada'].includes(o.accion)) { ejecuta(t); return; }
  const items = L.separa(t).map(x => { const b = L.buscaProducto(x, D.productos); return b && { ...b, original: x.trim() }; }).filter(Boolean);
  anadeALista(items);
  vCompra();
}

function infoProducto(clave, f) {
  const { p, s } = lineaCompra();
  const k = f && f.k, x = k && D.productos[k];
  const usos = k ? (usosPorProducto(efectivo(p))[k] || []) : [];
  const v = x ? L.veredicto(L.nutrientesDe(x)) : null;
  hoja(`<div class="producto-escaneado">${x && x.foto ? `<img src="${esc(x.foto)}" alt="">` : `<div class="sinfoto" style="width:64px;height:64px;border-radius:14px;display:grid;place-items:center;font-size:30px;background:var(--tarjeta-2)">${f.otro ? '📝' : '🛒'}</div>`}<div><h2>${esc(x ? nombreCorto(x) : f.texto)}</h2>
      ${x ? `<div class="nota">${esc(x.env)} · ${euros(x.precio)}${x.aprox ? ' (peso aprox.)' : ''}</div>` : f.otro ? `<div class="nota">Para «${esc(f.para)}»</div>` : ''}</div></div>
    ${v ? semaforoHTML(v) : f.nivel ? `<div class="botones" style="margin-top:10px">${pillNivel(f.nivel)}</div>` : ''}
    ${x ? `${f.falta ? `<p class="nota">El menú pide unos ${r0(f.falta)} g; sobran unos ${r0(f.sobra)} g, que pasan a «En casa».</p>` : ''}
      ${usos.length ? `<h3>${I.calendario} Para</h3><div class="botones">${usos.map(u => `<span class="pill">${COMIDA_EMO[u.c]} ${DS[fecha(u.f).getDay()]} ${fecha(u.f).getDate()} · ${esc(u.r.n)}</span>`).join('')}</div>` : ''}
      <div class="tabla-n"><div><b>${x.m[0]}</b><span>kcal</span></div><div><b>${x.m[1]} g</b><span>proteína</span></div><div><b>${x.m[2]} g</b><span>hidratos</span></div><div><b>${x.m[3]} g</b><span>grasa</span></div></div>
      <div class="nota">Por 100 g · ${esc(x.fm)}</div>` : !f.nivel && !f.otro ? `<p class="nota">No está en los productos de la app. Si tiene código de barras, escanéalo y os digo si es buena compra.</p><button class="boton suave" id="b-escanear-info">🔎 Escanear</button>` : ''}
    <div class="botones" style="margin-top:14px">
      ${k && !f.extra ? `<button class="boton" id="b-quitar">${I.papelera}Quitar de la lista</button>` : ''}
      ${f.extra ? `<button class="boton" id="b-borrar-extra">${I.papelera}Quitar</button>` : ''}
      ${f.otro ? `<button class="boton" id="b-borrar-otro">${I.papelera}Quitar</button>` : ''}
      ${k ? `<button class="boton" id="b-fijo">${E.fijos.some(y => y.k === k) ? '⭐ Quitar de «lo de siempre»' : '⭐ A «lo de siempre»'}</button>` : ''}
    </div>`, h => {
    $('#b-quitar', h)?.addEventListener('click', () => { s.quitados[k] = true; salva(); cierraHoja(); vCompra(); tostada('Quitado de la lista'); });
    $('#b-borrar-extra', h)?.addEventListener('click', () => { s.extra = s.extra.filter(y => y.id !== f.extra); salva(); cierraHoja(); vCompra(); });
    $('#b-borrar-otro', h)?.addEventListener('click', () => { s.otrosHechos[f.clave] = true; salva(); cierraHoja(); vCompra(); });
    $('#b-escanear-info', h)?.addEventListener('click', abrirEscaner);
    $('#b-fijo', h)?.addEventListener('click', () => {
      E.fijos = E.fijos.some(y => y.k === k) ? E.fijos.filter(y => y.k !== k) : [...E.fijos, { k, n: 1 }];
      salva(); cierraHoja(); vCompra(); tostada('Hecho');
    });
  });
}

function anadeALista(items) {
  const { s } = lineaCompra(), nombres = [];
  for (const it of items) {
    if (!it || (!it.k && !it.texto)) continue;
    if (it.k) delete s.quitados[it.k];
    s.extra.push({ id: uid(), k: it.k, texto: it.k ? it.texto : capital(it.original || it.texto), n: it.n && it.k ? Math.max(1, Math.round(it.n)) : it.n || 1, v: it.v, img: it.img, ean: it.ean });
    const nv = it.k ? L.veredicto(L.nutrientesDe(D.productos[it.k])).nivel : it.v;
    nombres.push((nv ? L.NIVEL[nv].e + ' ' : '') + (it.k ? nombreCorto(D.productos[it.k]) : capital(it.original || it.texto)));
  }
  salva();
  if (nombres.length) tostada('Añadido: ' + nombres.join(', '));
}

function pasarACasa(filas) {
  const { s } = lineaCompra();
  let n = 0;
  for (const f of filas) {
    if (!s.marcados[f.clave] || !f.k) continue;
    const x = D.productos[f.k];
    E.casa[f.k] = (E.casa[f.k] || 0) + f.envases * x.util; n++;
    if (f.extra) s.extra = s.extra.filter(y => y.id !== f.extra);
    if (f.extras) s.extra = s.extra.filter(y => !f.extras.includes(y.id));
    if (f.despensa) delete s.faltaDespensa[f.k];
  }
  for (const f of filas) {
    if (!s.marcados[f.clave] || f.k) continue;
    if (f.extra) s.extra = s.extra.filter(y => y.id !== f.extra);
    if (f.fijo) s.fijosHechos[f.clave] = true;
    if (f.otro) s.otrosHechos[f.clave] = true;
  }
  s.recetasLista = [];
  s.marcados = {}; s.compraHecha = true; salva();
  tostada(`📦 ${n} productos a «En casa»`);
  location.hash = 'casa';
}

async function compartirLista(filas) {
  const { s } = lineaCompra();
  let cat = '', txt = 'Lista de la compra (Mercadona) · NutriHome\n';
  for (const f of filas) {
    if (s.marcados[f.clave]) continue;
    const x = f.k ? D.productos[f.k] : null, c = x ? x.cat : 'Otros';
    if (c !== cat) { cat = c; txt += `\n${CAT_EMO[c] || ''} ${c}\n`; }
    txt += `☐ ${x ? `${nombreCorto(x)} — ${L.cantidadCompra(f, D.productos)}` : f.texto}\n`;
  }
  try { if (navigator.share) { await navigator.share({ title: 'Lista de la compra', text: txt }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(txt); tostada('Lista copiada: pégala en WhatsApp'); } catch { tostada('No he podido compartirla'); }
}

async function mandarFoto(fichero) {
  if (!fichero) return;
  const texto = 'Para Claude: foto de la compra o de una lista. Métela en NutriHome.';
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichero] })) { await navigator.share({ files: [fichero], text: texto }); tostada('Elige Telegram y el chat con @' + (D.perfiles.bot || 'el bot')); return; }
  } catch { return; }
  hoja(`<h2>📷 Mandar la foto</h2><p>Este móvil no deja compartir fotos desde la app. Mándala al bot de Telegram <b>@${esc(D.perfiles.bot || '')}</b> y la meto yo.</p>
    <a class="boton principal" href="https://t.me/${esc(D.perfiles.bot || '')}" target="_blank" rel="noopener">Abrir Telegram</a>`);
}

// ——— ¿Es buena compra? Escáner de códigos de barras + Open Food Facts + semáforo ———
const ZXING = { src: 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js', sri: 'sha384-BzBxP10ZE72aitqj5UMmUsbKFliP/DZqA8Wq+BNNhlIJDGoEd1tpkMYXOg9+n6sB' };
let cargaZX;
function cargaZXing() {
  if (window.ZXing) return Promise.resolve();
  return cargaZX ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = ZXING.src; s.integrity = ZXING.sri; s.crossOrigin = 'anonymous';
    s.onload = res; s.onerror = () => { cargaZX = null; rej(new Error('No se pudo cargar el lector')); }; document.head.append(s);
  });
}
async function leeCodigo(fichero) {
  const bmp = await createImageBitmap(fichero);
  if ('BarcodeDetector' in window) {
    try { const r = await new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }).detect(bmp); if (r[0]) return r[0].rawValue; } catch { /* a ZXing */ }
  }
  await cargaZXing();
  const Z = window.ZXing, hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const lector = new Z.MultiFormatReader(); lector.setHints(hints);
  for (const lado of [1400, 900, 2000]) for (const giro of [0, 90]) {
    const e = Math.min(1, lado / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * e), h = Math.round(bmp.height * e);
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    if (giro) { c.width = h; c.height = w; x.translate(h, 0); x.rotate(Math.PI / 2); } else { c.width = w; c.height = h; }
    x.drawImage(bmp, 0, 0, w, h);
    try { return lector.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(c)))).getText(); } catch { /* otro tamaño */ }
  }
  return null;
}
async function buscaOFF(ean) {
  const campos = 'product_name,product_name_es,generic_name_es,brands,quantity,image_front_small_url,nutriments,nutriscore_grade,nova_group,categories_tags';
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(ean)}.json?fields=${campos}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.status === 1 ? j.product : null;
}
function semaforoHTML(v) {
  const N = L.NIVEL[v.nivel];
  const razones = [...v.pros.map(t => `<span class="pill bueno">👍 ${esc(t)}</span>`), ...v.contras.map(t => `<span class="pill malo">👎 ${esc(t)}</span>`)].join('') || '<span class="pill">normalito: en su ración</span>';
  return `<div class="semaforo ${v.nivel}"><span class="luz">${N.e}</span><div><div class="titulo">${N.t}</div><div class="nota">para perder grasa con mucha proteína</div><div class="razones">${razones}</div></div></div>`;
}
function abrirEscaner() {
  hoja(`<h2>🔎 ¿Es buena compra?</h2><div class="nota">Foto al código de barras y os digo si os conviene.</div>
    <label class="escanear-grande" for="i-codigo-foto" style="margin-top:14px"><span class="emo">📷</span>Hacer foto del código<span class="nota">o elegir una de la galería</span></label>
    <input id="i-codigo-foto" type="file" accept="image/*" capture="environment" class="sr">
    <form class="anadir" id="f-ean"><div class="caja"><input id="i-ean" inputmode="numeric" placeholder="…o escribe los números" autocomplete="off"><button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
    <div id="resultado"></div>
    ${E.escaneos.length ? `<h3>🕘 Lo último</h3><div class="botones">${E.escaneos.slice(0, 8).map(x => `<button class="chip" data-ean="${esc(x.ean)}">${L.NIVEL[x.nivel]?.e || '⚪'} ${esc(x.n.slice(0, 28))}</button>`).join('')}</div>` : ''}
    <div class="nota" style="margin-top:14px">¿Sin código? Mándale una foto del producto a Claude por Telegram y os lo digo.</div>`, h => {
    const res = $('#resultado', h);
    const consulta = async ean => {
      ean = String(ean || '').replace(/\D/g, '');
      if (ean.length < 8) { res.innerHTML = '<div class="aviso"><span class="emo">🤔</span><div>Ese código es muy corto: revisa los números.</div></div>'; return; }
      res.innerHTML = '<div class="cargando"></div><div class="cargando" style="width:70%"></div>';
      const local = Object.entries(D.productos).find(([, x]) => x.ean && (x.ean === ean || x.ean.replace(/^0+/, '') === ean.replace(/^0+/, '')));
      let n, nombre, img, nut = null;
      if (local) { const [k, x] = local; nut = L.nutrientesDe(x); nombre = nombreCorto(x); img = x.foto; n = { k }; }
      else {
        let pr = null;
        try { pr = await buscaOFF(ean); } catch { res.innerHTML = '<div class="aviso"><span class="emo">📡</span><div>Sin conexión: prueba otra vez en un momento.</div></div>'; return; }
        if (!pr) { res.innerHTML = `<div class="aviso"><span class="emo">🙈</span><div><b>No lo encuentro</b> (${esc(ean)}). Mándale una foto del producto a Claude y lo miro.</div></div><button class="boton suave" id="b-off-claude">${I.enviar}Mandárselo a Claude</button>`;
          $('#b-off-claude', h).addEventListener('click', () => mandarAClaude(`¿Es buena compra el producto con código ${ean}? Os mando foto.`)); return; }
        nut = L.nutrientesOFF(pr); nombre = pr.product_name_es || pr.product_name || pr.generic_name_es || 'Producto ' + ean; img = pr.image_front_small_url;
        if (pr.brands) nombre += ' · ' + pr.brands.split(',')[0];
        n = { texto: nombre };
      }
      if (nut.kcal == null && !nut.p && !nut.hc) { res.innerHTML = `<div class="aviso"><span class="emo">🤷</span><div><b>${esc(nombre)}</b>: no tiene la tabla nutricional en Open Food Facts.</div></div>`; return; }
      const v = L.veredicto(nut);
      E.escaneos = [{ ean, n: nombre, nivel: v.nivel, img, f: new Date().toISOString() }, ...E.escaneos.filter(x => x.ean !== ean)].slice(0, 12); salva();
      res.innerHTML = `<div class="producto-escaneado" style="margin-top:14px">${img ? `<img src="${esc(img)}" alt="">` : ''}<div><b>${esc(nombre)}</b><div class="nota">${esc(ean)}</div></div></div>
        ${semaforoHTML(v)}
        <div class="tabla-n"><div><b>${v.kcal}</b><span>kcal</span></div><div><b>${r0(nut.p * 10) / 10} g</b><span>proteína</span></div><div><b>${nut.az != null ? r0(nut.az * 10) / 10 + ' g' : '—'}</b><span>azúcar</span></div><div><b>${r0(nut.g * 10) / 10} g</b><span>grasa</span></div></div>
        <div class="nota">Por 100 g${local ? ' · producto de la app' : ' · Open Food Facts'}</div>
        <div class="botones" style="margin-top:12px"><button class="boton ${v.nivel === 'malo' ? '' : 'principal'}" id="b-escaneo-lista">${I.carro}${v.nivel === 'malo' ? 'Añadir igualmente' : 'A la lista'}</button></div>`;
      $('#b-escaneo-lista', h).addEventListener('click', () => { anadeALista([{ ...n, v: v.nivel, img, ean }]); cierraHoja(); if (V.pestana === 'compra') vCompra(); });
    };
    $('#i-codigo-foto', h).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      res.innerHTML = '<div class="nota" style="text-align:center;margin-top:12px">🔍 Leyendo el código…</div><div class="cargando"></div>';
      try {
        const ean = await leeCodigo(f);
        if (ean) { $('#i-ean', h).value = ean; consulta(ean); }
        else res.innerHTML = '<div class="aviso"><span class="emo">📷</span><div><b>No leo el código.</b> Prueba más cerca, con luz y el código recto, o escribe los números.</div></div>';
      } catch (err) { res.innerHTML = `<div class="aviso"><span class="emo">⚠️</span><div>${esc(err.message || 'No he podido leer la foto')}. Escribe los números del código.</div></div>`; }
      e.target.value = '';
    });
    $('#f-ean', h).addEventListener('submit', e => { e.preventDefault(); consulta($('#i-ean', h).value); });
    $$('[data-ean]', h).forEach(b => b.addEventListener('click', () => { $('#i-ean', h).value = b.dataset.ean; consulta(b.dataset.ean); }));
  });
}

// ——— En casa ———
const LUGAR = k => {
  const c = D.productos[k]?.cat;
  if (c === 'Congelados') return 'Congelador';
  if (c === 'Fruta y verdura') return 'Fruta y verdura';
  if (['Carne', 'Marisco y pescado', 'Charcutería y quesos', 'Huevos, leche y mantequilla', 'Postres y yogures'].includes(c)) return 'Nevera';
  return 'Despensa';
};
const LUGAR_EMO = { 'Nevera': '🧊', 'Fruta y verdura': '🥬', 'Congelador': '❄️', 'Despensa': '🫙' };
function vCasa() {
  const items = Object.entries(E.casa).filter(([k, g]) => D.productos[k] && g > 0);
  cabecera('En casa', `${items.length} cosas apuntadas`);
  const grupos = {};
  for (const [k, g] of items) (grupos[LUGAR(k)] ||= []).push([k, g]);
  const orden = ['Nevera', 'Fruta y verdura', 'Congelador', 'Despensa'];
  $('#vista').innerHTML = `
    <form class="anadir" id="f-casa"><div class="caja"><input id="i-casa" placeholder="Tenemos… (huevos, arroz…)" autocomplete="off" enterkeyhint="done">
      <button type="button" class="icono mic" id="b-mic-casa" aria-label="Dictar">${SVG.micro.replace('<svg', '<svg class="i"')}</button>
      <button class="icono mas" aria-label="Añadir">${SVG.mas.replace('<svg', '<svg class="i"')}</button></div></form>
    <div class="aviso verde"><span class="emo">♻️</span><div>Se gasta solo al marcar un plato como hecho (o al pasar el día).</div></div>
    ${items.length ? orden.filter(o => grupos[o]).map(o => `<div class="cat"><span class="emo">${LUGAR_EMO[o]}</span>${o}<span class="num">${grupos[o].length}</span></div><div class="rejilla">
      ${grupos[o].sort((a, b) => D.productos[a[0]].n.localeCompare(D.productos[b[0]].n, 'es')).map(([k, g]) => `<div class="casa-item">
        <div class="arriba">${D.productos[k].foto ? `<img src="${esc(D.productos[k].foto)}" alt="" loading="lazy" width="46" height="46">` : `<div class="sinfoto" style="display:grid;place-items:center;font-size:22px">${CAT_EMO[D.productos[k].cat] || '🫙'}</div>`}
          <div style="min-width:0"><div class="pn">${esc(nombreCorto(D.productos[k]))}</div><div class="cant">${esc(cantidadCasa(k, g))}</div></div></div>
        <div class="mas-menos"><button data-menos="${k}" aria-label="Menos">−</button><button data-mas="${k}" aria-label="Más">+</button></div></div>`).join('')}</div>`).join('')
      : '<div class="vacio"><span class="emo">🧺</span>Todavía no hay nada. Al volver de la compra: «Pasar lo comprado a En casa».</div>'}
    <div class="nota" style="margin:16px 2px">El Huel y la creatina están en «Nosotros».</div>`;
  const paso = k => { const x = D.productos[k]; return x.gud || Math.max(10, Math.round(x.util / 4 / 10) * 10); };
  $$('[data-menos]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.menos; E.casa[k] = Math.max(0, (E.casa[k] || 0) - paso(k)); if (E.casa[k] <= 0.5) delete E.casa[k]; salva(); vCasa(); }));
  $$('[data-mas]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.mas; E.casa[k] = (E.casa[k] || 0) + paso(k); salva(); vCasa(); }));
  const anadeCasaTexto = t => { const items2 = L.separa(t || '').map(x => L.buscaProducto(x, D.productos)).filter(Boolean); if (anadeACasa(items2)) vCasa(); };
  $('#f-casa').addEventListener('submit', e => { e.preventDefault(); anadeCasaTexto($('#i-casa').value); });
  $('#b-mic-casa').addEventListener('click', e => dictar(e.currentTarget, $('#i-casa'), anadeCasaTexto));
}
function cantidadCasa(k, g) {
  const x = D.productos[k];
  if (x.ud && x.gud) { const n = g / x.gud; if (n >= 0.9) return `≈ ${r0(n)} ${L.plural(x.ud, r0(n))}`; }
  if (g >= x.util * 0.95 && x.util) { const n = g / x.util; return `${n >= 1.5 ? r0(n) + ' envases' : '1 envase'}`; }
  return `≈ ${g >= 30 ? Math.round(g / 10) * 10 : r0(g)} g`;
}
function anadeACasa(items) {
  const nombres = [];
  for (const it of items) {
    if (!it || !it.k) continue;
    const x = D.productos[it.k];
    E.casa[it.k] = (E.casa[it.k] || 0) + (it.n ? (x.gud ? it.n * x.gud : it.n * x.util) : x.util);
    nombres.push(nombreCorto(x));
  }
  salva();
  tostada(nombres.length ? '🏠 En casa: ' + nombres.join(', ') : 'No lo encuentro en los productos de la app');
  return nombres.length > 0;
}

// ——— Recetas ———
const FILTROS = [['todas', '✨ Todas'], ['vuestras', '⭐ Vuestras'], ['desayuno', '☀️ Desayunos'], ['comida', '🍽️ Comidas'], ['cena', '🌙 Cenas'], ['merienda', '🍎 Meriendas'], ['airfryer', '🌀 Air fryer'], ['plancha', '🍳 Plancha'], ['micro', '⚡ Micro'], ['rapidas', '⏱ 10 min']];
const QUESOS = [['queso_burgos', 'Para cada día: casi sin grasa'], ['cottage', 'Cremoso, para ensaladas y tostadas'], ['queso_batido', 'Base de salsas y batidos'],
  ['mozzarella_light', 'Con tomate, tomate seco y rúcula'], ['queso_cabra', 'Vuestro favorito: unos 20 g por ensalada'], ['feta', 'Poco y desmigado: sabe mucho'], ['grana_padano', 'En lascas: con 10 g basta']];
function vRecetas() {
  const todas = todasRecetas();
  cabecera('Recetas', `${todas.length} recetas · ${E.propias.length ? E.propias.length + ' vuestras' : 'air fryer, plancha y micro'}`);
  const t = L.normaliza(V.busca);
  const lista = todas.filter(r => {
    if (t && !L.normaliza(r.n + ' ' + r.ing.map(i => D.productos[i[0]]?.n).join(' ') + ' ' + (r.otros || []).join(' ')).includes(t)) return false;
    const f = V.filtro;
    return f === 'todas' || (f === 'vuestras' && r.propia) || r.tipo.includes(f) || r.ap === f || (f === 'rapidas' && r.min <= 10);
  });
  $('#vista').innerHTML = `
    <button class="nueva-receta" id="b-nueva"><span class="emo">✍️</span><span><b>Nueva receta</b><span>Escríbela o díctala y la guardo</span></span></button>
    <div class="buscador">${I.buscar}<input id="i-busca" type="search" placeholder="Buscar: pollo, ensalada, feta…" value="${esc(V.busca)}"></div>
    <div class="fila-chips">${FILTROS.map(([k, n]) => `<button class="chip" data-filtro="${k}" aria-pressed="${V.filtro === k}">${n}</button>`).join('')}</div>
    <details class="tarjeta quesos"><summary>🧀 Quesos para vuestras ensaladas</summary>
      <div class="nota" style="margin-top:6px">Más proteína y menos grasa = más cantidad. Por 100 g:</div>
      <table><thead><tr><th>Queso</th><th class="num">💪 Prot.</th><th class="num">🥑 Grasa</th></tr></thead><tbody>
      ${QUESOS.filter(([k]) => D.productos[k]).map(([k, tx]) => `<tr><td><b>${esc(nombreCorto(D.productos[k]).replace(/ desnatado.*| semidesnatado.*| de vaca/, ''))}</b><br><span class="nota">${esc(tx)}</span></td><td class="num">${D.productos[k].m[1]} g</td><td class="num">${D.productos[k].m[3]} g</td></tr>`).join('')}
      </tbody></table></details>
    <div class="recetas-rejilla">${lista.map(r => { const g = L.macrosReceta(r, 'G', D.productos, fac);
      return `<button class="receta-tarjeta c-${r.tipo[0]}" data-receta="${r.id}"><div class="portada">${r.propia ? '<span class="propia">⭐ VUESTRA</span>' : ''}${emojiReceta(r)}</div>
        <div class="cuerpo"><div class="nombre">${esc(r.n)}</div><div class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span><span class="pill g">${r0(g.kcal)} kcal</span></div></div></button>`; }).join('')}</div>
    ${lista.length ? '' : '<div class="vacio"><span class="emo">🔍</span>No hay recetas con ese filtro.</div>'}`;
  $('#b-nueva').addEventListener('click', () => editorReceta(null));
  $('#i-busca').addEventListener('input', e => { V.busca = e.target.value; const pos = e.target.selectionStart; vRecetas(); const i = $('#i-busca'); i.focus(); i.setSelectionRange(pos, pos); });
  $$('[data-filtro]').forEach(b => b.addEventListener('click', () => { V.filtro = b.dataset.filtro; vRecetas(); }));
  $$('[data-receta]').forEach(b => b.addEventListener('click', () => abrirReceta(b.dataset.receta)));
}

// ——— Nosotros ———
const GUSTO_EMO = [[/manzana/i, '🍎'], [/ensalada/i, '🥗'], [/pescado/i, '🐟'], [/frutos secos/i, '🥜'], [/entrecot/i, '🥩'], [/batido|fruta/i, '🍓']];
function vNosotros() {
  const p = perfiles(), h = hoy(), cr = E.creatina[h] || {};
  cabecera('Nosotros', 'Objetivos, gustos y suplementos');
  const tarjeta = q => {
    const x = p[q], o = obj[q];
    return `<div class="tarjeta perfil"><h3><span class="avatar ${q.toLowerCase()}">${ini(q)}</span><span class="${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(x.nombre)}</span></h3>
      <div class="campos">
        <label>Edad<input type="number" inputmode="numeric" data-q="${q}" data-campo="edad" value="${x.edad}"></label>
        <label>Altura (cm)<input type="number" inputmode="numeric" data-q="${q}" data-campo="altura" value="${x.altura}"></label>
        <label>Peso (kg)<input type="number" inputmode="decimal" step="0.5" data-q="${q}" data-campo="peso" value="${x.peso}"></label></div>
      <div class="objetivos"><div class="o1"><span class="emo">🔥</span><b>${o.kcal}</b><span>kcal</span></div><div class="o2"><span class="emo">💪</span><b>${o.prot} g</b><span>proteína</span></div><div class="o3"><span class="emo">🍞</span><b>${o.hc} g</b><span>hidratos</span></div><div class="o4"><span class="emo">🥑</span><b>${o.grasa} g</b><span>grasa</span></div></div></div>`;
  };
  const gym = E.gimnasio ?? p.gimnasio;
  $('#vista').innerHTML = `
    ${tarjeta('G')}${tarjeta('P')}
    <div class="tarjeta perfil"><h3>💊 Creatina de hoy</h3>
      <div class="botones" style="margin-top:10px"><button class="chip" data-crea="G" aria-pressed="${!!cr.G}">${cr.G ? '✅' : '⬜'} ${esc(NOM.G)}</button><button class="chip" data-crea="P" aria-pressed="${!!cr.P}">${cr.P ? '✅' : '⬜'} ${esc(NOM.P)}</button></div>
      <div class="nota" style="margin-top:8px">${esc(D.perfiles.suplementos.creatina)}</div>
      <div class="nota" style="margin-top:6px">🥤 ${esc(D.perfiles.suplementos.huel)}</div></div>
    <div class="tarjeta perfil"><button class="interruptor" id="b-gym" aria-pressed="${!!gym}"><span class="sw"></span><span>🏋️ ${gym ? 'Ya vamos al gimnasio' : 'Todavía no vamos al gimnasio'}</span></button>
      <div class="nota" style="margin-top:8px">Al activarlo subo la actividad y meto más hidratos.</div></div>
    <div class="tarjeta perfil"><h3>❤️ Lo que os gusta</h3><div class="gustos">${D.perfiles.gustos.map(g => `<span>${(GUSTO_EMO.find(([re]) => re.test(g)) || [0, '✨'])[1]} ${esc(g)}</span>`).join('')}</div></div>
    <details class="tarjeta perfil"><summary><b>🧮 Cómo lo calculo</b></summary><p class="nota">Gasto en reposo (Mifflin-St Jeor) × actividad ligera (×1,3; ×1,45 con gimnasio), menos un 20 % para perder grasa sin pasar hambre. Proteína: ${String(p.G.protKg).replace('.', ',')} g/kg ${esc(NOM.G)} y ${String(p.P.protKg).replace('.', ',')} g/kg ${esc(NOM.P)}. Grasa: 0,7 g/kg. Lo demás, hidratos. Si en 3 semanas no bajáis, se ajusta.</p></details>
    <div class="tarjeta perfil"><h3>🔜 Próximamente</h3><div class="gustos"><span>🧴 Piel</span><span>💇‍♀️ Pelo</span><span>💅 Uñas</span><span>🌸 Ciclo</span></div></div>
    <div class="tarjeta perfil"><h3>📱 Este móvil</h3><p class="nota">Cada móvil guarda lo suyo (la sincronización llegará). Datos del ${esc(D.generado ? new Date(D.generado).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '')}.</p>
      <div class="botones"><button class="boton" id="b-claude">${I.enviar}Mandar algo a Claude</button><button class="boton peligro" id="b-borrar">${I.papelera}Borrar lo de este móvil</button></div></div>`;
  $$('[data-campo]').forEach(i => i.addEventListener('change', () => {
    const v = parseFloat(i.value.replace(',', '.'));
    if (!isFinite(v) || v <= 0) return;
    (E.perfiles[i.dataset.q] ||= {})[i.dataset.campo] = v; salva(); recalcula(); vNosotros(); tostada('Objetivos recalculados');
  }));
  $('#b-gym').addEventListener('click', () => { E.gimnasio = !gym; salva(); recalcula(); vNosotros(); });
  $$('[data-crea]').forEach(b => b.addEventListener('click', () => { const x = (E.creatina[h] ||= {}); x[b.dataset.crea] = !x[b.dataset.crea]; salva(); vNosotros(); if (x[b.dataset.crea]) tostada('💊 Apuntada'); }));
  $('#b-claude').addEventListener('click', () => mandarAClaude(''));
  $('#b-borrar').addEventListener('click', () => {
    if (!confirm('¿Borro de este móvil los cambios, la lista tachada, lo de «En casa» y vuestras recetas? El menú y las recetas de la app no se borran.')) return;
    E = estadoNuevo(); E.casa = { ...(D.casa_inicial || {}) }; E.fijos = [...(D.fijos || [])]; reconstruyeRecetas(); salva(); recalcula(); vNosotros(); tostada('Borrado');
  });
}

async function mandarAClaude(texto) {
  const t = texto ? 'Para Claude, desde NutriHome: ' + texto : 'Para Claude, desde NutriHome: ';
  try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch { return; }
  window.open('https://t.me/share/url?url=' + encodeURIComponent(location.origin + location.pathname) + '&text=' + encodeURIComponent(t), '_blank');
}

// ——— Micrófono ———
function abrirMicro() {
  const SR = Reconocimiento();
  hoja(`<h2 style="text-align:center">¿Qué necesitas?</h2>
    <button class="micro-grande" id="b-escuchar" aria-label="Hablar">${SVG.micro}</button>
    <div class="transcripcion" id="trans">${SR ? 'Toca y habla' : 'Escríbelo o usa el 🎙️ del teclado'}</div>
    <form id="f-micro"><input class="campo-texto" id="i-micro" placeholder="Por ejemplo: apunta huevos y yuca" autocomplete="off" enterkeyhint="send"></form>
    <div class="ejemplos">${['🛒 Apunta huevos y yuca', '🍽️ ¿Qué cenamos hoy?', '🔄 Cambia la comida del jueves', '🚶 Hoy cenamos fuera', '🏠 Tenemos kéfir', '✍️ Nueva receta', '🔎 ¿Es bueno este yogur?'].map(x => `<button class="chip" data-ej="${esc(x.replace(/^\S+\s/, ''))}">${esc(x)}</button>`).join('')}</div>`, h => {
    const trans = $('#trans', h), boton = $('#b-escuchar', h);
    $('#f-micro', h).addEventListener('submit', e => { e.preventDefault(); ejecuta($('#i-micro', h).value); });
    $$('[data-ej]', h).forEach(b => b.addEventListener('click', () => ejecuta(b.dataset.ej)));
    boton.addEventListener('click', () => {
      if (!SR) { $('#i-micro', h).focus(); return; }
      try {
        const rec = new SR(); window.__rec = rec;
        rec.lang = 'es-ES'; rec.interimResults = true; rec.maxAlternatives = 1;
        let final = '';
        rec.onresult = e => { let t = ''; for (const r of e.results) { t += r[0].transcript; if (r.isFinal) final = t; } trans.textContent = t; };
        rec.onerror = () => { trans.textContent = 'No te he oído bien. Prueba otra vez o escríbelo.'; boton.classList.remove('escuchando'); };
        rec.onend = () => { boton.classList.remove('escuchando'); window.__rec = null; if (final) ejecuta(final); };
        boton.classList.add('escuchando'); trans.textContent = 'Te escucho…'; rec.start();
      } catch { trans.textContent = 'El micrófono no está disponible aquí: escríbelo o usa el del teclado.'; $('#i-micro', h).focus(); }
    });
  });
}

function diaDeVoz(d) {
  const p = planActivo(), h = hoy();
  if (!d || d === 'hoy') return h;
  if (d === '+1') return masDias(h, 1);
  if (d === '+2') return masDias(h, 2);
  const idx = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].indexOf(d);
  return p.dias.find(x => fecha(x.f).getDay() === idx)?.f || h;
}

// «Nueva receta: pollo con ñoquis, 150 g de pollo, 125 g de ñoquis… se hace así: …» → editor relleno.
function recetaDeVoz(texto) {
  let t = texto.replace(/^\s*(nueva receta|receta nueva|añade (una |la )?receta|agrega (una |la )?receta|apunta (una |la )?receta)\s*(de\s+)?[:,.]?\s*/i, '');
  const corte = t.search(/\b(pasos|se hace así|se hace asi|se hace|preparación|preparacion|elaboración|elaboracion)\b\s*:?/i);
  let pasos = '';
  if (corte >= 0) { pasos = t.slice(corte).replace(/^\S+(\s+(así|asi|hace))*\s*:?\s*/i, ''); t = t.slice(0, corte); }
  const m = t.match(/^([^:,]+)[:,]\s*(.*)$/s);
  const n = (m ? m[1] : t).trim(), ing = (m ? m[2] : '').split(/,\s*/).map(x => x.trim()).filter(Boolean).join('\n');
  return { n: n ? capital(n) : '', ing, pasos };
}

function ejecuta(texto) {
  const o = L.interpretar(texto, D.productos), p = planActivo();
  const i = f => p.dias.findIndex(d => d.f === f);
  switch (o.accion) {
    case 'anadir': cierraHoja(); anadeALista(o.items); if (V.pestana === 'compra') vCompra(); else location.hash = 'compra'; break;
    case 'quitar': {
      const s = est(p.id), n = [];
      for (const it of o.items) if (it.k) { s.quitados[it.k] = true; s.extra = s.extra.filter(x => x.k !== it.k); n.push(nombreCorto(D.productos[it.k])); }
      salva(); cierraHoja(); tostada(n.length ? 'Quitado: ' + n.join(', ') : 'No lo encuentro en la lista'); if (V.pestana === 'compra') vCompra(); break;
    }
    case 'casa': cierraHoja(); if (anadeACasa(o.items) && V.pestana === 'casa') vCasa(); break;
    case 'comprado': {
      const { s, filas } = lineaCompra(), n = [];
      for (const it of o.items) { const f = filas.find(x => x.k === it.k); if (f) { s.marcados[f.clave] = true; n.push(nombreCorto(D.productos[it.k])); } }
      salva(); cierraHoja(); tostada(n.length ? 'Tachado: ' + n.join(', ') : 'No está en la lista'); if (V.pestana === 'compra') vCompra(); break;
    }
    case 'fuera': {
      const f = diaDeVoz(o.dia);
      if (i(f) < 0) { tostada('Ese día no está en el menú'); break; }
      est(p.id).cambios[f + '|' + o.comida] = { fuera: true }; salva(); cierraHoja(); V.dia = f; location.hash = 'semana'; vSemana();
      tostada(`Apuntado: ${L.NOMBRE_COMIDA[o.comida].toLowerCase()} fuera`); break;
    }
    case 'cambiar': {
      const f = diaDeVoz(o.dia);
      if (i(f) < 0) { tostada('Ese día no está en el menú'); break; }
      V.dia = f; location.hash = 'semana'; vSemana(); abrirCambiar(p, i(f), o.comida || 'cena'); break;
    }
    case 'ver': {
      const f = diaDeVoz(o.dia), d = efectivo(p).dias.find(x => x.f === f);
      V.dia = f; cierraHoja(); location.hash = 'semana'; vSemana();
      const r = d && recetas[L.idDe(d[o.comida])];
      if (r) abrirReceta(r.id, { plan: p.id, f, c: o.comida }); else tostada(d && d[o.comida]?.fuera ? 'Ese día coméis fuera' : 'No hay plato puesto');
      break;
    }
    case 'receta': editorReceta(null, false, recetaDeVoz(texto)); break;
    case 'escanear': abrirEscaner(); break;
    case 'ir': cierraHoja(); location.hash = o.a; break;
    case 'nada': break;
    default: {
      const h = $('.hoja');
      if (!h || !$('#trans', h)) { tostada('No lo he entendido'); break; }
      $('#trans', h).innerHTML = `No lo he entendido: «${esc(texto)}».<div class="botones" style="justify-content:center;margin-top:10px"><button class="boton principal" id="b-a-claude">${I.enviar}Mandárselo a Claude</button></div>`;
      $('#b-a-claude', h).addEventListener('click', () => mandarAClaude(texto));
    }
  }
}

inicio();
