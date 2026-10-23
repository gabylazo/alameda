// app.js — interfaz de NutriHome: Semana, Compra, Claude (💬), En casa y Recetas; vuestros datos, en el icono de perfil de arriba.
// Recetas propias, buscador de Mercadona, ticket digital y escáner. Todo lo que va a Claude sale de la pestaña 💬.
// Los datos (productos de Mercadona, recetas, menú y perfiles) llegan cifrados en datos.enc; lo que cambiáis
// (platos cambiados, lista, lo que hay en casa, vuestras recetas…) se guarda en este móvil.
import * as L from './logica.js';

const CLAVE = 'alameda.clave';   // nombres de antes de NutriHome: así no se pierde lo guardado
let ESTADO = 'alameda.estado.v1';   // las casas amigas guardan lo suyo aparte: nutrihome.estado.<clave>
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lee = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const guarda = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento: se pierde al cerrar */ } };
const leeTexto = k => { try { return localStorage.getItem(k); } catch { return null; } };
const guardaTexto = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* nada */ } };
// Apariencia de este móvil (24/10): claro (lo de siempre), oscuro o automático (la del sistema). No se sincroniza.
const TEMA = 'nutrihome.tema', mqOscuro = matchMedia('(prefers-color-scheme: dark)');
function aplicaTema() {
  const t = leeTexto(TEMA) || 'claro', oscuro = t === 'oscuro' || (t === 'auto' && mqOscuro.matches);
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light';
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', oscuro ? 'dark' : 'light');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#121212' : '#ffffff');
}
aplicaTema(); mqOscuro.addEventListener?.('change', aplicaTema);
const r0 = n => Math.round(n);
const euros = n => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

let D, E, fac, obj, recetas, NOM = { G: '', P: '' };
const V = { pestana: 'semana', anterior: 'semana', dia: null, filtro: 'todas', busca: '', anadidos: new Set(), borrador: '', adjunto: null };

// ——— Casas amigas: su clave empieza por «nh-». Usan el catálogo público y sus datos viven solo en el servidor, cifrados con su clave ———
const NUEVA = 'alameda.nueva';   // la casa se abrió con un enlace de invitación: puede empezar de cero
const esAmiga = c => /^nh-/.test(c || '');
const ABC_CLAVE = 'abcdefghjkmnpqrstuvwxyz23456789';
const nuevaClaveAmiga = () => { const t = [...crypto.getRandomValues(new Uint8Array(12))].map(b => ABC_CLAVE[b % ABC_CLAVE.length]).join(''); return `nh-${t.slice(0, 4)}-${t.slice(4, 8)}-${t.slice(8)}`; };
function normalizaClave(c) {
  const t = String(c || '').trim().toLowerCase().replace(/\s+/g, ''), m = t.replace(/^nh-?/, '').replace(/-/g, '');
  return /^[a-z0-9]{12}$/.test(m) && /[a-z]/.test(m) ? `nh-${m.slice(0, 4)}-${m.slice(4, 8)}-${m.slice(8)}` : t;
}
const idCasa = async c => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nutrihome|' + String(c).trim().toLowerCase())))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
const SUPERS = [['mercadona', 'Mercadona'], ['lidl', 'Lidl'], ['dia', 'Dia'], ['carrefour', 'Carrefour'], ['otro', 'Otro']];
const nombreSuper = () => (SUPERS.find(([k]) => k === (E.super || 'mercadona')) || SUPERS[0])[1];
const esMercadona = () => !E.super || E.super === 'mercadona';

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
  hoy: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/></svg>',
  semana: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  compra: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  casa: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  recetas: '<svg viewBox="0 0 24 24"><path d="M6 4h10a3 3 0 0 1 3 3v13H8a2 2 0 0 1-2-2V4Z"/><path d="M6 18a2 2 0 0 1 2-2h11M10 8h5M10 11h4"/></svg>',
  nosotros: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.6-.2 1.3-.3 2-.3 2.2 0 3.9 1.5 4.4 4.2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  equis: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  mas: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  claude: '<svg viewBox="0 0 24 24"><path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-6.5L6 20v-4.2A3 3 0 0 1 4 13V7Z"/><path d="M8.5 8.5h7M8.5 11.5h4.5"/></svg>',
  volver: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  ajustes: '<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/></svg>',
  flecha: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  tienda: '<svg viewBox="0 0 24 24"><path d="M4 9l1.5-5h13L20 9M4 9h16M4 9v11h16V9M9 20v-6h6v6"/></svg>',
  pesa: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>',
  tema: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor"/></svg>',
  estrella: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z"/></svg>',
  nube: '<svg viewBox="0 0 24 24"><path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.3 9.6 4.5 4.5 0 0 0 7 18.5Z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.1"/></svg>',
  llave: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5"/></svg>',
};
const I = {
  corazon: ic('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
  buscar: ic('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  chispas: ic('<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  caja: ic('<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'),
  papelera: ic('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  lapiz: ic('<path d="M4 20h4L20 8l-4-4L4 16v4z"/>'),
  enviar: ic('<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3z"/><path d="M10 13l5-5"/>'),
  carro: ic('<path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>'),
  calendario: ic('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
};
const NOMBRE_AGENTE = 'Chef';   // el nombre de la pestaña 💬 lo elige la casa
const PESTANAS = [['hoy', 'Hoy'], ['compra', 'Compra'], ['casa', 'Nevera'], ['nosotros', 'Ajustes']];   // la semana y las recetas se abren desde Hoy
// «Ajustes» (hash nosotros) es pestaña desde el 24/10: antes se abría con los avatares de la cabecera y se perdía.
const VISTAS = { hoy: vClaude, semana: vSemana, compra: vCompra, claude: vClaude, casa: vCasa, recetas: vRecetas, nosotros: vNosotros };
const APARATO = { airfryer: 'Air fryer', horno: 'Horno', plancha: 'Plancha', micro: 'Micro', sin: 'Sin fuego', batidora: 'Batidora', olla: 'Olla' };
const APARATO_EMO = { airfryer: '🌀', horno: '🔥', plancha: '🍳', micro: '⚡', sin: '🥄', batidora: '🥤', olla: '♨️' };
// Lo que hay en la cocina de cada casa (sin elegir: todo). Las recetas de air fryer también se pueden hacer en el horno, unos minutos más.
const TODOS_APARATOS = ['airfryer', 'horno', 'plancha', 'micro', 'batidora', 'olla'];
const APARATOS_CASA = [['airfryer', '🌀 Air fryer'], ['horno', '🔥 Horno'], ['plancha', '🍳 Sartén o plancha'], ['micro', '⚡ Microondas'], ['batidora', '🥤 Batidora'], ['olla', '♨️ Olla o cazo']];
const aparatosCasa = () => (D.amiga ? E.hogar?.aparatos : E.aparatos) || TODOS_APARATOS;
function fijaAparatos(l) { if (D.amiga && E.hogar) E.hogar.aparatos = l; else E.aparatos = l; }
const conHorno = r => r.ap === 'airfryer' && !aparatosCasa().includes('airfryer') && aparatosCasa().includes('horno');
const sePuedeHacer = r => !r || !r.ap || r.ap === 'sin' || aparatosCasa().includes(r.ap) || conHorno(r);
const nombreAparato = a => ((APARATOS_CASA.find(([k]) => k === a) || [a, APARATO[a] || a])[1]).replace(/^\S+\s/, '').toLowerCase();
// ——— Novedades: lo nuevo de cada versión sale una vez en cada móvil (y queda en el perfil). Al publicar algo que se ve, se añade aquí ———
const NOVEDADES = [   // la más nueva, arriba
  { id: 'oscuro', fecha: '2026-10-24', emo: '', titulo: 'Ajustes y modo oscuro', texto: 'Ajustes, la pestaña nueva de abajo, reúne vuestros datos, el súper, lo que sabe el Chef y la apariencia: claro, oscuro o automático (como tengáis el móvil).', ir: 'nosotros', foco: '[data-tema]' },
  { id: 'fotos', fecha: '2026-10-24', emo: '', titulo: 'Fotos y letra nueva', texto: 'Cada receta tiene su foto, también las que creéis vosotros o con el Chef (se elige sola y se puede cambiar en la receta). Letra más limpia y listas más ordenadas.', ir: 'recetas' },
  { id: 'nutrihome3', fecha: '2026-10-23', emo: '', titulo: 'NutriHome, más sencilla', texto: 'Tres pantallas: Hoy (lo que toca hoy y el Chef en la misma pantalla), Compra y Nevera. «Cómo se hace» te explica la cena paso a paso al momento. Desayuno, almuerzo con Huel y cena sólida con ensalada. La semana y las recetas, desde Hoy.', ir: 'hoy', origen: true },
  { id: 'legumbres', fecha: '2026-10-22', emo: '🫘', titulo: 'Platos de legumbres', texto: 'Cinco platos calientes con garbanzos y lentejas: salteado con atún, lentejas guisadas, lentejas con arroz y cebolla, bol de quinoa con garbanzos crujientes y curry de garbanzos. El menú los usa cuando están en casa.', ir: 'recetas' },
  { id: 'chef-notas', fecha: '2026-10-22', emo: '📝', titulo: 'El Chef recuerda vuestras costumbres', texto: 'Lo que le contéis (horarios, comidas ligeras, cenas más elaboradas…) se queda apuntado en Nosotros y lo tiene en cuenta siempre. Y ya solo propone platos que salen con lo de casa, salvo que le pidáis comprar.', ir: 'nosotros', ajuste: 'chef', foco: '#f-nota' },
  { id: 'menu-casa', fecha: '2026-10-19', emo: '🔄', titulo: 'El menú sigue a lo que hay en casa', texto: 'Si falta lo principal de un plato (o no llega la cantidad), se cambia solo por otro que podáis hacer. En cada receta, ✓ o ✕ al lado de cada ingrediente.', ir: 'semana' },
  { id: 'aviso-noche', fecha: '2026-10-20', emo: '🌙', titulo: 'Aviso la noche antes', texto: 'Si mañana toca algo que se prepara la noche antes (como la avena de la noche), desde las 17:00 te sale en Semana «Esta noche, 5 minutos».', ir: 'semana' },
  { id: 'compartir-receta', fecha: '2026-10-20', emo: '📤', titulo: 'Compartir recetas', texto: 'En cada receta, «📤 Compartir»: la mandas por WhatsApp (o donde quieras) con los ingredientes y el paso a paso.', ir: 'recetas', foco: '.receta-tarjeta' },
  { id: 'chef-menu-recetas', fecha: '2026-10-19', emo: '👩‍🍳', titulo: 'El Chef rehace el menú y crea recetas', texto: 'Pídele «rehaz el menú con lo que tenemos» o «créame una receta de…»: te sale un botón y, al tocarlo, lo hace (con Deshacer). Sus recetas se guardan como vuestras.', ir: 'claude' },
  { id: 'bebidas', fecha: '2026-10-19', emo: '🥤', titulo: 'Bebidas', texto: 'En Recetas, el filtro «🥤 Bebidas»: limonada de lima con albahaca, mojito sin alcohol, agua de fresas, smoothies… Sin azúcar. Tocad ❤️ en las que os gusten.', ir: 'recetas', foco: '[data-filtro="bebida"]' },
  { id: 'huel-escondido', origen: true, fecha: '2026-10-19', emo: '🥞', titulo: 'Huel que no sabe a Huel', texto: 'Cuatro recetas con Huel sin sabor escondido: tortitas de avena, crema de queso batido con arándanos y cacao, avena de la noche y bizcocho de taza de cacao.', ir: 'recetas' },
  { id: 'buscar-listas', fecha: '2026-10-19', emo: '🔍', titulo: 'Buscar en las listas', texto: 'En «En casa» y en Compra, cuando la lista es larga, arriba tienes un buscador.', ir: 'casa', foco: '#i-filtra' },
  { id: 'no-vuelve', fecha: '2026-10-19', emo: '🗑️', titulo: 'Lo que quitas no vuelve', texto: 'Lo que quitas de En casa se queda quitado, también en el otro móvil. Solo vuelve si lo añades o lo compras otra vez.', ir: 'casa' },
  { id: 'presupuesto', amigas: true, fecha: '2026-10-19', emo: '💶', titulo: 'La compra, dentro del presupuesto', texto: 'El menú de cada semana se hace para que la compra entre en vuestro presupuesto, contando lo que ya tenéis en casa. Si os pasáis, en Compra: «Ajustar al presupuesto». Luego subís el ticket y el menú sigue a lo que comprasteis.', ir: 'compra' },
  { id: 'batidos', fecha: '2026-10-19', emo: '🥤', titulo: 'Un batido al día', texto: 'El menú pone un batido cada día: Huel para quien lo toma (con agua es lo más ligero) y batidos sin Huel, con queso batido y fruta.', ir: 'semana', origen: true },
  { id: 'sin-repetir', fecha: '2026-10-19', emo: '🔁', titulo: 'El menú no repite y te avisa', texto: 'Lo que coméis se descuenta de En casa. Comidas y cenas siempre con plato principal (la ensalada acompaña). No repite lo de esa semana; y si con lo que hay no llega, elige el que menos haya que comprar y te lo apunta en Compra.', ir: 'semana' },
  { id: 'no-hay', fecha: '2026-10-19', emo: '🚫', titulo: 'Dile al Chef lo que no hay', texto: 'Escríbele «no hay albóndigas» y te sale un botón: lo quita de En casa y cambia los platos que lo llevaban.', ir: 'claude' },
  { id: 'detalle', fecha: '2026-10-19', emo: '👩‍🍳', titulo: 'Paso a paso detallado', texto: 'Todas las recetas tienen «Resumen» y «Paso a paso detallado»: qué fuego, cuánto tiempo y cómo saber que está hecho.', ir: 'recetas', foco: '.receta-tarjeta' },
  { id: 'chat', fecha: '2026-10-19', emo: '💬', titulo: 'El Chef, como un chat', texto: 'Escribe abajo, como en WhatsApp, o toca una pregunta: «¿Cómo hago la cena?» le manda la receta de hoy y te la explica paso a paso.', ir: 'claude', foco: '.sugerencias' },
  { id: 'ensaladas', fecha: '2026-10-19', emo: '🥗', titulo: 'Cenas con ensalada', texto: 'Todas las cenas llevan su ensalada, distinta cada día y con lo que tenéis en casa.', ir: 'semana' },
  { id: 'chef-hace', fecha: '2026-10-19', emo: '💬', titulo: 'El Chef te explica y te ayuda', texto: 'Pregúntale cómo se hace cualquier plato de la semana y te lo explica paso a paso. Si le pides algo («añade los huevos a lo que hay en casa»), te sale un botón para hacerlo.', ir: 'claude', foco: '.charla' },
  { id: 'casa-buscar', fecha: '2026-10-19', emo: '🏠', titulo: 'Añadir a En casa', texto: '«Añadir algo que tenéis» busca en Mercadona y coloca cada cosa en su sección. Lo que borras ya no vuelve solo.', ir: 'casa', foco: '#b-anadir-casa' },
  { id: 'recetas-claras', fecha: '2026-10-19', emo: '👩‍🍳', titulo: 'Recetas paso a paso', texto: 'Cada receta dice qué preparar antes, el fuego, el tiempo y cómo saber que está hecho. Y abajo, «¿Dudas?» para preguntar al Chef sobre esa receta.', ir: 'recetas', foco: '.receta-tarjeta' },
  { id: 'vaciar-compra', fecha: '2026-10-18', emo: '🧹', titulo: 'Compra sin acumular', texto: '«Quitados», «¿Os queda?» y «Pendiente de otro súper» se vacían u ocultan desde su título, con «Deshacer». Los pendientes salen plegados.', ir: 'compra', foco: '.cat-accion' },
  { id: 'cocina', fecha: '2026-10-18', emo: '🍳', titulo: 'Lo que tenéis en la cocina', texto: 'En Recetas, marca los aparatos que tienes: solo verás lo que puedes hacer y el menú se adapta.', ir: 'recetas', foco: '.cocina' },
  { id: 'se-acabo', fecha: '2026-10-18', emo: '🛒', titulo: '«Se acabó»', texto: 'En «En casa», toca el carrito cuando algo se termine: pasa solo a la próxima compra.', ir: 'casa', foco: '.casa-fila .icono' },
  { id: 'amigos', fecha: '2026-10-18', emo: '👥', titulo: 'Invita a tus amigos', texto: 'En Ajustes, «Invitar a amigos»: cada casa tiene su menú, su compra y su Chef.', ir: 'nosotros', ajuste: 'amigos', foco: '#f-invitar', origen: true },
  { id: 'chef', fecha: '2026-10-18', emo: '💬', titulo: 'El Chef contesta aquí', texto: 'Pregúntale en la pestaña Chef: responde dentro de la app en un minuto.', ir: 'claude', foco: '.charla' },
  { id: 'sincro', fecha: '2026-10-18', emo: '☁️', titulo: 'Todos los móviles a la vez', texto: 'Lo que marca uno lo ven los demás de la casa al momento.' },
];
const VISTAS_NOV = 'nutrihome.novedades';   // en cada móvil, no se sincroniza: cada uno las ve una vez
const novedadesVistas = () => { try { return JSON.parse(leeTexto(VISTAS_NOV) || '[]'); } catch { return []; } };
// Las casas amigas no ven lo que ya estaba cuando entraron.
const novedadesCasa = () => NOVEDADES.filter(n => !(n.origen && D.amiga) && !(n.amigas && !D.amiga) && !(D.amiga && E.hogar?.creada && n.fecha <= E.hogar.creada));
const novedadesNuevas = () => { const v = new Set(novedadesVistas()); return novedadesCasa().filter(n => !v.has(n.id)); };
const marcaNovedadesVistas = () => guardaTexto(VISTAS_NOV, JSON.stringify([...new Set([...novedadesVistas(), ...novedadesCasa().map(n => n.id)])]));
const etiquetaNuevo = id => { const n = novedadesCasa().find(x => x.id === id); return n && (fecha(hoy()) - fecha(n.fecha)) / 864e5 <= 7 ? '<span class="nuevo">Nuevo</span>' : ''; };
function hojaNovedades(todas = false) {
  const lista = todas ? novedadesCasa() : novedadesNuevas();
  if (!lista.length) { if (todas) tostada('No hay novedades'); return; }
  hoja(`<h2>✨ Novedades</h2><div class="nota">${todas ? 'Lo último que ha llegado a NutriHome.' : 'Lo nuevo desde la última vez:'}</div>
    <div class="menu-lista">${lista.map(n => `<div class="novedad"><span class="emo">${n.emo}</span><div class="t"><b>${esc(n.titulo)}</b><span class="nota">${esc(n.texto)}</span></div>${n.ir ? `<button class="chip" data-nov="${n.id}">Ver</button>` : ''}</div>`).join('')}</div>
    <button class="boton principal ancho" id="b-nov-ok" style="margin-top:14px">Entendido</button>`, h => {
    marcaNovedadesVistas();
    $('#b-nov-ok', h).addEventListener('click', () => cierraHoja());
    $$('[data-nov]', h).forEach(b => b.addEventListener('click', () => { const n = NOVEDADES.find(x => x.id === b.dataset.nov); cierraHoja(); llevaA(n); }));
  });
}
// Lleva a la novedad: abre su pestaña y hace brillar lo nuevo unos segundos.
function llevaA(n) {
  if (!n?.ir) return;
  const brilla = () => { const el = $(n.foco); if (!el) return; el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('destaca'); setTimeout(() => el.classList.remove('destaca'), 3500); };
  if (n.ir === 'nosotros') { V.ajuste = n.ajuste || null; if (V.pestana === 'nosotros') { vNosotros(); return setTimeout(brilla, 100); } }
  if (V.pestana === n.ir) brilla(); else { location.hash = n.ir; setTimeout(brilla, 700); }
}
const pillAparato = r => !r ? '' : !sePuedeHacer(r) ? `<span class="pill malo">⚠️ necesita ${esc(nombreAparato(r.ap))}</span>` : conHorno(r) ? '<span class="pill">🔥 en horno</span>' : '';
const COMIDA_EMO = { desayuno: '☀️', comida: '🍽️', merienda: '🍎', cena: '🌙' };
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
// Fotos de los platos (24/10/2026): fotos libres de Pexels; `foto` en recetas.json es la ruta tras /photos/. Sin foto, un fondo suave con el icono de la comida.
const urlRuta = (ruta, w = 600) => `https://images.pexels.com/photos/${ruta}?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${Math.round(w * .75)}`;
const urlFoto = (r, w = 600) => { const f = r?.foto || fotoAuto(r); return f ? urlRuta(f, w) : ''; };
// Las recetas que creáis vosotros o el Chef: la foto sale sola del banco de Pexels (web/fotos.json, [ruta, descripción en inglés]),
// traduciendo el nombre y los ingredientes con ES_EN y quedándose con la descripción que más palabras comparte. Se guarda al crearla.
let BANCO = null;
const cargaBanco = () => BANCO || (BANCO = fetch('fotos.json').then(r => r.ok ? r.json() : []).catch(() => []).then(l => { BANCO = l.map(([ruta, t]) => ({ ruta, p: new Set(L.normaliza(t).split(/[^a-z]+/).map(raiz)) })); return BANCO; }));
const raiz = w => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '');
const ES_EN = { pollo: 'chicken', pechuga: 'chicken breast', muslo: 'chicken', jamoncito: 'chicken drumstick', pavo: 'turkey', ternera: 'beef', anojo: 'beef steak', vacuno: 'beef', entrecot: 'steak', filete: 'steak', carne: 'meat', cerdo: 'pork', lomo: 'pork loin', solomillo: 'tenderloin', costilla: 'ribs', hamburguesa: 'burger', albondiga: 'meatballs', jamon: 'ham', serrano: 'ham', chorizo: 'chorizo',
  pescado: 'fish', merluza: 'white fish', bacalao: 'cod', salmon: 'salmon', atun: 'tuna', gamba: 'shrimp', langostino: 'prawn', marisco: 'seafood', calamar: 'squid', pulpo: 'octopus', sardina: 'sardine',
  huevo: 'egg', clara: 'egg', tortilla: 'omelette', revuelto: 'scrambled egg', queso: 'cheese', cabra: 'goat cheese', mozzarella: 'mozzarella', yogur: 'yogurt', kefir: 'yogurt', leche: 'milk', nata: 'cream', mantequilla: 'butter',
  arroz: 'rice', pasta: 'pasta', macarron: 'pasta', espagueti: 'spaghetti', fideo: 'noodles', noqui: 'gnocchi', pan: 'bread', tostada: 'toast', wrap: 'wrap', quinoa: 'quinoa', avena: 'oats', cuscus: 'couscous', patata: 'potato', boniato: 'sweet potato', batata: 'sweet potato', yuca: 'cassava', platano: 'banana', maiz: 'corn',
  lenteja: 'lentil', garbanzo: 'chickpea', alubia: 'beans', judia: 'green beans', frijol: 'beans', legumbre: 'beans', edamame: 'edamame', hummus: 'hummus', tofu: 'tofu',
  ensalada: 'salad', lechuga: 'lettuce', rucula: 'arugula', canonigo: 'salad', espinaca: 'spinach', tomate: 'tomato', cherry: 'cherry tomato', pepino: 'cucumber', zanahoria: 'carrot', cebolla: 'onion', ajo: 'garlic', pimiento: 'pepper', calabacin: 'zucchini', berenjena: 'eggplant', champinon: 'mushroom', seta: 'mushroom', brocoli: 'broccoli', coliflor: 'cauliflower', esparrago: 'asparagus', aguacate: 'avocado', verdura: 'vegetables', calabaza: 'pumpkin', guisante: 'peas',
  fruta: 'fruit', fresa: 'strawberry', arandano: 'blueberry', frambuesa: 'raspberry', frutos: 'berries', rojos: 'berries', kiwi: 'kiwi', mango: 'mango', pina: 'pineapple', naranja: 'orange', mandarina: 'mandarin', limon: 'lemon', lima: 'lime', manzana: 'apple', pera: 'pear', uva: 'grape', melon: 'melon', sandia: 'watermelon', granada: 'pomegranate', coco: 'coconut',
  nuez: 'walnuts', almendra: 'almonds', anacardo: 'cashews', cacahuete: 'peanut', pinon: 'pine nuts', chocolate: 'chocolate', cacao: 'chocolate', canela: 'cinnamon', miel: 'honey', albahaca: 'basil', hierbabuena: 'mint', menta: 'mint', jengibre: 'ginger', curry: 'curry', mojo: 'sauce', salsa: 'sauce',
  sopa: 'soup', crema: 'cream soup', pure: 'mashed', guiso: 'stew', guisada: 'stew', estofado: 'stew', asado: 'roasted', plancha: 'grilled', horno: 'baked', frito: 'fried', salteado: 'stir fry', wok: 'wok', brocheta: 'skewers', bol: 'bowl', batido: 'smoothie', smoothie: 'smoothie', zumo: 'juice', limonada: 'lemonade', agua: 'water', helado: 'ice cream', bizcocho: 'cake', tarta: 'cake', galleta: 'cookies', tortita: 'pancakes', crep: 'crepe', postre: 'dessert', pizza: 'pizza', lasana: 'lasagna', paella: 'paella', croqueta: 'croquettes', empanada: 'empanada', arepa: 'arepa', taco: 'tacos', burrito: 'burrito', sandwich: 'sandwich', bocadillo: 'sandwich' };
const CONDIMENTOS = new Set(['garlic', 'sauce', 'lime', 'lemon', 'onion', 'cinnamon', 'basil', 'mint', 'ginger', 'honey', 'water', 'cream', 'grilled', 'baked', 'roasted', 'fried', 'bowl'].map(w => w.replace(/(es|s)$/, '')));
const palabrasEn = t => L.normaliza(t).split(/[^a-z]+/).filter(w => w.length > 2).flatMap(w => { const e = ES_EN[w] || ES_EN[w.replace(/(es|s)$/, '')]; return e ? e.split(' ') : []; }).map(raiz);
function fotosPara(r, n = 1) {
  if (!Array.isArray(BANCO) || !r) return [];
  const nom = palabrasEn(r.n), ing = palabrasEn((r.ing || []).map(i => D.productos[i[0]]?.n || '').join(' ') + ' ' + (r.otros || []).join(' '));
  if (!nom.length && !ing.length) return [];
  const usadas = new Set(Object.values(recetas).map(x => x.foto).filter(Boolean));
  // Manda lo principal (la primera palabra del nombre que no es condimento): una foto que lo tiene gana siempre a una que no.
  const peso = w => CONDIMENTOS.has(w) ? .5 : 3, principal = nom.find(w => !CONDIMENTOS.has(w));
  return BANCO.map(f => ({ f, pts: (principal && f.p.has(principal) ? 100 : 0) + nom.reduce((t, w) => t + (f.p.has(w) ? peso(w) : 0), 0) + ing.reduce((t, w) => t + (f.p.has(w) ? peso(w) / 3 : 0), 0) - (usadas.has(f.ruta) ? 2 : 0) }))
    .filter(x => x.pts > 0).sort((a, b) => b.pts - a.pts).filter((x, i, l) => l[0].pts < 100 || x.pts >= 100 || i < 4).slice(0, n).map(x => x.f.ruta);   // si hay fotos de lo principal, solo esas
}
const fotoAuto = r => r && !r.foto && (r.propia || r.chef) ? fotosPara(r)[0] || '' : '';
const fotoPlato = (r, w = 600, cls = 'foto') => urlFoto(r, w) ? `<img class="${cls}" src="${urlFoto(r, w)}" alt="" loading="lazy" decoding="async">` : `<span class="${cls} sin-foto c-${r?.tipo0 || r?.tipo?.[0] || 'cena'}">${ICONO_COMIDA[(r?.tipo0 || r?.tipo?.[0]) === 'desayuno' ? 'desayuno' : (r?.tipo0 || r?.tipo?.[0]) === 'merienda' ? 'merienda' : 'cena']}</span>`;
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

// ——— Sincronización entre móviles (servidor de la casa, en D.perfiles.servidor) ———
// La clave de casa da la huella de la casa (su id) y cifra todo lo que se sube: el servidor solo guarda bloques cifrados.
// Cada móvil guarda lo último sincronizado («base») y, cuando el servidor tiene algo más nuevo, funde los dos cambios (L.fusiona).
let SYNC = 'alameda.sync.v1';
let sync = null, claveSync = null, casaId = null, tSync, sincronizando = false, otraVez = false;
const servidor = () => (D?.perfiles?.servidor || '').replace(/\/$/, '');
async function preparaSync(clave) {
  const enc = new TextEncoder(), c = clave.trim().toLowerCase();
  casaId = await idCasa(c);
  const base = await crypto.subtle.importKey('raw', enc.encode(c), 'PBKDF2', false, ['deriveKey']);
  claveSync = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: enc.encode('nutrihome-sync-v1'), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  sync = lee(SYNC, { v: 0, base: null });
}
const aB64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
async function cifraSync(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, claveSync, new TextEncoder().encode(JSON.stringify(obj))));
  const u = new Uint8Array(12 + ct.length); u.set(iv); u.set(ct, 12); return aB64(u);
}
async function descifraSync(blob) { const u = b64(blob); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, claveSync, u.slice(12)))); }
// Cuánto «vale» lo guardado: la primera vez que dos móviles se encuentran, manda el que más datos tiene.
const riqueza = x => (x.compras || []).length * 20 + Object.values(x.semanas || {}).reduce((n, s) => n + Object.keys(s.marcados || {}).length + Object.keys(s.noComprado || {}).length + Object.keys(s.hechos || {}).length + Object.keys(s.cambios || {}).length + (s.extra || []).length, 0)
  + (x.propias || []).length * 5 + (x.pendientes || []).length + Object.keys(x.casa || {}).length + (x.escaneos || []).length + (x.favRecetas || []).length + (x.charla || []).length;
function programaSync() { if (!servidor() || !claveSync) return; clearTimeout(tSync); tSync = setTimeout(sincroniza, 1200); }
async function sincroniza() {
  if (!servidor() || !claveSync) return;
  if (sincronizando) { otraVez = true; return; }
  sincronizando = true;
  try {
    const r = await fetch(`${servidor()}/casa/${casaId}`, { cache: 'no-store' });
    if (r.status === 204) await sube(0);   // la casa aún no tiene datos en el servidor: este móvil los estrena
    else if (!r.ok) throw new Error('servidor ' + r.status);
    else {
      const rem = await r.json();
      if (rem.v === sync.v) { if (!L.igual(E, sync.base)) await sube(sync.v); }
      else {
        const E2 = await descifraSync(rem.blob);
        const fundido = sync.base == null ? (riqueza(E) > riqueza(E2) ? L.fusiona(undefined, E2, E) : L.fusiona(undefined, E, E2)) : L.fusiona(sync.base, E, E2);
        const cambiaLocal = !L.igual(fundido, E);
        E = Object.assign(estadoNuevo(), fundido); sync.v = rem.v; sync.base = JSON.parse(JSON.stringify(E)); guarda(ESTADO, E); guarda(SYNC, sync);
        if (!L.igual(fundido, E2)) await sube(rem.v);
        if (cambiaLocal) aplicaRemoto();
      }
    }
    V.sync = 'ok'; V.syncHora = new Date(); V.syncError = '';
  } catch (e) { V.sync = 'error'; V.syncError = e.message; }
  finally { sincronizando = false; pintaSync(); if (otraVez) { otraVez = false; programaSync(); } for (const c of E.charla || []) if (!c.r && Date.now() - new Date(c.t) < 864e5) esperaRespuesta(c.id); }   // respuestas que queden por recoger
}
async function sube(v) {
  const r = await fetch(`${servidor()}/casa/${casaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ v, blob: await cifraSync(E) }) });
  if (r.status === 409) { otraVez = true; return; }   // otro móvil subió antes: en la siguiente pasada se funde
  if (!r.ok) throw new Error('subida ' + r.status);
  sync.v = (await r.json()).v; sync.base = JSON.parse(JSON.stringify(E)); guarda(SYNC, sync);
}
// Listas que dos móviles pueden haber llenado a la vez: fuera los repetidos (mismo producto o mismo nombre).
function limpiaDuplicados() {
  const uniq = (l, clave) => { const vistos = new Set(); return (l || []).filter(x => { const c = clave(x); if (vistos.has(c)) return false; vistos.add(c); return true; }); };
  const porProducto = x => x.k || L.normaliza(x.n || x.texto || '');
  const antes = JSON.stringify([E.pendientes, E.proximaCompra, E.invitaciones, E.casaOtros]);
  E.pendientes = uniq(E.pendientes, porProducto).filter(x => !(x.k && D?.productos?.[x.k] && (E.casa?.[x.k] || 0) >= (D.productos[x.k].util || 1) * 0.5));   // lo que ya está en casa no está pendiente
  E.proximaCompra = uniq(E.proximaCompra, porProducto);
  E.invitaciones = uniq(E.invitaciones, x => x.clave); E.casaOtros = [...new Set(E.casaOtros || [])];
  return antes !== JSON.stringify([E.pendientes, E.proximaCompra, E.invitaciones, E.casaOtros]);
}
// Historial con tope, para que el estado no crezca sin fin (24/10): Chef 30 mensajes y 30 días (y no más de ~20 KB),
// 10 compras (las 3 últimas con los renglones del ticket), comidas marcadas y semanas de los últimos 60 días.
function podaHistorial() {
  const antes = JSON.stringify([E.charla, E.compras, E.consumidos, Object.keys(E.semanas || {}), (E.planes || []).length]);
  const limite = iso(new Date(Date.now() - 60 * 864e5)), mes = new Date(Date.now() - 30 * 864e5).toISOString();
  let ch = (E.charla || []).filter(c => !c.r || (c.t || '') >= mes).slice(-30);
  while (ch.length > 5 && JSON.stringify(ch).length > 20000) ch = ch.slice(1);
  E.charla = ch;
  E.compras = (E.compras || []).slice(0, 10).map((c, i) => i < 3 || !c.ticket?.lineas ? c : { ...c, ticket: { ...c.ticket, lineas: undefined } });
  for (const k of Object.keys(E.consumidos || {})) if ((k.split('|')[1] || '') < limite) delete E.consumidos[k];
  for (const k of Object.keys(E.semanas || {})) if (k < limite && k !== D.semana?.id) delete E.semanas[k];
  if (E.planes) E.planes = E.planes.filter(pl => pl.id >= limite || pl.id === D.semana?.id || pl.dias?.some(d => d.f >= limite));
  return antes !== JSON.stringify([E.charla, E.compras, E.consumidos, Object.keys(E.semanas || {}), (E.planes || []).length]);
}
function aplicaRemoto() {
  if (limpiaDuplicados()) guarda(ESTADO, E);
  if (!V.montada) return;   // todavía arrancando
  if (D.amiga && E.hogar) montaAmiga();
  reconstruyeRecetas(); recalcula();
  const escribiendo = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
  if (escribiendo || $('.hoja')) { V.repintar = true; return; }
  const y = window.scrollY; pinta(); window.scrollTo(0, y);
}
const iconoSync = () => V.sync === 'ok' ? '☁️ ' : V.sync === 'error' ? '⚠️ ' : '';
function pintaSync() { const c = $('.fecha-chip'); if (c) c.textContent = iconoSync() + c.textContent.replace(/^(☁️|⚠️) /, ''); }
function iniciaSync() {
  if (!servidor()) return;
  sincroniza().then(() => { for (const c of E.charla || []) if (!c.r && Date.now() - new Date(c.t) < 864e5) esperaRespuesta(c.id); });   // respuestas que llegaron mientras la app estaba cerrada
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincroniza(); });
  setInterval(() => { if (document.visibilityState === 'visible') sincroniza(); }, 20000);
  window.addEventListener('online', sincroniza);
}

// ——— Estado guardado en el móvil ———
function estadoNuevo() { return { v: 1, semanas: {}, planes: [], casa: null, consumidos: {}, creatina: {}, perfiles: {}, gimnasio: null, avisos: {}, fijos: null, propias: [], escaneos: [], secciones: [], casaOtros: [], compras: [], favRecetas: [], fijosQuitados: [], precios: {}, pendientes: [], charla: [], proximaCompra: [], invitaciones: [], hogar: null, casaExtra: [], descartados: {} }; }
const salva = () => { guarda(ESTADO, E); programaSync(); };
function est(id) {
  if (!E.semanas[id]) E.semanas[id] = { cambios: {}, hechos: {}, marcados: {}, extra: [], quitados: {}, faltaDespensa: id === D.semana.id ? Object.fromEntries((D.semana.falta || []).map(k => [k, true])) : {}, compraHecha: false };
  const s = E.semanas[id];
  s.recetasLista ||= []; s.otrosHechos ||= {}; s.fijosHechos ||= {}; s.noComprado ||= {}; s.alternativas ||= {}; s.menos ||= {}; s.ticketCant ||= {};
  return s;
}
function perfiles() {
  const p = JSON.parse(JSON.stringify(D.perfiles));
  for (const q of L.QUIEN) Object.assign(p[q], E.perfiles[q] || {});
  const gym = E.gimnasio ?? p.gimnasio;
  if (gym) for (const q of L.QUIEN) p[q].actividad = Math.max(p[q].actividad, 1.45);
  return p;
}
function recalcula() { const p = perfiles(); fac = L.factores(p, D.base || null); obj = {}; NOM = {}; for (const q of L.QUIEN) { obj[q] = L.objetivos(p[q]); NOM[q] = p[q].nombre || q; } }
const todasRecetas = () => [...(E.propias || []), ...D.recetas];
// Casa de origen (desde el 23/10/2026): desayuno, almuerzo con Huel (cada uno el suyo) y cena sólida; sin merienda.
// Las recetas con «almuerzo» son las del almuerzo; los platos de comida pasan a ser solo de cena.
function ajustaPlanCasa() {
  if (D.amiga) return;
  if (!L.DOBLES.includes('comida')) L.DOBLES.push('comida');
  const i = L.COMIDAS.indexOf('merienda'); if (i >= 0) L.COMIDAS.splice(i, 1);
  L.NOMBRE_COMIDA.comida = 'Almuerzo';
  for (const r of todasRecetas()) {
    r.tipo0 ||= r.tipo;
    const t = r.tipo0.filter(x => x !== 'comida' && x !== 'merienda');
    if (r.almuerzo) t.push('comida');
    if (r.tipo0.includes('merienda') && !t.length) t.push(r.bebida ? 'bebida' : 'desayuno');
    r.tipo = t.length ? t : ['cena'];
  }
}
function reconstruyeRecetas() { ajustaPlanCasa(); const fav = new Set(E.favRecetas || []); recetas = Object.fromEntries(todasRecetas().map(r => { r.fav = fav.has(r.id); return [r.id, r]; })); }
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

// Lo que quitáis de «En casa» a mano no vuelve solo: se apunta cuándo (E.casaBaja) y nada automático (ajustes del ticket,
// correcciones, otro móvil que sincroniza con datos viejos) puede devolverlo. Solo vuelve si lo añadís o lo compráis después (E.casaAlta).
const ahora = () => new Date().toISOString();
const alta = k => { (E.casaAlta ||= {})[k] = ahora(); };
const baja = k => { (E.casaBaja ||= {})[k] = ahora(); };
function respetaBajas() {
  let n = 0;
  for (const [k, t] of Object.entries(E.casaBaja || {})) if (E.casa[k] != null && (E.casaAlta?.[k] || '') < t) { delete E.casa[k]; n++; }
  if (n) salva();
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
  const m = location.hash.match(/^#(clave|casa)=(.+)$/);
  if (m) {
    const nueva = normalizaClave(decodeURIComponent(m[2])), antes = leeTexto(CLAVE);
    history.replaceState(null, '', location.pathname);
    if (!antes || antes === nueva || confirm('Este móvil está abierto en otra casa. ¿Abro esta? Lo de la otra casa no se borra: para volver, escribe su clave.')) {
      guardaTexto(CLAVE, nueva); if (m[1] === 'casa' && nueva !== antes) guardaTexto(NUEVA, '1');
    }
  }
  const clave = leeTexto(CLAVE);
  if (clave && esAmiga(clave)) { ESTADO = 'nutrihome.estado.' + clave; SYNC = 'nutrihome.sync.' + clave; }
  E = Object.assign(estadoNuevo(), lee(ESTADO, {}));
  for (const k of ['propias', 'escaneos', 'secciones', 'casaOtros', 'compras', 'favRecetas', 'fijosQuitados', 'pendientes', 'charla', 'proximaCompra', 'invitaciones', 'casaExtra']) E[k] ||= [];
  if (!clave) return puerta();
  if (esAmiga(clave)) { if (!(await arrancaAmiga(clave))) return; }
  else {
    try { D = await descifra(clave); }
    catch (e) { if (e.message === 'clave') { guardaTexto(CLAVE, null); return puerta('Esa clave no abre los datos. Vuelve a escribirla.'); } return puerta(e.message); }
    await preparaSync(clave);
  }
  reconstruyeRecetas();
  if (!E.casa) E.casa = { ...(D.casa_inicial || {}) };
  if (!E.fijos) E.fijos = [...(D.fijos || [])];
  E.fijosQuitados ||= [];
  E.precios ||= {};
  // El precio del último ticket, si es más nuevo que los datos (cuando se rehacen los datos, mandan los suyos).
  for (const [k, v] of Object.entries(E.precios)) { const [pr, f] = Array.isArray(v) ? v : []; if (D.productos[k] && pr > 0 && f >= (D.generado || '').slice(0, 10)) D.productos[k].precio = pr; }
  for (const f of D.fijos || []) if (f.reemplaza) E.fijos = E.fijos.filter(x => x.texto !== f.reemplaza);   // favoritos que antes eran solo texto y ahora son el producto de Mercadona
  for (const f of D.fijos || []) if (f.reemplazaM) E.fijos = E.fijos.filter(x => !(x.m && String(x.m.id) === String(f.reemplazaM)));   // o que ahora están en el catálogo
  for (const f of D.fijos || []) { const id = idFav(f); if (!E.fijos.some(x => idFav(x) === id) && !E.fijosQuitados.includes(id)) E.fijos.push(f); }
  recalcula();
  if (D.amiga && !D.semana) { const plan = creaPlan(hoy(), diasHasta(E.hogar.diaCompra ?? 6)); E.planes = [plan]; D.semana = plan; salva(); }   // su primer menú
  consumePasados();
  pintaMarco();
  cargaBanco().then(() => {   // fotos de las recetas propias que aún no la tienen (las de antes del 24/10): se eligen una vez y se guardan
    const sin = (E.propias || []).filter(r => !r.foto);
    for (const r of sin) r.foto = fotosPara(r)[0] || undefined;
    if (sin.some(r => r.foto)) { reconstruyeRecetas(); salva(); }
    if (!document.querySelector('.hoja')) repinta();
  });
  window.addEventListener('hashchange', () => {
    const n = (location.hash.slice(1) || 'hoy').split('/')[0];
    if (SUBVISTAS.includes(n) && !SUBVISTAS.includes(V.pestana)) V.anterior = V.pestana;   // para el botón de volver
    V.pestana = VISTAS[n] ? n : 'hoy'; pinta();
  });
  V.pestana = VISTAS[location.hash.slice(1)] ? location.hash.slice(1) : 'hoy';
  pinta();
  if (servidor() && !D.amiga) await sincroniza();   // primero lo de los otros móviles: los ajustes se hacen sobre lo de toda la casa
  if (limpiaDuplicados() | podaHistorial()) salva();
  const ajuste = ajusteAutomatico();   // lo marcado con ✕ (o el ticket ya subido) cambia los platos sin que haya que pedirlo
  if (ajuste.length) setTimeout(() => hojaCambiosMenu(ajuste), 700);
  else if (novedadesNuevas().length) setTimeout(() => { if (!$('.hoja')) hojaNovedades(); }, 1200);   // lo nuevo de esta versión, una vez
  iniciaSync();   // con servidor: baja lo de los otros móviles y sube lo de este
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

const SUBVISTAS = ['semana', 'recetas'];   // se abren desde Hoy o Ajustes y tienen botón de volver
const marcaHTML = '<span class="nombre-app"><span class="nutri">Nutri</span><span class="home">Home</span></span>';
function puerta(error = '') {
  document.body.innerHTML = `
    <div class="puerta">
      <img class="logo" src="iconos/nutrihome-192.png" alt="">
      <h1>${marcaHTML}</h1>
      <p>Escribe la clave de casa. Solo se pide una vez en cada móvil.</p>
      <form id="f-clave"><label class="sr" for="clave">Clave de casa</label>
        <input id="clave" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="clave de casa" required>
        <div class="error">${esc(error)}</div>
        <button class="boton principal ancho">Entrar</button></form>
    </div>`;
  $('#f-clave').addEventListener('submit', e => { e.preventDefault(); guardaTexto(CLAVE, normalizaClave($('#clave').value)); location.reload(); });
}

function pintaMarco() {
  V.montada = true;
  document.body.innerHTML = `
    <header class="cabecera" id="cab"></header>
    <main id="vista"></main>
    <nav class="pestanas" aria-label="Secciones"><div class="dentro">
      ${PESTANAS.map(([k, t]) => `<button data-p="${k}"><span class="ic">${SVG[k === 'nosotros' ? 'ajustes' : k]}</span><span>${t}</span></button>`).join('')}
    </div></nav>
    <div class="tostada" id="tostada" role="status"></div>
    <div class="deshacer" id="deshacer" role="status"><span id="deshacer-t"></span><button id="deshacer-b">Deshacer</button></div>`;
  $$('.pestanas button').forEach(b => b.addEventListener('click', () => { if (b.dataset.p === 'nosotros') { V.ajuste = null; if (V.pestana === 'nosotros') { vNosotros(); window.scrollTo({ top: 0 }); } } location.hash = b.dataset.p; }));
  sinEmojis(document.body);
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') sinEmojis(m.target); else m.addedNodes.forEach(sinEmojis); } })
    .observe(document.body, { childList: true, subtree: true, characterData: true });
}
// Interfaz sobria (23/10/2026): fuera los emojis de todo lo que se ve. Los textos que se comparten o van al Chef no cambian.
const EMOJI = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D(?:\p{Extended_Pictographic})\uFE0F?|[\u{1F3FB}-\u{1F3FF}])*\uFE0F?/gu;
function sinEmojis(n) {
  if (n.nodeType === 3) { if (EMOJI.test(n.data)) { EMOJI.lastIndex = 0; const t = n.data.replace(EMOJI, '').replace(/ {2,}/g, ' ').replace(/^ (?=\S)/, ''); if (t !== n.data) n.data = t; } EMOJI.lastIndex = 0; return; }
  if (n.nodeType !== 1 || n.tagName === 'TEXTAREA' || n.tagName === 'INPUT') return;
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); const ts = []; while (w.nextNode()) ts.push(w.currentNode); ts.forEach(sinEmojis);
  if (n.placeholder) n.placeholder = n.placeholder.replace(EMOJI, '').trim();
}

let tEntra;
function pinta() {
  const auto = autoMenu();   // el menú, siempre al día con lo que hay en casa
  if (auto.length) setTimeout(() => tostada(`🔄 Menú adaptado a lo que hay en casa: ${auto.length} plato${auto.length > 1 ? 's' : ''}`), 300);
  const activa = V.pestana === 'claude' || SUBVISTAS.includes(V.pestana) ? 'hoy' : V.pestana;
  $$('.pestanas button').forEach(b => b.setAttribute('aria-current', b.dataset.p === activa ? 'page' : 'false'));
  const f = VISTAS[V.pestana] || vClaude;
  document.body.classList.toggle('con-barra', V.pestana === 'compra');
  document.body.classList.toggle('con-chat', esChat());   // en Compra hay un botón fijo abajo
  const vista = $('#vista');
  vista.classList.add('entra');
  f();
  $$('#vista > *').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 12)));
  clearTimeout(tEntra); tEntra = setTimeout(() => vista.classList.remove('entra'), 1100);
  if (!esChat()) window.scrollTo({ top: 0 });
}
const esChat = () => V.pestana === 'claude' || V.pestana === 'hoy';
const repinta = () => (VISTAS[V.pestana] || vClaude)();
function cabecera(titulo, sub = '') {
  const d = new Date(), enAjuste = V.pestana === 'nosotros' && !!V.ajuste, sub2 = SUBVISTAS.includes(V.pestana) || enAjuste;
  $('#cab').innerHTML = `<div class="marca">${sub2 ? `<button class="volver" id="b-volver" aria-label="Volver">${SVG.volver}</button>` : ''}${marcaHTML}
      <span class="fecha-chip">${iconoSync()}${DS[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()].slice(0, 3)}</span></div>
    <h1>${titulo}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}`;
  $('#b-volver')?.addEventListener('click', () => { if (enAjuste) { V.ajuste = null; vNosotros(); window.scrollTo({ top: 0 }); return; } location.hash = V.anterior && V.anterior !== V.pestana ? V.anterior : 'hoy'; });
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
  if (V.repintar && !rapido) { V.repintar = false; setTimeout(pinta, 350); }   // llegó algo de otro móvil mientras la hoja estaba abierta
}

// ——— Semana ———
function horaComida() { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 11 ? 'desayuno' : h < 16.5 ? 'comida' : h < 19.5 ? 'merienda' : 'cena'; }
function vSemana() {
  const p = planActivo(), pe = efectivo(p), s = est(p.id), h = hoy();
  const ultimo = p.dias.at(-1).f;
  if (!V.dia || !p.dias.some(d => d.f === V.dia)) V.dia = p.dias.find(d => d.f === h)?.f || (h < p.dias[0].f ? p.dias[0].f : p.dias.at(-1).f);
  const i = pe.dias.findIndex(d => d.f === V.dia), d = pe.dias[i];
  const fd = fecha(d.f);
  cabecera('La semana', `${d.f === h ? 'Hoy, ' : capital(DL[fd.getDay()]) + ', '}${fd.getDate()} de ${MES[fd.getMonth()]}`);
  const banners = [];
  if (h > ultimo) banners.push(`<div class="aviso"><span class="emo">🗓️</span><div><b>Semana terminada</b><div class="botones" style="margin-top:8px"><button class="boton principal" id="b-siguiente">${I.chispas}Preparar la siguiente</button></div></div></div>`);
  // Platos con cosas que no comprasteis (✕) o que no hay en casa: se ofrece cambiarlos por otros que sí podáis hacer.
  V.tengo = loQueTenemos(p, s);
  const sinCosas = platosSinCosas(pe, s);
  if (E.ultimosAuto && Date.now() - new Date(E.ultimosAuto.t) < 864e5) banners.push(letrero('auto:' + E.ultimosAuto.t, '🔄', `<b>Menú adaptado a lo que hay en casa</b>: ${E.ultimosAuto.cambios.length} plato${E.ultimosAuto.cambios.length > 1 ? 's' : ''}.<div class="botones" style="margin-top:8px"><button class="boton" id="b-ver-auto">Ver cambios</button></div>`));
  // Recetas que se preparan la noche antes (avena de la noche…): aviso desde las 17:00 del día anterior.
  const manana = masDias(h, 1), dm = planes().map(efectivo).flatMap(x => x.dias).find(x => x.f === manana);
  const deNoche = new Date().getHours() >= 17 && dm ? L.COMIDAS.flatMap(c => L.idsDe(dm[c]).filter(id => recetas[id]?.noche).map(id => ({ c, id }))) : [];
  if (deNoche.length) banners.unshift(letrero('noche:' + manana, '🌙', `<b>Esta noche, 5 minutos:</b> deja preparada ${deNoche.map(x => esc(recetas[x.id].n[0].toLowerCase() + recetas[x.id].n.slice(1))).join(' y ')} para el ${L.NOMBRE_COMIDA[deNoche[0].c].toLowerCase()} de mañana.<div class="botones" style="margin-top:8px"><button class="boton" id="b-ver-noche" data-receta-noche="${deNoche[0].id}">Ver cómo</button></div>`));
  const sinAparato = platosSinAparato(p);
  if (sinAparato.length) banners.push(letrero('aparatos:' + p.id + ':' + aparatosCasa().join(','), '🍳', `<b>${sinAparato.length} plato${sinAparato.length > 1 ? 's necesitan' : ' necesita'} ${esc(enumera([...new Set(sinAparato.map(x => nombreAparato(x.r.ap)))], 3))}</b>, que no ${L.QUIEN.length > 1 ? 'tenéis' : 'tienes'} marcado en Recetas.<div class="botones" style="margin-top:8px"><button class="boton principal" id="b-ajustar-aparatos">🔄 Cambiarlos</button></div>`));
  if (sinCosas.platos) banners.push(letrero('falta:' + p.id + ':' + [...sinCosas.claves].sort().join(','), '🛒',
    `<b>${sinCosas.platos} plato${sinCosas.platos > 1 ? 's' : ''} con cosas que no tenéis</b>: ${esc(enumera(sinCosas.nombres))}.<div class="botones" style="margin-top:8px"><button class="boton principal" id="b-ajustar">🔄 Ajustar el menú</button></div>`));
  if (E.pendientes?.length) banners.push(letrero('pend:' + E.pendientes.map(x => x.id).join(','), '🏪', `<a href="#compra" style="color:inherit;text-decoration:none"><b>Pendiente de otro súper:</b> ${esc(enumera(E.pendientes.map(x => nombreFalta(x.k) || x.n), 4))} →</a>`));
  if (!s.compraHecha && h <= p.dias[1].f) banners.push(letrero('compra:' + p.id, '🛒', '<a href="#compra" style="color:inherit;text-decoration:none"><b>Toca compra</b> · ver la lista →</a>'));
  // Jueves y viernes: recordar la próxima compra y preparar la semana que viene (su lista sale en Compra).
  const sig = planes().find(x => x.dias[0].f > h);
  if (D.amiga) { const vacios = pe.dias.filter(x => x.f >= h).reduce((n, x) => n + L.COMIDAS.filter(c => x[c] === null || (L.esDoble(x[c]) && L.QUIEN.some(q => !x[c][q]))).length, 0);
    if (vacios) banners.push(letrero('vacios:' + p.id, '🤔', `<b>${vacios} comida${vacios > 1 ? 's' : ''} sin plato</b>: no tengo recetas que encajen con todo lo que me habéis dicho. Pregúntale al Chef o elige una en Recetas.`)); }
  if (h <= ultimo && masDias(h, 2) >= masDias(ultimo, 1)) {
    if (!sig) banners.push(letrero('proxima:' + p.id, '🛒', `<b>Próxima compra:</b> el ${DL[fecha(masDias(ultimo, 1)).getDay()]}. ¿Preparo la semana que viene y su lista?<div class="botones" style="margin-top:8px"><button class="boton principal" id="b-preparar">${I.chispas}Preparar la semana</button></div>`));
    else if (!est(sig.id).compraHecha) banners.push(letrero('proxima2:' + sig.id, '🛒', '<a href="#compra" style="color:inherit;text-decoration:none"><b>Próxima compra:</b> la lista de la semana que viene ya está en Compra →</a>'));
  }
  const tot = q => L.totalesDia(d, q, recetas, D.productos, fac);
  const caja = (q, t) => {
    const o = obj[q], color = q === 'G' ? 'var(--persona-g)' : 'var(--persona-p)';
    return `<div class="anillo-caja">${anilloDoble(t.kcal / o.kcal, t.p / o.prot, color, r0(t.kcal), 'kcal')}
      <div class="quien ${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(NOM[q])}</div><div class="meta">de ${o.kcal} · 💪 ${r0(t.p)}/${o.prot} g</div></div>`;
  };
  const puntos = x => L.COMIDAS.map(c => { const v = x[c]; return `<i class="${s.hechos[x.f + '|' + c] ? 'h' : v && v.fuera ? 'f' : ''}"></i>`; }).join('');
  const avisos = [...banners, ...consejosDia(pe, i)].filter(Boolean);   // un aviso a la vez: el que más corre
  $('#vista').innerHTML = `
    ${avisos.slice(0, 1).join('')}
    <div class="dias" role="tablist">${pe.dias.map(x => { const dd = fecha(x.f); return `<button class="dia-btn${x.f === h ? ' hoy' : ''}" data-f="${x.f}" aria-pressed="${x.f === V.dia}"><span class="ds">${x.f === h ? 'hoy' : DS[dd.getDay()]}</span><span class="dn">${dd.getDate()}</span><span class="puntos">${puntos(x)}</span></button>`; }).join('')}</div>
    <div class="tarjeta anillos${L.QUIEN.length === 1 ? ' una' : ''}"><div class="anillos-cab"><b>${L.QUIEN.length === 1 ? 'Lo que comes' : 'Lo que coméis'} ${d.f === h ? 'hoy' : 'este día'}</b><span class="leyenda"><i class="l1"></i>kcal <i class="l2"></i>proteína</span></div>${L.QUIEN.map(q => caja(q, tot(q))).join('')}</div>
    ${L.COMIDAS.map(c => tarjetaComida(p, d, i, c, s, d.f === h && c === horaComida())).join('')}`;
  $$('.dia-btn').forEach(b => b.addEventListener('click', () => { V.dia = b.dataset.f; vSemana(); }));
  $$('[data-acc]').forEach(b => b.addEventListener('click', () => abrirAcciones(p, i, b.dataset.acc, b.dataset.q || null)));
  $('#b-siguiente')?.addEventListener('click', siguienteSemana);
  $('#b-ajustar')?.addEventListener('click', () => { const c = adaptaMenu(p); vSemana(); hojaCambiosMenu(c); });
  $('#b-ver-auto')?.addEventListener('click', () => hojaCambiosMenu(E.ultimosAuto.cambios));
  $('#b-ver-noche')?.addEventListener('click', e => abrirReceta(e.currentTarget.dataset.recetaNoche));
  $('#b-ajustar-aparatos')?.addEventListener('click', () => { const c = ajustaPorAparatos(p); vSemana(); hojaCambiosMenu(c); });
  $('#b-preparar')?.addEventListener('click', () => { siguienteSemana(); location.hash = 'compra'; });
  activaLetreros();
  $('.dia-btn[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// ——— El menú se adapta a la compra ———
// Lo que tenéis: lo de «En casa», lo que siempre hay (especias, despensa) y, mientras la compra no esté terminada,
// lo que pide el menú (se va a comprar), salvo lo marcado con ✕. Si la compra está terminada pero «En casa» está casi vacío,
// no se da nada por perdido: solo cuenta lo marcado con ✕.
function loQueTenemos(p, s) {
  const enCasa = Object.keys(E.casa).filter(k => E.casa[k] > 0), tengo = new Set(enCasa);
  for (const [k, x] of Object.entries(D.productos)) if (x.en_casa || x.despensa) tengo.add(k);
  if (!s.compraHecha || enCasa.length < 5) {
    const h = hoy();
    for (const d of efectivo(p).dias) if (d.f >= h) for (const c of L.COMIDAS) for (const id of L.idsDe(d[c])) for (const ing of recetas[id]?.ing || []) tengo.add(ing[0]);
    for (const x of s.extra) if (x.k) tengo.add(x.k);
    for (const f of E.fijos) if (f.k) tengo.add(f.k);
  }
  for (const k of [...Object.keys(s.noComprado), ...Object.keys(s.noHabia || {})]) if ((s.noComprado[k] || s.noHabia?.[k]) && !(E.casa[k] > 0)) tengo.delete(k);
  return tengo;
}
const faltanDe = (r, tengo) => r && tengo ? [...new Set(r.ing.map(i => i[0]).filter(k => D.productos[k] && !tengo.has(k)))] : [];
// Lo que de verdad falta: lo marcado con ✕ (en la lista o al terminar la compra) y que tampoco hay en casa.
const noTenemos = s => new Set([...Object.keys(s.noComprado), ...Object.keys(s.noHabia || {})].filter(k => (s.noComprado[k] || s.noHabia?.[k]) && D.productos[k] && !(E.casa[k] > 0)));
const faltaExplicita = (r, s) => { if (!r) return []; const no = noTenemos(s); return [...new Set(r.ing.map(i => i[0]).filter(k => no.has(k)))]; };
// Nombre corto para los avisos: «Claras de huevo líquidas pasteurizadas» → «claras»; «Queso fresco batido desnatado 0% MG» → «queso fresco batido».
const nombreFalta = k => nombreCorto(D.productos[k]).toLowerCase().replace(/\d+\s?%\s?(mg)?/g, ' ')
  .replace(/\b(desnatad[oa]s?|l[ií]quidas?|pasteurizadas?|laminad[oa]s?|limpi[oa]s?|cocid[oa]s?|coraz[oó]n|romana|virgen extra|de canarias|de huevo|lonchas|para plancha|corte fino|deshuesad[oa]s?|y sin piel|sin piel|congelad[oa]s?|finos|redonda|dulce)\b/g, '')
  .replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
// «a, b, c y 4 más»
const enumera = (arr, n = 5) => arr.length <= n ? arr.join(', ') : arr.slice(0, n).join(', ') + ` y ${arr.length - n} más`;
// Qué platos pendientes (desde hoy, sin comer) usan algo que no tenéis.
function platosSinCosas(pe, s) {
  const h = hoy(), claves = new Set(); let platos = 0;
  for (const d of pe.dias) {
    if (d.f < h) continue;
    for (const c of L.COMIDAS) {
      if (s.hechos[d.f + '|' + c]) continue;
      for (const id of L.idsDe(d[c])) { const f = faltaExplicita(recetas[id], s); if (f.length) { platos++; f.forEach(k => claves.add(k)); } }
    }
  }
  return { platos, claves, nombres: [...claves].map(nombreFalta) };
}
// Cambia cada plato pendiente que use algo que no tenéis por la mejor alternativa que sí se pueda hacer. Devuelve los cambios.
function adaptaMenu(p) {
  const s = est(p.id), h = hoy(), cambios = [], tengo = loQueTenemos(p, s);
  p.dias.forEach((d0, i) => {
    if (d0.f < h) return;
    for (const c of L.COMIDAS) {
      const k = d0.f + '|' + c;
      if (s.hechos[k]) continue;
      const v0 = efectivo(p).dias[i][c];
      if (!v0 || v0.fuera) continue;
      for (const q of (L.esDoble(v0) ? L.QUIEN : [null])) {
        const pe = efectivo(p), v = pe.dias[i][c], id = q ? v[q] : L.idDe(v), r = recetas[id];
        const falta = faltaExplicita(r, s);
        if (!r || !falta.length) continue;
        for (const kk of falta) apuntaPendiente({ k: kk, n: nombreCorto(D.productos[kk]) });   // para comprarlo en otro súper
        const nueva = L.alternativas(pe, i, c, recetas, D.productos, fac, obj.G, 99, Date.now() + i, q).find(x => !faltanDe(x, tengo).length && aptaCasa(x, q ? [q] : L.QUIEN)) || null;
        if (nueva) {
          if (q) { const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[q] = nueva.id; s.cambios[k] = base; }
          else s.cambios[k] = nueva.id;
        }
        cambios.push({ f: d0.f, c, q, de: r.n, a: nueva ? nueva.n : null, falta: falta.map(nombreFalta) });
      }
    }
  });
  s.ajustado = [...noTenemos(s)].sort().join(',');   // con estas marcas ya se ha ajustado: no se repite al abrir la app
  salva();
  return cambios;
}
// Al abrir la app: si hay platos con cosas marcadas ✕ (o que no había al terminar la compra) y no se ha ajustado todavía con esas marcas,
// se ajusta solo. Si la compra se terminó con la versión anterior (sin «noHabia»), lo que no había se recupera del resumen.
// ——— El menú sigue a lo que hay en casa, solo y siempre ———
// Tras la compra de la semana, se recorren los platos pendientes por orden (desde hoy, sin comer) «gastando» lo que hay en casa.
// Si a un plato le falta algo (no está o no llega), se cambia por el primero que se pueda hacer con lo que queda. La despensa no cuenta.
const infinito = k => { const x = D.productos[k]; return !x || x.despensa || x.en_casa || !x.util; };
// base: solo lo principal (proteína o hidrato, 30 g o más): es lo único que obliga a cambiar el plato; lo demás (ensalada, adornos) solo se avisa.
function necesita(r, qs, base = false) { const n = {}; for (const ing of r.ing) { if (base && !(['p', 'h'].includes(ing[2]) && ing[1] >= 30)) continue; for (const q of qs) { const g = L.gramos(ing, q, fac); if (g && !infinito(ing[0])) n[ing[0]] = (n[ing[0]] || 0) + g; } } return n; }
const alcanza = (n, hay) => Object.entries(n).filter(([k, g]) => (hay[k] || 0) < g * 0.7).map(([k]) => k);   // margen: lo de casa es aproximado
const semillaDe = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);   // igual en todos los móviles: eligen lo mismo
function autoMenu() {
  if (!D?.semana || !E?.casa) return [];
  respetaBajas();
  const p = planActivo(), s = est(p.id), h = hoy();
  // Correcciones publicadas (semana.json → correcciones: [{id, si: {clave: [si hay justo esto, quitar esto]}}]): solo si En casa sigue con la
  // cantidad del ticket, así que se pueden repetir sin peligro aunque la sincronización junte móviles (no hay marca que pueda viajar sola).
  if (D.semana.id === p.id) for (const c of D.semana.correcciones || []) for (const [k, [si, g]] of Object.entries(c.si || {})) {
    if (E.casa[k] == null || Math.abs(E.casa[k] - si) >= 1) continue;
    E.casa[k] = si - g; if (E.casa[k] <= 0.5) delete E.casa[k]; salva();
  }
  if (!s.compraHecha) return [];   // antes de comprar, lo que falta va a la lista
  const hay = { ...E.casa }, cambios = [];
  const principal = x => x.ing.filter(ing => ['p', 'h'].includes(ing[2]) && ing[1] >= 30 && !infinito(ing[0])).map(ing => ing[0]);
  let previo = [];   // lo principal de la comida o cena anterior (para no repetirlo seguido)
  p.dias.forEach((d0, i) => {
    if (d0.f < h) return;
    for (const c of L.COMIDAS) {
      const k = d0.f + '|' + c;
      if (s.hechos[k]) continue;
      const v = efectivo(p).dias[i][c];
      if (!v || v.fuera || v.libre) continue;
      for (const q of (L.esDoble(v) ? L.QUIEN : [null])) {
        const qs = q ? [q] : L.QUIEN, vv = efectivo(p).dias[i][c], r = recetas[q ? vv[q] : L.idDe(vv)];
        if (!r) continue;
        const faltaReal = alcanza(necesita(r, qs, true), hay);
        let n = necesita(r, qs), falta = faltaReal.filter(kk => !(E.pendientes || []).some(x => x.k === kk));   // lo apuntado para comprar ya cuenta…
        const porComprar = !falta.length && faltaReal.length > 0;   // …pero si hay otro plato que se puede hacer con lo de casa, va ese
        const sola = r.soloEnsalada && !L.DOBLES.includes(c);   // una ensalada sola no es comida ni cena: hace falta un plato principal
        const seguido = !L.DOBLES.includes(c) && principal(r).some(kk => previo.includes(kk));   // lo mismo que la comida o cena anterior
        if (falta.length || sola || seguido || porComprar) {
          const cand = L.alternativas(efectivo(p), i, c, recetas, D.productos, fac, obj.G, 99, semillaDe(k + (q || '')), q).filter(x => aptaCasa(x, qs));
          // Nada repetido en comidas y cenas: ni lo de esta semana (también lo ya comido) ni lo de otro día.
          const cerca = new Set();
          if (!L.DOBLES.includes(c)) efectivo(p).dias.forEach(d => { for (const cc of L.COMIDAS) { if (d.f === d0.f && cc === c) continue; const v2 = d[cc]; if (v2 && !v2.fuera && !v2.libre) L.idsDe(v2).forEach(x => cerca.add(x)); } });
          // Tampoco el mismo ingrediente principal en las comidas y cenas de ese día ni del día antes o después (jamoncitos a mediodía y por la noche).
          const prin = x => x.ing.filter(ing => ['p', 'h'].includes(ing[2]) && ing[1] >= 30 && !infinito(ing[0])).map(ing => ing[0]);
          const junto = new Set();
          if (!L.DOBLES.includes(c)) efectivo(p).dias.forEach((d, j) => { if (Math.abs(j - i) > 1) return; for (const cc of ['comida', 'cena']) { if (j === i && cc === c) continue; const v2 = d[cc]; if (v2 && !v2.fuera && !v2.libre) L.idsDe(v2).forEach(x => recetas[x] && prin(recetas[x]).forEach(kk => junto.add(kk))); } });
          const choca = x => prin(x).filter(kk => junto.has(kk)).length;
          const orden = (x, y) => choca(x) - choca(y) || alcanza(necesita(x, qs), hay).length - alcanza(necesita(y, qs), hay).length;
          const posibles = cand.filter(x => !alcanza(necesita(x, qs, true), hay).length).sort(orden);
          let nueva = posibles.find(x => !cerca.has(x.id) && (!seguido || !choca(x))) || (cerca.has(r.id) || seguido || porComprar ? null : posibles[0]), comprar = [];
          if (!nueva && (seguido || porComprar) && !falta.length && !sola) { /* se puede hacer y no hay otro sin repetir: se queda */ }
          else if (!nueva) {   // con lo que hay no sale ningún plato: el que menos haya que comprar, sin repetir, y lo que falta a la compra
            const noHay = new Set([...Object.keys(E.noHay || {}), ...(D.semana.correcciones || []).flatMap(cc => Object.keys(cc.si || {}).filter(kk => (cc.si[kk][1] >= cc.si[kk][0])))]);   // lo que dijeron que no hay: no se propone comprarlo
            const mejor = cand.filter(x => !cerca.has(x.id) && !x.ing.some(ing => noHay.has(ing[0]))).map(x => ({ x, f: alcanza(necesita(x, qs, true), hay) })).sort((a, b) => choca(a.x) - choca(b.x) || a.f.length - b.f.length || orden(a.x, b.x))[0];
            if (mejor && (sola || cerca.has(r.id) || mejor.f.length < falta.length)) { nueva = mejor.x; comprar = mejor.f; } else comprar = falta;
          }
          for (const kk of comprar) apuntaPendiente({ k: kk, n: nombreCorto(D.productos[kk]) });
          if (nueva) {
            if (q) { const base = L.esDoble(vv) ? { ...vv } : { G: L.idDe(vv), P: L.idDe(vv) }; base[q] = nueva.id; s.cambios[k] = base; } else s.cambios[k] = nueva.id;
            cambios.push({ f: d0.f, c, q, de: r.n, a: nueva.n, falta: (porComprar ? faltaReal : falta).map(nombreFalta), sola: sola && !falta.length, seguido: seguido && !sola && !falta.length && !porComprar, porComprar, comprar: comprar.map(nombreFalta) });
            n = necesita(nueva, qs); falta = [];
          }
        }
        for (const [kk, g] of Object.entries(n)) hay[kk] = Math.max(0, (hay[kk] || 0) - g);   // lo que se va a gastar
        if (!L.DOBLES.includes(c)) { const rr = recetas[L.idDe(efectivo(p).dias[i][c])]; previo = rr ? principal(rr) : []; }
      }
    }
  });
  if (cambios.length) { E.ultimosAuto = { t: new Date().toISOString(), cambios }; salva(); }
  return cambios;
}
// Lo que le falta a un plato concreto con lo que hay en casa (para la pastilla y la receta).
const faltaEnCasa = (r, qs = L.QUIEN) => !est(planActivo().id).compraHecha ? [] : alcanza(necesita(r, qs), E.casa || {});
function ajusteAutomatico() {
  const p = planActivo(), s = est(p.id), u = E.compras[0];
  // El ticket se subió otro día y la compra sigue sin cerrar: se cierra sola (lo comprado a «En casa», lo que no había a pendientes).
  if (s.ticket && !s.compraHecha && hoy() > (s.ticket.fecha || hoy())) { const { filas } = lineaCompra(); const res = terminarCompra(filas, true); if (res?.menu?.length) return res.menu; }
  // El menú publicado se hizo sabiendo lo que hay (el ticket): lo que usa se da por tenido, aunque el lector no lo emparejara.
  const tienen = D.semana.id === p.id && D.semana.tienen, marcaTicket = D.semana.reconciliacion || 'ticket';
  if (tienen && /^\d{4}-\d\d-\d\dT/.test(s.reconciliado || '')) { s.reconciliado = marcaTicket; salva(); }   // marca antigua (la fecha de cada publicación): ya está hecho
  if (tienen && s.reconciliado !== marcaTicket) {   // una sola vez por semana, no en cada publicación
    for (const [k, g] of Object.entries(tienen)) {
      if (!D.productos[k]) continue;
      delete s.noComprado[k]; if (s.noHabia) delete s.noHabia[k];
      E.pendientes = (E.pendientes || []).filter(x => x.k !== k);
      if (!(E.casa[k] > 0)) E.casa[k] = g;
    }
    E.casaOtros = E.casaOtros.filter(t => !Object.keys(tienen).some(k => D.productos[k] && L.parecido(t, D.productos[k].n) >= 0.6));   // ya está como producto
    for (const k of D.semana.noTienen || []) delete E.casa[k];   // lo que el lector del ticket emparejó mal
    for (const k of D.semana.noHabia || []) if (D.productos[k] && !(E.casa[k] > 0)) apuntaPendiente({ k, n: nombreCorto(D.productos[k]) });   // lo que no había según el ticket
    s.reconciliado = marcaTicket; salva();
  }
  const enCasa = Object.keys(E.casa).filter(k => D.productos[k] && E.casa[k] > 0);
  const antes = E.casaOtros.length;
  E.casaOtros = E.casaOtros.filter(t => !enCasa.some(k => L.parecido(t, D.productos[k].n) >= 0.6));   // repetido: ya está como producto
  if (E.casaOtros.length !== antes) salva();
  if (!s.noHabia && s.compraHecha && u) {
    s.noHabia = {};
    const f = iso(new Date(u.f));
    if (f >= p.dias[0].f && f <= p.dias.at(-1).f && u.no?.length) {
      const porNombre = Object.fromEntries(Object.entries(D.productos).map(([k, x]) => [L.normaliza(nombreCorto(x)), k]));
      for (const n of u.no) { const k = porNombre[L.normaliza(n)]; if (k && !(E.casa[k] > 0)) { s.noHabia[k] = true; apuntaPendiente({ k, n }); } }
    }
    salva();
  }
  const firma = [...noTenemos(s)].sort().join(',');
  if (!firma || s.ajustado === firma) return [];
  return adaptaMenu(p);
}
function htmlCambiosMenu(cambios) {
  return cambios.map(x => `<div class="cambio-menu"><div class="nota">${COMIDA_EMO[x.c]} ${DS[fecha(x.f).getDay()]} ${fecha(x.f).getDate()} · ${L.NOMBRE_COMIDA[x.c]}${x.q ? ' · ' + esc(NOM[x.q]) : ''} · ${x.sola ? 'solo era ensalada' : x.seguido ? 'repetía lo anterior' : x.porComprar ? 'había que comprar ' + esc(enumera(x.falta, 3)) : 'sin ' + esc(enumera(x.falta, 3))}</div>
    <div><s>${esc(x.de)}</s><br>${x.a ? `<b>${esc(x.a)}</b>` : '<b class="persona-g">Sin alternativa con lo que tenéis</b>'}${x.comprar?.length ? `<div class="nota">🛒 Para este hay que comprar ${esc(enumera(x.comprar, 3))}: está en «Pendiente» de Compra.</div>` : ''}</div></div>`).join('');
}
// Platos pendientes (desde hoy, sin comer) que necesitan un aparato que la casa no tiene.
function platosSinAparato(p) {
  const s = est(p.id), h = hoy(), out = [];
  for (const d of efectivo(p).dias) {
    if (d.f < h) continue;
    for (const c of L.COMIDAS) {
      if (s.hechos[d.f + '|' + c]) continue;
      const v = d[c]; if (!v || v.fuera) continue;
      for (const q of (L.esDoble(v) ? L.QUIEN : [null])) { const r = recetas[q ? v[q] : L.idDe(v)]; if (r && !sePuedeHacer(r)) out.push({ f: d.f, c, q, r }); }
    }
  }
  return out;
}
// Los cambia por la mejor alternativa que se pueda hacer en esta cocina (y, si puede ser, con lo que hay en casa).
function ajustaPorAparatos(p) {
  const s = est(p.id), cambios = [], tengo = loQueTenemos(p, s);
  for (const x of platosSinAparato(p)) {
    const i = p.dias.findIndex(d => d.f === x.f), k = x.f + '|' + x.c, pe = efectivo(p), v = pe.dias[i][x.c], qs = x.q ? [x.q] : L.QUIEN;
    const alts = L.alternativas(pe, i, x.c, recetas, D.productos, fac, obj.G, 99, Date.now() + i, x.q).filter(r => aptaCasa(r, qs));
    const nueva = alts.find(r => !faltanDe(r, tengo).length) || alts[0] || null;
    if (nueva) {
      if (x.q) { const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[x.q] = nueva.id; s.cambios[k] = base; }
      else s.cambios[k] = nueva.id;
    }
    cambios.push({ f: x.f, c: x.c, q: x.q, de: x.r.n, a: nueva ? nueva.n : null, falta: [nombreAparato(x.r.ap)] });
  }
  if (cambios.length) salva();
  return cambios;
}
function hojaCambiosMenu(cambios) {
  const n = cambios.filter(x => x.a).length;
  hoja(`<h2>🔄 Menú ajustado</h2><p class="nota">${cambios.length ? `${n} plato${n === 1 ? '' : 's'} cambiado${n === 1 ? '' : 's'} por otros que podéis hacer con lo que tenéis.${n < cambios.length ? ' Para alguno no he encontrado alternativa: cámbialo a mano o pregúntame.' : ''}` : 'Todos los platos se pueden hacer con lo que tenéis.'}</p>
    ${htmlCambiosMenu(cambios)}`);
}

function tarjetaComida(p, d, i, c, s, ahora) {
  const v = d[c], clave = d.f + '|' + c, hecho = !!s.hechos[clave];
  const mom = `<span class="momento">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}${ahora && !hecho ? '<span class="ahora-pill">AHORA</span>' : ''}${hecho ? '<span class="hecho-pill">✓ comido</span>' : ''}</span>`;
  const cls = `tarjeta comida c-${c}${hecho ? ' hecha' : ''}${ahora && !hecho ? ' ahora' : ''}`;
  if (v && v.fuera) return `<button class="${cls} fuera" data-acc="${c}"><span class="tile">🍽️</span><span class="cuerpo">${mom}<span class="nombre">Coméis fuera</span></span><span class="flecha">›</span></button>`;
  const pillFalta = r => { const f = hecho ? [] : [...new Set([...faltaExplicita(r, s), ...faltaEnCasa(r)])]; return f.length ? `<span class="pill malo">⚠️ sin ${esc(enumera(f.map(nombreFalta), 2))}</span>` : ''; };
  if (L.esDoble(v)) {
    const fila = q => { const r = recetas[v[q]]; const m = r ? L.macrosReceta(r, q, D.productos, fac) : null;
      return `<button class="fila-doble" data-acc="${c}" data-q="${q}"><span class="avatar mini ${q.toLowerCase()}">${ini(q)}</span>${r ? fotoPlato(r, 120, 'doble-foto') : ''}
        <span class="nombre-s">${r ? esc(r.n) : 'Sin plato'}${r && (pillFalta(r) || pillAparato(r)) ? '<br>' + pillFalta(r) + pillAparato(r) : ''}</span>${m ? `<span class="pill ${q.toLowerCase()}">${r0(m.kcal)}</span>` : ''}<span class="flecha">›</span></button>`; };
    return `<div class="${cls} doble">${mom}${L.QUIEN.map(fila).join('')}</div>`;
  }
  const r = recetas[L.idDe(v)];
  if (!r) return `<button class="${cls} fuera" data-acc="${c}"><span class="tile">🏠</span><span class="cuerpo">${mom}<span class="nombre">${esc(v && v.libre ? v.libre : 'Sin plato')}</span></span><span class="flecha">›</span></button>`;
  return `<button class="${cls}" data-acc="${c}">${fotoPlato(r, 200, 'comida-foto')}
    <span class="cuerpo">${mom}<span class="nombre">${esc(r.n)}</span>
      <span class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span>${pillsKcal(r)}${r.propia ? '<span class="pill">⭐</span>' : ''}${pillFalta(r)}${pillAparato(r)}</span></span>
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
  else {
    const falta = hecho ? [] : faltaExplicita(r, s);
    botones = btn('a-ver', '📖', 'Receta', falta.length ? '' : 'primaria') + btn('a-hecho', hecho ? '↩️' : '✅', hecho ? 'Desmarcar' : 'Ya comido') + btn('a-cambiar', '🔄', 'Cambiar', falta.length ? 'primaria' : '') + btn('a-fuera', '🍽️', 'Comemos fuera');
    if (falta.length) botones = `<div class="aviso" style="grid-column:1/-1;margin:0 0 4px"><span class="emo">⚠️</span><div><b>No tenéis ${esc(falta.map(nombreFalta).join(' ni '))}.</b> Cambia el plato por otro que podáis hacer.</div></div>` + botones;
  }
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
  return partes;
}

// Guarda cómo estaba un hueco del menú para poder deshacer el cambio.
function recuerdaHueco(p, k) {
  const s = est(p.id), habia = k in s.cambios, antes = s.cambios[k];
  return () => { if (habia) s.cambios[k] = antes; else delete s.cambios[k]; salva(); repinta(); };
}
function alternaFuera(p, f, c) {
  const s = est(p.id), k = f + '|' + c, actual = efectivo(p).dias.find(d => d.f === f)[c], deshaz = recuerdaHueco(p, k);
  if (actual && actual.fuera) { const orig = p.dias.find(d => d.f === f)[c]; if (orig && orig.fuera) s.cambios[k] = null; else delete s.cambios[k]; }
  else s.cambios[k] = { fuera: true };
  salva(); repinta();
  conDeshacer(actual && actual.fuera ? '↩️ Ya no coméis fuera' : '🍽️ Coméis fuera', deshaz);
}
function alternaHecho(p, f, c) {
  const s = est(p.id), k = f + '|' + c, ck = p.id + '|' + k;
  if (s.hechos[k]) { delete s.hechos[k]; tostada('Desmarcado'); }
  else {
    s.hechos[k] = 1;
    if (!E.consumidos[ck]) { E.consumidos[ck] = 1; descuentaHueco(efectivo(p).dias.find(d => d.f === f)[c]); }
    tostada('Hecho: descontado de la nevera');
  }
  salva(); repinta();
}
function siguienteSemana() {
  const ult = planActivo(), inicio = [masDias(ult.dias.at(-1).f, 1), hoy()].sort().at(-1);
  if (planes().some(x => x.id === inicio)) { V.dia = inicio; repinta(); return; }   // ya estaba preparada
  const plan = creaPlan(inicio, 7);
  E.planes = [...E.planes.filter(x => x.id !== plan.id), plan];
  V.dia = inicio; salva(); repinta(); tostada('Semana preparada');
}

// Pastillas con las kcal de cada persona (o solo de una).
const pillsKcal = (r, qs = L.QUIEN) => qs.map(q => `<span class="pill ${q.toLowerCase()}">${ini(q)} ${r0(L.macrosReceta(r, q, D.productos, fac).kcal)}</span>`).join('');
function filaReceta(r, q = null, extra = '') {
  const kc = pillsKcal(r, q ? [q] : L.QUIEN);
  return `<button class="alternativa" data-id="${r.id}"><span class="emo">${emojiReceta(r)}</span><span style="min-width:0"><span class="nombre" style="display:block">${esc(r.n)}</span>
    <span class="datos"><span class="pill">${APARATO_EMO[r.ap] || '🍴'} ${r.min}′</span>${kc}${r.propia ? '<span class="pill">⭐</span>' : ''}${extra}</span></span></button>`;
}
function abrirCambiar(p, i, c, q) {
  const pe = efectivo(p), d = pe.dias[i], v = d[c];
  const doble = L.DOBLES.includes(c) && !(v && v.fuera);
  const persona = q || (doble ? 'G' : null);
  // Primero lo que se puede hacer con lo que tenéis; lo demás, avisando de lo que falta.
  const tengo = V.tengo || loQueTenemos(p, est(p.id));
  const alts = L.alternativas(pe, i, c, recetas, D.productos, fac, obj.G, 30, Date.now(), persona).filter(r => aptaCasa(r, persona ? [persona] : L.QUIEN)).slice(0, 10)
    .map(r => ({ r, falta: faltanDe(r, tengo) })).sort((a, b) => a.falta.length - b.falta.length);
  hoja(`<h2>${COMIDA_EMO[c]} Cambiar ${L.NOMBRE_COMIDA[c].toLowerCase()}</h2><div class="nota">${persona ? `Para ${esc(NOM[persona])} · ` : ''}${capital(DL[fecha(d.f).getDay()])} ${fecha(d.f).getDate()}</div>
    ${alts.map(({ r, falta }) => filaReceta(r, persona, falta.length ? `<span class="pill malo">falta ${esc(falta.map(nombreFalta).join(', '))}</span>` : '')).join('')}`, h => {
    $$('[data-id]', h).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id, s = est(p.id), k = d.f + '|' + c, deshaz = recuerdaHueco(p, k);
      if (persona) { const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[persona] = id; s.cambios[k] = base; }
      else s.cambios[k] = id;
      salva(); cierraHoja(); repinta(); conDeshacer('Plato cambiado', deshaz);
    }));
  });
}

// ——— Receta ———
// Cambiar la foto de una receta vuestra: las 12 que mejor encajan del banco.
function elegirFoto(r) {
  const op = [...new Set([r.foto, ...fotosPara(r, 12)].filter(Boolean))];
  hoja(`<h2>Foto de la receta</h2><p class="nota">${esc(r.n)}</p>
    <div class="fotos-elegir">${op.map(f => `<button data-foto="${esc(f)}" aria-pressed="${f === r.foto}"><img src="${urlRuta(f, 300)}" alt="" loading="lazy"></button>`).join('')}</div>`, h => {
    $$('[data-foto]', h).forEach(b => b.addEventListener('click', () => {
      E.propias = E.propias.map(x => x.id === r.id ? { ...x, foto: b.dataset.foto } : x);
      reconstruyeRecetas(); salva(); cierraHoja(); tostada('Foto cambiada'); abrirReceta(r.id);
    }));
  });
}
function abrirReceta(id, ctx) {
  const r = recetas[id];
  if (!r) return;
  const solo = ctx?.q || null;   // en los desayunos y meriendas de cada uno, solo su ración
  const quienes = solo ? [solo] : L.QUIEN, una = quienes.length === 1;
  const mac = Object.fromEntries(quienes.map(q => [q, L.macrosReceta(r, q, D.productos, fac)]));
  const filas = r.ing.map(ing => {
    const x = D.productos[ing[0]], necesita = quienes.reduce((t, q) => t + (L.gramos(ing, q, fac) || 0), 0);
    const marca = infinito(ing[0]) ? '' : (E.casa[ing[0]] || 0) >= necesita * 0.7 ? '<span class="hay si">✓</span>' : '<span class="hay no">✕</span>';
    return `<div class="ing-fila${una ? ' una' : ''}"><span>${marca}${esc(nombreCorto(x))}</span>${quienes.map(q => { const g = L.gramos(ing, q, fac); return `<span class="c persona-${q.toLowerCase()}">${g ? esc(L.cantidadTexto(ing[0], g, D.productos)) : '—'}</span>`; }).join('')}</div>`;
  }).join('') + [...(r.otros || []), ...(r.basicos || [])].map(t => `<div class="ing-fila${una ? ' una' : ''}"><span class="otro">${esc(t)}</span>${quienes.map(() => '<span class="c">·</span>').join('')}</div>`).join('');
  const m = (q, x) => {
    const o = obj[q], color = q === 'G' ? 'var(--persona-g)' : 'var(--persona-p)';
    const bm = (e, v, max) => `<div class="bm"><span>${e}</span>${miniBarra(v / max * 100, color)}<span>${r0(v)} g</span></div>`;
    return `<div class="m ${q.toLowerCase()}"><b class="persona-${q.toLowerCase()}">${esc(NOM[q])}</b><span class="k">${r0(x.kcal)} <small style="font-size:13px">kcal</small></span>
      <div class="barras">${bm('Prot.', x.p, o.prot * 0.4)}${bm('Hidr.', x.hc, o.hc * 0.4)}${bm('Grasa', x.g, o.grasa * 0.4)}</div></div>`;
  };
  const plan = planActivo();
  const tipoPrincipal = r.tipo?.[0] || 'comida';
  hoja(`${urlFoto(r) ? `<div class="ficha-foto">${fotoPlato(r, 900, 'foto')}${r.propia ? '<button class="ficha-cambiar" id="b-foto">Cambiar foto</button>' : ''}</div>` : ''}<div class="portada-hoja c-${tipoPrincipal}"><span class="emo">${emojiReceta(r)}</span><div><h2>${esc(r.n)}</h2>
      <div class="botones" style="margin-top:8px"><span class="pill verde">${APARATO_EMO[r.ap] || '🍴'} ${APARATO[r.ap] || 'Cocina'}</span><span class="pill">⏱ ${r.min}′</span>${r.propia ? '<span class="pill">⭐ vuestra</span>' : ''}</div></div></div>
    ${!sePuedeHacer(r) ? `<div class="aviso"><span class="emo">🍳</span><div><b>Necesita ${esc(nombreAparato(r.ap))}</b>, que no ${L.QUIEN.length > 1 ? 'tenéis' : 'tienes'} marcado en Recetas.</div></div>` : conHorno(r) ? '<div class="aviso"><span class="emo">🔥</span><div><b>Sin air fryer, en el horno:</b> a 200 °C con ventilador, unos 5 o 10 minutos más que en la receta y dándole la vuelta a mitad.</div></div>' : ''}
    <div class="macros${una ? ' una' : ''}">${quienes.map(q => m(q, mac[q])).join('')}</div>
    <h3>🥕 Ingredientes</h3>
    <div class="ing-lista"><div class="ing-fila cab${una ? ' una' : ''}"><span>Ingrediente</span>${quienes.map(q => `<span class="c persona-${q.toLowerCase()}">${esc(NOM[q])}</span>`).join('')}</div>${filas}</div>
    ${r.prep?.length ? `<h3>🧺 Antes de empezar</h3><ul class="prep">${r.prep.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${r.detalle?.length ? `<div class="segmento dos" role="tablist"><button data-modo="resumen" aria-selected="${!V.detalle}">Resumen</button><button data-modo="detalle" aria-selected="${!!V.detalle}">👩‍🍳 Paso a paso detallado</button></div>` : '<h3>👩‍🍳 Paso a paso</h3>'}
    <ol class="pasos">${(V.detalle && r.detalle?.length ? r.detalle : r.pasos).map(x => `<li><span>${esc(x)}</span></li>`).join('') || '<li><span>Sin pasos apuntados.</span></li>'}</ol>
    ${r.truco ? `<div class="aviso"><span class="emo">💡</span><div><b>Truco:</b> ${esc(r.truco)}</div></div>` : ''}
    ${r.nota ? `<div class="aviso"><span class="emo">💡</span><div>${esc(r.nota)}</div></div>` : ''}
    <button class="boton suave ancho" id="b-duda-receta" style="margin-top:10px">💬 ¿Dudas? Pregúntale al Chef</button>
    <div class="botones" style="margin-top:14px"><button class="boton" id="b-compartir-receta">📤 Compartir</button><button class="boton" id="b-fav-receta">${r.fav ? 'Quitar de favoritas' : 'Favorita'}</button><button class="boton suave" id="b-a-lista">${I.carro}A la lista</button>
      ${r.propia ? `<button class="boton" id="b-editar">${I.lapiz}Editar</button><button class="boton" id="b-claude-receta">${I.enviar}Al Chef</button><button class="boton peligro" id="b-borrar-receta" aria-label="Borrar">${I.papelera}</button>` : ''}</div>
    ${ctx ? '' : `<h3>${I.calendario} Ponerla en el menú</h3><div class="botones">
      <select id="s-dia" class="boton">${plan.dias.map(d => `<option value="${d.f}">${DS[fecha(d.f).getDay()]} ${fecha(d.f).getDate()}</option>`).join('')}</select>
      <select id="s-com" class="boton">${(r.tipo || L.COMIDAS).map(c => `<option value="${c}">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}</option>`).join('')}</select>
      ${L.QUIEN.length > 1 ? `<select id="s-quien" class="boton"><option value="">👫 Los dos</option>${L.QUIEN.map(q => `<option value="${q}">${esc(NOM[q])}</option>`).join('')}</select>` : ''}
      <button class="boton principal" id="b-poner">Poner</button></div>`}`, h => {
    $('#b-foto', h)?.addEventListener('click', () => elegirFoto(r));
    $('#b-compartir-receta', h)?.addEventListener('click', () => compartirTexto(r.n, recetaParaCompartir(r), '📋 Receta copiada: pégala donde quieras'));
    $('#b-poner', h)?.addEventListener('click', () => {
      const f = $('#s-dia', h).value, c = $('#s-com', h).value, q = $('#s-quien', h)?.value || '', s = est(plan.id), k = f + '|' + c;
      if (q) { const v = efectivo(plan).dias.find(d => d.f === f)[c]; const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[q] = r.id; s.cambios[k] = base; }
      else s.cambios[k] = r.id;
      salva(); cierraHoja(); tostada('Puesta en el menú'); repinta();
    });
    $('#b-a-lista', h).addEventListener('click', () => elegirRaciones(r));
    $$('[data-modo]', h).forEach(b => b.addEventListener('click', () => { V.detalle = b.dataset.modo === 'detalle'; const y = h.scrollTop; abrirReceta(id, ctx); requestAnimationFrame(() => { const n = $('.hoja'); if (n) n.scrollTop = y; }); }));
    $('#b-duda-receta', h).addEventListener('click', () => irAClaude('', null, { receta: recetaParaChef(r) }));
    $('#b-fav-receta', h).addEventListener('click', e => {
      E.favRecetas = r.fav ? E.favRecetas.filter(x => x !== r.id) : [...E.favRecetas, r.id];
      reconstruyeRecetas(); salva(); e.currentTarget.textContent = r.fav ? 'Quitar de favoritas' : 'Favorita'; e.currentTarget.classList.add('pop');
      tostada(r.fav ? '❤️ En vuestras favoritas' : 'Quitada de favoritas'); if (V.pestana === 'recetas') vRecetas();
    });
    $('#b-editar', h)?.addEventListener('click', () => editorReceta(r));
    $('#b-claude-receta', h)?.addEventListener('click', () => irAClaude(textoReceta(r)));
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
  if (L.QUIEN.length === 1) { est(planCompra().id).recetasLista.push({ id: uid(), r: r.id, quien: L.QUIEN[0] }); salva(); cierraHoja(); tostada(`🛒 ${r.n}: a la lista`); if (V.pestana === 'compra') vCompra(); else location.hash = 'compra'; return; }
  hoja(`<h2>🛒 ${esc(r.n)}</h2><div class="nota">¿Para quién?</div>
    <div class="acciones-grid" style="margin-top:12px">
      <button class="accion primaria" data-quien="${L.QUIEN.join('')}"><span class="emo">👫</span>Los dos</button>
      ${L.QUIEN.map(q => `<button class="accion" data-quien="${q}"><span class="avatar mini ${q.toLowerCase()}">${ini(q)}</span>${esc(NOM[q])}</button>`).join('')}</div>`, h => {
    $$('[data-quien]', h).forEach(b => b.addEventListener('click', () => {
      est(planCompra().id).recetasLista.push({ id: uid(), r: r.id, quien: b.dataset.quien });
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
    <div class="nota">${D.amiga ? 'Cantidades para una ración normal; la de cada uno sale sola.' : `Cantidades para una ración (${esc(NOM.G)}); la de ${esc(NOM.P)} sale sola.`}</div>
    <h3>📛 Nombre</h3><input class="campo-texto" id="r-nombre" placeholder="Pollo con ñoquis" value="${esc(v.n)}">
    <h3>🥕 Ingredientes</h3><textarea class="campo-texto" id="r-ing" placeholder="150 g de pechuga de pollo&#10;125 g de ñoquis&#10;100 g de tomate cherry&#10;1 cucharadita de aceite">${esc(v.ing)}</textarea>
    <div class="reconocidos" id="r-reco"></div>
    <h3>👩‍🍳 Cómo se hace</h3><textarea class="campo-texto" id="r-pasos" placeholder="Pollo en dados con sal. Air fryer 180 °C, 12 minutos…">${esc(v.pasos)}</textarea>
    <h3>🕐 ¿Cuándo?</h3><div class="botones" id="r-tipo">${L.COMIDAS.map(c => `<button type="button" class="chip" data-tipo="${c}" aria-pressed="${v.tipo.includes(c)}">${COMIDA_EMO[c]} ${L.NOMBRE_COMIDA[c]}</button>`).join('')}</div>
    <h3>🍳 ¿Con qué?</h3><div class="botones" id="r-ap">${['airfryer', 'horno', 'plancha', 'micro', 'olla', 'batidora', 'sin'].map(a => `<button type="button" class="chip" data-ap="${a}" aria-pressed="${v.ap === a}">${APARATO_EMO[a]} ${APARATO[a]}</button>`).join('')}
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
      nuevaR.foto = r?.foto && r.n === n ? r.foto : fotosPara(nuevaR)[0] || undefined;   // la foto sale sola; si cambia el nombre, se vuelve a elegir
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
let idaKcache = null;
const idaK = () => idaKcache ||= Object.fromEntries(Object.entries(D.productos).filter(([, x]) => x.id).map(([kk, x]) => [String(x.id), kk]));
const deAlgolia = h => ({ id: String(h.id), n: h.display_name, foto: (h.thumbnail || '').replace('h=300&w=300', 'h=160&w=160'),
  precio: parseFloat(h.price_instructions?.unit_price) || 0, ref: parseFloat(h.price_instructions?.reference_price) || 0,
  env: [h.packaging, tamano(h.price_instructions)].filter(Boolean).join(' '), cat: h.categories?.[0]?.name || 'Otros', k: idaK()[String(h.id)] || null });
async function buscaMercadona(q, n = 6) {
  const k = L.normaliza(q) + '|' + n;
  if (cacheMerca.has(k)) return cacheMerca.get(k);
  const r = await fetch(ALGOLIA, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ params: 'query=' + encodeURIComponent(q) + '&hitsPerPage=' + n }) });
  if (!r.ok) throw new Error('Mercadona no responde');
  const j = await r.json();
  const res = (j.hits || []).filter(h => h.published !== false).map(deAlgolia);
  cacheMerca.set(k, res);
  return res;
}
// «quiero papel higiénico» → «papel higiénico»
const limpiaPeticion = t => t.trim().replace(/^[¿¡\s]+/, '').replace(/^(quiero|queremos|necesito|necesitamos|añade|añadir|apunta|pon|compra|comprar|me hace falta|hace falta|falta|faltan)\s+/i, '')
  .replace(/^(un|una|unos|unas|el|la|los|las)\s+/i, '').replace(/[.?!]+$/, '').trim();

// ——— Compra ———
const BASICOS = /^(sal|agua|hielo|pimienta|pimienta negra|sal y pimienta|cilantro|perejil|albahaca|oregano|pimenton|canela|comino)$/;
const ordenSeccion = n => { const i = SECCIONES.indexOf(n); if (i >= 0) return i; const j = (E.secciones || []).findIndex(s => s.n === n); return j >= 0 ? 60 + j : 99; };
// La lista de la compra es para la semana que toca comprar: la que viene, si ya está preparada y faltan dos días o menos
// (o la de ahora ya está comprada); si no, la de ahora.
function planCompra() {
  const h = hoy(), act = planActivo(), sig = planes().find(x => x.dias[0].f > h);
  return sig && (masDias(h, 2) >= sig.dias[0].f || est(act.id).compraHecha) ? sig : act;
}
function lineaCompra() {
  const p = planCompra(), s = est(p.id), h = hoy();
  const desde = h > p.dias[0].f ? h : null, pe = efectivo(p);
  const nec = L.necesidades(pe, recetas, fac, desde);
  const tienen = D.semana.id === p.id && D.semana.tienen ? D.semana.tienen : null;   // el menú publicado se hizo sabiendo lo que hay: eso no se pide
  if (tienen) for (const k of Object.keys(tienen)) delete nec[k];
  if (!s.compraHecha) for (const f of E.fijos) if (f.k && D.productos[f.k]) nec[f.k] = (nec[f.k] || 0) + (f.n || 1) * D.productos[f.k].util;   // los favoritos, solo hasta hacer la compra
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
  const vistas = filas.filter(f => !s.quitados[f.k]).map(f => ({ ...f, clave: f.k, fijo: E.fijos.some(x => x.k === f.k) }))
    .map(f => s.menos[f.k] ? { ...f, envases: f.envases - Math.min(f.envases, s.menos[f.k]), precio: (f.envases - Math.min(f.envases, s.menos[f.k])) * D.productos[f.k].precio } : f).filter(f => f.envases > 0);
  if (!s.compraHecha) for (const k of Object.keys(s.faltaDespensa)) if (s.faltaDespensa[k] && D.productos[k]) vistas.push({ k, clave: k, envases: 1, precio: D.productos[k].precio, despensa: true });
  for (const x of s.extra) {
    const enLista = x.k && vistas.find(v => v.k === x.k);
    if (enLista) { enLista.envases += x.n || 1; enLista.precio += (x.n || 1) * D.productos[x.k].precio; (enLista.extras ||= []).push(x.id); enLista.manual = true; continue; }
    if (x.k) vistas.push({ k: x.k, clave: 'x:' + x.id, envases: x.n || 1, precio: (x.n || 1) * D.productos[x.k].precio, extra: x.id, manual: true });
    else if (x.m) vistas.push({ k: null, m: x.m, clave: 'x:' + x.id, envases: x.n || 1, precio: (x.n || 1) * (x.m.precio || 0), extra: x.id, manual: true, nivel: x.v });
    else vistas.push({ k: null, clave: 'x:' + x.id, texto: x.texto, n: x.n, extra: x.id, manual: true, nivel: x.v, img: x.img, sec: x.sec });
  }
  for (const x of E.proximaCompra || []) {   // lo que se acabó en casa
    if (x.k && D.productos[x.k]) { if (s.quitados[x.k]) continue; const enLista = vistas.find(v => v.k === x.k); if (enLista) { enLista.proxima = true; continue; } vistas.push({ k: x.k, clave: x.k, envases: 1, precio: D.productos[x.k].precio, proxima: true }); }
    else vistas.push({ k: null, clave: 'px:' + x.id, texto: x.n, proxima: true });
  }
  if (!s.compraHecha) for (const f of E.fijos) if (f.texto && !s.fijosHechos['f:' + f.texto]) vistas.push({ k: null, clave: 'f:' + f.texto, texto: f.texto, fijo: true });
  if (!s.compraHecha) for (const f of E.fijos) if (f.m && !s.fijosHechos['f:m:' + f.m.id]) vistas.push({ k: null, m: f.m, clave: 'f:m:' + f.m.id, envases: f.n || 1, precio: (f.n || 1) * (f.m.precio || 0), fijo: true });
  for (const [kk, o] of otros) vistas.push({ k: null, clave: kk, texto: o.texto, otro: true, para: o.para });
  for (const v of vistas) v.seccion = v.k ? D.productos[v.k].cat : v.m ? v.m.cat : v.sec || 'Otros';
  vistas.sort((a, b) => (ordenSeccion(a.seccion) - ordenSeccion(b.seccion)) || nombreFila(a).localeCompare(nombreFila(b), 'es'));
  const quitar = Object.keys(s.quitados).filter(k => s.quitados[k] === true);   // los vaciados ('oculto') siguen fuera de la lista, pero ya no se enseñan
  return { p, s, filas: vistas, despensa: s.despensaOculta ? [] : despensa.filter(f => !s.faltaDespensa[f.k] && !(s.despensaVista || {})[f.k]), total: vistas.reduce((t, f) => t + (f.precio || 0), 0), totalMenu: total, quitados: quitar };
}
const nombreFila = f => f.k ? nombreCorto(D.productos[f.k]) : f.m ? f.m.n : f.texto;
const nivelDe = f => f.k ? L.veredicto(L.nutrientesDe(D.productos[f.k])).nivel : f.nivel || null;
const pillNivel = n => n ? `<span class="pill ${n}">${L.NIVEL[n].e}</span>` : '';

// Tarjeta de arriba: subir el ticket digital; con el ticket ya leído, terminar; y, recién terminada, ver la última compra.
const fechaCorta = f => { const d = fecha(f); return `${DS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };
function tarjetaTicket(s, marcas) {
  if (!esMercadona()) return '';   // el ticket digital es el de Mercadona
  const u = E.compras[0];
  if (s.ticket) return `<div class="tarjeta pregunta ticket-ok"><span class="emo">🧾</span><div class="t"><b>Ticket${s.ticket.fecha ? ' del ' + fechaCorta(s.ticket.fecha) : ''} · ${euros(s.ticket.total)}</b>
    <span class="nota">${s.ticket.fuera.length ? `＋ ${s.ticket.fuera.length} fuera de la lista · ` : ''}ya puedes terminar</span></div><button class="boton" id="b-ver-ticket">Ver</button></div>`;
  if (!marcas && u && Date.now() - new Date(u.f) < 4 * 864e5) return `<div class="tarjeta pregunta"><span class="emo">🗂️</span><div class="t"><b>Compra del ${fechaCorta(iso(new Date(u.f)))}</b>
    <span class="nota">${u.no.length ? `✕ ${u.no.length} no había` : '✓ No faltó nada'}${u.ticket ? ' · 🧾 ' + euros(u.ticket.total) : ''}</span></div><button class="boton" id="b-ultima">Ver</button></div>`;
  return `<div class="tarjeta pregunta"><span class="emo">🧾</span><div class="t"><b>Ticket digital</b><span class="nota">El PDF del correo o una foto: marco la lista</span></div><button class="boton principal" id="b-ticket">Subir</button></div>`;
}

// Compra por encima del presupuesto: cambia platos (desde hoy, sin tocar lo comido) hasta que la lista entre, contando lo que hay en casa.
// El presupuesto es semanal: si el menú es de menos días (la primera semana, hasta el día de compra), se reparte.
const topeDe = p => E.hogar?.presupuesto ? Math.round(E.hogar.presupuesto * Math.min(7, p.dias.length) / 7 * 100) / 100 : null;
function ajustaAlPresupuesto() {
  const { p, s, total } = lineaCompra(), tope = topeDe(p), desde = hoy();
  if (!tope) return;
  const pe = efectivo(p), menu = L.listaCompra(L.necesidades(pe, recetas, fac, desde), D.productos, E.casa || {}).total;
  const fijo = Math.max(0, total - menu);   // favoritos, añadidos a mano…: no son del menú
  const plan = { ...pe, dias: pe.dias.map(d => { const x = { ...d }; for (const c of L.COMIDAS) if (s.hechos[d.f + '|' + c]) x[c] = { libre: 'comido' }; return x; }) };
  const res = L.ajustaPresupuesto(plan, recetas, D.productos, fac, E.casa || {}, tope - fijo, aptaCasa, desde);
  if (!res.cambios.length) { hoja(`<h2>💶 Presupuesto</h2><p>${res.cabe ? 'Ya estáis dentro.' : `Con las recetas que podéis comer no encuentro un menú más barato: la compra mínima es ${euros(fijo + res.despues)} y el presupuesto, ${euros(tope)}.`}</p>${caros(pe)}<p class="nota">Podéis cambiar alguno de esos platos a mano, quitar favoritos o cosas añadidas, comer fuera algún día o subir el presupuesto en Nosotros.</p>`); return; }
  const antes = JSON.stringify(s.cambios);
  res.plan.dias.forEach((d, i) => { for (const c of L.COMIDAS) if (JSON.stringify(d[c]) !== JSON.stringify(pe.dias[i][c]) && !s.hechos[d.f + '|' + c]) s.cambios[d.f + '|' + c] = d[c]; });
  salva(); pinta();
  const ahorro = res.antes - res.despues;
  hoja(`<h2>💶 Ajustado al presupuesto</h2><p>${res.cabe ? `✓ La compra baja a <b>${euros(fijo + res.despues)}</b> (presupuesto ${euros(tope)}).` : `He bajado ${euros(ahorro)}, hasta <b>${euros(fijo + res.despues)}</b>. Con vuestras recetas no se puede bajar más: os pasáis ${euros(fijo + res.despues - tope)}.${caros(res.plan)}`}</p>
    ${res.cambios.map(x => `<div class="cambio-menu"><div class="nota">${COMIDA_EMO[x.c]} ${DS[fecha(x.f).getDay()]} ${fecha(x.f).getDate()} · ${L.NOMBRE_COMIDA[x.c]}${x.q ? ' · ' + esc(NOM[x.q]) : ''} · −${euros(x.ahorro)}${x.repite ? ' · se cocina para dos días' : ''}</div><div><s>${esc(x.de)}</s><br><b>${esc(x.a)}</b></div></div>`).join('')}
    <div class="botones" style="margin-top:12px"><button class="boton" id="b-deshacer-pres">Deshacer</button></div>`);
  $('#b-deshacer-pres')?.addEventListener('click', () => { s.cambios = JSON.parse(antes); salva(); cierraHoja(); pinta(); });
}

// Los platos que más encarecen la compra (de hoy en adelante).
function caros(plan) {
  const vistos = new Map();
  for (const d of plan.dias) if (d.f >= hoy()) for (const c of ['comida', 'cena']) { const r = recetas[L.idDe(d[c])]; if (r && !vistos.has(r.id)) vistos.set(r.id, { n: r.n, e: L.QUIEN.reduce((t, q) => t + L.macrosReceta(r, q, D.productos, fac).coste, 0) }); }
  const top = [...vistos.values()].sort((a, b) => b.e - a.e).slice(0, 3);
  return top.length ? `<p class="nota" style="margin-top:8px">Lo que más encarece: ${top.map(x => `${esc(x.n)} (${euros(x.e)})`).join(' · ')}.</p>` : '';
}

// Buscador para listas largas: filtra las filas de la vista sin repintar; oculta las secciones que se quedan vacías.
const buscadorLista = (n, txt = 'Buscar en la lista') => n > 10 ? `<input class="campo-texto buscador-lista" id="i-filtra" type="search" placeholder="${txt}" autocomplete="off" value="${esc(V.filtraDe === V.pestana ? V.filtra || '' : '')}">` : '';
function activaBuscador() {
  const i = $('#i-filtra'); if (!i) { V.filtra = ''; return; }
  const filtra = () => {
    const q = L.normaliza(i.value.trim()); V.filtra = i.value; V.filtraDe = V.pestana;
    $$('#vista .lista').forEach(l => {
      let vis = 0;
      l.querySelectorAll('.producto').forEach(f => { const si = !q || L.normaliza(f.innerText).includes(q); f.style.display = si ? '' : 'none'; if (si) vis++; });
      l.style.display = vis ? '' : 'none';
      const cab = l.previousElementSibling; if (cab?.classList.contains('cat')) cab.style.display = vis ? '' : 'none';
    });
  };
  i.addEventListener('input', filtra); if (i.value) filtra();
}

function vCompra() {
  const { p, s, filas, despensa, total, quitados } = lineaCompra();
  const comprados = filas.filter(f => s.marcados[f.clave]), noHabia = filas.filter(f => s.noComprado[f.clave]), porComprar = filas.filter(f => !s.marcados[f.clave] && !s.noComprado[f.clave]);
  const conTicket = !!s.ticket;
  cabecera('Compra', `${nombreSuper()} · ${filas.length} productos${esMercadona() ? '' : ' · precios de Mercadona'}`);
  const tope = topeDe(p);
  const filaHTML = f => {
    const x = f.k ? D.productos[f.k] : null, estado = s.marcados[f.clave] ? 'si' : s.noComprado[f.clave] ? 'no' : '';
    const foto = x && x.foto ? x.foto : f.m ? f.m.foto : f.img;
    const etiquetas = [f.fijo ? '<span class="pill">⭐</span>' : '', f.despensa ? '<span class="pill">🫙</span>' : '', f.otro ? `<span class="pill">📝 ${esc(f.para)}</span>` : '', f.manual ? pillNivel(nivelDe(f)) : '', f.manual ? '<span class="pill">✏️ añadido</span>' : '', f.proxima ? '<span class="pill">🛒 se acabó</span>' : '',
      estado === 'no' ? '<span class="pill malo">no había</span>' : estado === 'si' ? '<span class="pill bueno">comprado</span>' : ''].join('');
    const cant = x ? L.cantidadCompra(f, D.productos) : f.m ? `${f.envases > 1 ? f.envases + ' × ' : ''}${f.m.env}` : f.n && f.n !== 1 ? String(f.n) : '';
    return `<div class="fila-desliza" data-fila="${esc(f.clave)}"><button class="producto ${estado}" data-info="${esc(f.clave)}">
      ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy" width="50" height="50"${f.img ? ' style="object-fit:contain"' : ''}>` : `<div class="sinfoto">${f.otro ? '📝' : emojiSeccion(f.seccion)}</div>`}
      <span class="info"><span class="pn">${esc(nombreFila(f))}</span><span class="pc">${esc(cant)}${etiquetas}</span></span>
      <span class="pp">${f.precio ? euros(f.precio) : ''}</span><span class="flecha">›</span></button></div>`;
  };
  const porSecciones = lista => {
    let sec = '', html = ''; const cuenta = {};
    for (const f of lista) cuenta[f.seccion] = (cuenta[f.seccion] || 0) + 1;
    for (const f of lista) { if (f.seccion !== sec) { if (sec) html += '</div>'; sec = f.seccion; html += `<div class="cat"><span class="emo">${emojiSeccion(sec)}</span>${esc(sec)}<span class="num">${cuenta[sec]}</span></div><div class="lista">`; } html += filaHTML(f); }
    return html + (sec ? '</div>' : '');
  };
  const noFilas = noHabia.filter(f => s.alternativas[f.clave]?.estado !== 'nada' && s.alternativas[f.clave]?.estado !== 'aceptada');
  const recetasLista = s.recetasLista.map(x => recetas[x.r] ? `<div class="producto fila-simple"><div class="sinfoto">${emojiReceta(recetas[x.r])}</div><div class="info"><div class="pn">${esc(recetas[x.r].n)}</div><div class="pc">para ${x.quien === 'GP' ? 'los dos' : esc(NOM[x.quien] || x.quien)}</div></div><button class="icono" data-quitar-receta="${x.id}" aria-label="Quitar">${I.papelera}</button></div>` : '').join('');
  const seccionesLista = [...new Set(filas.map(f => f.seccion))];
  $('#vista').innerHTML = `
    <div class="hero"><div><div class="grande">${euros(total)}</div><div class="sub">${esc(p.titulo || 'Esta semana')}</div>${tope ? `<div class="sub">${total > tope ? '⚠️ Te pasas del presupuesto' : '✓ Dentro del presupuesto'}: ${euros(tope)}</div>${total > tope && !s.compraHecha ? '<button class="boton" id="b-presupuesto" style="margin-top:8px">💶 Ajustar al presupuesto</button>' : ''}` : ''}</div><span class="hero-emo">🛒</span></div>
    <div class="rapidas">
      <button class="rapida" id="b-anadir"><span class="emo">➕</span>Añadir</button>
      <button class="rapida" id="b-receta-lista"><span class="emo">🍲</span>Receta</button>
      <button class="rapida" id="b-favoritos"><span class="emo">⭐</span>Favoritos</button>
      <button class="rapida" id="b-mas"><span class="emo">⋯</span>Más</button>
    </div>
    ${tarjetaTicket(s, comprados.length + noHabia.length > 0)}
    ${buscadorLista(filas.length + (E.pendientes || []).length, 'Buscar en la compra')}
    ${seccionPendientes()}
    ${D.semana.id === p.id && D.semana.avisoCompra ? letrero('avisoCompra:' + p.id + ':' + D.semana.avisoCompra.length, '💡', `<b>Chef:</b> ${esc(D.semana.avisoCompra)}`) : ''}
    ${recetasLista ? `<div class="cat"><span class="emo">🍲</span>Recetas añadidas</div><div class="lista">${recetasLista}</div>` : ''}
    ${noHabia.length ? `<div class="cat"><span class="emo">✕</span>No había<span class="num">${noHabia.length}</span></div><div class="lista">${noHabia.map(filaHTML).join('')}</div>
      <div class="botones" style="margin:8px 0 2px"><button class="chip" id="b-enviar-no">📤 Enviar lo que no había</button></div>` : ''}
    ${noFilas.length ? `<div class="cat"><span class="emo">🔁</span>No lo había: ¿otra cosa?</div><div id="alternativas">${noFilas.map(f => `<div class="tarjeta alt-prop" data-alt="${esc(f.clave)}"><div class="nota">✕ ${esc(nombreFila(f))}</div><div class="alt-cuerpo"><div class="cargando"></div></div></div>`).join('')}</div>` : ''}
    ${porComprar.length ? porSecciones(porComprar) : !comprados.length && !noHabia.length ? '<div class="vacio"><span class="emo">🎉</span>No falta nada para el menú.</div>' : ''}
    ${comprados.length ? `<details class="tarjeta comprados"><summary>✓ Comprado · ${comprados.length}</summary><div class="lista" style="margin-top:8px">${comprados.map(filaHTML).join('')}</div></details>` : ''}
    ${despensa.length ? `<div class="cat"><span class="emo">🫙</span>¿Os queda?<span class="num">${despensa.length}</span><button class="cat-accion" id="b-ocultar-despensa">Ocultar</button></div><div class="lista">${despensa.map(f => `<div class="producto fila-simple"><div class="sinfoto">${emojiSeccion(D.productos[f.k].cat)}</div><div class="info"><div class="pn">${esc(nombreCorto(D.productos[f.k]))}</div><div class="pc">lo usa el menú</div></div><button class="chip si" data-queda="${f.k}">✓ Queda</button><button class="chip" data-falta="${f.k}">＋ Comprar</button></div>`).join('')}</div>` : ''}
    ${quitados.length ? `<div class="cat"><span class="emo">↩️</span>Quitados de la lista<span class="num">${quitados.length}</span><button class="cat-accion" id="b-vaciar-quitados">Vaciar</button></div><div class="lista">${quitados.map(k => `<div class="producto fila-simple"><div class="sinfoto">${emojiSeccion(D.productos[k]?.cat || 'Otros')}</div><div class="info"><div class="pn">${esc(nombreCorto(D.productos[k] || { n: k }))}</div></div><button class="chip" data-volver="${k}">↺ Volver</button><button class="icono" data-olvidar="${k}" aria-label="Quitar de aquí">${I.papelera}</button></div>`).join('')}</div>` : ''}
    <div class="barra-accion"><div class="dentro"><button class="boton principal ancho" id="b-terminar"${filas.length ? '' : ' disabled'}>${I.caja}Terminar la compra</button></div></div>`;
  activaLetreros();
  $$('[data-info]').forEach(b => b.addEventListener('click', () => infoProducto(b.dataset.info, filas.find(f => f.clave === b.dataset.info))));
  $$('[data-fila]').forEach(fila => deslizaParaQuitar(fila, () => quitaDeLista(filas.find(f => f.clave === fila.dataset.fila))));
  $$('[data-falta]').forEach(b => b.addEventListener('click', () => { s.faltaDespensa[b.dataset.falta] = true; salva(); vCompra(); tostada('Añadido a la lista'); }));
  $$('[data-volver]').forEach(b => b.addEventListener('click', () => { delete s.quitados[b.dataset.volver]; salva(); vCompra(); }));
  // Vaciar lo que se acumula (con «Deshacer»): quitados (siguen fuera de la lista), «¿Os queda?» y pendientes de otro súper.
  const conVuelta = (txt, hacer) => {
    const antesS = JSON.stringify(s), antesP = JSON.stringify(E.pendientes || []);
    hacer(); salva(); const y = window.scrollY; vCompra(); window.scrollTo(0, y);
    conDeshacer(txt, () => { E.semanas[p.id] = JSON.parse(antesS); E.pendientes = JSON.parse(antesP); salva(); const y2 = window.scrollY; vCompra(); window.scrollTo(0, y2); });
  };
  $('#b-vaciar-quitados')?.addEventListener('click', () => conVuelta('🧹 Quitados vaciados', () => { for (const k of quitados) s.quitados[k] = 'oculto'; }));
  $$('[data-olvidar]').forEach(b => b.addEventListener('click', () => conVuelta('🧹 Fuera de «Quitados»', () => { s.quitados[b.dataset.olvidar] = 'oculto'; })));
  $('#b-ocultar-despensa')?.addEventListener('click', () => conVuelta('🧹 «¿Os queda?» oculto esta semana', () => { s.despensaOculta = true; }));
  $$('[data-queda]').forEach(b => b.addEventListener('click', () => conVuelta('✓ Apuntado: queda', () => { (s.despensaVista ||= {})[b.dataset.queda] = true; })));
  $('#b-ver-pend')?.addEventListener('click', () => { V.verPend = !V.verPend; const y = window.scrollY; vCompra(); window.scrollTo(0, y); });
  $('#b-vaciar-pend')?.addEventListener('click', () => conVuelta('🧹 Pendientes vaciados', () => { E.pendientes.forEach(descarta); E.pendientes = []; }));
  $$('[data-quitar-receta]').forEach(b => b.addEventListener('click', () => { s.recetasLista = s.recetasLista.filter(x => x.id !== b.dataset.quitarReceta); salva(); vCompra(); }));
  $('#b-ticket')?.addEventListener('click', elegirTicket);
  $('#b-ver-ticket')?.addEventListener('click', () => hojaTicketLeido(s, filas));
  $('#b-ultima')?.addEventListener('click', () => hojaCompra(E.compras[0]));
  $$('[data-pend-ya]').forEach(b => b.addEventListener('click', () => {
    const x = E.pendientes.find(y => y.id === b.dataset.pendYa);
    if (x?.k && D.productos[x.k]) (E.casa[x.k] = (E.casa[x.k] || 0) + D.productos[x.k].util, alta(x.k));
    descarta(x); E.pendientes = E.pendientes.filter(y => y.id !== b.dataset.pendYa); salva(); tostada(x?.k ? '🏠 Pasa a «En casa»' : 'Quitado'); refrescaCompra();
  }));
  $$('[data-pend-quitar]').forEach(b => b.addEventListener('click', () => { descarta(E.pendientes.find(y => y.id === b.dataset.pendQuitar)); E.pendientes = E.pendientes.filter(y => y.id !== b.dataset.pendQuitar); salva(); refrescaCompra(); }));
  $('#b-enviar-pend')?.addEventListener('click', () => compartirTexto('Pendiente de otro súper', 'Pendiente de otro súper · NutriHome\n' + E.pendientes.map(x => '☐ ' + x.n).join('\n'), 'Copiado: pégalo en WhatsApp'));
  $('#b-enviar-no')?.addEventListener('click', () => compartirNoHabia(noHabia.map(nombreFila)));
  $('#b-anadir').addEventListener('click', () => abrirAnadir(seccionesLista));
  $('#b-receta-lista').addEventListener('click', elegirRecetaParaLista);
  $('#b-favoritos').addEventListener('click', abrirFavoritos);
  $('#b-mas').addEventListener('click', abrirMas);
  activaBuscador();
  $('#b-presupuesto')?.addEventListener('click', ajustaAlPresupuesto);
  $('#b-terminar').addEventListener('click', () => conTicket ? terminarCompra(filas) : hojaTerminar(filas));
  for (const f of noFilas) pintaAlternativa(f, s);
}
// Terminar sin ticket leído: subirlo ahora o dar por comprado todo lo de la lista.
function hojaTerminar(filas) {
  if (!esMercadona()) { if (!confirm('¿Terminas la compra? Lo que queda en la lista pasa a «En casa».')) return; const { s } = lineaCompra(); for (const f of filas) if (!s.noComprado[f.clave]) s.marcados[f.clave] = true; salva(); terminarCompra(filas); return; }
  hoja(`<h2>📦 Terminar la compra</h2><div class="nota">Con el ticket digital marco yo lo comprado y lo que no había. Sin ticket, doy por comprado todo lo que queda en la lista.</div>
    <div class="acciones-grid" style="margin-top:12px"><button class="accion primaria" id="t-ticket"><span class="emo">🧾</span>Subir el ticket</button><button class="accion" id="t-sin"><span class="emo">✓</span>Sin ticket: todo comprado</button></div>`, h => {
    $('#t-ticket', h).addEventListener('click', () => { cierraHoja(); elegirTicket(); });
    $('#t-sin', h).addEventListener('click', () => { const { s } = lineaCompra(); for (const f of filas) if (!s.noComprado[f.clave]) s.marcados[f.clave] = true; salva(); cierraHoja(); terminarCompra(filas); });
  });
}
// El ticket ya leído: qué se compró, qué no había y qué vino fuera de la lista.
function hojaTicketLeido(s, filas) {
  const t = s.ticket, no = filas.filter(f => s.noComprado[f.clave]).map(nombreFila), si = filas.filter(f => s.marcados[f.clave]).map(nombreFila);
  const chips = l => listaSimple(l);
  hoja(`<h2>🧾 Ticket${t.fecha ? ' del ' + fechaCorta(t.fecha) : ''}</h2>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${si.length}</b><span>comprados</span></div><div><b>✕ ${no.length}</b><span>no había</span></div><div><b>＋ ${t.fuera.length}</b><span>fuera de lista</span></div></div>
    <p class="nota"><b>${euros(t.total)}</b>${t.cuadra === false ? ' · ⚠️ no me cuadra el total' : ''}</p>
    ${no.length ? `<h3>✕ No había</h3>${chips(no)}` : ''}
    ${t.fuera.length ? `<h3>＋ Fuera de la lista</h3>${chips(t.fuera.map(nombreFuera))}` : ''}
    <div class="botones" style="margin-top:14px">${no.length ? '<button class="boton" id="b-enviar-no-t">📤 Enviar lo que no había</button>' : ''}<button class="boton" id="b-otro-ticket">📄 Subir otro ticket</button></div>`, h => {
    $('#b-enviar-no-t', h)?.addEventListener('click', () => compartirNoHabia(no));
    $('#b-otro-ticket', h).addEventListener('click', () => { cierraHoja(); elegirTicket(); });
  });
}

// Lo que se usa menos, en un menú «⋯»: enviar la lista, el escáner y la última compra.
function abrirMas() {
  const fila = (id, emo, txt, sub = '') => `<button class="menu-fila" id="${id}"><span class="emo">${emo}</span><span><b>${txt}</b>${sub ? `<span class="nota" style="display:block">${sub}</span>` : ''}</span><span class="flecha">›</span></button>`;
  hoja(`<h2>Más</h2><div class="menu-lista">
    ${fila('m-enviar', '📤', 'Enviar la lista', 'Lo que falta por comprar, para WhatsApp')}
    ${fila('m-escanear', '🔎', '¿Es buena compra?', 'Foto del código de barras')}
    ${E.compras.length ? fila('m-ultima', '🗂️', 'Compras anteriores', 'El historial, con sus tickets') : ''}</div>`, h => {
    $('#m-enviar', h).addEventListener('click', () => { cierraHoja(); compartirLista(lineaCompra().filas); });
    $('#m-escanear', h).addEventListener('click', abrirEscaner);
    $('#m-ultima', h)?.addEventListener('click', abrirHistorial);
  });
}
// Historial de compras: cada una con su ticket.
function abrirHistorial() {
  const filas = (E.compras || []).map((c, i) => `<button class="menu-fila" data-compra="${i}"><span class="emo">🧾</span><span><b>Compra del ${fechaCorta(iso(new Date(c.f)))}</b><span class="nota" style="display:block">${c.ticket ? euros(c.ticket.total) + ' · con ticket' : 'sin ticket'} · ✓ ${c.si.length} · ✕ ${c.no.length} · ＋ ${c.extra.length}</span></span><span class="flecha">›</span></button>`).join('');
  hoja(`<h2>🗂️ Compras</h2><div class="menu-lista">${filas || '<div class="vacio"><span class="emo">🧾</span>Todavía no hay compras terminadas.</div>'}</div>`, h => {
    $$('[data-compra]', h).forEach(b => b.addEventListener('click', () => hojaCompra(E.compras[+b.dataset.compra])));
  });
}

// Añadir a la lista: una hoja con el buscador de Mercadona. Se pueden añadir varios seguidos; «Listo» la cierra.
function abrirAnadir(seccionesLista = [...new Set(lineaCompra().filas.map(f => f.seccion))], texto = '') {
  V.anadidos.clear();
  hoja(`<h2>➕ Añadir a la lista</h2><div class="nota">Una cosa o varias: «papel higiénico, yuca y 2 kéfir».</div>
    <form class="anadir" id="f-anadir"><div class="caja"><input id="i-anadir" placeholder="Busca en Mercadona…" autocomplete="off" enterkeyhint="search" value="${esc(texto)}">
      <button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
    <div id="resultados"></div>`, h => {
    let tBusca;
    $('#i-anadir', h).addEventListener('input', e => { clearTimeout(tBusca); tBusca = setTimeout(() => buscaParaAnadir(e.target.value, seccionesLista), 380); });
    $('#f-anadir', h).addEventListener('submit', e => { e.preventDefault(); clearTimeout(tBusca); buscaParaAnadir($('#i-anadir', h).value, seccionesLista, true); });
    setTimeout(() => $('#i-anadir', h)?.focus(), 350);
    if (texto) buscaParaAnadir(texto, seccionesLista);
  });
}
const refrescaCompra = () => { if (V.pestana === 'compra') { const y = window.scrollY; vCompra(); window.scrollTo(0, y); } };

async function buscaParaAnadir(texto, seccionesLista, enviado = false) {
  const caja = $('#resultados'); if (!caja) return;
  const t = limpiaPeticion(texto || '');
  if (t.length < 2) { caja.innerHTML = ''; return; }
  const o = L.interpretar(texto, D.productos);
  if (enviado && ['quitar', 'casa', 'comprado'].includes(o.accion)) { cierraHoja(); ejecuta(texto); return; }
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
      anadeALista(items); cierraHoja(); refrescaCompra();
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
  caja.innerHTML = `${hits.slice(0, 6).map((h, i) => `<button class="res${V.anadidos.has(h.id) ? ' anadido' : ''}" data-res="${i}">${h.foto ? `<img src="${esc(h.foto)}" alt="" loading="lazy">` : `<span class="sinfoto">${emojiSeccion(h.cat)}</span>`}
      <span class="res-t"><b>${esc(h.n)}</b><span class="nota">${esc(h.env)} · ${emojiSeccion(h.cat)} ${esc(h.cat)}</span></span>
      ${h.k ? pillNivel(L.veredicto(L.nutrientesDe(D.productos[h.k])).nivel) : ''}<span class="res-p">${h.precio ? euros(h.precio) : ''}</span><span class="icono mas">${(V.anadidos.has(h.id) ? SVG.check : SVG.mas).replace('<svg', '<svg class="i"')}</span></button>`).join('')}
    ${V.anadidos.size ? '<button class="boton ancho" id="b-listo-anadir" style="margin-top:8px">✓ Listo</button>' : ''}
    <div class="nota" style="margin:10px 2px 6px">¿No es ninguno? Añadir «${esc(capital(t))}» en:</div>
    <div class="chips-despensa">${secs.map(n => `<button class="chip" data-sec="${esc(n)}">${emojiSeccion(n)} ${esc(n)}</button>`).join('')}<button class="chip" data-sec-nueva="1">＋ Nueva sección</button></div>`;
  $$('[data-res]', caja).forEach(b => b.addEventListener('click', () => {
    const h = hits[+b.dataset.res]; anadeALista([h.k ? { k: h.k } : { m: h }]);
    V.anadidos.add(h.id); refrescaCompra(); buscaParaAnadir(texto, seccionesLista);   // la hoja sigue abierta para añadir más
  }));
  $('#b-listo-anadir', caja)?.addEventListener('click', () => { V.anadidos.clear(); cierraHoja(); refrescaCompra(); });
  $$('[data-sec]', caja).forEach(b => b.addEventListener('click', () => { anadeALista([{ texto: capital(t), sec: b.dataset.sec }]); cierraHoja(); refrescaCompra(); }));
  $('[data-sec-nueva]', caja)?.addEventListener('click', () => {
    const n = (prompt('Nombre de la sección nueva (por ejemplo: Farmacia):') || '').trim();
    if (!n) return;
    const e = (prompt('Un emoji para ella (opcional):', '🏷️') || '🏷️').trim().slice(0, 4);
    if (!E.secciones.some(s => s.n === n)) E.secciones.push({ n, e });
    anadeALista([{ texto: capital(t), sec: n }]); cierraHoja(); refrescaCompra();
  });
}

// Deslizar un producto a la izquierda lo quita de la lista (con «Deshacer»).
function deslizaParaQuitar(fila, alQuitar) {
  const el = fila.querySelector('.producto');
  let x0 = null, y0 = 0, dx = 0, horizontal = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; horizontal = null; el.style.transition = 'none'; }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (horizontal == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horizontal = Math.abs(mx) > Math.abs(my);
    if (!horizontal) return;
    dx = Math.min(0, mx); el.style.transform = `translateX(${dx}px)`; fila.classList.toggle('listo', dx < -90);
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (x0 == null) return;
    if (horizontal) el.dataset.deslizado = Date.now();
    if (horizontal && dx < -90) {
      el.style.transition = 'transform .18s'; el.style.transform = 'translateX(-110%)';
      setTimeout(() => { fila.style.maxHeight = fila.offsetHeight + 'px'; fila.style.transition = 'max-height .22s, opacity .22s';
        requestAnimationFrame(() => { fila.style.maxHeight = '0'; fila.style.opacity = '0'; }); setTimeout(alQuitar, 240); }, 160);
    } else { el.style.transition = 'transform .2s'; el.style.transform = ''; fila.classList.remove('listo'); }
    x0 = null;
  });
  // tras deslizar, que no cuente como toque en ✓, ✕ o la ficha
  el.addEventListener('click', e => { if (Date.now() - (+el.dataset.deslizado || 0) < 450) { e.stopPropagation(); e.preventDefault(); } }, true);
}
function quitaDeLista(f) {
  if (!f) return;
  const p = planActivo(), s = est(p.id), antes = JSON.stringify(s);
  if (f.k && !f.extra) { s.quitados[f.k] = true; s.extra = s.extra.filter(x => x.k !== f.k); delete s.menos[f.k]; }
  if (f.extra) s.extra = s.extra.filter(x => x.id !== f.extra && !(f.extras || []).includes(x.id));
  if (f.proxima) E.proximaCompra = (E.proximaCompra || []).filter(x => !((f.k && x.k === f.k) || 'px:' + x.id === f.clave));
  if (f.otro) s.otrosHechos[f.clave] = true;
  if (f.fijo && !f.k) s.fijosHechos[f.clave] = true;
  if (f.despensa) delete s.faltaDespensa[f.k];
  delete s.marcados[f.clave]; delete s.noComprado[f.clave];
  salva(); const y = window.scrollY; vCompra(); window.scrollTo(0, y);
  conDeshacer(`🗑️ ${nombreFila(f)}`, () => { E.semanas[p.id] = JSON.parse(antes); salva(); const y2 = window.scrollY; vCompra(); window.scrollTo(0, y2); });
}

// ——— Favoritos («lo de siempre»): entran solos en la lista cada semana ———
const idFav = f => f.k || f.texto || (f.m ? 'm:' + f.m.id : '');
function abrirFavoritos() {
  const pinta = h => {
    $('#favs', h).innerHTML = E.fijos.map((f, i) => {
      const x = f.k ? D.productos[f.k] : null;
      const nombre = x ? nombreCorto(x) : f.m ? f.m.n : f.texto, foto = x?.foto || f.m?.foto;
      const env = x ? x.env : f.m ? f.m.env : '', precio = x ? x.precio : f.m ? f.m.precio : 0;
      return `<div class="fav">${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : '<span class="sinfoto">⭐</span>'}
        <div class="fav-t"><b>${esc(nombre)}</b><span class="nota">${esc(env)}${precio ? ' · ' + euros(precio) : ''}</span></div>
        ${f.k || f.m ? `<div class="mini-cant"><button data-fav-menos="${i}" aria-label="Uno menos">−</button><b>${f.n || 1}</b><button data-fav-mas="${i}" aria-label="Uno más">＋</button></div>` : ''}
        <button class="icono" data-fav-quitar="${i}" aria-label="Quitar de favoritos">${I.papelera}</button></div>`;
    }).join('') || '<div class="vacio"><span class="emo">⭐</span>Todavía no hay favoritos.</div>';
    const cambia = () => { salva(); pinta(h); if (V.pestana === 'compra') { const y = window.scrollY; vCompra(); window.scrollTo(0, y); } };
    $$('[data-fav-mas]', h).forEach(b => b.addEventListener('click', () => { const f = E.fijos[+b.dataset.favMas]; f.n = (f.n || 1) + 1; cambia(); }));
    $$('[data-fav-menos]', h).forEach(b => b.addEventListener('click', () => { const f = E.fijos[+b.dataset.favMenos]; f.n = Math.max(1, (f.n || 1) - 1); cambia(); }));
    $$('[data-fav-quitar]', h).forEach(b => b.addEventListener('click', () => {
      const [f] = E.fijos.splice(+b.dataset.favQuitar, 1); E.fijosQuitados = [...new Set([...E.fijosQuitados, idFav(f)])]; cambia(); tostada('Quitado de favoritos');
    }));
  };
  hoja(`<h2>⭐ Favoritos</h2><div class="nota">Lo que compráis siempre: entra solo en la lista cada semana.</div>
    <div id="favs" style="margin-top:10px"></div>
    <h3>➕ Añadir un favorito</h3>
    <form class="anadir" id="f-fav"><div class="caja"><input id="i-fav" placeholder="Busca: anacardos, papel higiénico…" autocomplete="off" enterkeyhint="search"><button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
    <div id="res-fav"></div>`, h => {
    pinta(h);
    let tB;
    const busca = async () => {
      const t = limpiaPeticion($('#i-fav', h).value), caja = $('#res-fav', h);
      if (t.length < 2) { caja.innerHTML = ''; return; }
      caja.innerHTML = '<div class="cargando"></div>';
      let hits = [];
      try { hits = await buscaMercadona(t, 6); } catch { caja.innerHTML = '<div class="nota">📡 Sin conexión con Mercadona.</div>'; return; }
      const local = L.buscaProducto(t, D.productos);
      if (local?.k && !hits.some(x => x.k === local.k)) { const x = D.productos[local.k]; hits.unshift({ id: String(x.id), n: x.n, foto: x.foto, precio: x.precio, env: x.env, cat: x.cat, k: local.k }); }
      caja.innerHTML = hits.map((x, i) => `<button class="res" data-fav-res="${i}">${x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy">` : `<span class="sinfoto">${emojiSeccion(x.cat)}</span>`}
        <span class="res-t"><b>${esc(x.n)}</b><span class="nota">${esc(x.env)}</span></span><span class="res-p">${x.precio ? euros(x.precio) : ''}</span><span class="icono mas">⭐</span></button>`).join('') || '<div class="nota">No encuentro nada.</div>';
      $$('[data-fav-res]', caja).forEach(b => b.addEventListener('click', () => {
        const x = hits[+b.dataset.favRes], nuevo = x.k ? { k: x.k, n: 1 } : { m: x, n: 1 };
        if (E.fijos.some(f => idFav(f) === idFav(nuevo))) { tostada('Ya está en favoritos'); return; }
        E.fijos.push(nuevo); E.fijosQuitados = E.fijosQuitados.filter(z => z !== idFav(nuevo));
        $('#i-fav', h).value = ''; caja.innerHTML = ''; salva(); pinta(h); tostada('⭐ ' + (x.k ? nombreCorto(D.productos[x.k]) : x.n));
        if (V.pestana === 'compra') { const y = window.scrollY; vCompra(); window.scrollTo(0, y); }
      }));
    };
    $('#i-fav', h).addEventListener('input', () => { clearTimeout(tB); tB = setTimeout(busca, 380); });
    $('#f-fav', h).addEventListener('submit', e => { e.preventDefault(); clearTimeout(tB); busca(); });
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
    const cat = f.k ? D.productos[f.k].cat : f.m?.cat;
    for (const n of [4, 2, 1]) { hits = (await buscaMercadona(pal.slice(0, n).join(' '), 10)).filter(h => h.id !== evitar && (!cat || h.cat === cat)); if (hits.length) break; }   // solo de la misma sección
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
    ${f.k || f.extra ? `<div class="cantidad"><button id="b-menos" aria-label="Uno menos">−</button><label class="t"><input id="i-cant" type="number" inputmode="numeric" min="0" value="${f.k || f.m ? f.envases : f.n || 1}" aria-label="Cantidad">
      <span>${esc(f.k ? (L.porPieza(x) ? L.plural(x.ud, 2) : x.env) : f.m ? f.m.env : 'unidades')}${f.precio ? ' · ' + euros(f.precio) : ''}</span></label><button class="mas" id="b-mas" aria-label="Uno más">＋</button></div>` : ''}
    <div class="botones" style="margin-top:14px">
      ${k && !f.extra ? `<button class="boton" id="b-quitar">${I.papelera}Quitar de la lista</button>` : ''}
      ${f.extra ? `<button class="boton" id="b-borrar-extra">${I.papelera}Quitar</button>` : ''}
      ${f.otro ? `<button class="boton" id="b-borrar-otro">${I.papelera}Quitar</button>` : ''}
      <button class="boton" id="b-nohabia">${s.noComprado[clave] ? '↩️ Sí lo había' : '✕ No lo había'}</button>
      ${k ? `<button class="boton" id="b-fijo">${E.fijos.some(y => y.k === k) ? '⭐ Quitar de favoritos' : '⭐ A favoritos'}</button>` : ''}
      ${f.m && !f.fijo ? `<button class="boton" id="b-fijo-m">⭐ A favoritos</button>` : ''}
    </div>`, h => {
    $('#b-quitar', h)?.addEventListener('click', () => { s.quitados[k] = true; salva(); cierraHoja(); vCompra(); tostada('Quitado de la lista'); });
    $('#b-nohabia', h)?.addEventListener('click', () => {
      if (s.noComprado[clave]) { delete s.noComprado[clave]; quitaPendiente(f); tostada('Vale, sí lo había'); }
      else { s.noComprado[clave] = true; delete s.marcados[clave]; apuntaPendiente({ k: f.k || null, n: nombreFila(f) }, true); tostada('✕ No había: apuntado para otro súper'); }
      salva(); cierraHoja(); vCompra();
    });
    $('#b-borrar-extra', h)?.addEventListener('click', () => { s.extra = s.extra.filter(y => y.id !== f.extra); salva(); cierraHoja(); vCompra(); });
    $('#b-borrar-otro', h)?.addEventListener('click', () => { s.otrosHechos[f.clave] = true; salva(); cierraHoja(); vCompra(); });
    $('#b-escanear-info', h)?.addEventListener('click', abrirEscaner);
    // Cantidad: lo añadido a mano se suma o se resta; si no hay nada añadido, se resta de lo que pide el menú.
    const refresca = () => { const y = window.scrollY; vCompra(); window.scrollTo(0, y); const nueva = lineaCompra().filas.find(r => f.k ? r.k === f.k : r.clave === f.clave); if (nueva) infoProducto(nueva.clave, nueva); else cierraHoja(); };
    const actual = f.k || f.m ? f.envases : f.n || 1;
    const fija = T => {
      T = Math.max(0, Math.round(T));
      if (f.k) {
        let d = T - actual;
        if (d > 0) {   // primero se deshace lo bajado a mano; lo demás, como añadido
          const m = Math.min(d, s.menos[f.k] || 0); if (m) { s.menos[f.k] -= m; if (!s.menos[f.k]) delete s.menos[f.k]; d -= m; }
          if (d > 0) s.extra.push({ id: uid(), k: f.k, n: d });
          delete s.quitados[f.k];
        } else if (d < 0) {   // primero se quita lo añadido a mano; si no basta, se baja lo que pide el menú
          let r = -d;
          for (const id of [...(f.extras || (f.extra ? [f.extra] : []))].reverse()) {
            if (!r) break;
            const x = s.extra.find(y => y.id === id); if (!x) continue;
            const q = Math.min(r, x.n || 1); x.n = (x.n || 1) - q; r -= q;
            if (x.n <= 0) s.extra = s.extra.filter(y => y.id !== id);
          }
          if (r > 0) s.menos[f.k] = (s.menos[f.k] || 0) + r;
        }
      } else {
        const x = s.extra.find(y => y.id === f.extra);
        if (x) { if (T <= 0) s.extra = s.extra.filter(y => y.id !== f.extra); else x.n = T; }
      }
      salva(); refresca();
    };
    $('#b-mas', h)?.addEventListener('click', () => fija(actual + 1));
    $('#b-menos', h)?.addEventListener('click', () => fija(actual - 1));
    $('#i-cant', h)?.addEventListener('change', e => { const v = parseInt(e.target.value, 10); if (isFinite(v)) fija(v); });
    $('#b-fijo-m', h)?.addEventListener('click', () => {
      E.fijos.push({ m: f.m, n: f.envases || 1 }); E.fijosQuitados = E.fijosQuitados.filter(x => x !== idFav({ m: f.m }));
      s.extra = s.extra.filter(y => y.id !== f.extra);   // esta semana ya entra como favorito
      salva(); cierraHoja(); vCompra(); tostada('⭐ A favoritos');
    });
    $('#b-fijo', h)?.addEventListener('click', () => {
      if (E.fijos.some(y => y.k === k)) { E.fijos = E.fijos.filter(y => y.k !== k); E.fijosQuitados = [...new Set([...(E.fijosQuitados || []), k])]; }
      else { E.fijos = [...E.fijos, { k, n: 1 }]; E.fijosQuitados = (E.fijosQuitados || []).filter(x => x !== k); }
      salva(); cierraHoja(); vCompra(); tostada(E.fijos.some(y => y.k === k) ? '⭐ A favoritos' : 'Quitado de favoritos');
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

// Terminar la compra: lo marcado con ✓ pasa a «En casa» (con lo que dice el ticket, si se subió); lo marcado con ✕ sigue en la lista;
// lo del ticket que no estaba en la lista también pasa a «En casa». Queda un resumen, para Claude y para «Última compra».
function terminarCompra(filas, silencioso = false) {
  const { s, p } = lineaCompra();
  const res = { f: new Date().toISOString(), si: [], no: [], extra: [], estimado: 0 };
  for (const f of filas) {
    const n = nombreFila(f);
    if (s.marcados[f.clave]) { res.si.push(n); res.estimado += f.precio || 0; if (f.manual) res.extra.push(n); quitaPendiente(f); if (f.proxima) E.proximaCompra = (E.proximaCompra || []).filter(x => !((f.k && x.k === f.k) || L.normaliza(x.n) === L.normaliza(n))); }
    else if (s.noComprado[f.clave]) { res.no.push(n); apuntaPendiente({ k: f.k || null, n }, true); }
  }
  let n = 0;
  for (const f of filas) {
    if (!s.marcados[f.clave]) continue;
    if (f.k) {
      const x = D.productos[f.k], c = s.ticketCant[f.clave];   // con ticket, lo que se compró de verdad
      (E.casa[f.k] = (E.casa[f.k] || 0) + (c ? (c.kg ? c.kg * 1000 : c.n * x.util) : f.envases * x.util), alta(f.k)); n++;
      if (f.despensa) delete s.faltaDespensa[f.k];
    }
    else if (f.m && !NO_COMIDA.has(f.m.cat)) { E.casaOtros = [...new Set([...E.casaOtros, f.m.n])]; }
    if (f.extra) s.extra = s.extra.filter(y => y.id !== f.extra);
    if (f.extras) s.extra = s.extra.filter(y => !f.extras.includes(y.id));
    if (f.fijo && !f.k) s.fijosHechos[f.clave] = true;
    if (f.otro) s.otrosHechos[f.clave] = true;
  }
  if (s.ticket) {
    n += aCasaTicket(s.ticket.fuera);
    res.extra.push(...s.ticket.fuera.map(nombreFuera));
    res.ticket = { fecha: s.ticket.fecha, total: s.ticket.total, cuadra: s.ticket.cuadra, lineas: s.ticket.lineas };
  }
  res.estimado = +res.estimado.toFixed(2);
  s.noHabia = Object.fromEntries(Object.keys(s.noComprado).filter(k => s.noComprado[k]).map(k => [k, true]));   // para avisar en Semana
  s.recetasLista = []; s.marcados = {}; s.noComprado = {}; s.alternativas = {}; s.ticketCant = {}; s.ticket = null; s.compraHecha = true;
  V.filtroCompra = 'todo';
  res.menu = adaptaMenu(p);   // los platos con cosas que no había se cambian por otros que podáis hacer
  E.compras = [res, ...E.compras].slice(0, 20); salva();
  if (silencioso) return res;
  hojaCompra(res, n);
  vCompra();
}

// Resumen de una compra (al terminarla o desde «Última compra»): lo que no había, lo de fuera de la lista y el ticket.
const listaSimple = (l, emo = '•') => `<div class="lista">${l.map(x => `<div class="producto fila-simple"><div class="sinfoto">${emo}</div><div class="info"><div class="pn">${esc(x)}</div></div></div>`).join('')}</div>`;
function hojaCompra(res, nCasa = null) {
  if (!res) return;
  const t = res.ticket, chips = l => listaSimple(l);
  hoja(`<h2>${nCasa != null ? '🧾 Compra terminada' : '🗂️ Compra del ' + fechaCorta(iso(new Date(res.f)))}</h2>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${res.si.length}</b><span>comprados</span></div><div><b>✕ ${res.no.length}</b><span>no había</span></div><div><b>＋ ${res.extra.length}</b><span>extra</span></div></div>
    ${nCasa != null ? `<p class="nota">${nCasa} productos pasan a «En casa».${res.menu?.filter(x => x.a).length ? ` El menú se ha ajustado: ${res.menu.filter(x => x.a).length} plato${res.menu.filter(x => x.a).length === 1 ? '' : 's'} cambiado${res.menu.filter(x => x.a).length === 1 ? '' : 's'}.` : res.no.length ? ' Lo que no había queda en «Pendiente de otro súper».' : ''}</p>` : ''}
    ${t ? `<p class="nota">🧾 Ticket${t.fecha ? ' del ' + fechaCorta(t.fecha) : ''}: <b>${euros(t.total)}</b>${t.cuadra === false ? ' · ⚠️ no me cuadra el total' : ''}</p>` : ''}
    ${t?.lineas?.length ? `<details class="emparejados"><summary>🧾 Ver el ticket · ${t.lineas.length} renglones</summary>${t.lineas.map(([n, d, imp, kg]) => `<div class="par"><span>${esc((kg ? String(kg).replace('.', ',') + ' kg ' : n > 1 ? n + ' × ' : '') + d)}</span><span class="nota">${euros(imp)}</span></div>`).join('')}</details>` : ''}
    ${res.no.length ? `<h3>✕ No había</h3>${chips(res.no)}` : ''}
    ${res.sinTicket?.length ? `<h3>🤔 Con ✓ pero no salen en el ticket</h3>${chips(res.sinTicket)}` : ''}
    ${res.extra.length ? `<h3>＋ Extra</h3>${chips(res.extra)}` : ''}
    ${res.menu?.length ? `<h3>🔄 Menú ajustado a la compra</h3>${htmlCambiosMenu(res.menu)}` : ''}
    <div class="botones" style="margin-top:14px">
      ${res.no.length ? '<button class="boton" id="b-enviar-no-h">📤 Enviar lo que no había</button>' : ''}
      ${t ? '' : '<button class="boton" id="b-ticket-h">📄 Subir el ticket</button>'}
    </div>
    <button class="boton principal ancho" id="b-resumen-claude" style="margin-top:10px">${I.enviar}Mandar al Chef para ajustar el plan</button>
    ${nCasa != null ? `<button class="boton ancho" id="b-ir-casa" style="margin-top:8px">${I.caja}Ver «En casa»</button>` : ''}`, h => {
    $('#b-enviar-no-h', h)?.addEventListener('click', () => compartirNoHabia(res.no));
    $('#b-ticket-h', h)?.addEventListener('click', elegirTicket);
    $('#b-resumen-claude', h).addEventListener('click', () => irAClaude(`Esta es nuestra compra del ${new Date(res.f).toLocaleDateString('es-ES')}. Mira qué compramos y dime si cambiarías algo del menú.`, null, { compra: res }));
    $('#b-ir-casa', h)?.addEventListener('click', () => { cierraHoja(); location.hash = 'casa'; });
  });
}
const textoCompra = r => [`Compra del ${new Date(r.f).toLocaleDateString('es-ES')}.`,
  r.ticket ? `Ticket${r.ticket.fecha ? ' del ' + r.ticket.fecha : ''}: ${euros(r.ticket.total)}${r.estimado ? ` (la lista calculaba ${euros(r.estimado)})` : ''}.` : 'Sin ticket.',
  `Comprado (${r.si.length}): ${r.si.join(', ')}`, `No había (${r.no.length}): ${r.no.join(', ') || '—'}`, `Extra (${r.extra.length}): ${r.extra.join(', ') || '—'}`,
  r.sinTicket?.length ? `Con ✓ pero no salen en el ticket: ${r.sinTicket.join(', ')}` : '',
  r.ticket?.lineas?.length ? `Renglones del ticket: ${r.ticket.lineas.map(([n, d, imp, kg]) => `${kg ? String(kg).replace('.', ',') + ' kg' : n} ${d} ${euros(imp)}`).join('; ')}` : '',
  r.ticket ? 'Compáralo con el plan y ajústalo.' : 'Compáralo con el ticket y ajusta el plan.'].filter(Boolean).join('\n');

// La receta en texto para mandarla (WhatsApp, notas…): cantidades de una ración, el paso a paso más completo y el truco.
function recetaParaCompartir(r) {
  const q = L.QUIEN[0], g = ing => { const x = L.gramos(ing, q, fac); return x ? cantidadCasa(ing[0], x) : ''; };
  const ings = [...r.ing.map(ing => `• ${nombreCorto(D.productos[ing[0]] || { n: ing[0] }).replace(/\s*\([^)]*\)/g, '')}${g(ing) ? ' · ' + g(ing).replace(/^≈\s*/, '') : ''}`), ...[...(r.otros || []), ...(r.basicos || [])].map(t => `• ${t}`)];
  const pasos = r.detalle?.length ? r.detalle : r.pasos || [];
  return [`${emojiReceta(r)} ${r.n}`, `${APARATO[r.ap] || 'Cocina'} · ${r.min} min`, '', 'Ingredientes (1 ración):', ...ings,
    ...(r.prep?.length ? ['', 'Antes de empezar:', ...r.prep.map(x => `• ${x}`)] : []),
    '', 'Paso a paso:', ...pasos.map((x, i) => `${i + 1}. ${x}`), ...(r.truco ? ['', `💡 ${r.truco}`] : []), '', '— NutriHome'].join('\n');
}
async function compartirTexto(titulo, txt, copiado) {
  try { if (navigator.share) { await navigator.share({ title: titulo, text: txt }); return; } } catch { return; }
  try { await navigator.clipboard.writeText(txt); tostada(copiado); } catch { tostada('No he podido compartirlo'); }
}
async function compartirLista(filas) {
  const { s } = lineaCompra();
  let sec = '', txt = 'Lista de la compra (Mercadona) · NutriHome\n';
  for (const f of filas) {
    if (s.marcados[f.clave] || s.noComprado[f.clave]) continue;
    if (f.seccion !== sec) { sec = f.seccion; txt += `\n${emojiSeccion(sec)} ${sec}\n`; }
    txt += `☐ ${nombreFila(f)}${f.k ? ` — ${L.cantidadCompra(f, D.productos)}` : f.m ? ` — ${f.m.env}` : ''}\n`;
  }
  compartirTexto('Lista de la compra', txt, 'Lista copiada: pégala en WhatsApp');
}
const compartirNoHabia = nombres => compartirTexto('Lo que no había', 'No había en Mercadona · NutriHome\n' + nombres.map(n => '☐ ' + n).join('\n'), 'Copiado: pégalo en WhatsApp');

async function mandarFoto(fichero, texto = 'Para Claude, desde NutriHome: foto del ticket o de una lista. Compárala con la compra y métela en NutriHome.') {
  if (!fichero) return false;
  if (!D.perfiles.bot) { tostada('Las fotos al Chef llegarán pronto: de momento, escríbeselo'); return false; }
  try {
    if (navigator.canShare && navigator.canShare({ files: [fichero] })) { tostada('Elige Telegram y el chat con @' + (D.perfiles.bot || 'el bot')); await navigator.share({ files: [fichero], text: texto }); return true; }
  } catch { return false; }
  hoja(`<h2>📷 Mandárselo al Chef</h2><p>Este móvil no deja compartir ficheros desde la app. Mándalo al bot de Telegram <b>@${esc(D.perfiles.bot || '')}</b>.</p>
    <a class="boton principal" href="https://t.me/${esc(D.perfiles.bot || '')}" target="_blank" rel="noopener">Abrir Telegram</a>`);
  return false;
}

// ——— Ticket digital: el PDF que manda Mercadona por correo ———
// Se lee en el móvil (pdf.js, en vendor/), cada renglón se busca en Mercadona para saber qué producto es (si el precio coincide,
// es ese seguro) y se cruza con la lista: lo comprado se marca con ✓, lo que no sale con ✕ y lo de fuera pasa a «En casa» al terminar.
let cargaPDF;
function cargaPDFJS() {
  if (window.pdfjsLib) return Promise.resolve();
  return cargaPDF ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; res(); };
    s.onerror = () => { cargaPDF = null; rej(new Error('Sin conexión no puedo abrir el lector de PDF')); };
    document.head.appendChild(s);
  });
}
// Los trozos de texto del PDF se juntan por renglón (misma altura) y de izquierda a derecha.
async function lineasPDF(fichero) {
  await cargaPDFJS();
  const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await fichero.arrayBuffer()) }).promise, lineas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    const trozos = tc.items.filter(t => t.str.trim()).map(t => ({ s: t.str.trim(), x: t.transform[4], y: t.transform[5], h: Math.abs(t.transform[3]) || 8 }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    let fila = [], y0 = null;
    const cierra = () => { if (fila.length) lineas.push(fila.sort((a, b) => a.x - b.x).map(t => t.s).join('  ')); fila = []; };
    for (const t of trozos) { if (y0 !== null && Math.abs(t.y - y0) > Math.min(t.h, 6) / 2) cierra(); if (!fila.length) y0 = t.y; fila.push(t); }
    cierra();
  }
  doc.destroy();
  return lineas;
}
function elegirTicket() {
  $$('input.elige-ticket').forEach(x => x.remove());
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf,image/*'; i.className = 'sr elige-ticket';
  i.addEventListener('change', () => { const f = i.files[0]; i.remove(); abreTicket(f); });
  document.body.appendChild(i); i.click();
}
async function abreTicket(fichero) {
  if (!fichero) return;
  if (/^image\//.test(fichero.type)) return irAClaude('foto del ticket. Compárala con la compra y métela en NutriHome.', fichero);   // la foto la leo yo
  hoja('<h2>🧾 Leyendo el ticket…</h2><div class="cargando"></div><div class="cargando" style="width:70%"></div>');
  let t;
  try { t = L.leeTicket(/pdf$/i.test(fichero.type) || /\.pdf$/i.test(fichero.name) ? await lineasPDF(fichero) : await fichero.text()); }
  catch (e) { return ticketIlegible(fichero, e.message); }
  if (!t.items.length) return ticketIlegible(fichero);
  muestraTicket(t);
}
function ticketIlegible(fichero, motivo = '') {
  hoja(`<h2>🧾 No he podido leerlo</h2>
    <p class="nota">${motivo ? esc(motivo) + '. ' : ''}¿Es el PDF del ticket digital de Mercadona? Puedes mandárselo al Chef, o copiar el texto del ticket y pegarlo aquí.</p>
    <button class="boton principal ancho" id="b-ticket-claude">${I.enviar}Mandárselo al Chef</button>
    <textarea class="campo-texto" id="t-ticket" placeholder="MERCADONA, S.A. … TOTAL (€) …" style="margin-top:12px"></textarea>
    <button class="boton ancho" id="b-leer-ticket" style="margin-top:8px">🧾 Leer el texto</button>`, h => {
    $('#b-ticket-claude', h).addEventListener('click', () => irAClaude('el ticket digital de Mercadona. Compáralo con la compra de NutriHome.', fichero));
    $('#b-leer-ticket', h).addEventListener('click', () => { const t = L.leeTicket($('#t-ticket', h).value); if (t.items.length) muestraTicket(t); else tostada('No encuentro productos en ese texto'); });
  });
}

// Cada renglón distinto se busca en Mercadona, de 20 en 20 en una sola llamada. Sin conexión se compara solo por el nombre.
const ALGOLIA_VARIAS = ALGOLIA.replace('/products_prod_mad1_es/query', '/*/queries');
async function identificaTicket(items) {
  for (let i = 0; i < items.length; i += 20) {
    const trozo = items.slice(i, i + 20);
    const r = await fetch(ALGOLIA_VARIAS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: trozo.map(it => ({
      indexName: 'products_prod_mad1_es', params: 'query=' + encodeURIComponent(it.d) + '&hitsPerPage=3&queryType=prefixAll&removeWordsIfNoResults=allOptional' })) }) });
    if (!r.ok) throw new Error('Mercadona no responde');
    (await r.json()).results.forEach((res, n) => {
      const it = trozo[n], hits = (res.hits || []).filter(h => h.published !== false).map(deAlgolia);
      it.hits = hits; it.seguro = hits.find(h => it.kg ? h.ref && Math.abs(h.ref - it.pu) < 0.011 : it.pu && Math.abs(h.precio - it.pu) < 0.011) || null;
    });
  }
}
// Un mismo producto puede salir en varios renglones: se suman.
function juntaRenglones(items) {
  const m = new Map();
  for (const it of items) {
    const k = L.normaliza(it.d), x = m.get(k);
    if (!x) { m.set(k, { ...it }); continue; }
    x.n += it.n; x.imp = +(x.imp + it.imp).toFixed(2); if (it.kg) x.kg = +((x.kg || 0) + it.kg).toFixed(3);
  }
  return [...m.values()];
}
const idFila = f => f.k ? String(D.productos[f.k].id) : f.m?.id ? String(f.m.id) : null;
const nombreLargo = f => f.k ? D.productos[f.k].n : f.m ? f.m.n : f.texto || '';
// De 0 a 1: ¿es este renglón del ticket esa fila de la lista? Si Mercadona dice (por el precio) que es otro producto,
// solo vale si el nombre es casi igual (otro tamaño del mismo yogur, por ejemplo).
function puntuaTicket(it, f) {
  const id = idFila(f), nombre = nombreLargo(f), t = L.parecido(it.d, nombre);
  if (!id) { const pr = it.seguro || it.hits?.[0]; return pr ? Math.max(t, (it.seguro ? 0.9 : 0.75) * L.parecido(nombre, pr.n)) : t; }
  if (it.seguro) return it.seguro.id === id ? 1 : t >= 0.85 ? t : t * 0.6;
  return it.hits?.[0]?.id === id && t >= 0.3 ? Math.max(t, 0.7) : t;   // lo primero que encuentra Mercadona, si el nombre también se parece
}
const sinMarca = n => nombreCorto({ n }).replace(/ (Deliplus|Bosque Verde|Sabroz|Compy)\b/g, '');
const nombreFuera = x => x.m?.n ? sinMarca(x.m.n) : capital(x.d.toLowerCase());
const resumenTicket = (t, fuera) => ({ fecha: t.fecha, hora: t.hora, total: t.total ?? t.suma, cuadra: t.cuadra, lineas: t.items.map(it => [it.n, it.d, it.imp, it.kg]),
  fuera: fuera.map(it => ({ d: it.d, n: it.n, kg: it.kg, imp: it.imp, k: it.seguro?.k || null,
    m: it.seguro ? { id: it.seguro.id, n: it.seguro.n, cat: it.seguro.cat, foto: it.seguro.foto } : it.hits?.[0] ? { cat: it.hits[0].cat } : null })) });
// Lo de fuera de la lista pasa a «En casa» (lo que no es comida, no). Devuelve cuántos.
function aCasaTicket(fuera = []) {
  let n = 0;
  for (const x of fuera) {
    const cat = x.k ? D.productos[x.k].cat : x.m?.cat;
    if (!cat || NO_COMIDA.has(cat)) continue;
    if (x.k) (E.casa[x.k] = (E.casa[x.k] || 0) + (x.kg ? x.kg * 1000 : x.n * D.productos[x.k].util), alta(x.k));
    else E.casaOtros = [...new Set([...E.casaOtros, nombreFuera(x)])];
    n++;
  }
  return n;
}
// Si Mercadona confirma el producto y su precio ha cambiado, la lista usa el precio nuevo (con la fecha del ticket).
function aprendePrecios(items, f = hoy()) {
  for (const it of items) { const k = it.seguro?.k; if (k && !it.kg && it.pu > 0 && Math.abs(D.productos[k].precio - it.pu) > 0.004) { E.precios[k] = [it.pu, f]; D.productos[k].precio = it.pu; } }
}
const filaTicket = it => `<div class="res sin-borde">${it.seguro?.foto ? `<img src="${esc(it.seguro.foto)}" alt="" loading="lazy">` : '<div class="sinfoto">🧾</div>'}
  <span class="res-t"><b>${esc(it.seguro ? sinMarca(it.seguro.n) : capital(it.d.toLowerCase()))}</b><span class="nota">${it.kg ? String(it.kg).replace('.', ',') + ' kg' : it.n + ' ud.'}</span></span><span class="res-p">${euros(it.imp)}</span></div>`;

async function muestraTicket(t) {
  const items = juntaRenglones(t.items);
  hoja('<h2>🧾 Buscando cada producto…</h2><div class="cargando"></div><div class="cargando" style="width:70%"></div>');
  let sinRed = false;
  try { await identificaTicket(items); } catch { sinRed = true; }
  const { p, s, filas } = lineaCompra();
  const marcas = filas.some(f => s.marcados[f.clave] || s.noComprado[f.clave]);
  // ¿La compra ya se terminó sin ticket? Entonces se compara con lo que se marcó.
  const u = E.compras[0], fu = u && iso(new Date(u.f));
  if (!marcas && u && !u.ticket && t.fecha && t.fecha <= fu && fecha(fu) - fecha(t.fecha) <= 3 * 864e5) return ticketDeTerminada(t, items, u, sinRed);
  const pares = L.cruzaTicket(items, filas, puntuaTicket);
  const enFila = new Set(pares.map(([, j]) => j)), usados = new Set(pares.map(([i]) => i));
  const faltan = filas.filter((_, j) => !enFila.has(j)), noEstan = faltan.filter(f => !s.marcados[f.clave]), raros = faltan.filter(f => s.marcados[f.clave]);
  const fuera = items.filter((_, i) => !usados.has(i));
  const chips = l => listaSimple(l.map(nombreFila));
  hoja(`<h2>🧾 Ticket${t.fecha ? ' del ' + fechaCorta(t.fecha) : ''}</h2>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${pares.length}</b><span>de la lista</span></div><div><b>✕ ${noEstan.length}</b><span>no está</span></div><div><b>＋ ${fuera.length}</b><span>fuera de lista</span></div></div>
    <p class="nota"><b>${euros(t.total ?? t.suma)}</b>${t.cuadra ? '' : ' · ⚠️ no me cuadra el total'}${sinRed ? ' · 📡 sin conexión: comparo solo por el nombre' : ''}</p>
    ${noEstan.length ? `<h3>✕ No está en el ticket</h3>${chips(noEstan)}` : ''}
    ${raros.length ? `<h3>🤔 Con ✓ pero no salen en el ticket</h3>${chips(raros)}` : ''}
    ${fuera.length ? `<h3>＋ Fuera de la lista</h3>${fuera.map(filaTicket).join('')}` : ''}
    ${pares.length ? `<details class="emparejados"><summary>✓ Ver los ${pares.length} de la lista</summary>${pares.map(([i, j]) => `<div class="par"><span>${esc(nombreFila(filas[j]))}</span><span class="nota">${esc(items[i].d)}</span></div>`).join('')}</details>` : ''}
    <button class="boton principal ancho" id="b-aplicar-ticket" style="margin-top:14px">✅ Aplicar el ticket</button>`, h => {
    $('#b-aplicar-ticket', h).addEventListener('click', () => {
      for (const [i, j] of pares) { const f = filas[j], it = items[i]; s.marcados[f.clave] = true; delete s.noComprado[f.clave]; delete s.alternativas[f.clave]; s.ticketCant[f.clave] = { n: it.n, kg: it.kg }; }
      for (const f of noEstan) s.noComprado[f.clave] = true;
      s.ticket = resumenTicket(t, fuera); aprendePrecios(items, t.fecha || hoy());
      salva(); cierraHoja();
      const cambios = noEstan.length ? adaptaMenu(p) : [];   // los platos con lo que no había se cambian ya por otros que podáis hacer
      V.filtroCompra = 'todo';
      if (V.pestana !== 'compra') location.hash = 'compra'; else { vCompra(); window.scrollTo({ top: 0 }); }
      tostada(`🧾 ✓ ${pares.length} · ✕ ${noEstan.length} · ＋ ${fuera.length}`);
      if (cambios.length) setTimeout(() => hojaCambiosMenu(cambios), 450);
    });
  });
}
// El ticket llega cuando la compra ya estaba terminada: se compara con lo marcado y lo de fuera de la lista pasa a «En casa».
function ticketDeTerminada(t, items, u, sinRed) {
  const filas = u.si.map(n => ({ texto: n })), pares = L.cruzaTicket(items, filas, puntuaTicket);
  const usados = new Set(pares.map(([i]) => i)), vistos = new Set(pares.map(([, j]) => j));
  const fuera = items.filter((_, i) => !usados.has(i)), sinTicket = u.si.filter((_, j) => !vistos.has(j));
  hoja(`<h2>🧾 Ticket${t.fecha ? ' del ' + fechaCorta(t.fecha) : ''}</h2>
    <p class="nota">La compra ya estaba terminada: lo comparo con lo que marcasteis.</p>
    <div class="tabla-n" style="grid-template-columns:repeat(3,1fr)"><div><b>✓ ${pares.length}</b><span>coinciden</span></div><div><b>🤔 ${sinTicket.length}</b><span>no salen</span></div><div><b>＋ ${fuera.length}</b><span>fuera de lista</span></div></div>
    <p class="nota"><b>${euros(t.total ?? t.suma)}</b>${t.cuadra ? '' : ' · ⚠️ no me cuadra el total'}${sinRed ? ' · 📡 sin conexión: comparo solo por el nombre' : ''}</p>
    ${sinTicket.length ? `<h3>🤔 Con ✓ pero no salen en el ticket</h3>${listaSimple(sinTicket)}` : ''}
    ${fuera.length ? `<h3>＋ Fuera de la lista</h3>${fuera.map(filaTicket).join('')}` : ''}
    <button class="boton principal ancho" id="b-guardar-ticket" style="margin-top:14px">✅ Guardar${fuera.length ? ' y pasar lo de fuera a «En casa»' : ''}</button>`, h => {
    $('#b-guardar-ticket', h).addEventListener('click', () => {
      const r = resumenTicket(t, fuera);
      aCasaTicket(r.fuera); aprendePrecios(items, t.fecha || hoy());
      u.ticket = { fecha: r.fecha, total: r.total, cuadra: r.cuadra, lineas: r.lineas };
      u.extra = [...u.extra, ...r.fuera.map(nombreFuera)]; u.sinTicket = sinTicket;
      salva(); hojaCompra(u); tostada('🧾 Ticket guardado');
    });
  });
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
    ${E.escaneos.length ? `<h3>🕘 Lo último</h3><div class="lista">${E.escaneos.slice(0, 8).map(x => `<button class="producto fila-simple" data-ean="${esc(x.ean)}"><div class="sinfoto">${L.NIVEL[x.nivel]?.e || '⚪'}</div><span class="info"><span class="pn">${esc(x.n.slice(0, 48))}</span></span><span class="flecha">›</span></button>`).join('')}</div>` : ''}`, h => {
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
        if (!pr) { res.innerHTML = `<div class="aviso"><span class="emo">🙈</span><div><b>No lo encuentro</b> (${esc(ean)}).</div></div><button class="boton suave" id="b-off-claude">${I.enviar}Mandárselo al Chef</button>`;
          $('#b-off-claude', h).addEventListener('click', () => irAClaude(`¿Es buena compra el producto con código ${ean}? Te mando foto.`)); return; }
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
        <details class="por-que"><summary>Por qué esta nota</summary>
          <p class="nota">Puntos: ${v.pts > 0 ? '+' : ''}${v.pts} (bueno con 2 o más, «mejor no» con −2 o menos). Por cada 100 g: ${[`${v.kcal} kcal`, `${r0(nut.p * 10) / 10} g de proteína`, nut.az != null && `${r0(nut.az * 10) / 10} g de azúcar`, nut.sat != null && `${r0(nut.sat * 10) / 10} g de grasa saturada`, nut.f != null && `${r0(nut.f * 10) / 10} g de fibra`, nut.sal != null && `${r0(nut.sal * 100) / 100} g de sal`, nut.nova && `NOVA ${nut.nova}`, nut.nutri && `Nutri-Score ${String(nut.nutri).toUpperCase()}`].filter(Boolean).join(' · ')}.</p>
          <p class="nota">Suma: mucha proteína para sus calorías, fibra, poco procesado, Nutri-Score A o B. Resta: azúcar (7 g o más), grasa saturada (2,5 g o más), más de 400 kcal, sal (1,5 g o más), ultraprocesado (NOVA 4), Nutri-Score D o E.</p>
          <p class="nota">Datos: ${local ? 'la ficha de Mercadona y Open Food Facts' : 'Open Food Facts'} · <a href="https://world.openfoodfacts.org/product/${esc(ean)}" target="_blank" rel="noopener">ver la ficha</a></p></details>
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
  const items = Object.entries(E.casa).filter(([k, g]) => D.productos[k] && g > 0), extra = E.casaExtra || [];
  cabecera('Nevera', `${items.length + extra.length + E.casaOtros.length} cosas`);
  const porSec = {};
  for (const [k, g] of items) (porSec[D.productos[k].cat] ||= []).push({ k, g });
  for (const x of extra) (porSec[x.cat || 'Otros'] ||= []).push({ x });
  const secs = Object.keys(porSec).sort((a, b) => ordenSeccion(a) - ordenSeccion(b));
  const fila = ({ k, g, x }) => {
    if (x) return `<div class="producto casa-fila">${x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy" width="50" height="50">` : `<div class="sinfoto">${emojiSeccion(x.cat || 'Otros')}</div>`}
      <div class="info"><div class="pn">${esc(x.n)}</div></div>
      <button class="icono" data-extra-acabado="${esc(x.id)}" aria-label="Se acabó">${I.carro}</button><button class="icono" data-extra-quitar="${esc(x.id)}" aria-label="Quitar">${I.papelera}</button></div>`;
    const p = D.productos[k];
    return `<div class="producto casa-fila">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy" width="50" height="50">` : `<div class="sinfoto">${emojiSeccion(p.cat)}</div>`}
      <div class="info"><div class="pn">${esc(nombreCorto(p))}</div><div class="pc">${esc(cantidadCasa(k, g))}</div></div>
      <div class="mini-cant"><button data-menos="${k}" aria-label="Menos">−</button><button data-mas="${k}" aria-label="Más">＋</button></div>
      <button class="icono" data-acabado="${k}" aria-label="Se acabó" title="Se acabó: a la próxima compra">${I.carro}</button></div>`; };
  $('#vista').innerHTML = `
    <button class="boton principal ancho" id="b-anadir-casa" style="margin:4px 0 12px">➕ Añadir algo que tenéis</button>
    ${buscadorLista(items.length + extra.length + E.casaOtros.length, 'Buscar en casa')}
    ${letrero('casa-ayuda', '💡', '<b>Toca el carrito</b> cuando algo se acabe: se quita de aquí y entra en la próxima compra.')}
    ${secs.map(sec => `<div class="cat"><span class="emo">${emojiSeccion(sec)}</span>${esc(sec)}<span class="num">${porSec[sec].length}</span></div><div class="lista">${porSec[sec].map(fila).join('')}</div>`).join('')}
    ${E.casaOtros.length ? `<div class="cat"><span class="emo">🧺</span>Otras cosas<span class="num">${E.casaOtros.length}</span></div><div class="lista">${E.casaOtros.map((t, i) => `<div class="producto casa-fila"><div class="sinfoto">📝</div><div class="info"><div class="pn">${esc(t)}</div></div>
      <button class="icono" data-otro-acabado="${i}" aria-label="Se acabó">${I.carro}</button><button class="icono" data-otro-casa="${i}" aria-label="Quitar">${I.papelera}</button></div>`).join('')}</div>` : ''}
    ${!secs.length && !E.casaOtros.length ? '<div class="vacio"><span class="emo">🧺</span>Todavía no hay nada.</div>' : ''}`;
  activaLetreros();
  activaBuscador();
  const paso = k => { const x = D.productos[k]; return x.gud || Math.max(10, Math.round(x.util / 4 / 10) * 10); };
  const quitarConVuelta = (txt, hacer) => { const antes = JSON.stringify({ casa: E.casa, extra: E.casaExtra, otros: E.casaOtros, prox: E.proximaCompra }); hacer(); salva(); vCasa();
    conDeshacer(txt, () => { const a = JSON.parse(antes); E.casa = a.casa; E.casaExtra = a.extra; E.casaOtros = a.otros; E.proximaCompra = a.prox; salva(); vCasa(); }); };
  $$('[data-menos]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.menos; E.casa[k] = Math.max(0, (E.casa[k] || 0) - paso(k)); if (E.casa[k] <= 0.5) { delete E.casa[k]; baja(k); } salva(); vCasa(); }));
  $$('[data-mas]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.mas; (E.casa[k] = (E.casa[k] || 0) + paso(k), alta(k)); salva(); vCasa(); }));
  $$('[data-acabado]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.acabado; quitarConVuelta('🛒 A la próxima compra: ' + nombreCorto(D.productos[k]), () => { delete E.casa[k]; baja(k); apuntaProxima({ k, n: nombreCorto(D.productos[k]) }); }); }));
  $$('[data-extra-acabado]').forEach(b => b.addEventListener('click', () => { const x = (E.casaExtra || []).find(y => y.id === b.dataset.extraAcabado); if (x) quitarConVuelta('🛒 A la próxima compra: ' + x.n, () => { E.casaExtra = E.casaExtra.filter(y => y !== x); apuntaProxima({ texto: x.n, n: x.n }); }); }));
  $$('[data-extra-quitar]').forEach(b => b.addEventListener('click', () => { const x = (E.casaExtra || []).find(y => y.id === b.dataset.extraQuitar); if (x) quitarConVuelta('🗑️ ' + x.n, () => { E.casaExtra = E.casaExtra.filter(y => y !== x); }); }));
  $$('[data-otro-acabado]').forEach(b => b.addEventListener('click', () => { const t = E.casaOtros[+b.dataset.otroAcabado]; quitarConVuelta('🛒 A la próxima compra: ' + t, () => { E.casaOtros.splice(E.casaOtros.indexOf(t), 1); apuntaProxima({ texto: t, n: t }); }); }));
  $$('[data-otro-casa]').forEach(b => b.addEventListener('click', () => { const t = E.casaOtros[+b.dataset.otroCasa]; quitarConVuelta('🗑️ ' + t, () => { E.casaOtros.splice(E.casaOtros.indexOf(t), 1); }); }));
  $('#b-anadir-casa').addEventListener('click', abrirAnadirCasa);
}
// Añadir a «En casa» lo que se olvidó: se busca en Mercadona (o en los productos de la app) y cada cosa va a su sección.
function abrirAnadirCasa() {
  hoja(`<h2>🏠 Añadir a En casa</h2><div class="nota">Busca el producto y tócalo. Varias a la vez: «6 huevos, arroz, 2 yogures».</div>
    <form class="anadir" id="f-casa"><div class="caja"><input id="i-casa" placeholder="Busca en Mercadona…" autocomplete="off" enterkeyhint="search"><button class="icono mas" aria-label="Buscar">${I.buscar}</button></div></form>
    <div id="res-casa"></div>`, h => {
    let tB;
    const busca = async () => {
      const txt = $('#i-casa', h).value.trim(), caja = $('#res-casa', h), q = limpiaPeticion(txt);
      if (q.length < 2) { caja.innerHTML = ''; return; }
      if (/,| y /.test(txt)) { caja.innerHTML = `<button class="boton principal ancho" id="b-casa-varias">➕ Apuntar las ${L.separa(txt).length}</button>`; $('#b-casa-varias', h).addEventListener('click', () => { cierraHoja(); apuntaCasa(txt); }); return; }
      caja.innerHTML = '<div class="cargando"></div>';
      let hits = []; try { hits = await buscaMercadona(q, 8); } catch { /* sin conexión */ }
      const local = L.buscaProducto(q, D.productos);
      if (local?.k && !hits.some(x => x.k === local.k)) { const x = D.productos[local.k]; hits.unshift({ id: String(x.id), n: x.n, foto: x.foto, env: x.env, cat: x.cat, k: local.k }); }
      if ($('#i-casa', h).value.trim() !== txt) return;
      caja.innerHTML = hits.map((x, i) => `<button class="res" data-res-casa="${i}">${x.foto ? `<img src="${esc(x.foto)}" alt="" loading="lazy">` : `<span class="sinfoto">${emojiSeccion(x.cat)}</span>`}<span class="res-t"><b>${esc(x.n)}</b><span class="nota">${esc(x.env || '')} · ${emojiSeccion(x.cat)} ${esc(x.cat)}</span></span><span class="icono mas">${SVG.mas.replace('<svg', '<svg class="i"')}</span></button>`).join('')
        + `<button class="chip" id="b-casa-tal" style="margin-top:8px">Apuntar «${esc(capital(q))}» tal cual</button>`;
      $$('[data-res-casa]', caja).forEach(b => b.addEventListener('click', () => {
        const x = hits[+b.dataset.resCasa];
        if (x.k) (E.casa[x.k] = (E.casa[x.k] || 0) + D.productos[x.k].util, alta(x.k));
        else E.casaExtra = [...(E.casaExtra || []), { id: uid(), n: x.n, cat: x.cat || 'Otros', foto: x.foto, m: x.id }];
        salva(); b.classList.add('anadido'); tostada('🏠 ' + (x.k ? nombreCorto(D.productos[x.k]) : x.n)); if (V.pestana === 'casa') vCasa();
      }));
      $('#b-casa-tal', caja).addEventListener('click', () => { E.casaExtra = [...(E.casaExtra || []), { id: uid(), n: capital(q), cat: 'Otros' }]; salva(); cierraHoja(); if (V.pestana === 'casa') vCasa(); tostada('🏠 ' + capital(q)); });
    };
    $('#i-casa', h).addEventListener('input', () => { clearTimeout(tB); tB = setTimeout(busca, 380); });
    $('#f-casa', h).addEventListener('submit', e => { e.preventDefault(); clearTimeout(tB); busca(); });
    setTimeout(() => $('#i-casa', h)?.focus(), 350);
  });
}
// «Se acabó»: lo que se termina en casa entra en la lista de la próxima compra (hasta que se compra).
function apuntaProxima({ k = null, texto = null, n }) {
  E.proximaCompra ||= [];
  if (!n || E.proximaCompra.some(x => (k && x.k === k) || L.normaliza(x.n) === L.normaliza(n))) return;
  E.proximaCompra.push({ id: uid(), k, texto, n, f: hoy() });
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
      (E.casa[d.k] = (E.casa[d.k] || 0) + (conCantidad ? d.g : x.util), alta(d.k));
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
    (E.casa[it.k] = (E.casa[it.k] || 0) + (it.n ? (x.gud ? it.n * x.gud : it.n * x.util) : x.util), alta(it.k));
    nombres.push(nombreCorto(x));
  }
  salva();
  tostada(nombres.length ? '🏠 En casa: ' + nombres.join(', ') : 'No lo encuentro en los productos de la app');
  return nombres.length > 0;
}

// ——— Recetas ———
const FILTROS = [['todas', 'Todas'], ['cena', 'Cenas'], ['desayuno', 'Desayunos'], ['comida', 'Almuerzos'], ['antojos', 'Smoothies y postres'], ['favoritas', 'Favoritas'], ['rapidas', 'En 10 min'], ['vuestras', 'Vuestras']];
function vRecetas() {
  const todas = todasRecetas();
  cabecera('Recetas', `${todas.length} recetas`);
  const pregunta = V.busca.trim();
  const t = L.normaliza(pregunta).replace(/^(como se hace|como hago|como preparo|como se prepara|receta de|receta)\s+/, '').replace(/^(un|una|el|la|los|las)\s+/, '');
  const ocultas = todas.filter(r => !sePuedeHacer(r)).length, sinAp = platosSinAparato(planActivo()).length, vos = L.QUIEN.length > 1;
  const lista = todas.filter(r => {
    if (D.amiga && L.QUIEN.some(q => alergiaDe(r, perfiles()[q]).length)) return false;   // alergias: nunca
    if (!V.verOcultas && !sePuedeHacer(r)) return false;   // lo que no se puede hacer con esta cocina, solo si se pide
    if (t && !L.normaliza(r.n + ' ' + r.ing.map(i => D.productos[i[0]]?.n).join(' ') + ' ' + (r.otros || []).join(' ')).includes(t)) return false;
    const f = V.filtro;
    return f === 'todas' || (f === 'antojos' && (r.bebida || r.postre || r.batido)) || (f === 'favoritas' && r.fav) || (f === 'vuestras' && r.propia) || r.tipo.includes(f) || r.ap === f || (f === 'rapidas' && r.min <= 10);
  });
  const esPregunta = /^(¿)?\s*(c[oó]mo|qu[eé]|puedo|se puede|receta)/i.test(pregunta) || (t && !lista.length);
  $('#vista').innerHTML = `
    <div class="buscador">${I.buscar}<input id="i-busca" type="search" placeholder="Busca o pregunta: ¿cómo se hace…?" value="${esc(V.busca)}" enterkeyhint="search"></div>
    ${esPregunta && pregunta ? `<div class="tarjeta pregunta"><span class="emo">🤔</span><div><b>${lista.length ? '¿No es ninguna?' : 'No la tengo todavía.'}</b> Pregúntaselo al Chef y la añado.</div><button class="boton principal" id="b-preguntar">${I.enviar}Preguntar</button></div>` : ''}
    <div class="rec-linea"><button class="ver-todo" id="b-cocina">${V.verCocina ? 'Listo' : `${vos ? 'Vuestra' : 'Tu'} cocina · ${APARATOS_CASA.filter(([k]) => aparatosCasa().includes(k)).length} aparatos`}</button><button class="ver-todo" id="b-nueva">+ Nueva receta</button></div>
    <div class="tarjeta cocina"${V.verCocina || ocultas && V.verOcultas || sinAp ? '' : ' hidden'}><div class="cocina-cab"><b>Lo que ${vos ? 'tenéis' : 'tienes'} en la cocina</b><span class="nota">toca para quitar o poner</span></div>
      <div class="botones">${APARATOS_CASA.map(([k, n]) => `<button class="chip" data-aparato="${k}" aria-pressed="${aparatosCasa().includes(k)}">${n}</button>`).join('')}</div>
      ${ocultas ? `<p class="nota" style="margin:10px 0 0">${ocultas} receta${ocultas > 1 ? 's necesitan' : ' necesita'} algo que no ${vos ? 'tenéis' : 'tienes'}. <button class="ver-todo" id="b-ver-ocultas">${V.verOcultas ? 'Ocultarlas' : 'Verlas'}</button></p>` : ''}
      ${sinAp ? `<p class="nota" style="margin:8px 0 0">⚠️ ${sinAp} plato${sinAp > 1 ? 's' : ''} de esta semana no se ${sinAp > 1 ? 'pueden' : 'puede'} hacer. <button class="ver-todo" id="b-cambiar-sinap">Cambiar${sinAp > 1 ? 'los' : 'lo'}</button></p>` : ''}</div>
    <div class="fila-chips">${FILTROS.map(([k, n]) => `<button class="chip" data-filtro="${k}" aria-pressed="${V.filtro === k}">${n}</button>`).join('')}</div>
    <div class="recetas-rejilla">${lista.map(r => { const g = L.macrosReceta(r, 'G', D.productos, fac);
      return `<button class="rt${sePuedeHacer(r) ? '' : ' no-puedo'}" data-receta="${r.id}">${fotoPlato(r, 400, 'rt-foto')}${r.fav ? `<span class="rt-fav" aria-label="Favorita">${I.corazon}</span>` : ''}
        <span class="rt-nombre">${esc(r.n)}</span><span class="rt-datos">${r.min} min · ${r0(g.kcal)} kcal${r.propia ? ' · vuestra' : ''}</span></button>`; }).join('')}</div>
    ${lista.length ? '' : `<div class="vacio"><span class="emo">${V.filtro === 'favoritas' ? '❤️' : '🔍'}</span>${V.filtro === 'favoritas' ? 'Toca 🤍 en una receta para guardarla aquí.' : 'No hay recetas con ese filtro.'}</div>`}`;
  $('#b-nueva').addEventListener('click', () => editorReceta(null));
  $('#b-cocina').addEventListener('click', () => { V.verCocina = !V.verCocina; vRecetas(); });
  $('#b-preguntar')?.addEventListener('click', () => irAClaude(`${/^¿/.test(pregunta) ? pregunta : '¿' + capital(pregunta) + '?'} Explícamelo y, si vale, ponla en NutriHome.`));
  $('#i-busca').addEventListener('input', e => { V.busca = e.target.value; const pos = e.target.selectionStart; vRecetas(); const i = $('#i-busca'); i.focus(); i.setSelectionRange(pos, pos); });
  $$('[data-filtro]').forEach(b => b.addEventListener('click', () => { V.filtro = b.dataset.filtro; vRecetas(); }));
  $$('[data-receta]').forEach(b => b.addEventListener('click', () => abrirReceta(b.dataset.receta)));
  $$('[data-aparato]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.aparato, ahora = aparatosCasa();
    fijaAparatos(ahora.includes(a) ? ahora.filter(x => x !== a) : [...ahora, a]);
    salva(); vRecetas();
  }));
  $('#b-ver-ocultas')?.addEventListener('click', () => { V.verOcultas = !V.verOcultas; vRecetas(); });
  $('#b-cambiar-sinap')?.addEventListener('click', () => { const c = ajustaPorAparatos(planActivo()); vRecetas(); hojaCambiosMenu(c); });
}

// ——— Nosotros (icono de perfil): vuestros datos, gustos y el súper ———
const OBJ_TXT = { perder: 'perder grasa', mantener: 'mantenerse', ganar: 'ganar músculo' };
const enlaceCasa = c => `${location.origin}${location.pathname}#casa=${c}`;
const textoInvitacion = x => `Te invito a NutriHome, nuestra app de menús y lista de la compra, con un chef al que preguntar: ${enlaceCasa(x.clave)}\nÁbrela en el móvil y contesta unas preguntas. Si algún día te pide la clave de casa, es esta: ${x.clave}`;
function vNosotros() {
  const p = perfiles(), h = hoy(), cr = E.creatina[h] || {}, sup = E.super || 'mercadona', amiga = !!D.amiga, varios = L.QUIEN.length > 1;
  const alergiasTxt = x => [...new Set([...(x.alergias || []).map(a => (ALERGIAS.find(([v]) => v.split(',').includes(a)) || [a, a])[1]), x.otrasAlergias].filter(Boolean))];
  const tarjeta = q => {
    const x = p[q], o = obj[q], al = alergiasTxt(x);
    return `<div class="tarjeta perfil"><h3><span class="avatar ${q.toLowerCase()}">${ini(q)}</span><span class="${q === 'G' ? 'persona-g' : 'persona-p'}">${esc(x.nombre)}</span></h3>
      <div class="campos">
        <label>Edad<input type="number" inputmode="numeric" data-q="${q}" data-campo="edad" value="${x.edad}"></label>
        <label>Altura (cm)<input type="number" inputmode="numeric" data-q="${q}" data-campo="altura" value="${x.altura}"></label>
        <label>Peso (kg)<input type="number" inputmode="decimal" step="0.5" data-q="${q}" data-campo="peso" value="${x.peso}"></label></div>
      <div class="objetivos"><div class="o1"><span class="emo">🔥</span><b>${o.kcal}</b><span>kcal</span></div><div class="o2"><span class="emo">💪</span><b>${o.prot} g</b><span>proteína</span></div><div class="o3"><span class="emo">🍞</span><b>${o.hc} g</b><span>hidratos</span></div><div class="o4"><span class="emo">🥑</span><b>${o.grasa} g</b><span>grasa</span></div></div>
      ${amiga ? `<p class="nota" style="margin:10px 0 0">🎯 ${x.tca ? 'sin dieta para perder peso' : OBJ_TXT[x.objetivo] || 'perder grasa'} · 🍽️ ${(DIETAS.find(([v]) => v === (x.dieta || 'todo')) || DIETAS[0])[1].toLowerCase()}${al.length ? ` · ⚠️ alergias: ${esc(al.join(', '))}` : ''}</p>` : ''}
      <label class="campo-largo">❤️ Me gusta<textarea data-q="${q}" data-texto="gusta" rows="2" placeholder="batidos, fruta, queso de cabra…">${esc(x.gusta || '')}</textarea></label>
      <label class="campo-largo">🚫 No me gusta<textarea data-q="${q}" data-texto="noGusta" rows="2" placeholder="manzana, cilantro… (no entra en los menús)">${esc(x.noGusta || '')}</textarea></label></div>`;
  };
  const gym = E.gimnasio ?? p.gimnasio, conSuple = !amiga && D.perfiles.suplementos;
  const fmt = v => String(v).replace('.', ',');
  // Ajustes: una lista por grupos y cada fila abre su página (V.ajuste); Apariencia se elige ahí mismo.
  const tema = leeTexto(TEMA) || 'claro', nNotas = (E.notasChef || []).length, nAp = APARATOS_CASA.filter(([k]) => aparatosCasa().includes(k)).length;
  const paginas = {
    ...Object.fromEntries(L.QUIEN.map(q => [q, [esc(p[q].nombre), tarjeta(q) + (amiga ? `<button class="boton ancho" id="b-cambiar-datos" style="margin:4px 0 8px">Cambiar ${varios ? 'nuestros' : 'mis'} datos y rehacer el menú</button>` : '')]])),
    super: [varios ? 'Vuestro súper' : 'Tu súper', `    <div class="tarjeta perfil"><h3>🏪 ${varios ? 'Vuestro' : 'Tu'} súper</h3>
      <div class="botones" style="margin-top:10px">${SUPERS.map(([k, n]) => `<button class="chip" data-super="${k}" aria-pressed="${sup === k}">${n}</button>`).join('')}</div>
      <p class="nota" style="margin:10px 0 0">${sup === 'mercadona' ? 'Productos, precios y ticket digital de Mercadona.' : 'Por ahora, los productos y los precios son los de Mercadona, como referencia.'}${amiga && E.hogar?.presupuesto ? ` Presupuesto: ${euros(E.hogar.presupuesto)} a la semana.` : ''}</p></div>
`],
    salud: [conSuple ? 'Creatina y gimnasio' : 'Cómo lo calculo', `    ${conSuple ? `<div class="tarjeta perfil"><h3>💊 Creatina de hoy</h3>
      <div class="botones" style="margin-top:10px">${L.QUIEN.map(q => `<button class="chip" data-crea="${q}" aria-pressed="${!!cr[q]}">${cr[q] ? '✅' : '⬜'} ${esc(NOM[q])}</button>`).join('')}</div></div>
    <div class="tarjeta perfil"><button class="interruptor" id="b-gym" aria-pressed="${!!gym}"><span class="sw"></span><span>🏋️ ${gym ? 'Vamos al gimnasio' : 'Todavía sin gimnasio'}</span></button></div>` : ''}
    <details class="tarjeta perfil" open><summary><b>🧮 Cómo lo calculo</b></summary><p class="nota">Gasto en reposo (Mifflin-St Jeor) × actividad${amiga ? ', y según el objetivo de cada uno: perder grasa, un 20 % menos; mantenerse, igual; ganar músculo, un 10 % más' : ' (×1,3; ×1,45 con gimnasio), menos un 20 %'}. Nunca por debajo de 1.200 kcal (mujeres) o 1.500 (hombres). Proteína: ${L.QUIEN.map(q => `${fmt(p[q].protKg)} g/kg ${esc(NOM[q])}`).join(' y ')}. Grasa: ${fmt(p.G.grasaKg)} g/kg. Lo demás, hidratos.</p>
      ${conSuple ? `<p class="nota">💊 ${esc(D.perfiles.suplementos.creatina)}<br>🥤 ${esc(D.perfiles.suplementos.huel)}</p>` : ''}<p class="nota">NutriHome no da consejos médicos: si tienes una enfermedad o estás embarazada, consulta antes a un profesional.</p></details>
`],
    chef: ['Lo que sabe el Chef', `    <div class="tarjeta perfil"><h3>📝 Lo que el Chef sabe de ${varios ? 'vosotros' : 'ti'}${etiquetaNuevo('chef-notas')}</h3><p class="nota" style="margin:6px 0 10px">Costumbres que le habéis contado (horarios, lo que preferís en cada comida…). Las tiene en cuenta siempre.</p>
      ${(E.notasChef || []).length ? `<div class="lista">${E.notasChef.map((t, i) => `<div class="producto fila-simple"><div class="sinfoto">📝</div><div class="info"><div class="pn">${esc(t)}</div></div><button class="icono" data-nota-quitar="${i}" aria-label="Quitar">${I.papelera}</button></div>`).join('')}</div>` : ''}
      <form class="anadir" id="f-nota" style="margin-top:10px"><div class="caja"><input id="i-nota" placeholder="Desayunamos tarde y casi nunca comemos" autocomplete="off" enterkeyhint="send"><button class="icono mas" aria-label="Apuntar">${SVG.mas.replace('<svg', '<svg class="i"')}</button></div></form></div>
`],
    amigos: [amiga ? 'Clave de casa' : 'Invitar a amigos', `    ${amiga ? `<div class="tarjeta perfil"><h3>🔑 ${varios ? 'Vuestra' : 'Tu'} clave de casa</h3>
      <p class="nota" style="margin:6px 0 10px">Te la pedirá si instalas la app en la pantalla de inicio o la abres en otro móvil.</p>
      <div class="clave-casa"><b>${esc(leeTexto(CLAVE))}</b><button class="chip" id="b-copiar-clave">Copiar</button><button class="chip" id="b-enviar-clave">📤 Enviar</button></div></div>`
    : `<div class="tarjeta perfil"><h3>👥 Invitar a amigos${etiquetaNuevo('amigos')}</h3>
      <p class="nota" style="margin:6px 0 10px">Cada casa invitada tiene su menú, su compra y su Chef. Sus datos van aparte, cifrados con su propia clave.</p>
      ${E.invitaciones.length ? `<div class="lista">${E.invitaciones.map(x => `<div class="producto fila-simple"><div class="sinfoto">🏠</div><div class="info"><div class="pn">${esc(x.nombre)}</div><div class="pc" data-estado-inv="${esc(x.id)}">invitada el ${fechaCorta(x.creada)}</div></div><button class="chip" data-inv-enviar="${esc(x.id)}">📤 Enviar</button><button class="icono" data-inv-quitar="${esc(x.id)}" aria-label="Quitar">${I.papelera}</button></div>`).join('')}</div>` : ''}
      <form class="anadir" id="f-invitar" style="margin-top:10px"><div class="caja"><input id="i-invitar" placeholder="¿A quién invitas? Laura y Dani" autocomplete="off" enterkeyhint="send"><button class="icono mas" aria-label="Crear invitación">${SVG.mas.replace('<svg', '<svg class="i"')}</button></div></form></div>`}
`],
    movil: ['Sincronización', `    <div class="tarjeta perfil"><h3>☁️ Sincronización</h3><p class="nota" style="margin:8px 0 0">${servidor() ? (V.sync === 'ok' ? `Todos los móviles de casa comparten lo mismo a través del servidor. Última vez: ${V.syncHora ? V.syncHora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}.` : V.sync === 'error' ? `No llego al servidor (${esc(V.syncError)}). Lo guardado se sube en cuanto vuelva la conexión.` : 'Conectando con el servidor de casa…') : 'Sin servidor todavía: lo guardado está solo en este móvil.'}</p></div>
    <div class="tarjeta perfil"><h3>📱 Este móvil</h3>
      <div class="botones">${servidor() ? `<button class="boton" id="b-rebajar">🔄 Volver a bajar los datos de casa</button><button class="boton" id="b-salir">🚪 Salir en este móvil</button>` : `<button class="boton peligro" id="b-borrar">${I.papelera}Borrar lo de este móvil</button>`}</div></div>`],
  };
  const fila = (k, ic, t, sub = '', val = '') => `<button class="ajuste-fila" data-ajuste="${k}">${ic}<span class="af-t"><b>${t}</b>${sub ? `<span>${sub}</span>` : ''}</span>${val ? `<span class="af-v">${val}</span>` : ''}<span class="af-flecha">${SVG.flecha}</span></button>`;
  const icono = (svg, cls = '') => `<span class="af-ic ${cls}">${svg}</span>`;
  const estadoSync = !servidor() ? 'Solo este móvil' : V.sync === 'ok' ? 'Al día' : V.sync === 'error' ? 'Sin conexión' : 'Conectando…';
  if (V.ajuste && !paginas[V.ajuste]) V.ajuste = null;
  if (V.ajuste) { cabecera(paginas[V.ajuste][0]); $('#vista').innerHTML = `<div class="ajuste-pagina">${paginas[V.ajuste][1]}</div>`; }
  else {
    cabecera('Ajustes');
    $('#vista').innerHTML = `
    <h2 class="cat">${varios ? 'Vosotros' : 'Tus datos'}</h2>
    <div class="ajustes-lista">${L.QUIEN.map(q => fila(q, `<span class="avatar ${q.toLowerCase()}">${ini(q)}</span>`, esc(p[q].nombre), `${p[q].edad} años · ${p[q].altura} cm · ${fmt(p[q].peso)} kg`, `${obj[q].kcal} kcal`)).join('')}</div>
    <h2 class="cat">Casa</h2>
    <div class="ajustes-lista">
      ${fila('super', icono(SVG.tienda), varios ? 'Vuestro súper' : 'Tu súper', '', (SUPERS.find(([k]) => k === sup) || SUPERS[0])[1])}
      <button class="ajuste-fila" data-ir-cocina>${icono(SVG.recetas)}<span class="af-t"><b>Cocina</b></span><span class="af-v">${nAp} aparatos</span><span class="af-flecha">${SVG.flecha}</span></button>
      ${fila('chef', icono(SVG.claude), 'Lo que sabe el Chef', 'Vuestras costumbres', nNotas ? String(nNotas) : '')}
      ${conSuple ? fila('salud', icono(SVG.pesa), 'Creatina y gimnasio', 'Y cómo se calculan las calorías') : ''}
      ${fila('amigos', icono(amiga ? SVG.llave : SVG.nosotros), amiga ? 'Clave de casa' : 'Invitar a amigos', '', !amiga && E.invitaciones.length ? String(E.invitaciones.length) : '')}
    </div>
    <h2 class="cat">App</h2>
    <div class="ajustes-lista">
      <div class="ajuste-fila estatica">${icono(SVG.tema)}<span class="af-t"><b>Apariencia${etiquetaNuevo('oscuro')}</b><span>Solo en este móvil</span></span></div>
      <div class="af-seg"><div class="segmento" role="tablist">${[['claro', 'Claro'], ['oscuro', 'Oscuro'], ['auto', 'Automático']].map(([k, n]) => `<button data-tema="${k}" aria-selected="${tema === k}">${n}</button>`).join('')}</div></div>
      <button class="ajuste-fila" id="b-novedades">${icono(SVG.estrella)}<span class="af-t"><b>Novedades</b><span>Lo último que ha llegado</span></span><span class="af-flecha">${SVG.flecha}</span></button>
      ${fila('movil', icono(SVG.nube), 'Sincronización y este móvil', '', estadoSync)}
      ${conSuple ? '' : fila('salud', icono(SVG.info), 'Cómo lo calculo')}
    </div>
    <p class="nota creditos">Fotos de los platos: Pexels (fotos libres). Pueden no ser exactamente vuestra receta.</p>`;
  }
  $$('[data-ajuste]').forEach(b => b.addEventListener('click', () => { V.ajuste = b.dataset.ajuste; vNosotros(); window.scrollTo({ top: 0 }); }));
  $('[data-ir-cocina]')?.addEventListener('click', () => { V.verCocina = true; location.hash = 'recetas'; });
  $$('input[data-campo]').forEach(i => i.addEventListener('change', () => {
    const v = parseFloat(i.value.replace(',', '.'));
    if (!isFinite(v) || v <= 0) return;
    if (i.dataset.campo === 'edad' && v < 18) { tostada('NutriHome es para mayores de 18'); i.value = p[i.dataset.q].edad; return; }
    (E.perfiles[i.dataset.q] ||= {})[i.dataset.campo] = v; salva(); recalcula(); vNosotros(); tostada('Objetivos recalculados');
  }));
  $$('textarea[data-texto]').forEach(t => t.addEventListener('change', () => { (E.perfiles[t.dataset.q] ||= {})[t.dataset.texto] = t.value.trim(); salva(); tostada('Apuntado: lo tengo en cuenta en los menús'); }));
  $$('[data-super]').forEach(b => b.addEventListener('click', () => { E.super = b.dataset.super; if (E.hogar) E.hogar.super = b.dataset.super; salva(); vNosotros(); }));
  $('#b-gym')?.addEventListener('click', () => { E.gimnasio = !gym; salva(); recalcula(); vNosotros(); });
  $$('[data-crea]').forEach(b => b.addEventListener('click', () => { const x = (E.creatina[h] ||= {}); x[b.dataset.crea] = !x[b.dataset.crea]; salva(); vNosotros(); if (x[b.dataset.crea]) tostada('💊 Apuntada'); }));
  $('#b-cambiar-datos')?.addEventListener('click', () => bienvenida(true));
  $('#b-novedades')?.addEventListener('click', () => hojaNovedades(true));
  $$('[data-tema]').forEach(b => b.addEventListener('click', () => { guardaTexto(TEMA, b.dataset.tema); aplicaTema(); vNosotros(); }));
  $$('[data-nota-quitar]').forEach(b => b.addEventListener('click', () => { E.notasChef.splice(+b.dataset.notaQuitar, 1); salva(); vNosotros(); }));
  $('#f-nota')?.addEventListener('submit', e => { e.preventDefault(); const t = $('#i-nota').value.trim(); if (!t) return; haceAccion({ tipo: 'nota', texto: t }); vNosotros(); tostada('📝 Apuntado'); });
  $('#b-copiar-clave')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(leeTexto(CLAVE)); tostada('Clave copiada'); } catch { tostada('No he podido copiarla'); } });
  $('#b-enviar-clave')?.addEventListener('click', () => compartirTexto('NutriHome', `Nuestra casa en NutriHome: ${enlaceCasa(leeTexto(CLAVE))}\nClave de casa: ${leeTexto(CLAVE)}`, 'Copiado: pégalo en WhatsApp'));
  $('#f-invitar')?.addEventListener('submit', e => {
    e.preventDefault();
    const n = $('#i-invitar').value.trim();
    if (!n) { $('#i-invitar').focus(); tostada('Escribe a quién invitas'); return; }
    const x = { id: uid(), nombre: n, clave: nuevaClaveAmiga(), creada: hoy() };
    E.invitaciones = [...E.invitaciones, x]; salva(); vNosotros();
    compartirTexto('Invitación a NutriHome', textoInvitacion(x), 'Invitación copiada: pégala en WhatsApp');
  });
  $$('[data-inv-enviar]').forEach(b => b.addEventListener('click', () => { const x = E.invitaciones.find(y => y.id === b.dataset.invEnviar); if (x) compartirTexto('Invitación a NutriHome', textoInvitacion(x), 'Invitación copiada: pégala en WhatsApp'); }));
  $$('[data-inv-quitar]').forEach(b => b.addEventListener('click', () => {
    const x = E.invitaciones.find(y => y.id === b.dataset.invQuitar);
    if (x && confirm(`¿Quitas la invitación de ${x.nombre}? Su app seguirá funcionando, pero el Chef ya no le contestará.`)) { E.invitaciones = E.invitaciones.filter(y => y !== x); salva(); vNosotros(); }
  }));
  // ¿Han entrado ya? Solo se mira si su casa tiene datos en el servidor (sin descifrar nada).
  if (servidor()) for (const x of E.invitaciones) idCasa(x.clave).then(id => fetch(`${servidor()}/casa/${id}`, { method: 'GET', cache: 'no-store' })).then(r => {
    const el = $(`[data-estado-inv="${CSS.escape(x.id)}"]`); if (el) el.textContent = `${r.status === 200 ? '✓ ya está dentro' : 'todavía no ha entrado'} · invitada el ${fechaCorta(x.creada)}`;
  }).catch(() => {});
  $('#b-rebajar')?.addEventListener('click', () => { if (!confirm('¿Vuelvo a bajar los datos de casa? Lo que solo esté en este móvil y no se haya subido se pierde.')) return; guardaTexto(ESTADO, null); guardaTexto(SYNC, null); location.reload(); });
  $('#b-salir')?.addEventListener('click', () => { if (!confirm('¿Sales de esta casa en este móvil? Para volver hará falta la clave de casa.')) return; guardaTexto(CLAVE, null); location.reload(); });
  $('#b-borrar')?.addEventListener('click', () => {
    if (!confirm('¿Borro de este móvil los cambios, la lista, lo de «En casa» y vuestras recetas? El menú y las recetas de la app no se borran.')) return;
    E = estadoNuevo(); E.casa = { ...(D.casa_inicial || {}) }; E.fijos = [...(D.fijos || [])]; reconstruyeRecetas(); salva(); recalcula(); vNosotros(); tostada('Borrado');
  });
}

// ——— Casas amigas: arranque, preguntas iniciales y su menú ———
async function cargaCatalogo() {
  const r = await fetch('catalogo.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('No se pudo descargar el catálogo (' + r.status + ').');
  const c = await r.json();
  return { amiga: true, generado: c.generado, productos: c.productos, recetas: c.recetas, base: c.base, servidor: c.servidor, perfiles: { servidor: c.servidor }, semana: null, casa_inicial: {}, fijos: [] };
}
// Lo que haya de esta casa en el servidor (si es otro móvil de la casa). null: sin conexión.
async function bajaCasa() {
  let r;
  try { r = await fetch(`${servidor()}/casa/${casaId}`, { cache: 'no-store' }); } catch { return E.hogar ? true : null; }
  if (r.status === 204) return false;
  if (!r.ok) return E.hogar ? true : null;
  try {
    const rem = await r.json(), E2 = await descifraSync(rem.blob);
    const fundido = sync.base == null ? (riqueza(E) > riqueza(E2) ? L.fusiona(undefined, E2, E) : L.fusiona(undefined, E, E2)) : L.fusiona(sync.base, E, E2);
    E = Object.assign(estadoNuevo(), fundido); sync.v = rem.v; sync.base = JSON.parse(JSON.stringify(E2)); guarda(ESTADO, E); guarda(SYNC, sync);
  } catch { return E.hogar ? true : null; }
  return true;
}
async function arrancaAmiga(clave) {
  try { D = await cargaCatalogo(); } catch (e) { puerta(e.message); return false; }
  await preparaSync(clave);
  const hay = await bajaCasa();
  if (hay === null && !E.hogar) { puerta('Sin conexión: la primera vez hace falta internet.'); return false; }
  if (!hay && !E.hogar && !leeTexto(NUEVA)) { guardaTexto(CLAVE, null); puerta('No encuentro esa casa. Revisa la clave o pide otra invitación.'); return false; }
  if (!E.hogar) { bienvenida(); return false; }
  montaAmiga(); return true;
}
function montaAmiga() {
  const h = E.hogar, per = { servidor: D.servidor, gimnasio: false };
  h.personas.forEach((x, i) => { per[i ? 'P' : 'G'] = { ...x }; });
  D.perfiles = per;
  L.fijaQuien(h.personas.map((_, i) => (i ? 'P' : 'G')));
  D.semana = (E.planes || []).slice().sort((a, b) => a.id.localeCompare(b.id))[0] || null;
  if (!E.super) E.super = h.super;
}
// Días hasta el próximo día de compra (al menos 3): el primer menú llega justo hasta ahí.
function diasHasta(dc) { const dow = fecha(hoy()).getDay(); let n = ((dc - dow + 7) % 7) || 7; if (n < 3) n += 7; return n; }
function diaBase(f) {
  const d = { f }, dow = fecha(f).getDay();
  for (const c of L.COMIDAS) d[c] = null;
  if (D.amiga) { if (E.hogar?.fueraComida?.includes(dow)) d.comida = { fuera: true }; if (E.hogar?.fueraCena?.includes(dow)) d.cena = { fuera: true }; }
  else { if (dow === 0) d.comida = { fuera: true }; if (dow === 5) d.cena = { fuera: true }; }
  return d;
}
const tituloPlan = (a, b) => { const x = fecha(a), y = fecha(b); return x.getMonth() === y.getMonth() ? `Semana del ${x.getDate()} al ${y.getDate()} de ${MES[y.getMonth()]}` : `Semana del ${x.getDate()} de ${MES[x.getMonth()]} al ${y.getDate()} de ${MES[y.getMonth()]}`; };
// Un menú nuevo con las recetas que puede comer toda la casa. Con presupuesto: si se pasa, se prueba con las más baratas.
function creaPlan(inicio, n) {
  const dias = Array.from({ length: n }, (_, k) => diaBase(masDias(inicio, k)));
  const base = { id: inicio, titulo: tituloPlan(inicio, dias.at(-1).f), dias };
  const pool = recetasAptas();
  let plan = L.proponerSemana(base, pool, D.productos, fac, obj.G);
  const tope = E.hogar?.presupuesto;
  if (tope) plan = L.ajustaPresupuesto(plan, recetas, D.productos, fac, E.casa || {}, tope * n / 7, aptaCasa).plan;   // la compra, dentro del presupuesto
  return plan;
}
// Recetas que puede comer toda la casa: sin alergias (regla fija), con su forma de comer, sin lo que no le gusta a nadie,
// con los aparatos que tienen y en el tiempo que tienen.
function aptaCasa(r, qs = L.QUIEN) {
  if (!gustaA(r, qs) || !sePuedeHacer(r)) return false;   // lo que no gusta y lo que no se puede hacer con la cocina de casa
  if (!D.amiga) return true;
  const per = perfiles();
  for (const q of qs) { const x = per[q]; if (x && (alergiaDe(r, x).length || !dietaOk(r, x.dieta))) return false; }
  const h = E.hogar || {};
  if (h.tiempo && r.min > h.tiempo) return false;
  return true;
}
const recetasAptas = () => Object.fromEntries(Object.entries(recetas).filter(([, r]) => aptaCasa(r) || (typeof r.almuerzo === 'string' && aptaCasa(r, [r.almuerzo]))));   // el almuerzo de uno solo: basta con que le guste a él
const alergenosReceta = r => [...new Set(r.ing.flatMap(i => D.productos[i[0]]?.al || []))];
function alergiaDe(r, x) {
  if (!x) return [];
  const tags = alergenosReceta(r), out = (x.alergias || []).filter(a => tags.includes(a));
  const otras = L.normaliza(x.otrasAlergias || '').split(/[,;\n]| y /).map(s => s.trim()).filter(s => s.length >= 3);
  if (otras.some(w => textoBusca(r).includes(w))) out.push('otras');
  return out;
}
const RE_CARNE = /pollo|pavo|cerdo|vacuno|anojo|entrecot|jamon|ternera|albondiga|solomillo|contramuslo|jamoncito|chorizo|salchicha|hamburguesa|lomo de cerdo|lomo de vacuno/;
const RE_PESCADO = /atun|salmon|merluza|gamba|pescado|marisco|bacalao|sardina|calamar|mejillon/;
const RE_CERDO = /cerdo|jamon|chorizo|albondiga|bacon|panceta|salchichon|fuet/;
function dietaOk(r, dieta) {
  if (!dieta || dieta === 'todo') return true;
  const t = L.normaliza(r.n + ' ' + r.ing.map(i => D.productos[i[0]]?.n || '').join(' '));
  if (dieta === 'vegetariana') return !RE_CARNE.test(t) && !RE_PESCADO.test(t);
  if (dieta === 'sinpescado') return !RE_PESCADO.test(t);
  if (dieta === 'sincerdo') return !RE_CERDO.test(t);
  return true;
}

const ACTIVIDAD = [['1.2', 'Poca', 'sentado casi todo el día'], ['1.375', 'Algo', 'camino o estoy de pie'], ['1.55', 'Bastante', 'deporte 3 o 4 días'], ['1.725', 'Mucha', 'deporte casi a diario']];
const OBJETIVOS = [['perder', 'Perder grasa'], ['mantener', 'Mantenerme'], ['ganar', 'Ganar músculo']];
const ALERGIAS = [['gluten', 'Gluten'], ['leche', 'Lactosa o leche'], ['huevo', 'Huevo'], ['pescado', 'Pescado'], ['crustaceos,moluscos', 'Marisco'], ['frutos_cascara', 'Frutos secos'], ['cacahuete', 'Cacahuete'], ['soja', 'Soja'], ['sesamo', 'Sésamo'], ['mostaza', 'Mostaza'], ['apio', 'Apio'], ['sulfitos', 'Sulfitos']];
const DIETAS = [['todo', 'De todo'], ['vegetariana', 'Vegetariana'], ['sinpescado', 'Sin pescado'], ['sincerdo', 'Sin cerdo']];
const DIAS_L = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']];
const METAS = { perder: { deficit: 0.2, protKg: 1.8, grasaKg: 0.7 }, mantener: { deficit: 0, protKg: 1.4, grasaKg: 0.8 }, ganar: { deficit: -0.1, protKg: 1.8, grasaKg: 0.8 } };
const chips = (attr, grupo, opciones, activos) => opciones.map(([v, t, s]) => `<button type="button" class="chip" ${attr}="${grupo}" data-v="${v}" aria-pressed="${activos.includes(String(v))}">${t}${s ? ` <small>${s}</small>` : ''}</button>`).join('');
function tarjetaPersona(i, x = {}) {
  return `<div class="tarjeta perfil" data-persona="${i}"${i && !x.nombre ? ' data-vacia="1"' : ''}><h3><span class="avatar ${i ? 'p' : 'g'}">${i + 1}</span>${i ? 'La otra persona' : 'Tú'}</h3>
    <label class="campo-largo">Nombre<input class="campo-texto" data-c="nombre" value="${esc(x.nombre || '')}" placeholder="Nombre" autocomplete="${i ? 'off' : 'given-name'}"></label>
    <div class="campo-largo">Para el cálculo<div class="botones">${chips('data-g', 'sexo', [['F', 'Mujer'], ['M', 'Hombre']], [x.sexo || ''])}</div></div>
    <div class="campos"><label>Edad<input type="number" inputmode="numeric" data-c="edad" value="${x.edad || ''}"></label><label>Altura (cm)<input type="number" inputmode="numeric" data-c="altura" value="${x.altura || ''}"></label><label>Peso (kg)<input type="number" inputmode="decimal" step="0.5" data-c="peso" value="${x.peso || ''}"></label></div>
    <div class="campo-largo">¿Cuánto te mueves?<div class="botones">${chips('data-g', 'actividad', ACTIVIDAD, [String(x.actividad || '1.375')])}</div></div>
    <div class="campo-largo">Objetivo<div class="botones">${chips('data-g', 'objetivo', OBJETIVOS, [x.objetivo || 'perder'])}</div></div>
    <div class="campo-largo">Alergias e intolerancias <small>(nunca saldrán en el menú)</small><div class="botones">${chips('data-m', 'alergias', ALERGIAS, ALERGIAS.filter(([v]) => v.split(',').every(a => (x.alergias || []).includes(a))).map(([v]) => v))}</div>
      <input class="campo-texto" data-c="otrasAlergias" value="${esc(x.otrasAlergias || '')}" placeholder="Otras: kiwi, melocotón…" style="margin-top:8px"></div>
    <div class="campo-largo">¿Qué comes?<div class="botones">${chips('data-g', 'dieta', DIETAS, [x.dieta || 'todo'])}</div></div>
    <label class="campo-largo">🚫 No me gusta<textarea data-c="noGusta" rows="2" placeholder="cilantro, setas…">${esc(x.noGusta || '')}</textarea></label>
    <label class="campo-largo">❤️ Me gusta<textarea data-c="gusta" rows="2" placeholder="pasta, ensaladas, picante…">${esc(x.gusta || '')}</textarea></label>
    <label class="check"><input type="checkbox" data-c="tca"${x.tca ? ' checked' : ''}> Tengo o he tenido un trastorno de la conducta alimentaria</label>
  </div>`;
}
// Preguntas iniciales (y «Cambiar nuestros datos»): personas, compra y cocina. Al terminar, su menú.
function bienvenida(editar = false) {
  const h0 = E.hogar || {}, pers = h0.personas || [], clave = leeTexto(CLAVE);
  document.body.innerHTML = `<div class="bienvenida">
    <header class="cabecera"><div class="marca"><span class="logo-mini">🥗</span>${marcaHTML}</div>
      <h1>${editar ? 'Vuestros datos' : 'Hola 👋'}</h1>
      <div class="sub">${editar ? 'Cámbialos y rehago el menú desde hoy.' : 'Te han invitado a NutriHome: los menús de la semana, la lista de la compra y un chef al que preguntar. Antes, unas preguntas para hacer vuestro menú.'}</div></header>
    <main>
      <div class="tarjeta perfil"><h3>🏠 ¿Cuántos sois en casa?</h3><div class="botones" style="margin-top:10px">${chips('data-hg', 'n', [['1', 'Solo yo'], ['2', 'Dos']], [String(pers.length || 1)])}</div>
        <p class="nota" style="margin:8px 0 0">Por ahora, una o dos personas por casa.</p></div>
      ${tarjetaPersona(0, pers[0])}${tarjetaPersona(1, pers[1])}
      <div class="tarjeta perfil"><h3>🛒 La compra</h3>
        <div class="campo-largo">¿Dónde compráis?<div class="botones">${chips('data-hg', 'super', SUPERS, [h0.super || 'mercadona'])}</div>
          <p class="nota" style="margin:6px 0 0">Por ahora, los productos y los precios son los de Mercadona; en los demás, como referencia.</p></div>
        <label class="campo-largo">Presupuesto a la semana (€, opcional)<input class="campo-texto" type="number" inputmode="decimal" data-hc="presupuesto" value="${h0.presupuesto || ''}" placeholder="60"></label>
        <div class="campo-largo">Día de compra<div class="botones">${chips('data-hg', 'diaCompra', DIAS_L, [String(h0.diaCompra ?? 6)])}</div></div>
        <div class="campo-largo">Coméis fuera a mediodía<div class="botones">${chips('data-hm', 'fueraComida', DIAS_L, (h0.fueraComida || []).map(String))}</div></div>
        <div class="campo-largo">Cenáis fuera<div class="botones">${chips('data-hm', 'fueraCena', DIAS_L, (h0.fueraCena || []).map(String))}</div></div></div>
      <div class="tarjeta perfil"><h3>🍳 La cocina</h3>
        <div class="campo-largo">Lo que tenéis<div class="botones">${chips('data-hm', 'aparatos', APARATOS_CASA, h0.aparatos || ['plancha', 'micro'])}</div></div>
        <div class="campo-largo">Tiempo para cocinar<div class="botones">${chips('data-hg', 'tiempo', [['10', '10 min'], ['20', '20 min'], ['30', '30 min'], ['0', 'Me da igual']], [String(h0.tiempo ?? 0)])}</div></div></div>
      <div class="tarjeta perfil">
        <label class="check"><input type="checkbox" id="b-mayores"${editar ? ' checked' : ''}> En casa todos tenemos 18 años o más.</label>
        <p class="nota">Vuestros datos se guardan cifrados con la clave de vuestra casa y solo los ven los móviles que la tienen. El Chef, el asistente, es Claude: los lee para contestaros. NutriHome no da consejos médicos.</p>
        <div class="clave-casa"><span>Clave de casa:</span><b>${esc(clave)}</b><button type="button" class="chip" id="b-copiar-clave">Copiar</button></div>
        <p class="nota">Guárdala: te la pedirá si instalas la app en la pantalla de inicio o la abres en otro móvil.</p>
        <div class="error" id="b-error"></div></div>
    </main>
    <div class="barra-accion"><div class="dentro"><button class="boton principal ancho" id="b-empezar">${editar ? '💾 Guardar y rehacer el menú' : '✨ Crear nuestro menú'}</button></div></div></div>`;
  const persona2 = $('[data-persona="1"]');
  const pinta2 = () => { persona2.hidden = $('[data-hg="n"][aria-pressed="true"]')?.dataset.v !== '2'; };
  pinta2();
  $$('[data-g]').forEach(b => b.addEventListener('click', () => { $$(`[data-g="${b.dataset.g}"]`, b.closest('.tarjeta')).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); }));
  $$('[data-m], [data-hm]').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
  $$('[data-hg]').forEach(b => b.addEventListener('click', () => { $$(`[data-hg="${b.dataset.hg}"]`).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); pinta2(); }));
  $('#b-copiar-clave').addEventListener('click', async () => { try { await navigator.clipboard.writeText(clave); tostadaSuelta('Clave copiada'); } catch { tostadaSuelta('No he podido copiarla'); } });
  const error = (t, el) => { $('#b-error').textContent = t; (el || $('#b-error')).scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus?.(); };
  $('#b-empezar').addEventListener('click', () => {
    const n = $('[data-hg="n"][aria-pressed="true"]')?.dataset.v === '2' ? 2 : 1, personas = [];
    for (let i = 0; i < n; i++) {
      const el = $(`[data-persona="${i}"]`), c = k => el.querySelector(`[data-c="${k}"]`), g = k => el.querySelector(`[data-g="${k}"][aria-pressed="true"]`)?.dataset.v;
      const num = k => parseFloat(String(c(k).value).replace(',', '.'));
      const x = { nombre: c('nombre').value.trim(), sexo: g('sexo'), edad: num('edad'), altura: num('altura'), peso: num('peso'), actividad: parseFloat(g('actividad') || '1.375'),
        objetivo: g('objetivo') || 'perder', alergias: [...new Set($$('[data-m="alergias"][aria-pressed="true"]', el).flatMap(b => b.dataset.v.split(',')))],
        otrasAlergias: c('otrasAlergias').value.trim(), dieta: g('dieta') || 'todo', gusta: c('gusta').value.trim(), noGusta: c('noGusta').value.trim(), tca: c('tca').checked };
      const quien = n > 1 ? ` (${i ? 'la otra persona' : 'tú'})` : '';
      if (!x.nombre) return error('Falta el nombre' + quien + '.', c('nombre'));
      if (!x.sexo) return error('Elige mujer u hombre' + quien + ': cambia el cálculo de lo que necesitas.', el.querySelector('[data-g="sexo"]'));
      if (!(x.edad >= 18 && x.edad <= 100)) return error(x.edad < 18 ? 'NutriHome es solo para mayores de 18 años.' : 'Revisa la edad' + quien + '.', c('edad'));
      if (!(x.altura >= 120 && x.altura <= 230)) return error('Revisa la altura' + quien + ', en centímetros.', c('altura'));
      if (!(x.peso >= 35 && x.peso <= 250)) return error('Revisa el peso' + quien + ', en kilos.', c('peso'));
      personas.push({ ...x, ...METAS[x.tca ? 'mantener' : x.objetivo] });
    }
    if (!$('#b-mayores').checked) return error('Marca que en casa todos tenéis 18 años o más.', $('#b-mayores'));
    const hv = k => $(`[data-hg="${k}"][aria-pressed="true"]`)?.dataset.v, hm = k => $$(`[data-hm="${k}"][aria-pressed="true"]`).map(b => b.dataset.v);
    const pres = parseFloat(String($('[data-hc="presupuesto"]').value).replace(',', '.'));
    E.hogar = { personas, super: hv('super') || 'mercadona', presupuesto: pres > 0 ? pres : null, diaCompra: +(hv('diaCompra') ?? 6), fueraComida: hm('fueraComida').map(Number), fueraCena: hm('fueraCena').map(Number),
      aparatos: hm('aparatos'), tiempo: +(hv('tiempo') || 0), creada: h0.creada || hoy(), cambiada: new Date().toISOString() };
    E.perfiles = {}; E.super = E.hogar.super; guardaTexto(NUEVA, null);
    // El menú: desde hoy. Al cambiar los datos, lo que ya pasó se queda y lo de hoy en adelante se rehace.
    const h = hoy();
    if (editar) {
      E.planes = (E.planes || []).map(pl => ({ ...pl, dias: pl.dias.filter(d => d.f < h) })).filter(pl => pl.dias.length);
      for (const s of Object.values(E.semanas || {})) for (const k of Object.keys(s.cambios || {})) if (k.slice(0, 10) >= h) delete s.cambios[k];
    }
    montaAmiga(); reconstruyeRecetas(); recalcula();
    E.planes = [...(E.planes || []).filter(pl => pl.id !== h), creaPlan(h, diasHasta(E.hogar.diaCompra))];
    salva(); location.reload();
  });
}
// Avisos antes de que exista la barra de la app (en la bienvenida).
function tostadaSuelta(t) { let el = $('#tostada'); if (!el) { el = document.createElement('div'); el.id = 'tostada'; el.className = 'tostada'; document.body.appendChild(el); } tostada(t); }

// ——— Gustos: lo que a alguien no le gusta no entra en sus propuestas ———
const palabrasNo = q => L.normaliza((E.perfiles[q]?.noGusta ?? D.perfiles[q]?.noGusta) || '').split(/[,;\n]| y /).map(s => s.trim()).filter(s => s.length >= 3);
const textoBusca = r => L.normaliza(r.n + ' ' + r.ing.map(i => D.productos[i[0]]?.n || '').join(' ') + ' ' + (r.otros || []).join(' '));
const gustaA = (r, qs) => qs.every(q => { const ws = palabrasNo(q); return !ws.length || !ws.some(w => textoBusca(r).includes(w)); });

// ——— Pendiente de otro súper: lo que no había (✕) se apunta para comprarlo en otro sitio ———
const claveDesc = x => x.k || L.normaliza(x.n || '');
// Lo que la persona quita de pendientes queda descartado: los ajustes automáticos no lo vuelven a apuntar (solo un «no había» nuevo).
function descarta(x) { if (x) (E.descartados ||= {})[claveDesc(x)] = hoy(); }
function apuntaPendiente({ k = null, n }, forzar = false) {
  E.pendientes ||= [];
  const c = claveDesc({ k, n });
  if (E.descartados?.[c]) { if (!forzar) return; delete E.descartados[c]; }
  if (!n || E.pendientes.some(x => (k && x.k === k) || L.normaliza(x.n) === L.normaliza(n))) return;
  E.pendientes.push({ id: uid(), k, n, f: hoy() });
}
function quitaPendiente(f) {
  if (!E.pendientes?.length) return;
  const n = L.normaliza(nombreFila(f));
  E.pendientes = E.pendientes.filter(x => !((f.k && x.k === f.k) || L.normaliza(x.n) === n));
}
// Pendiente de otro súper, a la vista en Compra: filas con «Ya lo tengo» y papelera.
function seccionPendientes() {
  if (!E.pendientes?.length) return '';
  return `<div class="cat"><span class="emo">🏪</span>Pendiente de otro súper<span class="num">${E.pendientes.length}</span><button class="cat-accion" id="b-vaciar-pend">Vaciar</button></div><div class="lista">${(V.verPend || E.pendientes.length <= 4 ? E.pendientes : E.pendientes.slice(0, 3)).map(x => `<div class="producto fila-simple"><div class="sinfoto">${x.k && D.productos[x.k] ? emojiSeccion(D.productos[x.k].cat) : '🛒'}</div><div class="info"><div class="pn">${esc(x.k && D.productos[x.k] ? nombreCorto(D.productos[x.k]) : x.n)}</div><div class="pc">no había el ${fechaCorta(x.f)}</div></div><button class="chip si" data-pend-ya="${esc(x.id)}">✓ Ya lo tengo</button><button class="icono" data-pend-quitar="${esc(x.id)}" aria-label="Quitar">${I.papelera}</button></div>`).join('')}</div>
    <div class="botones" style="margin:8px 0 2px">${E.pendientes.length > 4 ? `<button class="chip" id="b-ver-pend">${V.verPend ? 'Ver menos' : `Ver los ${E.pendientes.length}`}</button>` : ''}<button class="chip" id="b-enviar-pend">📤 Enviar esta lista</button></div>`;
}
const tarjetaPendientes = () => !E.pendientes?.length ? '' : `<div class="tarjeta pregunta"><span class="emo">🏪</span><div class="t"><b>Pendiente de otro súper</b><span class="nota">${esc(enumera(E.pendientes.map(x => x.k && D.productos[x.k] ? nombreFalta(x.k) : x.n), 4))}</span></div><button class="boton" id="b-pendientes">Ver</button></div>`;
function abrirPendientes() {
  const pinta = h => {
    $('#pendientes', h).innerHTML = E.pendientes.map(x => `<div class="pend"><span class="emo">${x.k && D.productos[x.k] ? emojiSeccion(D.productos[x.k].cat) : '🛒'}</span><div class="pend-t"><b>${esc(x.n)}</b><span class="nota">desde el ${fechaCorta(x.f)}</span></div>
      <button class="chip si" data-pend-ya="${x.id}">✓ Ya lo tengo</button><button class="icono" data-pend-quitar="${x.id}" aria-label="Quitar">${I.papelera}</button></div>`).join('') || '<div class="vacio"><span class="emo">🎉</span>No queda nada pendiente.</div>';
    $$('[data-pend-ya]', h).forEach(b => b.addEventListener('click', () => {
      const x = E.pendientes.find(y => y.id === b.dataset.pendYa);
      if (x?.k && D.productos[x.k]) (E.casa[x.k] = (E.casa[x.k] || 0) + D.productos[x.k].util, alta(x.k));
      descarta(x); E.pendientes = E.pendientes.filter(y => y.id !== b.dataset.pendYa); salva(); pinta(h); tostada(x?.k ? '🏠 Pasa a «En casa»' : 'Quitado'); refrescaCompra();
    }));
    $$('[data-pend-quitar]', h).forEach(b => b.addEventListener('click', () => { descarta(E.pendientes.find(y => y.id === b.dataset.pendQuitar)); E.pendientes = E.pendientes.filter(y => y.id !== b.dataset.pendQuitar); salva(); pinta(h); refrescaCompra(); }));
  };
  hoja(`<h2>🏪 Pendiente de otro súper</h2><div class="nota">Lo que no había en Mercadona. Cuando lo compréis en otro sitio, «Ya lo tengo» lo pasa a «En casa».</div>
    <div id="pendientes" style="margin-top:10px"></div>
    <button class="boton ancho" id="b-enviar-pend" style="margin-top:14px">📤 Enviar la lista</button>`, h => {
    pinta(h);
    $('#b-enviar-pend', h).addEventListener('click', () => compartirTexto('Pendiente de otro súper', 'Pendiente de otro súper · NutriHome\n' + E.pendientes.map(x => '☐ ' + x.n).join('\n'), 'Copiado: pégalo en WhatsApp'));
  });
}

// ——— Claude (💬): el único sitio desde el que se le escribe ———
// Hoy el mensaje sale por Telegram (compartir); cuando esté el servidor, contestará aquí mismo.
function irAClaude(texto = '', fichero = null, datos = null) {
  V.borrador = texto; V.adjunto = fichero; V.datos = datos; cierraHoja();
  if (esChat()) pinta(); else location.hash = 'hoy';
}
function vClaude() {
  const fh = new Date();
  cabecera('Hoy', `${capital(DL[fh.getDay()])}, ${fh.getDate()} de ${MES[fh.getMonth()]}`);
  const conServidor = !!servidor(), adj = V.datos?.receta, h0 = hoy();
  // La conversación de hoy a la vista; lo anterior, plegado.
  const todo = (E.charla || []).slice(-20), deHoy = todo.filter(c => (c.t || '').slice(0, 10) >= h0 || !c.r);
  const charla = V.verAntes ? todo : deHoy, antes = todo.length - deHoy.length;
  const p = planActivo(), d = efectivo(p).dias.find(x => x.f === hoy());
  const rec = c => d && !L.esDoble(d[c]) ? recetas[L.idDe(d[c])] : null, cena = rec('cena'), comida = L.DOBLES.includes('comida') ? null : rec('comida');
  // Preguntas de un toque: se envían solas (con la receta adjunta cuando toca).
  const rapidas = adj ? [
    ['👩‍🍳', 'Explícamela paso a paso', `Explícame paso a paso «${adj.nombre}», que no sé cocinar.`],
    ['🔁', '¿Qué puedo cambiar?', `¿Qué ingrediente de «${adj.nombre}» puedo cambiar por algo que tengamos en casa?`],
    ['❄️', '¿Se puede guardar?', `¿Cuánto aguanta «${adj.nombre}» en la nevera? ¿Se puede congelar?`],
  ] : [
    cena && ['', '¿Qué hay para cenar?', null, null, null, () => explicaAqui(cena, '¿Qué hay hoy para cenar?')],
    ['', '¿Qué hago con lo que hay?', '¿Qué puedo cocinar ahora con lo que tenemos en casa?'],
    ['', 'Un antojo sano', 'Propónme un smoothie, una limonada o un postre sano que pueda hacer ahora con lo que hay en casa.'],
    ['', 'Se ha acabado…', null, null, 'Se ha acabado '],
    ['', '¿Es buena compra?', null, null, null, abrirEscaner],
  ].filter(Boolean);
  const corto = q => q.length > 220 ? esc(q.slice(0, 180).trim()) + '… <button class="ver-todo" data-ver="1">ver todo</button>' : esc(q);
  const burbujas = charla.map(c => { const { texto: rt, acciones } = separaAcciones(c.r || '');
    return `<div class="burbuja yo" data-q="${esc(c.id)}">${corto(c.q)}<button class="borrar" data-borrar="${esc(c.id)}" aria-label="Borrar">×</button></div>${c.r ? `<div class="burbuja el">${esc(rt).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}${acciones.map((a, i) => `<button class="boton principal accion-chef" data-accion="${esc(c.id)}|${i}"${(c.hechas || []).includes(i) ? ' disabled' : ''}>${(c.hechas || []).includes(i) ? '✓ Hecho' : esc(textoAccion(a))}</button>`).join('')}</div>` : `<div class="burbuja el pensando" data-charla="${esc(c.id)}">El Chef está escribiendo…</div>`}`; }).join('');
  $('#vista').innerHTML = `
    ${bloqueHoy(p, d)}
    <div class="chat" id="hilo">${antes && !V.verAntes ? `<button class="ver-todo" id="b-ver-antes" style="align-self:center">Ver la conversación anterior (${antes})</button>` : ''}${charla.length ? `${burbujas}<button class="ver-todo" id="b-borrar-charla" style="align-self:center">Borrar la conversación</button>`
      : `<div class="chat-hola"><b>Pregúntale al Chef</b><span class="nota">«¿Qué hay hoy para cenar?», «hoy cenamos fuera», «no tengo pepino, ¿qué uso?», «apunta detergente en la compra»…</span></div>`}</div>
    <div class="chat-barra"><div class="dentro">
      ${adj ? `<div class="adjunto"><span>📖 ${esc(adj.nombre)}</span><button id="b-quitar-datos" aria-label="Quitar">×</button></div>` : ''}
      ${V.datos?.compra ? `<div class="adjunto"><span>🧾 Compra del ${fechaCorta(iso(new Date(V.datos.compra.f)))}</span><button id="b-quitar-datos" aria-label="Quitar">×</button></div>` : ''}
      ${V.adjunto ? `<div class="adjunto"><span>📎 ${esc(V.adjunto.name || 'foto')}</span><button id="b-quitar-adjunto" aria-label="Quitar">×</button></div>` : ''}
      <div class="sugerencias">${rapidas.map((a, i) => `<button class="chip" data-rapida="${i}">${a[0]} ${esc(a[1])}</button>`).join('')}</div>
      <form class="chat-form" id="f-chat">${D.perfiles.bot ? '<label class="icono" for="i-foto-claude" aria-label="Foto">' + ic('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>') + '</label><input id="i-foto-claude" type="file" accept="image/*,application/pdf" class="sr">' : ''}
        <textarea id="t-claude" rows="1" placeholder="Escribe al Chef…" enterkeyhint="send">${esc(V.borrador || '')}</textarea>
        <button class="enviar-chat" aria-label="Enviar">${I.enviar}</button></form>
    </div></div>`;
  const ta = $('#t-claude');
  const crece = () => { ta.style.height = 'auto'; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; };
  crece();
  const enviar = async (texto, datos) => {
    texto = (texto || '').trim();
    if (!texto && !V.adjunto) { ta.focus(); return; }
    if (datos) V.datos = datos;
    if (conServidor && !V.adjunto) {
      V.borrador = ''; ta.value = '';
      try { await preguntaServidor(texto); } catch (e) { V.borrador = texto; tostada('No llego al servidor: ' + e.message); }
      vClaude(); return;
    }
    if (await mandarAClaude(texto + (V.datos?.compra ? '\n\n' + textoCompra(V.datos.compra) : ''), V.adjunto)) { V.borrador = ''; V.adjunto = null; V.datos = null; vClaude(); }
  };
  ta.addEventListener('input', () => { V.borrador = ta.value; crece(); });
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(ta.value); } });
  $('#f-chat').addEventListener('submit', e => { e.preventDefault(); enviar(ta.value); });
  $$('[data-rapida]').forEach(b => b.addEventListener('click', () => {
    const [, , texto, datos, rellena, fn] = rapidas[+b.dataset.rapida];
    if (fn) return fn();
    if (rellena) { ta.value = V.borrador = rellena; crece(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); return; }
    enviar(texto, datos);
  }));
  $('#i-foto-claude')?.addEventListener('change', e => { V.adjunto = e.target.files[0] || null; vClaude(); });
  $('#b-quitar-adjunto')?.addEventListener('click', () => { V.adjunto = null; vClaude(); });
  $('#b-quitar-datos')?.addEventListener('click', () => { V.datos = null; vClaude(); });
  $$('[data-accion]').forEach(b => b.addEventListener('click', () => {
    const [id, i] = b.dataset.accion.split('|'), c = (E.charla || []).find(x => x.id === id); if (!c) return;
    const a = separaAcciones(c.r).acciones[+i]; if (!a) return;
    const hecho = haceAccion(a); if (!hecho) return;
    c.hechas = [...(c.hechas || []), +i]; salva(); tostada('✓ ' + hecho); vClaude();
  }));
  $$('[data-borrar]').forEach(b => b.addEventListener('click', () => { E.charla = (E.charla || []).filter(c => c.id !== b.dataset.borrar); salva(); vClaude(); }));
  $$('[data-ver]').forEach(b => b.addEventListener('click', e => { const c = (E.charla || []).find(x => x.id === e.target.closest('.burbuja').dataset.q); if (c) hoja(`<h2>Tu mensaje</h2><p style="white-space:pre-wrap">${esc(c.q)}</p>`); }));
  $('#b-borrar-charla')?.addEventListener('click', () => { if (confirm('¿Borro toda la conversación con el Chef?')) { E.charla = []; salva(); vClaude(); } });
  $$('[data-charla]').forEach(b => esperaRespuesta(b.dataset.charla));
  $('#b-ver-antes')?.addEventListener('click', () => { V.verAntes = true; vClaude(); });
  activaHoy(p, d);
  // Lo último, a la vista, si hoy ya se ha hablado; si no, arriba, con lo que toca hoy.
  requestAnimationFrame(() => window.scrollTo(0, charla.length ? document.documentElement.scrollHeight : 0));
}
// Lo que toca hoy, arriba del Chef: una línea por comida; la cena, con sus botones.
// Un icono de línea por comida (desayuno: sol; almuerzo: bol; cena: luna).
const ICONO_COMIDA = { desayuno: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>',
  comida: '<svg viewBox="0 0 24 24"><path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M8 7c0-1.5 1-2 1-3M12 7c0-1.5 1-2 1-3M16 7c0-1.5 1-2 1-3"/></svg>',
  merienda: '<svg viewBox="0 0 24 24"><path d="M12 7c-4-2-7 1-7 5 0 4 3 8 7 8s7-4 7-8c0-4-3-7-7-5Z"/><path d="M12 7c0-2 1-3 2-4"/></svg>',
  cena: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>' };
function bloqueHoy(p, d) {
  if (!d && hoy() > p.dias.at(-1).f && !D.amiga) { if (!V.preparando) { V.preparando = true; setTimeout(() => { siguienteSemana(); V.preparando = false; }, 0); } return ''; }   // se acabó la semana: la siguiente, sola
  if (!d) return `<div class="hoy-plan"><div class="hoy-vacio">Hoy no hay menú. <button class="ver-todo" data-ir="semana">Ver la semana</button></div></div>`;
  const s = est(p.id), i = efectivo(p).dias.findIndex(x => x.f === d.f), ahora = horaComida();
  const fila = c => {
    const v = d[c], hecho = !!s.hechos[d.f + '|' + c];
    if (v === undefined || v === null) return '';
    const nombre = v.fuera ? 'Fuera' : L.esDoble(v) ? L.QUIEN.map(q => `<span class="quien-ini ${q.toLowerCase()}">${ini(q)}</span>${esc(recetas[v[q]]?.n || '—')}`).join('<br>') : esc(recetas[L.idDe(v)]?.n || v.libre || '—');
    const r1 = v.fuera ? null : recetas[L.idsDe(v)[0]];
    return `<button class="hoy-fila c-${c}${hecho ? ' hecha' : ''}${c === ahora ? ' ahora' : ''}" data-hoy="${c}">${r1 ? fotoPlato(r1, 160, 'hoy-mini') : `<span class="hoy-mini sin-foto c-${c}">${ICONO_COMIDA[c] || ''}</span>`}<span class="hoy-txt"><span class="hoy-comida">${L.NOMBRE_COMIDA[c]}${hecho ? ' · hecho' : ''}</span><span class="hoy-plato">${nombre}</span></span><span class="flecha">›</span></button>`;
  };
  const vc = d.cena, rc = vc && !vc.fuera && !L.esDoble(vc) ? recetas[L.idDe(vc)] : null, cenaHecha = !!s.hechos[d.f + '|cena'];
  const falta = rc && !cenaHecha ? faltaEnCasa(rc) : [];
  const kc = rc ? L.QUIEN.map(q => r0(L.macrosReceta(rc, q, D.productos, fac).kcal)).join(' / ') : '';
  return `${rc ? `<section class="hoy-cena">
      <button class="hoy-cena-foto" data-hoy-acc="receta">${fotoPlato(rc, 900, 'foto')}</button>
      <div class="hoy-cena-cuerpo"><span class="hoy-comida">Cena de hoy${cenaHecha ? ' · hecha' : ''}</span>
        <h2>${esc(rc.n)}</h2><p class="hoy-cena-datos">${rc.min} min · ${esc(APARATO[rc.ap] || 'Cocina')} · ${kc} kcal</p>
        ${falta.length ? `<p class="hoy-falta">Falta ${esc(enumera(falta.map(nombreFalta), 3))}.</p>` : ''}
        <div class="hoy-botones">${cenaHecha ? `<button class="boton" data-hoy-acc="hecho">Desmarcar la cena</button>` : `<button class="boton principal" data-hoy-acc="como">Cómo se hace</button><button class="boton" data-hoy-acc="hecho">Ya hemos cenado</button>`}</div>
        <div class="hoy-enlaces"><button class="ver-todo" data-hoy-acc="cambiar">Cambiar</button><button class="ver-todo" data-hoy-acc="fuera">Cenamos fuera</button></div></div>
    </section>` : ''}
    <section class="hoy-plan"><h3 class="hoy-tit">${rc ? 'El resto del día' : 'Hoy'}</h3>
    ${L.COMIDAS.filter(c => !(rc && c === 'cena')).map(fila).join('')}
    ${vc?.fuera ? `<div class="hoy-botones"><button class="boton" data-hoy-acc="fuera">Al final cenamos en casa</button></div>` : ''}
    <div class="hoy-enlaces"><button class="ver-todo" data-ir="semana">La semana</button><button class="ver-todo" data-ir="recetas">Recetas</button></div>
  </section>`;
}
function activaHoy(p, d) {
  $$('[data-ir]').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.ir; }));
  if (!d) return;
  const i = efectivo(p).dias.findIndex(x => x.f === d.f);
  $$('[data-hoy]').forEach(b => b.addEventListener('click', () => abrirAcciones(p, i, b.dataset.hoy, null)));
  const rc = recetas[L.idDe(d.cena)];
  $$('[data-hoy-acc]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.hoyAcc;
    if (a === 'como' && rc) explicaAqui(rc, '¿Cómo se hace la cena?');
    if (a === 'receta' && rc) abrirReceta(rc.id);
    if (a === 'hecho') alternaHecho(p, d.f, 'cena');
    if (a === 'fuera') alternaFuera(p, d.f, 'cena');
    if (a === 'cambiar') abrirCambiar(p, i, 'cena', null);
  }));
}
// La receta explicada en el chat al momento (sin esperar al Chef): cantidades de cada uno y el paso a paso.
function explicaAqui(r, pregunta) {
  const ing = r.ing.filter(x => !infinito(x[0]) || L.gramos(x, L.QUIEN[0], fac) >= 5).map(x => `· ${nombreCorto(D.productos[x[0]] || { n: x[0] })}: ${L.QUIEN.map(q => { const g = L.gramos(x, q, fac); return g ? (L.QUIEN.length > 1 ? `${NOM[q]} ` : '') + L.cantidadTexto(x[0], g, D.productos) : null; }).filter(Boolean).join(' · ')}`);
  const pasos = (r.detalle?.length ? r.detalle : r.pasos).map((x, n) => `${n + 1}. ${x}`);
  const texto = [`${r.n} · ${r.min} min · ${APARATO[r.ap] || 'cocina'}`, '', 'Ingredientes', ...ing, ...(r.prep?.length ? ['', 'Antes de empezar', ...r.prep.map(x => '· ' + x)] : []), '', 'Paso a paso', ...pasos, ...(r.truco ? ['', 'Truco: ' + r.truco] : []), '', 'Si te atascas en algún paso, pregúntame.'].join('\n');
  E.charla = [...(E.charla || []), { id: uid(), q: pregunta, r: texto, t: new Date().toISOString(), local: true }].slice(-40);
  salva(); if (esChat()) vClaude(); else location.hash = 'hoy';
}
// Recetas que el Chef necesita ver enteras: las de ayer, hoy y mañana, y las que se nombran en la pregunta o en lo último hablado.
function recetasParaPregunta(texto, pe, h) {
  const ids = new Set(pe.dias.filter(d => d.f >= masDias(h, -1) && d.f <= masDias(h, 1)).flatMap(d => L.COMIDAS.flatMap(c => L.idsDe(d[c]))));
  const VACIAS = new Set(['con', 'de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'al', 'a', 'receta', 'plancha', 'ensalada']);
  const t = L.normaliza([texto, ...(E.charla || []).slice(-2).map(c => c.q + ' ' + (c.r || ''))].join(' '));
  for (const r of Object.values(recetas)) {
    const palabras = L.normaliza(r.n).split(/[^a-z0-9ñ]+/).filter(w => w.length > 3 && !VACIAS.has(w));
    if (palabras.filter(w => t.includes(w)).length >= Math.min(2, palabras.length)) ids.add(r.id);
  }
  return [...ids].map(id => recetas[id]).filter(Boolean).slice(0, 12);
}
// La receta entera para el Chef: ingredientes con la cantidad de cada uno y los pasos.
const recetaParaChef = r => ({ id: r.id, nombre: r.n, aparato: APARATO[r.ap] || r.ap, minutos: r.min,
  ingredientes: r.ing.map(i => ({ producto: nombreCorto(D.productos[i[0]] || { n: i[0] }), ...Object.fromEntries(L.QUIEN.map(q => [NOM[q], L.gramos(i, q, fac) ? L.cantidadTexto(i[0], L.gramos(i, q, fac), D.productos) : '—'])) })),
  otros: [...(r.otros || []), ...(r.basicos || [])], antesDeEmpezar: r.prep || [], pasos: r.pasos, truco: r.truco || '' });
// Para el Chef: si la receta sale con lo que hay en casa (lo principal y la cantidad para los dos) o qué hay que comprar.
function conLoDeCasa(r) {
  if (!E.casa) return '';
  const f = alcanza(necesita(r, L.QUIEN, true), E.casa), otros = alcanza(necesita(r, L.QUIEN), E.casa).filter(k => !f.includes(k));
  return f.length ? ` [HAY QUE COMPRAR: ${f.map(nombreFalta).join(', ')}]` : ` [CON LO DE CASA${otros.length ? `; falta solo ${otros.slice(0, 4).map(nombreFalta).join(', ')}` : ''}]`;
}
// Lo que el cerebro necesita saber para contestar: menú próximo, lo que hay, la lista, pendientes, personas.
function contextoParaClaude(texto = '') {
  const p = planActivo(), pe = efectivo(p), h = hoy(), s = est(p.id), per = perfiles();
  const plato = v => L.esDoble(v) ? L.QUIEN.map(q => `${NOM[q]}: ${recetas[v[q]]?.n || '—'}`).join(' / ') : v && v.fuera ? 'fuera' : recetas[L.idDe(v)]?.n || (v && v.libre) || '—';
  const { filas } = lineaCompra();
  return {
    hoy: h, semana: p.titulo || p.id,
    menu: pe.dias.filter(d => d.f >= h).slice(0, 7).map(d => ({ dia: `${DL[fecha(d.f).getDay()]} ${d.f}`, ...Object.fromEntries(L.COMIDAS.map(c => [c, plato(d[c])])) })),   // la semana que queda, con el día de la semana
    enCasa: [...Object.keys(E.casa).filter(k => D.productos[k] && E.casa[k] > 0).map(k => `${nombreCorto(D.productos[k])} (${cantidadCasa(k, E.casa[k])})`), ...(E.casaExtra || []).map(x => x.n), ...E.casaOtros],
    lista: filas.filter(f => !s.marcados[f.clave]).slice(0, 40).map(nombreFila),
    pendientesOtroSuper: (E.pendientes || []).map(x => x.n),
    personas: L.QUIEN.map(q => ({ nombre: per[q].nombre, objetivo: obj[q], gusta: per[q].gusta || '', noGusta: per[q].noGusta || '', alergias: [...(per[q].alergias || []), per[q].otrasAlergias || ''].filter(Boolean), dieta: per[q].dieta || 'todo', tca: !!per[q].tca })),
    casa: { super: nombreSuper(), presupuestoSemanal: E.hogar?.presupuesto || null, cocina: aparatosCasa().map(nombreAparato) },
    recetasPropias: (E.propias || []).map(r => r.n),
    menuSemanaEntera: pe.dias.map(d => ({ dia: `${DL[fecha(d.f).getDay()]} ${d.f}${d.f === h ? ' (hoy)' : d.f === masDias(h, -1) ? ' (ayer)' : ''}`, ...Object.fromEntries(L.COMIDAS.map(c => [c, plato(d[c])])) })),
    recetasCompletas: recetasParaPregunta(texto, pe, h).map(recetaParaChef),
    notasDeLaCasa: E.notasChef || [],   // lo que nos han dicho de sus costumbres: vale siempre
    todasLasRecetas: Object.values(recetas).map(r => `${r.id}: ${r.n} (${(r.tipo || []).join('/')})${conLoDeCasa(r)}${r.soloEnsalada ? (r.acomp ? ' [acompañamiento: no vale solo como comida o cena]' : ' [solo ensalada: no vale sola como comida o cena]') : ''}${r.noche ? ' [se prepara la noche antes]' : ''}${sePuedeHacer(r) ? '' : ' [no tienen el aparato]'}`),
    productosDeLaApp: Object.values(D.productos).map(x => nombreCorto(x)),   // para recetas nuevas: ingredientes con estos nombres
    conversacionReciente: (E.charla || []).filter(c => c.r).slice(-5).map(c => ({ pregunta: c.q.slice(0, 400), respuesta: c.r.slice(0, 600) })),
  };
}
const esperando = new Set();
// El Chef propone cambios con líneas «ACCION: {...}»; la app los enseña como botones y los hace solo si se tocan.
function separaAcciones(r) {
  const acciones = [], texto = String(r).split('\n').filter(l => { const m = l.match(/^\s*ACCION:\s*(\{.*\})\s*$/); if (!m) return true; try { acciones.push(JSON.parse(m[1])); } catch { /* mal formada */ } return false; }).join('\n').trim();
  return { texto, acciones };
}
const productoDe = n => { const b = L.buscaProducto(String(n || ''), D.productos); return b?.k || null; };
function textoAccion(a) {
  if (a.tipo === 'casa') return `🏠 Añadir «${a.producto}» a En casa`;
  if (a.tipo === 'quitar') return `🚫 No hay «${a.producto}»: quitarlo de En casa y del menú`;
  if (a.tipo === 'lista') return `🛒 Añadir «${a.producto}» a la lista`;
  if (a.tipo === 'receta') return `💾 Guardar la receta «${a.nombre || 'nueva'}»${a.poner?.length ? ' y ponerla en el menú' : ''}`;
  if (a.tipo === 'menu') return `🔄 Cambiar ${(a.cambios || []).length} plato${(a.cambios || []).length === 1 ? '' : 's'} del menú`;
  if (a.tipo === 'rehacer') return '🔄 Rehacer el menú con lo que hay en casa';
  if (a.tipo === 'nota') return `Recordar: «${a.texto}»`;
  if (a.tipo === 'acabado') return `Se ha acabado «${a.producto}»: quitarlo de la nevera y apuntarlo en la compra`;
  if (a.tipo === 'apuntar') return `Apuntar «${a.producto}» en la compra`;
  if (a.tipo === 'fuera') return `${L.NOMBRE_COMIDA[a.comida] || a.comida} fuera (${a.dia})`;
  if (a.tipo === 'cambiar') return `🔄 Poner «${recetas[a.receta]?.n || a.receta}» (${L.NOMBRE_COMIDA[a.comida] || a.comida}, ${a.dia})`;
  return 'Hacerlo';
}
// El aparato como lo diga el Chef («Sartén», «air fryer», «microondas»…) → la clave de la app.
const aparatoDe = t => { const n = L.normaliza(String(t || '')); return /air|freidora/.test(n) ? 'airfryer' : /horno/.test(n) ? 'horno' : /micro/.test(n) ? 'micro' : /batidor|licuador/.test(n) ? 'batidora' : /olla|cazo|hervi|cocer/.test(n) ? 'olla' : /sin|nada|frio/.test(n) ? 'sin' : 'plancha'; };
// Pone una receta en un día y comida (con «quien» solo para esa persona en desayunos y meriendas). Devuelve false si el día no está.
function ponPlato(a) {
  const p = planes().find(pl => pl.dias.some(d => d.f === a.dia)); if (!p) return false;
  const s = est(p.id), k = a.dia + '|' + a.comida, v = efectivo(p).dias.find(d => d.f === a.dia)[a.comida];
  if (s.hechos[k]) return false;   // lo ya comido no se toca
  if (a.quien && L.QUIEN.includes(a.quien)) { const base = L.esDoble(v) ? { ...v } : { G: L.idDe(v), P: L.idDe(v) }; base[a.quien] = a.receta; s.cambios[k] = base; } else s.cambios[k] = a.receta;
  return true;
}
const fotoMenu = () => JSON.stringify(planes().map(p => [p.id, est(p.id).cambios]));
const vuelveMenu = foto => { for (const [id, c] of JSON.parse(foto)) est(id).cambios = c; };
// Rehace desde hoy los platos sin comer con recetas cuyo plato principal está en casa (lo que no llegue, lo arregla autoMenu).
function rehaceConLoQueHay() {
  const p = planActivo(), s = est(p.id), h = hoy(), pe = efectivo(p);
  const pool = Object.fromEntries(Object.values(recetas).filter(r => aptaCasa(r) && !alcanza(necesita(r, L.QUIEN, true), E.casa || {}).length).map(r => [r.id, r]));
  const base = { ...pe, dias: pe.dias.map(d => { const x = { ...d }; for (const c of L.COMIDAS) if (d.f < h || s.hechos[d.f + '|' + c]) x[c] = d[c]; else if (!(d[c] && (d[c].fuera || d[c].libre))) x[c] = null; return x; }) };
  const fijas = Object.fromEntries(base.dias.flatMap(d => L.COMIDAS.flatMap(c => L.idsDe(d[c]))).filter(id => recetas[id]).map(id => [id, recetas[id]]));   // las que se quedan (pasado, comido)
  const nuevo = L.proponerSemana(base, { ...fijas, ...pool }, D.productos, fac, obj.G, semillaDe(h + 'rehacer'), null, h);
  let n = 0;
  nuevo.dias.forEach((d, i) => { if (d.f < h) return; for (const c of L.COMIDAS) { if (s.hechos[d.f + '|' + c] || JSON.stringify(d[c]) === JSON.stringify(pe.dias[i][c]) || !d[c]) continue; s.cambios[d.f + '|' + c] = d[c]; n++; } });
  return n;
}
function haceAccion(a) {
  if (a.tipo === 'casa' && a.producto) {
    const k = productoDe(a.producto);
    if (k) (E.casa[k] = (E.casa[k] || 0) + (a.gramos || D.productos[k].util), alta(k)); else E.casaExtra = [...(E.casaExtra || []), { id: uid(), n: capital(a.producto), cat: a.seccion || 'Otros' }];
    salva(); return `${a.producto}: en «En casa»`;
  }
  if (a.tipo === 'acabado' && a.producto) {   // «se ha acabado»: fuera de la nevera y a la próxima compra
    const k = productoDe(a.producto);
    if (k) { delete E.casa[k]; baja(k); apuntaProxima({ k, n: nombreCorto(D.productos[k]) }); } else apuntaProxima({ texto: capital(a.producto), n: capital(a.producto) });
    E.casaExtra = (E.casaExtra || []).filter(x => L.parecido(x.n, a.producto) < 0.6);
    salva(); autoMenu(); return `${a.producto}: a la próxima compra`;
  }
  if (a.tipo === 'apuntar' && a.producto) { const k = productoDe(a.producto); apuntaProxima(k ? { k, n: nombreCorto(D.productos[k]) } : { texto: capital(a.producto), n: capital(a.producto) }); salva(); return `${a.producto}: en la compra`; }
  if (a.tipo === 'fuera' && a.dia && a.comida) { const pl = planes().find(x => x.dias.some(d => d.f === a.dia)); if (!pl) return null; const v = efectivo(pl).dias.find(d => d.f === a.dia)[a.comida]; if (!(v && v.fuera)) alternaFuera(pl, a.dia, a.comida); return `${L.NOMBRE_COMIDA[a.comida] || a.comida}: fuera`; }
  if (a.tipo === 'nota' && a.texto) {   // una costumbre de la casa: el Chef la tiene en cuenta siempre
    E.notasChef = [...(E.notasChef || []).filter(t => L.parecido(t, a.texto) < 0.8), String(a.texto).slice(0, 200)].slice(-20);
    salva(); return 'Apuntado: el Chef lo tendrá en cuenta';
  }
  if (a.tipo === 'quitar' && a.producto) {   // «no hay»: fuera de En casa; el menú se adapta solo al repintar
    const k = productoDe(a.producto);
    if (k) { delete E.casa[k]; baja(k); (E.noHay ||= {})[k] = hoy(); }
    E.casaExtra = (E.casaExtra || []).filter(x => L.parecido(x.n, a.producto) < 0.6);
    E.casaOtros = E.casaOtros.filter(x => L.parecido(x, a.producto) < 0.6);
    salva(); const c = autoMenu(); return `${a.producto}: fuera de En casa${c.length ? ` · ${c.length} plato${c.length > 1 ? 's' : ''} cambiado${c.length > 1 ? 's' : ''}` : ''}`;
  }
  if (a.tipo === 'lista' && a.producto) { const k = productoDe(a.producto); anadeALista([k ? { k } : { texto: capital(a.producto) }]); return `${a.producto}: a la lista`; }
  if (a.tipo === 'cambiar' && a.dia && a.comida && recetas[a.receta]) {
    if (!ponPlato(a)) { tostada('Ese día no está en el menú'); return null; }
    salva(); return 'Menú cambiado';
  }
  if (a.tipo === 'menu' && Array.isArray(a.cambios)) {   // varios platos de una vez, con Deshacer
    const antes = fotoMenu(); let n = 0;
    for (const c of a.cambios) if (c && c.dia && c.comida && recetas[c.receta] && ponPlato(c)) n++;
    if (!n) { tostada('No he podido cambiar ningún plato'); return null; }
    salva(); conDeshacer(`🔄 ${n} plato${n > 1 ? 's' : ''} cambiado${n > 1 ? 's' : ''}`, () => { vuelveMenu(antes); salva(); pinta(); });
    return `${n} plato${n > 1 ? 's' : ''} cambiado${n > 1 ? 's' : ''}`;
  }
  if (a.tipo === 'rehacer') {   // el menú desde hoy, con recetas que se pueden hacer con lo que hay en casa
    const antes = fotoMenu(), n = rehaceConLoQueHay();
    if (!n) { tostada('Con lo que hay, el menú ya está bien'); return null; }
    salva(); autoMenu(); conDeshacer(`🔄 Menú rehecho: ${n} platos`, () => { vuelveMenu(antes); salva(); pinta(); });
    return `Menú rehecho con lo que hay: ${n} platos`;
  }
  if (a.tipo === 'receta' && a.nombre && Array.isArray(a.ingredientes)) {   // receta nueva del Chef: se guarda como vuestra
    const ingT = a.ingredientes.map(x => typeof x === 'string' ? x : `${x.gramos ? Math.round(x.gramos) + ' g ' : ''}${x.producto || ''}`).join('\n');
    const x = L.interpretaReceta(ingT, (a.pasos || []).join('\n'), D.productos);
    const tipos = (a.comidas || []).filter(c => [...L.COMIDAS, 'bebida'].includes(c));
    const r = { id: 'p-' + uid(), n: capital(String(a.nombre).slice(0, 90)), e: a.emoji || L.emojiDe(a.nombre + ' ' + ingT), tipo: tipos.length ? tipos : ['comida', 'cena'],
      ap: aparatoDe(a.aparato), soloEnsalada: a.acompanamiento ? true : undefined, acomp: a.acompanamiento ? true : undefined, min: Math.max(1, parseInt(a.minutos, 10) || 15), prot: 'propia',
      ing: x.ing, otros: x.otros, basicos: x.basicos, pasos: x.pasos.length ? x.pasos : (a.pasos || []), detalle: (a.detalle || []).map(String).slice(0, 20), truco: a.truco ? String(a.truco) : undefined,
      txt: { ing: ingT, pasos: (a.pasos || []).join('\n') }, propia: true, chef: true, creada: new Date().toISOString() };
    if (!r.ing.length) { tostada('No reconozco los ingredientes de esa receta'); return null; }
    r.foto = fotosPara(r)[0] || undefined;
    E.propias = [...(E.propias || []), r]; reconstruyeRecetas();
    let puestas = 0; for (const c of a.poner || []) if (c && c.dia && c.comida && ponPlato({ ...c, receta: r.id })) puestas++;
    salva(); if (V.pestana === 'recetas') vRecetas();
    return `Receta guardada${puestas ? ` y puesta en ${puestas} comida${puestas > 1 ? 's' : ''}` : ''}`;
  }
  tostada('No sé hacer eso todavía'); return null;
}
async function preguntaServidor(texto) {
  const id = uid();
  E.charla = [...(E.charla || []), { id, q: texto, r: null, t: new Date().toISOString() }].slice(-40); salva();
  const datos = V.datos || undefined;
  const r = await fetch(`${servidor()}/casa/${casaId}/pregunta`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: id, blob: await cifraSync({ texto, contexto: contextoParaClaude(texto), datos, cuando: new Date().toISOString() }) }) });
  if (!r.ok) { E.charla = E.charla.filter(c => c.id !== id); salva(); throw new Error('servidor ' + r.status); }
  V.datos = null;
  esperaRespuesta(id);
}
// Espera la respuesta del cerebro: cada 3 s los dos primeros minutos y luego cada 15 s, hasta un día; solo con la app a la vista.
async function esperaRespuesta(id) {
  if (esperando.has(id)) return; esperando.add(id);
  try {
    const t0 = Date.now();
    while (Date.now() - t0 < 864e5) {
      await new Promise(r => setTimeout(r, Date.now() - t0 < 120000 ? 3000 : 15000));
      const x = (E.charla || []).find(c => c.id === id); if (!x || x.r) return;
      if (document.visibilityState !== 'visible') continue;
      try {
        const r = await fetch(`${servidor()}/casa/${casaId}/respuesta/${id}`, { cache: 'no-store' });
        if (r.status === 200) { const resp = await descifraSync((await r.json()).blob); x.r = resp.texto; x.tr = new Date().toISOString(); salva(); if (V.pestana === 'claude' && !$('.hoja')) vClaude(); return; }
      } catch { /* siguiente intento */ }
    }
  } finally { esperando.delete(id); }
}

async function mandarAClaude(texto, fichero = null) {
  const t = 'Para Claude, desde NutriHome: ' + (texto || '').trim();
  if (fichero) return mandarFoto(fichero, t);
  try { if (navigator.share) { await navigator.share({ text: t }); return true; } } catch { return false; }
  window.open('https://t.me/share/url?url=' + encodeURIComponent(location.origin + location.pathname) + '&text=' + encodeURIComponent(t), '_blank');
  return true;
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
  const o = L.interpretar(texto, D.productos), p = planActivo(), pc = planCompra();
  const i = f => p.dias.findIndex(d => d.f === f);
  switch (o.accion) {
    case 'anadir': anadeALista(o.items); if (V.pestana === 'compra') vCompra(); break;
    case 'quitar': {
      const s = est(pc.id), n = [];
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
