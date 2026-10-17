// app.js — interfaz de NutriHome: Semana, Compra, En casa, Recetas y Nosotros; recetas propias, buscador de Mercadona y escáner.
// Los datos (productos de Mercadona, recetas, menú y perfiles) llegan cifrados en datos.enc; lo que cambiáis
// (platos cambiados, lista, lo que hay en casa, vuestras recetas…) se guarda en este móvil.
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
const capital = s => s ? s[0].toUpperCase() + s.slice(1) : s;

// ——— Iconos y dibujos ———
const ic = d => `<svg class="i" viewBox="0 0 24 24">${d}</svg>`;
const SVG = {
  semana: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  compra: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  casa: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  recetas: '<svg viewBox="0 0 24 24"><path d="M6 4h10a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4Z"/><path d="M6 18a2 2 0 0 1 2-2h11M10 8h5M10 11h4"/></svg>',
  nosotros: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.6-.2 1.3-.3 2-.3 2.2 0 3.9 1.5 4.4 4.2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  equis: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
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
const PLURAL_COMIDA = { desayuno: 'Desayunos', comida: 'Comidas', merienda: 'Meriendas', cena: 'Cenas' };
// Secciones de la tienda, en el orden en que se recorre Mercadona.
const SECCIONES = ['Fruta y verdura', 'Panadería y pastelería', 'Carne', 'Marisco y pescado', 'Charcutería y quesos', 'Huevos, leche y mantequilla',
  'Postres y yogures', 'Arroz, legumbres y pasta', 'Conservas, caldos y cremas', 'Aceite, especias y salsas', 'Cereales y galletas', 'Aperitivos',
  'Azúcar, caramelos y chocolate', 'Cacao, café e infusiones', 'Zumos', 'Agua y refrescos', 'Bodega', 'Pizzas y platos preparados', 'Congelados',
  'Limpieza y hogar', 'Cuidado del cabello', 'Cuidado facial y corporal', 'Fitoterapia y parafarmacia', 'Maquillaje', 'Bebé', 'Mascotas'];
const CAT_EMO = { 'Fruta y verdura': '🥬', 'Panadería y pastelería': '🥖', 'Carne': '🥩', 'Marisco y pescado': '🐟', 'Charcutería y quesos': '🧀',
  'Huevos, leche y mantequilla': '🥚', 'Postres y yogures': '🥛', 'Arroz, legumbres y pasta': '🍚', 'Conservas, caldos y cremas': '🥫',
  'Aceite, especias y salsas': '🫒', 'Cereales y galletas': '🥣', 'Aperitivos': '🥜', 'Azúcar, caramelos y chocolate': '🍫', 'Cacao, café e infusiones': '☕',
  'Zumos': '🧃', 'Agua y refrescos': '💧', 'Bodega': '🍷', 'Pizzas y platos preparados': '🍕', 'Congelados': '❄️', 'Limpieza y hogar': '🧽',
  'Cuidado del cabello': '💇‍♀️', 'Cuidado facial y corporal': '🧴', 'Fitoterapia y parafarmacia': '💊', 'Maquillaje': '💄', 'Bebé': '🍼', 'Mascotas': '🐾', 'Otros': '🛒' };
const NO_COMIDA = new Set(['Limpieza y hogar', 'Cuidado del cabello', 'Cuidado facial y corporal', 'Fitoterapia y parafarmacia', 'Maquillaje', 'Mascotas']);
const emojiReceta = r => r?.e || L.emojiDe(r?.n || '');
const emojiSeccion = n => CAT_EMO[n] || (E.secciones || []).find(s => s.n === n)?.e || '🏷️';

// Anillo doble (SVG): por fuera las kcal, por dentro la proteína.
function anilloDoble(pk, pp, color, centro, sub, tam = 92) {
  const a = (r, pct, col, w) => { const c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(1, pct)));
    return `<circle cx="40" cy="40" r="${r}" class="pista" style="stroke-width:${w}"/><circle cx="40" cy="40" r="${r}" class="valor" style="stroke:${col};stroke-width:${w};stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${off.toFixed(1)};--c:${c.toFixed(1)}"/>`; };
  return `<div class="anillo" style="width:${tam}px;height:${tam}px;flex-basis:${tam}px"><svg viewBox="0 0 80 80">${a(34, pk, color, 8)}${a(23, pp, '#10b981', 7)}</svg>
    <div class="centro"><div><b>${centro}</b><span>${sub}</span></div></div></div>`;
}
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
function estadoNuevo() { return { v: 1, semanas: {}, planes: [], casa: null, consumidos: {}, creatina: {}, perfiles: {}, gimnasio: null, avisos: {}, fijos: null, propias: [], escaneos: [], secciones: [], casaOtros: [], compras: [] }; }
const salva = () => guarda(ESTADO, E);
function est(id) {
  if (!E.semanas[id]) E.semanas[id] = { cambios: {}, hechos: {}, marcados: {}, extra: [], quitados: {}, faltaDespensa: id === D.semana.id ? Object.fromEntries((D.semana.falta || []).map(k => [k, true])) : {}, compraHecha: false };
  const s = E.semanas[id];
  s.recetasLista ||= []; s.otrosHechos ||= {}; s.fijosHechos ||= {}; s.noComprado ||= {}; s.alternativas ||= {};
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

// Lo que se ha comido sale de «En casa»: al marcar «Ya comido» o, si no se marca, al pasar el día.
function descuentaHueco(v) {
  for (const q of L.QUIEN) {
    const r = recetas[L.recetaDe(v, q)];
    if (!r) continue;
    for (const ing of r.ing) { const g = L.gramos(ing, q, fac); if (g && E.casa[ing[0]] != null) E.casa[ing[0]] = Math.max(0, E.casa[ing[0]] - g); }
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
        descuentaHueco(d[c]);
      }
    }
  }
  salva();
}

// ——— Arranque ———
async function inicio() {
  E = Object.assign(estadoNuevo(), lee(ESTADO, {}));
  for (const k of ['propias', 'escaneos', 'secciones', 'casaOtros', 'compras']) E[k] ||= [];
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
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
    let recargada = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recargada && versionCargada) { recargada = true; location.reload(); } });
  }
  versionCargada = await versionPublicada();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => {});
    const v = await versionPublicada();
    if (v && versionCargada && v !== versionCargada) location.reload();
  });
}
// La versión publicada (la escribe construir.mjs): si cambia mientras la app estaba abierta en segundo plano, se recarga.
let versionCargada = null;
async function versionPublicada() { try { const r = await fetch('version.txt', { cache: 'no-store' }); return r.ok ? (await r.text()).trim() : null; } catch { return null; } }

const marcaHTML = '<span class="nombre-app"><span class="nutri">Nutri</span><span class="home">Home</span></span>';
function puerta(error = '') {
  document.body.innerHTML = `
    <div class="puerta">
      <img class="logo" src="iconos/nutrihome-192.png" alt="">
      <h1>${marcaHTML}</h1>
      <p>Escribe la clave de casa. Solo se pide una vez en cada móvil.</p>
      <form id="f-clave"><label class="sr" for="clave">Clave de casa</label>
        <input id="clave" type="text" inputmode="numeric" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="clave de casa" required>
        <div class="error">${esc(error)}</div>
        <button class="boton principal ancho">Entrar</button></form>
    </div>`;
  $('#f-clave').addEventListener('submit', e => { e.preventDefault(); guardaTexto(CLAVE, $('#clave').value.trim().toLowerCase()); location.reload(); });
}

function pintaMarco() {
  document.body.innerHTML = `
    <header class="cabecera" id="cab"></header>
    <main id="vista"></main>
    <nav class="pestanas" aria-label="Secciones"><div class="dentro">
      ${PESTANAS.map(([k, t]) => `<button data-p="${k}"><span class="ic">${SVG[k]}</span><span>${t}</span></button>`).join('')}
    </div></nav>
    <div class="tostada" id="tostada" role="status"></div>
    <div class="deshacer" id="deshacer" role="status"><span id="deshacer-t"></span><button id="deshacer-b">Deshacer</button></div>`;
  $$('.pestanas button').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.p; }));
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

let tTostada, tDeshacer;
function tostada(txt) { const t = $('#tostada'); t.textContent = txt; t.classList.add('visible'); clearTimeout(tTostada); tTostada = setTimeout(() => t.classList.remove('visible'), 2600); }
function conDeshacer(txt, alDeshacer) {
  const b = $('#deshacer'); $('#deshacer-t').textContent = txt; b.classList.add('visible');
  $('#deshacer-b').onclick = () => { b.classList.remove('visible'); alDeshacer(); };
  clearTimeout(tDeshacer); tDeshacer = setTimeout(() => b.classList.remove('visible'), 6000);
}

// Letreros que se quitan deslizando el dedo (o con la ×). Se recuerda que se han quitado.
function deslizable(el, alQuitar) {
  let x0 = null, y0 = 0, dx = 0, horizontal = null;
  const quita = dir => { el.style.transition = 'transform .25s, opacity .25s, max-height .3s .2s, margin .3s .2s, padding .3s .2s'; el.style.transform = `translateX(${dir}120%)`; el.style.opacity = '0';
    setTimeout(() => { el.style.maxHeight = '0'; el.style.margin = '0'; el.style.padding = '0'; }, 200); setTimeout(() => { el.remove(); alQuitar(); }, 520); };
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horizontal = null; el.style.transition = 'none'; }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (horizontal == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horizontal = Math.abs(mx) > Math.abs(my);
    if (!horizontal) return;
    dx = mx; el.style.transform = `translateX(${dx}px)`; el.style.opacity = String(1 - Math.min(.8, Math.abs(dx) / 260));
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (x0 == null) return;
    if (horizontal && Math.abs(dx) > 80) quita(dx > 0 ? '' : '-');
    else { el.style.transition = 'transform .2s, opacity .2s'; el.style.transform = ''; el.style.opacity = ''; }
    x0 = null;
  });
  el.querySelector('.cerrar-aviso')?.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); quita(''); });
}
function activaLetreros(raiz = document) {
  $$('[data-aviso]', raiz).forEach(el => deslizable(el, () => { E.avisos[el.dataset.aviso] = 1; salva(); }));
}
const letrero = (clave, emo, html, cls = '') => E.avisos[clave] ? '' : `<div class="aviso ${cls}" data-aviso="${esc(clave)}"><span class="emo">${emo}</span><div>${html}</div><button class="cerrar-aviso" aria-label="Quitar">×</button></div>`;

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
}

// ——— Semana ———
function horaComida() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 11 ? 'desayuno' : h < 16.5 ? 'comida' : h < 19.5 ? 'merienda' : 'cena'; }
function vSemana() {
  const p = planActivo(), pe = efectivo(p), s = est(p.id), h = hoy();
  const ultimo = p.dias.at(-1).f;
  if (!V.dia || !p.dias.some(d => d.f === V.dia)) V.dia = p.dias.find(d => d.f === h)?.f || (h < p.dias[0].f ? p.dias[0].f : p.dias.at(-1).f);
  const i = pe.dias.findIndex(d => d.f === V.dia), d = pe.dias[i];
  const fd = fecha(d.f);
  cabecera(d.f === h ? 'Hoy' : capital(DL[fd.getDay()]), `${fd.getDate()} de ${MES[fd.getMonth()]}`);
  const banners = [];
  if (h > ultimo) banners.push(`<div class="aviso"><span class="emo">🗓️</span><div><b>Semana terminada</b><div class="botones" style="margin-top:8px"><button class="boton principal" id="b-siguiente">${I.chispas}Preparar la siguiente</button></div></div></div>`);
  if (!s.compraHecha && h <= p.dias[1].f) banners.push(letrero('compra:' + p.id, '🛒', '<a href="#compra" style="color:inherit;text-decoration:none"><b>Toca compra</b> · ver la lista →</a>'));
  const tot = q => L.totalesDia(d, q, recetas, D.productos, fac);
  const tG = tot('G'), tP = tot('P');
  const caja = (q, t) => {
    const o = obj[q], color = q === 'G' ? 'var(--persona-g)' : 'var(--persona-p)';
    return `<div class="anillo-caja">${anilloDoble(t.kcal / o.kcal, t.p / o.prot, color, r0(t.kcal), 'kcal')}
      <div class="quien ${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(NOM[q])}</div><div class="meta">de ${o.kcal} · 💪 ${r0(t.p)}/${o.prot} g</div></div>`;
  };
  const puntos = x => L.COMIDAS.map(c => { const v = x[c]; return `<i class="${s.hechos[x.f + '|' + c] ? 'h' : v && v.fuera ? 'f' : ''}"></i>`; }).join('');
  $('#vista').innerHTML = `
    ${banners.join('')}
    <div class="dias" role="tablist">${pe.dias.map(x => { const dd = fecha(x.f); return `<button class="dia-btn${x.f === h ? ' hoy' : ''}" data-f="${x.f}" aria-pressed="${x.f === V.dia}"><span class="ds">${x.f === h ? 'hoy' : DS[dd.getDay()]}</span><span class="dn">${dd.getDate()}</span><span class="puntos">${puntos(x)}</span></button>`; }).join('')}</div>
    <div class="tarjeta anillos"><div class="anillos-cab"><b>Lo que coméis ${d.f === h ? 'hoy' : 'este día'}</b><span class="leyenda"><i class="l1"></i>kcal <i class="l2"></i>proteína</span></div>${caja('G', tG)}${caja('P', tP)}</div>
    ${consejosDia(pe, i)}
    ${L.COMIDAS.map(c => tarjetaComida(p, d, i, c, s, d.f === h && c === horaComida())).join('')}
    <div class="proponer"><div class="proponer-t">${I.chispas}Proponer otros</div><div class="botones">${L.COMIDAS.map(c => `<button class="chip" data-proponer="${c}">${COMIDA_EMO[c]} ${PLURAL_COMIDA[c]}</button>`).join('')}</div></div>`;
  $$('.dia-btn').forEach(b => b.addEventListener('click', () => { V.dia = b.dataset.f; vSemana(); }));
  $$('[data-acc]').forEach(b => b.addEventListener('click', () => abrirAcciones(p, i, b.dataset.acc, b.dataset.q || null)));
  $$('[data-proponer]').forEach(b => b.addEventListener('click', () => proponer(p, b.dataset.proponer)));
  $('#b-siguiente')?.addEventListener('click', siguienteSemana);
  activaLetreros();
  $('.dia-btn[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

function tarjetaComida(p, d, i, c, s, ahora) {
  const v = d[c], clave = d.f + '|' + c, hecho = !!s.hechos[clave];
  const mom = `<span class="momento">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}${ahora && !hecho ? '<span class="ahora-pill">AHORA</span>' : ''}${hecho ? '<span class="hecho-pill">✓ comido</span>' : ''}</span>`;
  const cls = `tarjeta comida c-${c}${hecho ? ' hecha' : ''}${ahora && !hecho ? ' ahora' : ''}`;
  if (v && v.fuera) return `<button class="${cls} fuera" data-acc="${c}"><span class="tile">🍽️</span><span class="cuerpo">${mom}<span class="nombre">Coméis fuera</span></span><span class="flecha">›</span></button>`;
  if (L.esDoble(v)) {
    const fila = q => { const r = recetas[v[q]]; const m = r ? L.macrosReceta(r, q, D.productos, fac) : null;
      return `<button class="fila-doble" data-acc="${c}" data-q="${q}"><span class="avatar mini ${q.toLowerCase()}">${ini(q)}</span><span class="mini-tile">${r ? emojiReceta(r) : '➕'}</span>
        <span class="nombre-s">${r ? esc(r.n) : 'Sin plato'}</span>${m ? `<span class="pill ${q.toLowerCase()}">${r0(m.kcal)}</span>` : ''}<span class="flecha">›</span></button>`; };
    return `<div class="${cls} doble">${mom}${fila('G')}${fila('P')}</div>`;
  }
  const r = recetas[L.idDe(v)];
  if (!r) return `<button class="${cls} fuera" data-acc="${c}"><span class="tile">🏠</span><span class="cuerpo">${mom}<span class="nombre">${esc(v && v.libre ? v.libre : 'Sin plato')}</span></span><span class="flecha">›</span></button>`;
  const mg = L.macrosReceta(r, 'G', D.productos, fac), mp = L.macrosReceta(r, 'P', D.productos, fac);
  return `<button class="${cls}" data-acc="${c}"><span class="tile">${emojiReceta(r)}</span>
    <span class="cuerpo">${mom}<span class="nombre">${esc(r.n)}</span>
      <span class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span><span class="pill g">${ini('G')} ${r0(mg.kcal)}</span><span class="pill p">${ini('P')} ${r0(mp.kcal)}</span>${r.propia ? '<span class="pill">⭐</span>' : ''}</span></span>
    <span class="flecha">›</span></button>`;
}

// Al tocar una comida: qué se puede hacer con ella, con botones grandes y claros.
function abrirAcciones(p, i, c, q) {
  const pe = efectivo(p), d = pe.dias[i], v = d[c], s = est(p.id), clave = d.f + '|' + c, hecho = !!s.hechos[clave];
  const dia = `${capital(DL[fecha(d.f).getDay()])} ${fecha(d.f).getDate()}`;
  const rid = q ? L.recetaDe(v, q) : L.idDe(v), r = recetas[rid];
  const quien = q ? `<span class="avatar mini ${q.toLowerCase()}">${ini(q)}</span> ${esc(NOM[q])} · ` : '';
  const btn = (id, emo, txt, cls = '') => `<button class="accion ${cls}" id="${id}"><span class="emo">${emo}</span>${txt}</button>`;
  let botones = '';
  if (v && v.fuera) botones = btn('a-cambiar', '🔄', 'Poner un plato') + btn('a-fuera', '↩️', 'No comemos fuera');
  else if (!r) botones = btn('a-cambiar', '🔄', 'Poner un plato') + btn('a-fuera', '🍽️', 'Comemos fuera');
  else botones = btn('a-ver', '📖', 'Receta', 'primaria') + btn('a-hecho', hecho ? '↩️' : '✅', hecho ? 'Desmarcar' : 'Ya comido') + btn('a-cambiar', '🔄', 'Cambiar') + btn('a-fuera', '🍽️', 'Comemos fuera');
  hoja(`<div class="acciones-cab c-${c}"><span class="emo">${r ? emojiReceta(r) : v && v.fuera ? '🍽️' : '🏠'}</span><div><div class="nota">${quien}${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]} · ${dia}</div>
      <h2>${r ? esc(r.n) : v && v.fuera ? 'Coméis fuera' : 'Sin plato'}</h2></div></div>
    <div class="acciones-grid">${botones}</div>`, h => {
    $('#a-ver', h)?.addEventListener('click', () => abrirReceta(r.id, { plan: p.id, f: d.f, c, q }));
    $('#a-hecho', h)?.addEventListener('click', () => { cierraHoja(); alternaHecho(p, d.f, c); });
    $('#a-cambiar', h)?.addEventListener('click', () => abrirCambiar(p, i, c, q));
    $('#a-fuera', h)?.addEventListener('click', () => { cierraHoja(); alternaFuera(p, d.f, c); });
  });
}

// Consejos de congelador: lo fresco que se usa a partir del cuarto día, al congelador al llegar; y la noche antes, sacarlo.
const PROTE_FRESCA = ['Carne', 'Marisco y pescado'];
function usosPorProducto(pe) {
  const usos = {};
  pe.dias.forEach((d, i) => L.COMIDAS.forEach(c => {
    for (const id of L.idsDe(d[c])) { const r = recetas[id]; if (r) for (const ing of r.ing) (usos[ing[0]] ||= []).push({ i, f: d.f, c, r }); }
  }));
  return usos;
}
const PESCADO_CONGELADO = /salm|merluza/i;   // viene congelado y hay que descongelarlo en la nevera (las gambas, no)
function consejosDia(pe, i) {
  const usos = usosPorProducto(pe), partes = [];
  const fresca = k => PROTE_FRESCA.includes(D.productos[k]?.cat);
  const nombre = k => nombreCorto(D.productos[k]).toLowerCase().replace(/^filetes? (de )?/, '').replace(/\b(deshuesad[oa]s?|y sin piel|sin piel|corte fino|para plancha|limpi[oa]s?|congelad[oa]s?|lomos de)\b/g, '').replace(/\s+/g, ' ').trim();
  if (i === 0) {
    const cong = Object.entries(usos).filter(([k, u]) => fresca(k) && u.some(v => v.i >= 3)).map(([k]) => nombre(k));
    if (cong.length) partes.push(letrero('cong:' + pe.dias[0].f, '❄️', `<b>Al congelador:</b> ${esc(cong.join(', '))}`, 'hielo'));
  }
  if (pe.dias[i + 1]) {
    const sacar = Object.entries(usos).filter(([k, u]) => u.some(v => v.i === i + 1) &&
      ((D.productos[k].cat === 'Congelados' && PESCADO_CONGELADO.test(D.productos[k].n)) || (fresca(k) && i + 1 >= 3))).map(([k]) => nombre(k));
    if (sacar.length) partes.push(letrero('noche:' + pe.dias[i].f, '🌙', `<b>Esta noche, a la nevera:</b> ${esc(sacar.join(' y '))}`, 'hielo'));
  }
  return partes.join('');
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
    if (!E.consumidos[ck]) { E.consumidos[ck] = 1; descuentaHueco(efectivo(p).dias.find(d => d.f === f)[c]); }
    tostada('✅ ¡Comido! Descontado de «En casa»');
  }
  salva(); vSemana();
}
// Proponer otros platos de un tipo (desayunos, comidas…) para el resto de la semana, con opción de deshacer.
function proponer(p, comida) {
  const s = est(p.id), pe = efectivo(p), h = hoy(), antes = JSON.stringify(s.cambios);
  const desde = h > pe.dias[0].f ? h : null;
  const nuevo = L.proponerSemana(pe, recetas, D.productos, fac, obj.G, Date.now(), comida, desde);
  for (const d of nuevo.dias) {
    if (desde && d.f < desde) continue;
    const orig = pe.dias.find(x => x.f === d.f)[comida];
    if (orig === null || typeof orig === 'string' || L.esDoble(orig)) s.cambios[d.f + '|' + comida] = d[comida];
  }
  salva(); vSemana();
  conDeshacer(`✨ ${PLURAL_COMIDA[comida]} nuevos`, () => { s.cambios = JSON.parse(antes); salva(); vSemana(); });
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

function filaReceta(r, q = null) {
  const g = L.macrosReceta(r, 'G', D.productos, fac), p = L.macrosReceta(r, 'P', D.productos, fac);
  const kc = q ? `<span class="pill ${q.toLowerCase()}">${ini(q)} ${r0((q === 'G' ? g : p).kcal)}</span>` : `<span class="pill g">${ini('G')} ${r0(g.kcal)}</span><span class="pill p">${ini('P')} ${r0(p.kcal)}</span>`;
  return `<button class="alternativa" data-id="${r.id}"><span class="emo">${emojiReceta(r)}</span><span style="min-width:0"><span class="nombre" style="display:block">${esc(r.n)}</span>
    <span class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span>${kc}${r.propia ? '<span class="pill">⭐</span>' : ''}</span></span></button>`;
}
function abrirCambiar(p, i, c, q) {
  const pe = efectivo(p), d = pe.dias[i], v = d[c];
  const doble = L.DOBLES.includes(c) && !(v && v.fuera);
  const persona = q || (doble ? 'G' : null);
  const alts = L.alternativas(pe, i, c, recetas, D.productos, fac, obj.G, 8, Date.now(), persona);
  hoja(`<h2>${COMIDA_EMO[c]} Cambiar ${L.NOMBRE_COMIDA[c].toLowerCase()}</h2><div class="nota">${persona ? `Para ${esc(NOM[persona])} · ` : ''}${capital(DL[fecha(d.f).getDay()])} ${fecha(d.f).getDate()}</div>
    ${alts.map(r => filaReceta(r, persona)).join('')}`, h => {
    $$('[data-id]', h).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id, s = est(p.id), k = d.f + '|' + c;
      if (persona) { const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[persona] = id; s.cambios[k] = base; }
      else s.cambios[k] = id;
      salva(); cierraHoja(); vSemana(); tostada('🔄 Plato cambiado');
    }));
  });
}

// ——— Receta ———
function abrirReceta(id, ctx) {
  const r = recetas[id];
  if (!r) return;
  const solo = ctx?.q || null;   // en los desayunos y meriendas de cada uno, solo su ración
  const quienes = solo ? [solo] : L.QUIEN;
  const mac = Object.fromEntries(quienes.map(q => [q, L.macrosReceta(r, q, D.productos, fac)]));
  const filas = r.ing.map(ing => {
    const x = D.productos[ing[0]];
    return `<div class="ing-fila${solo ? ' una' : ''}"><span>${esc(nombreCorto(x))}</span>${quienes.map(q => { const g = L.gramos(ing, q, fac); return `<span class="c persona-${q.toLowerCase()}">${g ? esc(L.cantidadTexto(ing[0], g, D.productos)) : '—'}</span>`; }).join('')}</div>`;
  }).join('') + [...(r.otros || []), ...(r.basicos || [])].map(t => `<div class="ing-fila${solo ? ' una' : ''}"><span class="otro">${esc(t)}</span>${quienes.map(() => '<span class="c">·</span>').join('')}</div>`).join('');
  const m = (q, x) => {
    const o = obj[q], color = q === 'G' ? 'var(--persona-g)' : 'var(--persona-p)';
    const bm = (e, v, max) => `<div class="bm"><span>${e}</span>${miniBarra(v / max * 100, color)}<span>${r0(v)} g</span></div>`;
    return `<div class="m ${q.toLowerCase()}"><b class="persona-${q.toLowerCase()}">${esc(NOM[q])}</b><span class="k">${r0(x.kcal)} <small style="font-size:13px">kcal</small></span>
      <div class="barras">${bm('💪', x.p, o.prot * 0.4)}${bm('🍞', x.hc, o.hc * 0.4)}${bm('🥑', x.g, o.grasa * 0.4)}</div></div>`;
  };
  const plan = planActivo();
  const tipoPrincipal = r.tipo?.[0] || 'comida';
  hoja(`<div class="portada-hoja c-${tipoPrincipal}"><span class="emo">${emojiReceta(r)}</span><div><h2>${esc(r.n)}</h2>
      <div class="botones" style="margin-top:8px"><span class="pill verde">${APARATO_EMO[r.ap] || '🍴'} ${APARATO[r.ap] || 'Cocina'}</span><span class="pill">⏱ ${r.min}′</span>${r.propia ? '<span class="pill">⭐ vuestra</span>' : ''}</div></div></div>
    <div class="macros${solo ? ' una' : ''}">${quienes.map(q => m(q, mac[q])).join('')}</div>
    <h3>🥕 Ingredientes</h3>
    <div class="ing-lista"><div class="ing-fila cab${solo ? ' una' : ''}"><span>Ingrediente</span>${quienes.map(q => `<span class="c persona-${q.toLowerCase()}">${esc(NOM[q])}</span>`).join('')}</div>${filas}</div>
    <h3>👩‍🍳 Cómo se hace</h3><ol class="pasos">${r.pasos.map(x => `<li><span>${esc(x)}</span></li>`).join('') || '<li><span>Sin pasos apuntados.</span></li>'}</ol>
    ${r.nota ? `<div class="aviso"><span class="emo">💡</span><div>${esc(r.nota)}</div></div>` : ''}
    <div class="botones" style="margin-top:14px"><button class="boton suave" id="b-a-lista">${I.carro}A la lista</button>
      ${r.propia ? `<button class="boton" id="b-editar">${I.lapiz}Editar</button><button class="boton" id="b-claude-receta">${I.enviar}A Claude</button><button class="boton peligro" id="b-borrar-receta" aria-label="Borrar">${I.papelera}</button>` : ''}</div>
    ${ctx ? '' : `<h3>${I.calendario} Ponerla en el menú</h3><div class="botones">
      <select id="s-dia" class="boton">${plan.dias.map(d => `<option value="${d.f}">${DS[fecha(d.f).getDay()]} ${fecha(d.f).getDate()}</option>`).join('')}</select>
      <select id="s-com" class="boton">${(r.tipo || L.COMIDAS).map(c => `<option value="${c}">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}</option>`).join('')}</select>
      <select id="s-quien" class="boton"><option value="">👫 Los dos</option><option value="G">${esc(NOM.G)}</option><option value="P">${esc(NOM.P)}</option></select>
      <button class="boton principal" id="b-poner">Poner</button></div>`}`, h => {
    $('#b-poner', h)?.addEventListener('click', () => {
      const f = $('#s-dia', h).value, c = $('#s-com', h).value, q = $('#s-quien', h).value, s = est(plan.id), k = f + '|' + c;
      if (q) { const v = efectivo(plan).dias.find(d => d.f === f)[c]; const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[q] = r.id; s.cambios[k] = base; }
      else s.cambios[k] = r.id;
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
  hoja(`<h2>🛒 ${esc(r.n)}</h2><div class="nota">¿Para quién?</div>
    <div class="acciones-grid" style="margin-top:12px">
      <button class="accion primaria" data-quien="GP"><span class="emo">👫</span>Los dos</button>
      <button class="accion" data-quien="G"><span class="avatar mini g">${ini('G')}</span>${esc(NOM.G)}</button>
      <button class="accion" data-quien="P"><span class="avatar mini p">${ini('P')}</span>${esc(NOM.P)}</button></div>`, h => {
    $$('[data-quien]', h).forEach(b => b.addEventListener('click', () => {
      est(planActivo().id).recetasLista.push({ id: uid(), r: r.id, quien: b.dataset.quien });
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
    <button class="nueva-receta" id="b-crear"><span class="emo">✍️</span><span><b>Crear una nueva</b></span></button>
    <div class="buscador">${I.buscar}<input id="i-busca-r" type="search" placeholder="Buscar receta…" autocomplete="off"></div>
    <div id="lista-recetas"></div>`, h => {
    pintaLista(h, '');
    $('#i-busca-r', h).addEventListener('input', e => pintaLista(h, e.target.value));
    $('#b-crear', h).addEventListener('click', () => editorReceta(null, true));
  });
}

// ——— Vuestras recetas, escritas ———
function editorReceta(r, aLaLista = false, inicial = {}) {
  const nueva = !r;
  const v = { n: r?.n || inicial.n || '', ing: r?.txt?.ing || inicial.ing || '', pasos: r?.txt?.pasos || inicial.pasos || '',
    tipo: r?.tipo || ['comida', 'cena'], ap: r?.ap || 'airfryer', min: r?.min || 20 };
  hoja(`<h2>${nueva ? '✍️ Nueva receta' : '✏️ Editar receta'}</h2>
    <div class="nota">Cantidades para una ración (${esc(NOM.G)}); la de ${esc(NOM.P)} sale sola.</div>
    <h3>📛 Nombre</h3><input class="campo-texto" id="r-nombre" placeholder="Pollo con ñoquis" value="${esc(v.n)}">
    <h3>🥕 Ingredientes</h3><textarea class="campo-texto" id="r-ing" placeholder="150 g de pechuga de pollo&#10;125 g de ñoquis&#10;100 g de tomate cherry&#10;1 cucharadita de aceite">${esc(v.ing)}</textarea>
    <div class="reconocidos" id="r-reco"></div>
    <h3>👩‍🍳 Cómo se hace</h3><textarea class="campo-texto" id="r-pasos" placeholder="Pollo en dados con sal. Air fryer 180 °C, 12 minutos…">${esc(v.pasos)}</textarea>
    <h3>🕐 ¿Cuándo?</h3><div class="botones" id="r-tipo">${L.COMIDAS.map(c => `<button type="button" class="chip" data-tipo="${c}" aria-pressed="${v.tipo.includes(c)}">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}</button>`).join('')}</div>
    <h3>🍳 ¿Con qué?</h3><div class="botones" id="r-ap">${['airfryer', 'plancha', 'micro', 'sin'].map(a => `<button type="button" class="chip" data-ap="${a}" aria-pressed="${v.ap === a}">${APARATO_EMO[a]} ${APARATO[a]}</button>`).join('')}
      <label class="chip">⏱ <input id="r-min" type="number" inputmode="numeric" value="${v.min}" style="width:42px;border:0;background:none;font-weight:800;padding:0"> min</label></div>
    <button class="boton principal ancho" id="r-guardar" style="margin-top:18px">💾 Guardar receta</button>`, h => {
    const reco = () => {
      const x = L.interpretaReceta($('#r-ing', h).value, '', D.productos);
      $('#r-reco', h).innerHTML = x.detalle.map(d => d.k
        ? `<span class="pill bueno">✓ ${esc(nombreCorto(D.productos[d.k]))} · ${r0(d.g)} g${d.aprox ? ' ≈' : ''}</span>`
        : d.basico ? `<span class="pill">🏠 ${esc(d.texto)}</span>` : `<span class="pill regular">＋ ${esc(d.texto)}</span>`).join('');
    };
    reco();
    $('#r-ing', h).addEventListener('input', reco);
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

// ——— Buscador de Mercadona (el mismo que usa su web) ———
const ALGOLIA = 'https://7uzjkl1dj0-dsn.algolia.net/1/indexes/products_prod_mad1_es/query?x-algolia-application-id=7UZJKL1DJ0&x-algolia-api-key=9d8f2e39e90df472b4f2e559a116fe17';
const cacheMerca = new Map();
const tamano = pi => !pi ? '' : pi.size_format === 'kg' && pi.unit_size ? `${r0(pi.unit_size * 1000)} g` : pi.size_format === 'l' && pi.unit_size ? `${r0(pi.unit_size * 1000)} ml`
  : pi.total_units ? `${pi.total_units} ${pi.unit_name || 'uds'}` : '';
async function buscaMercadona(q, n = 6) {
  const k = L.normaliza(q) + '|' + n;
  if (cacheMerca.has(k)) return cacheMerca.get(k);
  const r = await fetch(ALGOLIA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ params: 'query=' + encodeURIComponent(q) + '&hitsPerPage=' + n }) });
  if (!r.ok) throw new Error('Mercadona no responde');
  const j = await r.json();
  const idaK = Object.fromEntries(Object.entries(D.productos).filter(([, x]) => x.id).map(([kk, x]) => [String(x.id), kk]));
  const res = (j.hits || []).filter(h => h.published !== false).map(h => ({ id: String(h.id), n: h.display_name, foto: (h.thumbnail || '').replace('h=300&w=300', 'h=160&w=160'),
    precio: parseFloat(h.price_instructions?.unit_price) || 0, env: [h.packaging, tamano(h.price_instructions)].filter(Boolean).join(' '),
    cat: h.categories?.[0]?.name || 'Otros', k: idaK[String(h.id)] || null }));
  cacheMerca.set(k, res);
  return res;
}
// «quiero papel higiénico» → «papel higiénico»
const limpiaPeticion = t => t.trim().replace(/^[¿¡\s]+/, '').replace(/^(quiero|queremos|necesito|necesitamos|añade|añadir|apunta|pon|compra|comprar|me hace falta|hace falta|falta|faltan)\s+/i, '')
  .replace(/^(un|una|unos|unas|el|la|los|las)\s+/i, '').replace(/[.?!]+$/, '').trim();

// ——— Compra ———
const BASICOS = /^(sal|agua|hielo|pimienta|pimienta negra|sal y pimienta|cilantro|perejil|albahaca|oregano|pimenton|canela|comino)$/;
const ordenSeccion = n => { const i = SECCIONES.indexOf(n); if (i >= 0) return i; const j = (E.secciones || []).findIndex(s => s.n === n); return j >= 0 ? 60 + j : 99; };
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
  for (const d of pe.dias) { if (desde && d.f < desde) continue; for (const c of L.COMIDAS) for (const id of L.idsDe(d[c])) { const r = recetas[id]; if (r?.otros) sumaOtros(r, r.n); } }
  const { filas, despensa, total } = L.listaCompra(nec, D.productos, E.casa || {});
  const vistas = filas.filter(f => !s.quitados[f.k]).map(f => ({ ...f, clave: f.k, fijo: E.fijos.some(x => x.k === f.k) }));
  for (const k of Object.keys(s.faltaDespensa)) if (s.faltaDespensa[k] && D.productos[k]) vistas.push({ k, clave: k, envases: 1, precio: D.productos[k].precio, despensa: true });
  for (const x of s.extra) {
    const enLista = x.k && vistas.find(v => v.k === x.k);
    if (enLista) { enLista.envases += x.n || 1; enLista.precio += (x.n || 1) * D.productos[x.k].precio; (enLista.extras ||= []).push(x.id); enLista.manual = true; continue; }
    if (x.k) vistas.push({ k: x.k, clave: 'x:' + x.id, envases: x.n || 1, precio: (x.n || 1) * D.productos[x.k].precio, extra: x.id, manual: true });
    else if (x.m) vistas.push({ k: null, m: x.m, clave: 'x:' + x.id, envases: x.n || 1, precio: (x.n || 1) * (x.m.precio || 0), extra: x.id, manual: true, nivel: x.v });
    else vistas.push({ k: null, clave: 'x:' + x.id, texto: x.texto, n: x.n, extra: x.id, manual: true, nivel: x.v, img: x.img, sec: x.sec });
  }
  for (const f of E.fijos) if (!f.k && !s.fijosHechos['f:' + f.texto]) vistas.push({ k: null, clave: 'f:' + f.texto, texto: f.texto, fijo: true });
  for (const [kk, o] of otros) vistas.push({ k: null, clave: kk, texto: o.texto, otro: true, para: o.para });
  for (const v of vistas) v.seccion = v.k ? D.productos[v.k].cat : v.m ? v.m.cat : v.sec || 'Otros';
  vistas.sort((a, b) => (ordenSeccion(a.seccion) - ordenSeccion(b.seccion)) || nombreFila(a).localeCompare(nombreFila(b), 'es'));
  const quitar = Object.keys(s.quitados).filter(k => s.quitados[k]);
  return { p, s, filas: vistas, despensa: despensa.filter(f => !s.faltaDespensa[f.k]), total: vistas.reduce((t, f) => t + (f.precio || 0), 0), totalMenu: total, quitados: quitar };
}
const nombreFila = f => f.k ? nombreCorto(D.productos[f.k]) : f.m ? f.m.n : f.texto;
const nivelDe = f => f.k ? L.veredicto(L.nutrientesDe(D.productos[f.k])).nivel : f.nivel || null;
const pillNivel = n => n ? `<span class="pill ${n}">${L.NIVEL[n].e}</span>` : '';

function vCompra() {
  const { p, s, filas, despensa, total, quitados } = lineaCompra();
  const si = filas.filter(f => s.marcados[f.clave]).length, no = filas.filter(f => s.noComprado[f.clave]).length;
  cabecera('Compra', `Mercadona · ${filas.length} productos`);
  let sec = '', html = '';
  const cuenta = {};
  for (const f of filas) cuenta[f.seccion] = (cuenta[f.seccion] || 0) + 1;
  for (const f of filas) {
    const x = f.k ? D.productos[f.k] : null;
    if (f.seccion !== sec) { if (sec) html += '</div>'; sec = f.seccion; html += `<div class="cat"><span class="emo">${emojiSeccion(sec)}</span>${esc(sec)}<span class="num">${cuenta[sec]}</span></div><div class="lista">`; }
    const estado = s.marcados[f.clave] ? 'si' : s.noComprado[f.clave] ? 'no' : '';
    const foto = x && x.foto ? x.foto : f.m ? f.m.foto : f.img;
    const etiquetas = [f.fijo ? '<span class="pill">⭐</span>' : '', f.despensa ? '<span class="pill">🫙</span>' : '', f.otro ? `<span class="pill">📝 ${esc(f.para)}</span>` : '', f.manual ? pillNivel(nivelDe(f)) : ''].join('');
    const cant = x ? L.cantidadCompra(f, D.productos) : f.m ? `${f.envases > 1 ? f.envases + ' × ' : ''}${f.m.env}` : f.n && f.n !== 1 ? String(f.n) : '';
    html += `<div class="producto ${estado}" data-clave="${esc(f.clave)}">
      ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy" width="50" height="50"${f.img ? ' style="object-fit:contain"' : ''}>` : `<div class="sinfoto">${f.otro ? '📝' : emojiSeccion(f.seccion)}</div>`}
      <button class="info" data-info="${esc(f.clave)}"><div class="pn">${esc(nombreFila(f))}</div><div class="pc">${esc(cant)}${etiquetas}</div></button>
      <div class="pp">${f.precio ? euros(f.precio) : ''}</div>
      <div class="sino"><button class="b-si" data-si="${esc(f.clave)}" aria-pressed="${estado === 'si'}" aria-label="Comprado">${SVG.check}</button><button class="b-no" data-no="${esc(f.clave)}" aria-pressed="${estado === 'no'}" aria-label="No lo hemos comprado">${SVG.equis}</button></div></div>`;
  }
  if (sec) html += '</div>';
  const noFilas = filas.filter(f => s.noComprado[f.clave] && s.alternativas[f.clave]?.estado !== 'nada' && s.alternativas[f.clave]?.estado !== 'aceptada');
  const recetasLista = s.recetasLista.map(x => recetas[x.r] ? `<button class="chip" data-quitar-receta="${x.id}">${emojiReceta(recetas[x.r])} ${esc(recetas[x.r].n)} ✕</button>` : '').join('');
  const seccionesLista = [...new Set(filas.map(f => f.seccion))];
  $('#vista').innerHTML = `
    <div class="hero"><div><div class="grande">${euros(total)}</div><div class="sub">✓ ${si} · ✕ ${no} · faltan ${filas.length - si - no}</div></div>${anillo(filas.length ? (si + no) / filas.length : 0, '#fff', `${si}/${filas.length}`, 'comprados', 78)}</div>
    <div class="rapidas">
      <button class="rapida" id="b-ir-anadir"><span class="emo">➕</span>Añadir</button>
      <button class="rapida" id="b-receta-lista"><span class="emo">🍲</span>Receta</button>
      <button class="rapida" id="b-escanear"><span class="emo">🔎</span>¿Es bueno?</button>
      <button class="rapida" id="b-compartir"><span class="emo">📤</span>Enviar</button>
    </div>
    ${letrero('ticket', '🧾', '<b>En caja:</b> pedid el ticket digital')}
    ${recetasLista ? `<div class="cat"><span class="emo">🍲</span>Recetas añadidas</div><div class="chips-despensa">${recetasLista}</div>` : ''}
    ${html || '<div class="vacio"><span class="emo">🎉</span>No falta nada para el menú.</div>'}
    ${noFilas.length ? `<div class="cat"><span class="emo">🔁</span>No lo había: ¿otra cosa?</div><div id="alternativas">${noFilas.map(f => `<div class="tarjeta alt-prop" data-alt="${esc(f.clave)}"><div class="nota">✕ ${esc(nombreFila(f))}</div><div class="alt-cuerpo"><div class="cargando"></div></div></div>`).join('')}</div>` : ''}
    <div class="tarjeta anadir-mas" id="anadir-mas">
      <h3 style="margin-top:0">➕ ¿Añadir algo más?</h3>
      <form class="anadir" id="f-anadir"><div class="caja"><input id="i-anadir" placeholder="Escribe: papel higiénico, yuca…" autocomplete="off" enterkeyhint="search">
        <button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
      <div id="resultados"></div>
      <button class="boton suave ancho" id="b-escanear-2" style="margin-top:8px">🔎 ¿Es bueno? Foto del código</button>
    </div>
    ${despensa.length ? `<div class="cat"><span class="emo">🫙</span>¿Os queda?</div><div class="chips-despensa">${despensa.map(f => `<button class="chip" data-falta="${f.k}">${esc(nombreCorto(D.productos[f.k]))}</button>`).join('')}</div>` : ''}
    ${quitados.length ? `<div class="cat"><span class="emo">↩️</span>Quitados</div><div class="chips-despensa">${quitados.map(k => `<button class="chip" data-volver="${k}">${esc(nombreCorto(D.productos[k] || { n: k }))} ↺</button>`).join('')}</div>` : ''}
    <button class="boton principal ancho" id="b-a-casa" style="margin-top:20px"${si ? '' : ' disabled'}>${I.caja}Terminar: lo comprado a «En casa»</button>
    <div class="botones" style="margin:10px 0 18px;justify-content:center">
      <label class="boton" for="i-foto">📷 Foto del ticket a Claude</label><input id="i-foto" type="file" accept="image/*" class="sr">
    </div>`;
  activaLetreros();
  const marca = (k, cual) => {
    if (cual === 'si') { s.marcados[k] = !s.marcados[k]; if (s.marcados[k]) delete s.noComprado[k]; }
    else { s.noComprado[k] = !s.noComprado[k]; if (s.noComprado[k]) delete s.marcados[k]; else delete s.alternativas[k]; }
    salva(); const y = window.scrollY; vCompra(); window.scrollTo(0, y);
    $(`[data-${cual}="${CSS.escape(k)}"]`)?.classList.add('pop');
  };
  $$('[data-si]').forEach(b => b.addEventListener('click', () => marca(b.dataset.si, 'si')));
  $$('[data-no]').forEach(b => b.addEventListener('click', () => marca(b.dataset.no, 'no')));
  $$('[data-info]').forEach(b => b.addEventListener('click', () => infoProducto(b.dataset.info, filas.find(f => f.clave === b.dataset.info))));
  $$('[data-falta]').forEach(b => b.addEventListener('click', () => { s.faltaDespensa[b.dataset.falta] = true; salva(); vCompra(); tostada('Añadido a la lista'); }));
  $$('[data-volver]').forEach(b => b.addEventListener('click', () => { delete s.quitados[b.dataset.volver]; salva(); vCompra(); }));
  $$('[data-quitar-receta]').forEach(b => b.addEventListener('click', () => { s.recetasLista = s.recetasLista.filter(x => x.id !== b.dataset.quitarReceta); salva(); vCompra(); }));
  $('#b-ir-anadir').addEventListener('click', () => { $('#anadir-mas').scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => $('#i-anadir').focus(), 350); });
  $('#b-receta-lista').addEventListener('click', elegirRecetaParaLista);
  $('#b-escanear').addEventListener('click', abrirEscaner);
  $('#b-escanear-2').addEventListener('click', abrirEscaner);
  $('#b-a-casa').addEventListener('click', () => terminarCompra(filas));
  $('#b-compartir').addEventListener('click', () => compartirLista(filas));
  $('#i-foto').addEventListener('change', e => mandarFoto(e.target.files[0]));
  // Añadir: se busca en Mercadona mientras escribes y se elige el producto.
  let tBusca;
  $('#i-anadir').addEventListener('input', e => { clearTimeout(tBusca); tBusca = setTimeout(() => buscaParaAnadir(e.target.value, seccionesLista), 380); });
  $('#f-anadir').addEventListener('submit', e => { e.preventDefault(); clearTimeout(tBusca); buscaParaAnadir($('#i-anadir').value, seccionesLista, true); });
  // Alternativas para lo que no había
  for (const f of noFilas) pintaAlternativa(f, s);
}

async function buscaParaAnadir(texto, seccionesLista, enviado = false) {
  const caja = $('#resultados'); if (!caja) return;
  const t = limpiaPeticion(texto || '');
  if (t.length < 2) { caja.innerHTML = ''; return; }
  const o = L.interpretar(texto, D.productos);
  if (enviado && ['quitar', 'casa', 'comprado'].includes(o.accion)) { ejecuta(texto); return; }
  const varios = L.separa(t).filter(x => x.length > 1);
  if (varios.length > 1) {
    caja.innerHTML = `<div class="nota" style="margin:8px 2px">${varios.length} cosas: ${varios.map(esc).join(' · ')}</div><button class="boton principal ancho" id="b-anadir-varios">➕ Añadir las ${varios.length}</button>`;
    $('#b-anadir-varios').addEventListener('click', async () => {
      const items = [];
      for (const v of varios) {
        const b = L.buscaProducto(v, D.productos);
        if (b && b.k) { items.push({ ...b, original: v }); continue; }
        try { const h = (await buscaMercadona(limpiaPeticion(v), 1))[0]; items.push(h ? (h.k ? { k: h.k, n: b?.n } : { m: h }) : { texto: capital(v) }); } catch { items.push({ texto: capital(v) }); }
      }
      anadeALista(items); vCompra();
    });
    return;
  }
  caja.innerHTML = '<div class="cargando"></div><div class="cargando" style="width:70%"></div>';
  let hits = [];
  try { hits = await buscaMercadona(t, 6); } catch { caja.innerHTML = '<div class="nota" style="margin:8px 2px">📡 Sin conexión con Mercadona.</div>'; }
  if ($('#i-anadir') && limpiaPeticion($('#i-anadir').value) !== t) return;   // ya ha escrito otra cosa
  const local = L.buscaProducto(t, D.productos);
  if (local?.k && !hits.some(h => h.k === local.k)) { const x = D.productos[local.k]; hits.unshift({ id: String(x.id), n: x.n, foto: x.foto, precio: x.precio, env: x.env, cat: x.cat, k: local.k }); }
  const secs = [...new Set([...seccionesLista.filter(n => n !== 'Otros'), ...(E.secciones || []).map(s => s.n)])];
  caja.innerHTML = `${hits.slice(0, 6).map((h, i) => `<button class="res" data-res="${i}">${h.foto ? `<img src="${esc(h.foto)}" alt="" loading="lazy">` : `<span class="sinfoto">${emojiSeccion(h.cat)}</span>`}
      <span class="res-t"><b>${esc(h.n)}</b><span class="nota">${esc(h.env)} · ${emojiSeccion(h.cat)} ${esc(h.cat)}</span></span>
      ${h.k ? pillNivel(L.veredicto(L.nutrientesDe(D.productos[h.k])).nivel) : ''}<span class="res-p">${h.precio ? euros(h.precio) : ''}</span><span class="icono mas">${SVG.mas.replace('<svg', '<svg class="i"')}</span></button>`).join('')}
    <div class="nota" style="margin:10px 2px 6px">¿No es ninguno? Añadir «${esc(capital(t))}» en:</div>
    <div class="chips-despensa">${secs.map(n => `<button class="chip" data-sec="${esc(n)}">${emojiSeccion(n)} ${esc(n)}</button>`).join('')}<button class="chip" data-sec-nueva="1">＋ Nueva sección</button></div>`;
  $$('[data-res]', caja).forEach(b => b.addEventListener('click', () => { const h = hits[+b.dataset.res]; anadeALista([h.k ? { k: h.k } : { m: h }]); vCompra(); }));
  $$('[data-sec]', caja).forEach(b => b.addEventListener('click', () => { anadeALista([{ texto: capital(t), sec: b.dataset.sec }]); vCompra(); }));
  $('[data-sec-nueva]', caja)?.addEventListener('click', () => {
    const n = (prompt('Nombre de la sección nueva (por ejemplo: Farmacia):') || '').trim();
    if (!n) return;
    const e = (prompt('Un emoji para ella (opcional):', '🏷️') || '🏷️').trim().slice(0, 4);
    if (!E.secciones.some(s => s.n === n)) E.secciones.push({ n, e });
    anadeALista([{ texto: capital(t), sec: n }]); vCompra();
  });
}

// Lo que se marca con ✕: se propone otra cosa de Mercadona; se acepta, se pide otra o nada.
async function pintaAlternativa(f, s) {
  const el = $(`[data-alt="${CSS.escape(f.clave)}"] .alt-cuerpo`); if (!el) return;
  const base = (f.k ? nombreCorto(D.productos[f.k]) : f.m ? f.m.n : f.texto).replace(/ Hacendado|Hacendado /g, '');
  const evitar = f.k ? String(D.productos[f.k].id) : f.m ? f.m.id : null;
  let hits = [];
  try {
    const pal = base.split(' ');
    for (const n of [4, 2, 1]) { hits = (await buscaMercadona(pal.slice(0, n).join(' '), 10)).filter(h => h.id !== evitar); if (hits.length) break; }
  } catch { el.innerHTML = '<div class="nota">📡 Sin conexión.</div>'; return; }
  const st = s.alternativas[f.clave] ||= { i: 0 };
  const h = hits[st.i % Math.max(1, hits.length)];
  if (!h) { el.innerHTML = '<div class="nota">No encuentro nada parecido.</div><div class="botones"><button class="chip" data-alt-nada>✕ Vale</button></div>'; }
  else el.innerHTML = `<div class="res sin-borde">${h.foto ? `<img src="${esc(h.foto)}" alt="">` : ''}<span class="res-t"><b>${esc(h.n)}</b><span class="nota">${esc(h.env)}</span></span><span class="res-p">${h.precio ? euros(h.precio) : ''}</span></div>
    <div class="botones"><button class="chip si" data-alt-si>✓ Esta</button><button class="chip" data-alt-otra>↻ Otra</button><button class="chip" data-alt-nada>✕ Nada</button></div>`;
  el.querySelector('[data-alt-si]')?.addEventListener('click', () => { st.estado = 'aceptada'; anadeALista([h.k ? { k: h.k } : { m: h }]); vCompra(); });
  el.querySelector('[data-alt-otra]')?.addEventListener('click', () => { st.i++; salva(); pintaAlternativa(f, s); });
  el.querySelector('[data-alt-nada]')?.addEventListener('click', () => { st.estado = 'nada'; salva(); vCompra(); });
}

function infoProducto(clave, f) {
  const { p, s } = lineaCompra();
  const k = f && f.k, x = k && D.productos[k];
  const usos = k ? (usosPorProducto(efectivo(p))[k] || []) : [];
  const v = x ? L.veredicto(L.nutrientesDe(x)) : null;
  const foto = x?.foto || f.m?.foto || f.img;
  hoja(`<div class="producto-escaneado">${foto ? `<img src="${esc(foto)}" alt="">` : `<div class="sinfoto" style="width:64px;height:64px;border-radius:14px;display:grid;place-items:center;font-size:30px;background:var(--tarjeta-2)">${f.otro ? '📝' : emojiSeccion(f.seccion)}</div>`}<div><h2>${esc(nombreFila(f))}</h2>
      ${x ? `<div class="nota">${esc(x.env)} · ${euros(x.precio)}</div>` : f.m ? `<div class="nota">${esc(f.m.env)} · ${euros(f.m.precio)} · ${emojiSeccion(f.m.cat)} ${esc(f.m.cat)}</div>` : f.otro ? `<div class="nota">Para «${esc(f.para)}»</div>` : ''}</div></div>
    ${v ? semaforoHTML(v) : f.nivel ? `<div class="botones" style="margin-top:10px">${pillNivel(f.nivel)} ${L.NIVEL[f.nivel].t}</div>` : ''}
    ${x ? `${usos.length ? `<h3>${I.calendario} Para</h3><div class="botones">${usos.map(u => `<span class="pill">${COMIDA_EMO[u.c]} ${DS[fecha(u.f).getDay()]} ${fecha(u.f).getDate()} · ${esc(u.r.n)}</span>`).join('')}</div>` : ''}
      <div class="tabla-n"><div><b>${x.m[0]}</b><span>kcal</span></div><div><b>${x.m[1]} g</b><span>proteína</span></div><div><b>${x.m[2]} g</b><span>hidratos</span></div><div><b>${x.m[3]} g</b><span>grasa</span></div></div>` : ''}
    ${!x && !f.nivel && !f.otro && !NO_COMIDA.has(f.seccion) ? `<button class="boton suave" id="b-escanear-info" style="margin-top:10px">🔎 ¿Es bueno? Escanéalo</button>` : ''}
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
    if (!it || (!it.k && !it.texto && !it.m)) continue;
    if (it.k) delete s.quitados[it.k];
    const texto = it.k || it.m ? undefined : capital(it.original || it.texto);
    s.extra.push({ id: uid(), k: it.k || null, m: it.m || undefined, texto, sec: it.sec, n: it.n && (it.k || it.m) ? Math.max(1, Math.round(it.n)) : it.n || 1, v: it.v, img: it.img, ean: it.ean });
    const nv = it.k ? L.veredicto(L.nutrientesDe(D.productos[it.k])).nivel : it.v;
    nombres.push((nv ? L.NIVEL[nv].e + ' ' : '') + (it.k ? nombreCorto(D.productos[it.k]) : it.m ? it.m.n : texto));
  }
  salva();
  if (nombres.length) tostada('➕ ' + nombres.join(', '));
}

// Terminar la compra: lo marcado con ✓ pasa a «En casa»; lo marcado con ✕ sigue en la lista; queda un resumen para Claude.
function terminarCompra(filas) {
  const { s } = lineaCompra();
  const res = { f: new Date().toISOString(), si: [], no: [], extra: [] };
  for (const f of filas) {
    const n = nombreFila(f);
    if (s.marcados[f.clave]) { res.si.push(n); if (f.manual) res.extra.push(n); }
    else if (s.noComprado[f.clave]) res.no.push(n);
  }
  let n = 0;
  for (const f of filas) {
    if (!s.marcados[f.clave]) continue;
    if (f.k) { E.casa[f.k] = (E.casa[f.k] || 0) + f.envases * D.productos[f.k].util; n++; if (f.despensa) delete s.faltaDespensa[f.k]; }
    else if (f.m && !NO_COMIDA.has(f.m.cat)) { E.casaOtros = [...new Set([...E.casaOtros, f.m.n])]; }
    if (f.extra) s.extra = s.extra.filter(y => y.id !== f.extra);
    if (f.extras) s.extra = s.extra.filter(y => !f.extras.includes(y.id));
    if (f.fijo && !f.k) s.fijosHechos[f.clave] = true;
    if (f.otro) s.otrosHechos[f.clave] = true;
  }
  s.recetasLista = []; s.marcados = {}; s.noComprado = {}; s.alternativas = {}; s.compraHecha = true;
  E.compras = [res, ...E.compras].slice(0, 20); salva();
  hoja(`<h2>🧾 Compra terminada</h2>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${res.si.length}</b><span>comprados</span></div><div><b>✕ ${res.no.length}</b><span>no había</span></div><div><b>＋ ${res.extra.length}</b><span>extra</span></div></div>
    <p class="nota">${n} productos pasan a «En casa». Lo que no había sigue en la lista.</p>
    <button class="boton principal ancho" id="b-resumen-claude">${I.enviar}Mandar a Claude para compararlo con el ticket</button>
    <button class="boton ancho" id="b-ir-casa" style="margin-top:8px">${I.caja}Ver «En casa»</button>`, h => {
    $('#b-resumen-claude', h).addEventListener('click', () => mandarAClaude(`Compra del ${new Date().toLocaleDateString('es-ES')}.\nComprado (${res.si.length}): ${res.si.join(', ')}\nNo había (${res.no.length}): ${res.no.join(', ') || '—'}\nAñadido fuera del menú: ${res.extra.join(', ') || '—'}\nCompáralo con el ticket y ajusta el plan.`));
    $('#b-ir-casa', h).addEventListener('click', () => { cierraHoja(); location.hash = 'casa'; });
  });
  vCompra();
}

async function compartirLista(filas) {
  const { s } = lineaCompra();
  let sec = '', txt = 'Lista de la compra (Mercadona) · NutriHome\n';
  for (const f of filas) {
    if (s.marcados[f.clave] || s.noComprado[f.clave]) continue;
    if (f.seccion !== sec) { sec = f.seccion; txt += `\n${emojiSeccion(sec)} ${sec}\n`; }
    txt += `☐ ${nombreFila(f)}${f.k ? ` — ${L.cantidadCompra(f, D.productos)}` : f.m ? ` — ${f.m.env}` : ''}\n`;
  }
  try { if (navigator.share) { await navigator.share({ title: 'Lista de la compra', text: txt }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(txt); tostada('Lista copiada: pégala en WhatsApp'); } catch { tostada('No he podido compartirla'); }
}

async function mandarFoto(fichero) {
  if (!fichero) return;
  const texto = 'Para Claude: foto del ticket o de una lista. Compárala con la compra y métela en NutriHome.';
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichero] })) { await navigator.share({ files: [fichero], text: texto }); tostada('Elige Telegram y el chat con @' + (D.perfiles.bot || 'el bot')); return; }
  } catch { return; }
  hoja(`<h2>📷 Mandar la foto</h2><p>Este móvil no deja compartir fotos desde la app. Mándala al bot de Telegram <b>@${esc(D.perfiles.bot || '')}</b>.</p>
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
  // Primero la foto entera; si el código sale pequeño, por trozos que se solapan (centro y una rejilla de 3 × 3).
  const W = bmp.width, H = bmp.height, zonas = [[0, 0, 1, 1, true], [0.15, 0.15, 0.7, 0.7], [0.25, 0.25, 0.5, 0.5]];
  for (const y of [0, 0.25, 0.5]) for (const x of [0, 0.25, 0.5]) zonas.push([x, y, 0.5, 0.5]);
  const intenta = (sx, sy, sw, sh, giro, lado) => {
    const e = Math.min(2, lado / Math.max(sw, sh)), w = Math.round(sw * e), h = Math.round(sh * e);
    const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
    if (giro) { c.width = h; c.height = w; x.translate(h, 0); x.rotate(Math.PI / 2); } else { c.width = w; c.height = h; }
    x.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    const fuente = new Z.HTMLCanvasElementLuminanceSource(c);
    for (const B of [Z.HybridBinarizer, Z.GlobalHistogramBinarizer]) { try { return lector.decode(new Z.BinaryBitmap(new B(fuente))).getText(); } catch { /* siguiente */ } }
    return null;
  };
  for (const [zx, zy, zw, zh, entera] of zonas) for (const giro of entera ? [0, 90] : [0]) {
    const t = intenta(zx * W, zy * H, zw * W, zh * H, giro, entera ? 1400 : 1100);
    if (t) return t;
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
  return `<div class="semaforo ${v.nivel}"><span class="luz">${N.e}</span><div><div class="titulo">${N.t}</div><div class="razones">${razones}</div></div></div>`;
}
function abrirEscaner() {
  hoja(`<h2>🔎 ¿Es buena compra?</h2>
    <label class="escanear-grande" for="i-codigo-foto" style="margin-top:12px"><span class="emo">📷</span>Foto del código de barras</label>
    <input id="i-codigo-foto" type="file" accept="image/*" capture="environment" class="sr">
    <form class="anadir" id="f-ean"><div class="caja"><input id="i-ean" inputmode="numeric" placeholder="…o escribe los números" autocomplete="off"><button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
    <div id="resultado"></div>
    ${E.escaneos.length ? `<h3>🕘 Lo último</h3><div class="botones">${E.escaneos.slice(0, 8).map(x => `<button class="chip" data-ean="${esc(x.ean)}">${L.NIVEL[x.nivel]?.e || '⚪'} ${esc(x.n.slice(0, 28))}</button>`).join('')}</div>` : ''}`, h => {
    const res = $('#resultado', h);
    const consulta = async ean => {
      ean = String(ean || '').replace(/\D/g, '');
      if (ean.length < 8) { res.innerHTML = '<div class="aviso"><span class="emo">🤔</span><div>Ese código es muy corto.</div></div>'; return; }
      res.innerHTML = '<div class="cargando"></div><div class="cargando" style="width:70%"></div>';
      const local = Object.entries(D.productos).find(([, x]) => x.ean && (x.ean === ean || x.ean.replace(/^0+/, '') === ean.replace(/^0+/, '')));
      let n, nombre, img, nut = null;
      if (local) { const [k, x] = local; nut = L.nutrientesDe(x); nombre = nombreCorto(x); img = x.foto; n = { k }; }
      else {
        let pr = null;
        try { pr = await buscaOFF(ean); } catch { res.innerHTML = '<div class="aviso"><span class="emo">📡</span><div>Sin conexión: prueba otra vez.</div></div>'; return; }
        if (!pr) { res.innerHTML = `<div class="aviso"><span class="emo">🙈</span><div><b>No lo encuentro</b> (${esc(ean)}).</div></div><button class="boton suave" id="b-off-claude">${I.enviar}Mandárselo a Claude</button>`;
          $('#b-off-claude', h).addEventListener('click', () => mandarAClaude(`¿Es buena compra el producto con código ${ean}? Os mando foto.`)); return; }
        nut = L.nutrientesOFF(pr); nombre = pr.product_name_es || pr.product_name || pr.generic_name_es || 'Producto ' + ean; img = pr.image_front_small_url;
        if (pr.brands) nombre += ' · ' + pr.brands.split(',')[0];
        n = { texto: nombre };
      }
      if (nut.kcal == null && !nut.p && !nut.hc) { res.innerHTML = `<div class="aviso"><span class="emo">🤷</span><div><b>${esc(nombre)}</b>: sin tabla nutricional.</div></div>`; return; }
      const v = L.veredicto(nut);
      E.escaneos = [{ ean, n: nombre, nivel: v.nivel, img, f: new Date().toISOString() }, ...E.escaneos.filter(x => x.ean !== ean)].slice(0, 12); salva();
      res.innerHTML = `<div class="producto-escaneado" style="margin-top:14px">${img ? `<img src="${esc(img)}" alt="">` : ''}<div><b>${esc(nombre)}</b></div></div>
        ${semaforoHTML(v)}
        <div class="tabla-n"><div><b>${v.kcal}</b><span>kcal</span></div><div><b>${r0(nut.p * 10) / 10} g</b><span>proteína</span></div><div><b>${nut.az != null ? r0(nut.az * 10) / 10 + ' g' : '—'}</b><span>azúcar</span></div><div><b>${r0(nut.g * 10) / 10} g</b><span>grasa</span></div></div>
        <div class="botones" style="margin-top:12px"><button class="boton ${v.nivel === 'malo' ? '' : 'principal'}" id="b-escaneo-lista">${I.carro}${v.nivel === 'malo' ? 'Añadir igualmente' : 'A la lista'}</button></div>`;
      $('#b-escaneo-lista', h).addEventListener('click', () => { anadeALista([{ ...n, v: v.nivel, img, ean }]); cierraHoja(); if (V.pestana === 'compra') vCompra(); });
    };
    $('#i-codigo-foto', h).addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      res.innerHTML = '<div class="nota" style="text-align:center;margin-top:12px">🔍 Leyendo el código…</div><div class="cargando"></div>';
      try {
        const ean = await leeCodigo(f);
        if (ean) { $('#i-ean', h).value = ean; consulta(ean); }
        else res.innerHTML = '<div class="aviso"><span class="emo">📷</span><div><b>No leo el código.</b> Más cerca, con luz y recto, o escribe los números.</div></div>';
      } catch (err) { res.innerHTML = `<div class="aviso"><span class="emo">⚠️</span><div>${esc(err.message || 'No he podido leer la foto')}.</div></div>`; }
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
  cabecera('En casa', `${items.length + E.casaOtros.length} cosas`);
  const grupos = {};
  for (const [k, g] of items) (grupos[LUGAR(k)] ||= []).push([k, g]);
  const orden = ['Nevera', 'Fruta y verdura', 'Congelador', 'Despensa'];
  $('#vista').innerHTML = `
    <div class="tarjeta anadir-mas">
      <h3 style="margin-top:0">📝 ¿Qué tenéis?</h3>
      <textarea class="campo-texto" id="t-casa" placeholder="Escríbelo todo: 6 huevos, 2 latas de atún, arroz, medio pollo, leche…"></textarea>
      <button class="boton principal ancho" id="b-casa" style="margin-top:10px">✅ Apuntar y ajustar la lista</button>
    </div>
    ${items.length ? orden.filter(o => grupos[o]).map(o => `<div class="cat"><span class="emo">${LUGAR_EMO[o]}</span>${o}<span class="num">${grupos[o].length}</span></div><div class="rejilla">
      ${grupos[o].sort((a, b) => D.productos[a[0]].n.localeCompare(D.productos[b[0]].n, 'es')).map(([k, g]) => `<div class="casa-item">
        <div class="arriba">${D.productos[k].foto ? `<img src="${esc(D.productos[k].foto)}" alt="" loading="lazy" width="46" height="46">` : `<div class="sinfoto" style="display:grid;place-items:center;font-size:22px">${CAT_EMO[D.productos[k].cat] || '🫙'}</div>`}
          <div style="min-width:0"><div class="pn">${esc(nombreCorto(D.productos[k]))}</div><div class="cant">${esc(cantidadCasa(k, g))}</div></div></div>
        <div class="mas-menos"><button data-menos="${k}" aria-label="Menos">−</button><button data-mas="${k}" aria-label="Más">+</button></div></div>`).join('')}</div>`).join('') : ''}
    ${E.casaOtros.length ? `<div class="cat"><span class="emo">🧺</span>Otras cosas<span class="num">${E.casaOtros.length}</span></div><div class="chips-despensa">${E.casaOtros.map((t, i) => `<button class="chip" data-otro-casa="${i}">${esc(t)} ✕</button>`).join('')}</div>` : ''}
    ${!items.length && !E.casaOtros.length ? '<div class="vacio"><span class="emo">🧺</span>Todavía no hay nada.</div>' : ''}`;
  const paso = k => { const x = D.productos[k]; return x.gud || Math.max(10, Math.round(x.util / 4 / 10) * 10); };
  $$('[data-menos]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.menos; E.casa[k] = Math.max(0, (E.casa[k] || 0) - paso(k)); if (E.casa[k] <= 0.5) delete E.casa[k]; salva(); vCasa(); }));
  $$('[data-mas]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.mas; E.casa[k] = (E.casa[k] || 0) + paso(k); salva(); vCasa(); }));
  $$('[data-otro-casa]').forEach(b => b.addEventListener('click', () => { E.casaOtros.splice(+b.dataset.otroCasa, 1); salva(); vCasa(); }));
  $('#b-casa').addEventListener('click', () => apuntaCasa($('#t-casa').value));
}
// «6 huevos, 2 latas de atún, arroz…» → En casa (con cantidades) y la lista se ajusta sola.
function apuntaCasa(texto) {
  const partes = (texto || '').split(/\n|,|;| y (?=\S)/).map(t => t.trim()).filter(Boolean);
  if (!partes.length) { tostada('Escribe lo que tenéis'); return; }
  const antes = lineaCompra().filas.length;
  const hechos = [], otros = [];
  for (const t of partes) {
    const d = L.lineaIngrediente(t, D.productos);
    if (d?.basico) continue;
    if (d?.k) {
      const x = D.productos[d.k], conCantidad = /\d|\b(un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|medio|media)\b/i.test(t);
      E.casa[d.k] = (E.casa[d.k] || 0) + (conCantidad ? d.g : x.util);
      hechos.push(nombreCorto(x));
    } else otros.push(capital(t));
  }
  E.casaOtros = [...new Set([...E.casaOtros, ...otros])];
  salva(); vCasa();
  const quitados = antes - lineaCompra().filas.length;
  tostada(`🏠 ${hechos.length + otros.length} apuntadas${quitados > 0 ? ` · ${quitados} fuera de la lista` : ''}`);
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
  cabecera('Recetas', `${todas.length} recetas`);
  const pregunta = V.busca.trim();
  const t = L.normaliza(pregunta).replace(/^(como se hace|como hago|como preparo|como se prepara|receta de|receta)\s+/, '').replace(/^(un|una|el|la|los|las)\s+/, '');
  const lista = todas.filter(r => {
    if (t && !L.normaliza(r.n + ' ' + r.ing.map(i => D.productos[i[0]]?.n).join(' ') + ' ' + (r.otros || []).join(' ')).includes(t)) return false;
    const f = V.filtro;
    return f === 'todas' || (f === 'vuestras' && r.propia) || r.tipo.includes(f) || r.ap === f || (f === 'rapidas' && r.min <= 10);
  });
  const esPregunta = /^(¿)?\s*(c[oó]mo|qu[eé]|puedo|se puede|receta)/i.test(pregunta) || (t && !lista.length);
  $('#vista').innerHTML = `
    <div class="buscador">${I.buscar}<input id="i-busca" type="search" placeholder="Busca o pregunta: ¿cómo se hace…?" value="${esc(V.busca)}" enterkeyhint="search"></div>
    ${esPregunta && pregunta ? `<div class="tarjeta pregunta"><span class="emo">🤔</span><div><b>${lista.length ? '¿No es ninguna?' : 'No la tengo todavía.'}</b> Pregúntaselo a Claude y la añado.</div><button class="boton principal" id="b-preguntar">${I.enviar}Preguntar</button></div>` : ''}
    <button class="nueva-receta" id="b-nueva"><span class="emo">✍️</span><span><b>Nueva receta</b></span></button>
    <div class="fila-chips">${FILTROS.map(([k, n]) => `<button class="chip" data-filtro="${k}" aria-pressed="${V.filtro === k}">${n}</button>`).join('')}</div>
    <div class="recetas-rejilla">${lista.map(r => { const g = L.macrosReceta(r, 'G', D.productos, fac);
      return `<button class="receta-tarjeta c-${r.tipo[0]}" data-receta="${r.id}"><div class="portada">${r.propia ? '<span class="propia">⭐ VUESTRA</span>' : ''}${emojiReceta(r)}</div>
        <div class="cuerpo"><div class="nombre">${esc(r.n)}</div><div class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span><span class="pill g">${r0(g.kcal)} kcal</span></div></div></button>`; }).join('')}</div>
    <details class="tarjeta quesos"><summary>🧀 Quesos para vuestras ensaladas</summary>
      <table><thead><tr><th>Queso</th><th class="num">💪</th><th class="num">🥑</th></tr></thead><tbody>
      ${QUESOS.filter(([k]) => D.productos[k]).map(([k, tx]) => `<tr><td><b>${esc(nombreCorto(D.productos[k]).replace(/ desnatado.*| semidesnatado.*| de vaca/, ''))}</b><br><span class="nota">${esc(tx)}</span></td><td class="num">${D.productos[k].m[1]} g</td><td class="num">${D.productos[k].m[3]} g</td></tr>`).join('')}
      </tbody></table></details>`;
  $('#b-nueva').addEventListener('click', () => editorReceta(null));
  $('#b-preguntar')?.addEventListener('click', () => mandarAClaude(`${/^¿/.test(pregunta) ? pregunta : '¿' + capital(pregunta) + '?'} Explícamelo y, si vale, ponla en NutriHome.`));
  $('#i-busca').addEventListener('input', e => { V.busca = e.target.value; const pos = e.target.selectionStart; vRecetas(); const i = $('#i-busca'); i.focus(); i.setSelectionRange(pos, pos); });
  $$('[data-filtro]').forEach(b => b.addEventListener('click', () => { V.filtro = b.dataset.filtro; vRecetas(); }));
  $$('[data-receta]').forEach(b => b.addEventListener('click', () => abrirReceta(b.dataset.receta)));
}

// ——— Nosotros ———
const GUSTO_EMO = [[/manzana/i, '🍎'], [/ensalada/i, '🥗'], [/pescado/i, '🐟'], [/frutos secos/i, '🥜'], [/entrecot/i, '🥩'], [/batido|fruta/i, '🍓']];
function vNosotros() {
  const p = perfiles(), h = hoy(), cr = E.creatina[h] || {};
  cabecera('Nosotros');
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
      <div class="botones" style="margin-top:10px"><button class="chip" data-crea="G" aria-pressed="${!!cr.G}">${cr.G ? '✅' : '⬜'} ${esc(NOM.G)}</button><button class="chip" data-crea="P" aria-pressed="${!!cr.P}">${cr.P ? '✅' : '⬜'} ${esc(NOM.P)}</button></div></div>
    <div class="tarjeta perfil"><button class="interruptor" id="b-gym" aria-pressed="${!!gym}"><span class="sw"></span><span>🏋️ ${gym ? 'Vamos al gimnasio' : 'Todavía sin gimnasio'}</span></button></div>
    <div class="tarjeta perfil"><h3>❤️ Lo que os gusta</h3><div class="gustos">${D.perfiles.gustos.map(g => `<span>${(GUSTO_EMO.find(([re]) => re.test(g)) || [0, '✨'])[1]} ${esc(g)}</span>`).join('')}</div></div>
    <details class="tarjeta perfil"><summary><b>🧮 Cómo lo calculo</b></summary><p class="nota">Gasto en reposo (Mifflin-St Jeor) × actividad (×1,3; ×1,45 con gimnasio), menos un 20 %. Proteína: ${String(p.G.protKg).replace('.', ',')} g/kg ${esc(NOM.G)} y ${String(p.P.protKg).replace('.', ',')} g/kg ${esc(NOM.P)}. Grasa: 0,7 g/kg. Lo demás, hidratos.</p>
      <p class="nota">💊 ${esc(D.perfiles.suplementos.creatina)}<br>🥤 ${esc(D.perfiles.suplementos.huel)}</p></details>
    <div class="tarjeta perfil"><h3>🔜 Próximamente</h3><div class="gustos"><span>🧴 Piel</span><span>💇‍♀️ Pelo</span><span>💅 Uñas</span><span>🌸 Ciclo</span></div></div>
    <div class="tarjeta perfil"><h3>📱 Este móvil</h3>
      <div class="botones"><button class="boton" id="b-claude">${I.enviar}Escribir a Claude</button><button class="boton peligro" id="b-borrar">${I.papelera}Borrar lo de este móvil</button></div></div>`;
  $$('[data-campo]').forEach(i => i.addEventListener('change', () => {
    const v = parseFloat(i.value.replace(',', '.'));
    if (!isFinite(v) || v <= 0) return;
    (E.perfiles[i.dataset.q] ||= {})[i.dataset.campo] = v; salva(); recalcula(); vNosotros(); tostada('Objetivos recalculados');
  }));
  $('#b-gym').addEventListener('click', () => { E.gimnasio = !gym; salva(); recalcula(); vNosotros(); });
  $$('[data-crea]').forEach(b => b.addEventListener('click', () => { const x = (E.creatina[h] ||= {}); x[b.dataset.crea] = !x[b.dataset.crea]; salva(); vNosotros(); if (x[b.dataset.crea]) tostada('💊 Apuntada'); }));
  $('#b-claude').addEventListener('click', () => mandarAClaude(''));
  $('#b-borrar').addEventListener('click', () => {
    if (!confirm('¿Borro de este móvil los cambios, la lista, lo de «En casa» y vuestras recetas? El menú y las recetas de la app no se borran.')) return;
    E = estadoNuevo(); E.casa = { ...(D.casa_inicial || {}) }; E.fijos = [...(D.fijos || [])]; reconstruyeRecetas(); salva(); recalcula(); vNosotros(); tostada('Borrado');
  });
}

async function mandarAClaude(texto) {
  const t = texto ? 'Para Claude, desde NutriHome: ' + texto : 'Para Claude, desde NutriHome: ';
  try { if (navigator.share) { await navigator.share({ text: t }); return; } } catch { return; }
  window.open('https://t.me/share/url?url=' + encodeURIComponent(location.origin + location.pathname) + '&text=' + encodeURIComponent(t), '_blank');
}

// ——— Órdenes escritas («quita los huevos», «tenemos kéfir»…) ———
function diaDeVoz(d) {
  const p = planActivo(), h = hoy();
  if (!d || d === 'hoy') return h;
  if (d === '+1') return masDias(h, 1);
  if (d === '+2') return masDias(h, 2);
  const idx = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'].indexOf(d);
  return p.dias.find(x => fecha(x.f).getDay() === idx)?.f || h;
}
function recetaDeTexto(texto) {
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
    case 'anadir': anadeALista(o.items); if (V.pestana === 'compra') vCompra(); break;
    case 'quitar': {
      const s = est(p.id), n = [];
      for (const it of o.items) if (it.k) { s.quitados[it.k] = true; s.extra = s.extra.filter(x => x.k !== it.k); n.push(nombreCorto(D.productos[it.k])); }
      salva(); tostada(n.length ? 'Quitado: ' + n.join(', ') : 'No lo encuentro en la lista'); if (V.pestana === 'compra') vCompra(); break;
    }
    case 'casa': if (anadeACasa(o.items) && V.pestana === 'casa') vCasa(); if (V.pestana === 'compra') vCompra(); break;
    case 'comprado': {
      const { s, filas } = lineaCompra(), n = [];
      for (const it of o.items) { const f = filas.find(x => x.k === it.k); if (f) { s.marcados[f.clave] = true; n.push(nombreCorto(D.productos[it.k])); } }
      salva(); tostada(n.length ? '✓ ' + n.join(', ') : 'No está en la lista'); if (V.pestana === 'compra') vCompra(); break;
    }
    case 'fuera': {
      const f = diaDeVoz(o.dia);
      if (i(f) < 0) { tostada('Ese día no está en el menú'); break; }
      est(p.id).cambios[f + '|' + o.comida] = { fuera: true }; salva(); V.dia = f; location.hash = 'semana'; vSemana();
      tostada(`Apuntado: ${L.NOMBRE_COMIDA[o.comida].toLowerCase()} fuera`); break;
    }
    case 'receta': editorReceta(null, false, recetaDeTexto(texto)); break;
    case 'escanear': abrirEscaner(); break;
    default: tostada('No lo he entendido');
  }
}

inicio();
