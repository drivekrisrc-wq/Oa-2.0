function injectTemplates() {
      const app = document.getElementById('app');
      if (!app) return false;
      if (app.children.length) return true;
      const ids = ['bienvenida','responsable','menu','nuevo','pasados','detalle','editar','toast'];
      const html = ids.map(id => {
        const t = document.getElementById('view-' + id);
        return t ? t.innerHTML.trim() : '';
      }).join('\n\n');
      app.innerHTML = html;
      return true;
    }

    if (!injectTemplates()) {
      document.addEventListener('DOMContentLoaded', injectTemplates);
    }

    // =================== VISOR DE IMAGEN ===================
let visorFotos = [];
let visorIndex = 0;

function abrirVisor(fotos, index) {
  visorFotos = fotos;
  visorIndex = index;
  const visor = document.getElementById('imgVisor');
  visor.style.display = 'flex';
  actualizarVisor();
  document.body.style.overflow = 'hidden';
}

function cerrarVisor() {
  document.getElementById('imgVisor').style.display = 'none';
  document.body.style.overflow = '';
}

function visorNav(dir) {
  visorIndex = (visorIndex + dir + visorFotos.length) % visorFotos.length;
  actualizarVisor();
  event.stopPropagation();
}

function actualizarVisor() {
  document.getElementById('visorImg').src = visorFotos[visorIndex];
  document.getElementById('visorLabel').textContent = `Foto ${visorIndex + 1} de ${visorFotos.length}`;
  const dots = document.getElementById('visorDots');
  dots.innerHTML = visorFotos.map((_, i) => `
    <div onclick="visorIndex=${i};actualizarVisor();event.stopPropagation()" style="width:8px;height:8px;border-radius:50%;background:${i===visorIndex?'white':'rgba(255,255,255,0.35)'};cursor:pointer;transition:background 0.2s"></div>
  `).join('');
}

// Cerrar con tecla Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') cerrarVisor();
  if (e.key === 'ArrowLeft') { if(visorFotos.length>1){visorIndex=(visorIndex-1+visorFotos.length)%visorFotos.length;actualizarVisor();} }
  if (e.key === 'ArrowRight') { if(visorFotos.length>1){visorIndex=(visorIndex+1)%visorFotos.length;actualizarVisor();} }
});

// =================== RESPONSABLE ===================
let inspectorActual = null;

function selResponsable(siglas) {
  inspectorActual = siglas;
  showToast('<i class="bi bi-person-check-fill"></i> Inspector: ' + siglas);
  goTo('screenResponsable', 'screenNuevo');
  // Mostrar badge del inspector en el topbar de nueva OA
  const sub = document.getElementById('nuevoFolioSub');
  if (sub) sub.textContent = (sub.textContent.split('·')[0]).trim() + ' · ' + siglas;
}

// =================== EDITAR OA ===================
let editState = { area: null, inc: null };

function abrirEditar() {
  if (!currentDetalle) return;
  const r = currentDetalle;
  document.getElementById('editarFolioSub').textContent = r.folio;

  // Preseleccionar área actual
  editState.area = r.area;
  editState.inc = r.tipo;

  setTimeout(() => {
    // Marcar área seleccionada
    document.querySelectorAll('#editAreaList .area-list-item').forEach(el => {
      const name = el.querySelector('.ali-name')?.textContent;
      if (name && (name === r.area || name.replace('—','-') === r.area.replace('—','-'))) {
        el.classList.add('sel');
      }
    });
    // Marcar incumplimiento seleccionado
    document.querySelectorAll('#screenEditar .inc-item').forEach(el => {
      if (el.querySelector('.inc-text')?.textContent === r.tipo) {
        el.classList.add('sel');
      }
    });
    // Rellenar notas
    const notasEl = document.getElementById('editNotasTa');
    if (notasEl) notasEl.value = r.notas || '';
  }, 100);

  goTo('screenDetalle', 'screenEditar');
}

function selEditArea(el, nombre) {
  document.querySelectorAll('#editAreaList .area-list-item').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  editState.area = nombre;
}

function selEditInc(el, tipo) {
  document.querySelectorAll('#screenEditar .inc-item').forEach(i => i.classList.remove('sel'));
  el.classList.add('sel');
  editState.inc = tipo;
}

function filterEditAreas(q) {
  const query = q.toLowerCase().trim();
  document.querySelectorAll('#editAreaList .area-list-item').forEach(item => {
    const name = item.querySelector('.ali-name');
    if (!name) return;
    item.classList.toggle('hidden', !name.textContent.toLowerCase().includes(query));
  });
  document.querySelectorAll('#editAreaList .area-group-label').forEach(label => {
    let next = label.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains('area-group-label')) {
      if (!next.classList.contains('hidden')) hasVisible = true;
      next = next.nextElementSibling;
    }
    label.style.display = hasVisible ? '' : 'none';
  });
}

function guardarEdicion() {
  if (!currentDetalle) return;
  const reg = registros.find(r => r.folio === currentDetalle.folio);
  if (!reg) return;

  const notasVal = document.getElementById('editNotasTa')?.value || '';
  if (editState.area) reg.area = editState.area;
  if (editState.inc) {
    reg.tipo = editState.inc;
    const prio = getPrioridad(editState.inc);
    reg.nivel = prio.nivel;
    reg.diasLimite = prio.diasLimite;
  }
  reg.notas = notasVal;

  guardarEnStorage();
  showToast('<i class="bi bi-check-lg"></i> OA actualizada correctamente');
  currentDetalle = reg;

  setTimeout(() => {
    goTo('screenEditar', 'screenDetalle');
    verDetalle(reg.folio);
  }, 800);
}

// =================== PRIORIDADES ===================
    const PRIORIDADES = {
      'Incorrecta Segregación RP':          { nivel:'Alto',      diasLimite:1, color:'#DC2626', bg:'rgba(220,38,38,0.1)',   icon:'bi-circle-fill' },
      'Incorrecta Segregación RME':         { nivel:'Bajo',      diasLimite:4, color:'#16A34A', bg:'rgba(22,163,74,0.1)',   icon:'bi-recycle' },
      'Incorrecto Almacenaje de Materiales':{ nivel:'Medio',     diasLimite:2, color:'#D97706', bg:'rgba(217,119,6,0.1)',   icon:'bi-circle-fill' },
      'Orden y Limpieza':                   { nivel:'Medio',     diasLimite:2, color:'#D97706', bg:'rgba(217,119,6,0.1)',   icon:'bi-circle-fill' },
      'Movimiento de Residuos':             { nivel:'Bajo',      diasLimite:4, color:'#16A34A', bg:'rgba(22,163,74,0.1)',   icon:'bi-circle-fill' },
      'Contaminación al Suelo — DERRAME':   { nivel:'Inmediato', diasLimite:0, color:'#7C3AED', bg:'rgba(124,58,237,0.1)', icon:'bi-exclamation-diamond-fill' },
      'Agotamiento de Recursos — FUGA':     { nivel:'Alto',      diasLimite:1, color:'#DC2626', bg:'rgba(220,38,38,0.1)',   icon:'bi-circle-fill' },
    };

    function prioridadIcon(prio) {
      if (!prio || !prio.icon) return '';
      return `<i class="bi ${prio.icon}" style="color:${prio.color}"></i>`;
    }

function getPrioridad(tipo) {
      return PRIORIDADES[tipo] || { nivel:'—', diasLimite:null, color:'#6B7B9A', bg:'rgba(107,123,154,0.1)', icon:'bi-circle' };
    }

function calcFechaLimite(fechaAperturaISO, diasLimite) {
  if (diasLimite === null) return '—';
  if (diasLimite === 0) return 'Inmediato';
  const d = new Date(fechaAperturaISO);
  d.setDate(d.getDate() + diasLimite);
  return d.toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' });
}

function calcDiasDesviacion(fechaAperturaISO, fechaCierreISO) {
  const inicio = new Date(fechaAperturaISO);
  const fin = fechaCierreISO ? new Date(fechaCierreISO) : new Date();
  const diff = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatFechaISO(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' });
}

// =================== LOCALSTORAGE ===================
const STORAGE_KEY = 'tng_oa_registros';
const FOLIO_KEY   = 'tng_oa_folio';

function comprimirFoto(base64, calidad = 0.4) {
  return new Promise(resolve => {
    if (!base64 || base64 === '[foto]' || !base64.startsWith('data:image')) {
      resolve(base64); return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 600;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => resolve('[foto]');
    img.src = base64;
  });
}

async function guardarEnStorage() {
  try {
    const comprimidos = await Promise.all(registros.map(async r => {
      const fotos = await Promise.all((r.fotos || []).map(f => comprimirFoto(f)));
      const foto  = await comprimirFoto(r.foto);
      return { ...r, fotos, foto };
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comprimidos));
    localStorage.setItem(FOLIO_KEY, String(folioCounter));
  } catch(e) {
    // Si aún así está lleno, guardar sin fotos
    try {
      const sinFotos = registros.map(r => ({ ...r, fotos: [], foto: '' }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sinFotos));
      localStorage.setItem(FOLIO_KEY, String(folioCounter));
      showToast('<i class="bi bi-exclamation-triangle-fill"></i> Registros guardados sin fotos (memoria llena)');
    } catch(e2) {
      showToast('<i class="bi bi-exclamation-triangle-fill"></i> No se pudo guardar. Memoria del dispositivo llena.');
    }
  }
}

function cargarDeStorage() {
  try {
    const raw   = localStorage.getItem(STORAGE_KEY);
    const folio = localStorage.getItem(FOLIO_KEY);
    if (raw) {
      registros = JSON.parse(raw);
      // Migración: agregar fechaAperturaISO a registros viejos que no la tienen
      registros = registros.map(r => {
        if (!r.fechaAperturaISO) {
          // Intentar reconstruir desde el campo fecha texto, si no usar fecha actual
          r.fechaAperturaISO = new Date().toISOString();
        }
        if (r.fechaCierreISO === undefined) r.fechaCierreISO = null;
        return r;
      });
    }
    if (folio) folioCounter = parseInt(folio);
  } catch(e) {
    console.warn('Error al leer localStorage:', e);
  }
}

// =================== DATOS ===================
let registros = [];
let folioCounter = 1;
let currentDetalle = null;
let nuevoEstatus = null;
let filterActual = 'todos';

// Cargar datos guardados al iniciar
cargarDeStorage();

// =================== NAVEGACIÃ“N ===================
function goTo(from, to) {
  const fromEl = document.getElementById(from);
  const toEl = document.getElementById(to);
  fromEl.classList.add('exit-left');
  setTimeout(() => {
    fromEl.classList.remove('active','exit-left');
    toEl.classList.add('active');
    toEl.scrollTop = 0;
  }, 350);
  if (to === 'screenPasados') renderRegistros();
  if (to === 'screenMenu') updateStats();
}

function goBack(from, to) {
  goTo(from, to);
}

// =================== RELOJ ===================
function updateClock() {
  const now = new Date();
  const f = now.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('fechaVal').textContent = f.charAt(0).toUpperCase()+f.slice(1);
  document.getElementById('horaVal').textContent = now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
updateClock(); setInterval(updateClock,1000);

// =================== FORM NUEVO =================== 
let fState = { area:null, inc:null, foto:false, fotos:[null,null,null,null,null] };

function selArea(el, nombre) {
  document.querySelectorAll('#areaList .area-list-item').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  fState.area = nombre;
  document.getElementById('chk2').classList.add('on');
  document.getElementById('fc3').classList.remove('locked');
  checkForm();
}

function filterAreas(q) {
  const query = q.toLowerCase().trim();
  const items = document.querySelectorAll('.area-list-item');
  const labels = document.querySelectorAll('.area-group-label');

  items.forEach(item => {
    const name = item.querySelector('.ali-name');
    if (!name) return;
    const match = name.textContent.toLowerCase().includes(query);
    item.classList.toggle('hidden', !match);
  });

  // Ocultar labels de grupos vacíos
  labels.forEach(label => {
    let next = label.nextElementSibling;
    let hasVisible = false;
    while (next && !next.classList.contains('area-group-label')) {
      if (!next.classList.contains('hidden')) hasVisible = true;
      next = next.nextElementSibling;
    }
    label.style.display = hasVisible ? '' : 'none';
  });
}

function selInc(el, tipo) {
  document.querySelectorAll('.inc-item').forEach(i=>i.classList.remove('sel'));
  el.classList.add('sel');
  fState.inc = tipo;

  // Mostrar badge de prioridad
  const prio = getPrioridad(tipo);
  const existing = document.getElementById('prioBadge');
  if (existing) existing.remove();
  const badge = document.createElement('div');
  badge.id = 'prioBadge';
  badge.style.cssText = `margin-top:10px;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;background:${prio.bg};border:1px solid ${prio.color}30`;
  badge.innerHTML = `
    <span style="font-size:18px">${prioridadIcon(prio)}</span>
    <div>
      <div style="font-size:12px;font-weight:700;color:${prio.color}">${prio.nivel}</div>
      <div style="font-size:11px;color:var(--mid)">Tiempo de atención: ${prio.diasLimite === 0 ? 'Inmediato' : prio.diasLimite + ' día' + (prio.diasLimite!==1?'s':'')}</div>
    </div>
  `;
  el.closest('.fcard-body').appendChild(badge);

  document.getElementById('chk3').classList.add('on');
  document.getElementById('fc4').classList.remove('locked');
  checkForm();
}

let currentSlot = 0;
const MAX_FOTOS = 5;

function triggerFotoSlot(slot) {
  currentSlot = slot;
  document.getElementById('fotoInput').value = '';
  document.getElementById('fotoInput').click();
}

function handleFotoSlot(input) {
  if (input.files && input.files[0]) {
    const r = new FileReader();
    r.onload = e => {
      setFotoSlot(currentSlot, e.target.result);
    };
    r.readAsDataURL(input.files[0]);
  }
}

function setFotoSlot(slot, src) {
  fState.fotos[slot] = src;
  const img = document.getElementById('fotoImg' + slot);
  const slotEl = document.getElementById('slot' + slot);
  img.src = src;
  slotEl.classList.add('filled');
  updateFotosUI();
}

function delFoto(slot, e) {
  e.stopPropagation();
  fState.fotos[slot] = null;
  document.getElementById('fotoImg' + slot).src = '';
  document.getElementById('slot' + slot).classList.remove('filled');
  updateFotosUI();
}

function updateFotosUI() {
  const count = fState.fotos.filter(Boolean).length;
  document.getElementById('fotosCount').textContent = count;

  // Dots
  for (let i = 0; i < MAX_FOTOS; i++) {
    const dot = document.getElementById('fd' + i);
    dot.className = 'fc-dot' + (fState.fotos[i] ? ' filled' : (i===0 ? ' required' : ''));
  }

  const hasMin = !!fState.fotos[0];
  fState.foto = hasMin;
  document.getElementById('chk4').classList.toggle('on', hasMin);
  if (hasMin) {
    document.getElementById('fc5').classList.remove('locked');
    setTimeout(()=>document.getElementById('fc5').scrollIntoView({behavior:'smooth',block:'center'}), count===1?300:0);
  }
  checkForm();
}

// Demo en desktop: simular fotos al click
document.getElementById('fotosGrid').addEventListener('click', function(e) {
  const slot = e.target.closest('.foto-slot');
  if (!slot || slot.classList.contains('filled')) return;
  const slotId = parseInt(slot.id.replace('slot',''));
  setTimeout(() => {
    if (!fState.fotos[slotId]) {
      const demos = [
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzBEMkI1RSIvPjx0ZXh0IHg9IjE1MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMyQjdFQzEiIGZvbnQtc2l6ZT0iNDAiPvCfk5s8L3RleHQ+PHRleHQgeD0iMTUwIiB5PSIxMjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIgZm9udC1zaXplPSIxMiIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSI+Rm90byBkZSBldmlkZW5jaWE8L3RleHQ+PC9zdmc+',
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzE0MzIxZSIvPjx0ZXh0IHg9IjE1MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMxNkEzNEEiIGZvbnQtc2l6ZT0iNDAiPvCfk7c8L3RleHQ+PHRleHQgeD0iMTUwIiB5PSIxMjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIgZm9udC1zaXplPSIxMiIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSI+w4FyZWEgYWZlY3RhZGE8L3RleHQ+PC9zdmc+',
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMxMWIwMCIvPjx0ZXh0IHg9IjE1MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNGNTlFMEIiIGZvbnQtc2l6ZT0iNDAiPvCfk7U8L3RleHQ+PHRleHQgeD0iMTUwIiB5PSIxMjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIgZm9udC1zaXplPSIxMiIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSI+RGV0YWxsZSBpbmN1bXBsaW1pZW50bzwvdGV4dD48L3N2Zz4=',
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFhMDgwOCIvPjx0ZXh0IHg9IjE1MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNEQzI2MjYiIGZvbnQtc2l6ZT0iNDAiPvCfkqg8L3RleHQ+PHRleHQgeD0iMTUwIiB5PSIxMjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIgZm9udC1zaXplPSIxMiIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSI+Wm9uYSBhZmVjdGFkYTwvdGV4dD48L3N2Zz4=',
        'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzBhMTgyOCIvPjx0ZXh0IHg9IjE1MCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM0QTlGRTAiIGZvbnQtc2l6ZT0iNDAiPvCfkb08L3RleHQ+PHRleHQgeD0iMTUwIiB5PSIxMjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC41KSIgZm9udC1zaXplPSIxMiIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSI+UGFub3LDoW1pY2E8L3RleHQ+PC9zdmc+'
      ];
      setFotoSlot(slotId, demos[slotId]);
    }
  }, 500);
});

function checkForm() {
  const ok = fState.area && fState.inc && fState.foto;
  document.getElementById('btnGuardar').disabled = !ok;
  document.getElementById('pm2').className = 'pm-chip' + (fState.area?' ok':'');
  document.getElementById('pm3').className = 'pm-chip' + (fState.inc?' ok':'');
  document.getElementById('pm4').className = 'pm-chip' + (fState.foto?' ok':'');
  if (ok) document.getElementById('btnGuardar').textContent = 'Guardar — ' + fState.area;
  else document.getElementById('btnGuardar').textContent = 'Guardar Registro';
}

function guardarOA() {
  const now = new Date();
  const nuevoFolio = 'OA-' + String(folioCounter).padStart(4,'0');
  folioCounter++;

  const tipo = fState.inc;
  const prio = getPrioridad(tipo);

  const nuevo = {
    folio: nuevoFolio,
    inspector: inspectorActual || '—',
    area: fState.area,
    tipo: tipo,
    nivel: prio.nivel,
    diasLimite: prio.diasLimite,
    fechaAperturaISO: now.toISOString(),
    fecha: now.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'}),
    hora: now.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}),
    estatus: 'abierta',
    fechaCierreISO: null,
    notas: document.getElementById('notasTa').value,
    fotos: fState.fotos.filter(Boolean),
    foto: fState.fotos[0] || ''
  };

  registros.unshift(nuevo);
  guardarEnStorage();
  updateStats();
  showToast('<i class="bi bi-check-lg"></i> OA ' + nuevoFolio + ' registrada correctamente');

  setTimeout(() => {
    resetNuevo();
    goTo('screenNuevo', 'screenMenu');
    document.getElementById('nuevoFolioSub').textContent = 'OA-2026-' + String(folioCounter).padStart(4,'0');
  }, 1200);
}

function resetNuevo() {
  fState = {area:null,inc:null,foto:false,fotos:[null,null,null,null,null]};
  document.querySelectorAll('#areaList .area-list-item').forEach(b=>b.classList.remove('sel'));
  document.querySelectorAll('#fc3 .inc-item').forEach(i=>i.classList.remove('sel'));
  const pb = document.getElementById('prioBadge'); if(pb) pb.remove();
  for(let i=0;i<5;i++){
    document.getElementById('fotoImg'+i).src='';
    document.getElementById('slot'+i).classList.remove('filled');
    const dot=document.getElementById('fd'+i);
    dot.className='fc-dot'+(i===0?' required':'');
  }
  document.getElementById('fotosCount').textContent='0';
  document.getElementById('notasTa').value='';
  document.getElementById('areaSearch').value='';
  filterAreas('');
  ['chk2','chk3','chk4','chk5'].forEach(id=>document.getElementById(id).classList.remove('on'));
  ['fc3','fc4','fc5'].forEach(id=>document.getElementById(id).classList.add('locked'));
  document.getElementById('btnGuardar').disabled=true;
  document.getElementById('btnGuardar').textContent='Guardar Registro';
  ['pm2','pm3','pm4'].forEach(id=>document.getElementById(id).className='pm-chip');
}

// =================== ESTADISTICAS ===================
function updateStats() {
  const abiertas = registros.filter(r=>r.estatus==='abierta').length;
  const cerradas = registros.filter(r=>r.estatus==='cerrada').length;
  document.getElementById('statAbiertas').textContent = abiertas;
  document.getElementById('statCerradas').textContent = cerradas;
  document.getElementById('statTotal').textContent = registros.length;
}

// =================== REGISTROS PASADOS ===================
function renderRegistros() {
  const lista = document.getElementById('registrosList');
  const filtrados = filterActual==='todos' ? registros : registros.filter(r=>r.estatus===filterActual);
  document.getElementById('pasadosSub').textContent = filtrados.length + ' observaciones';

  lista.innerHTML = filtrados.length === 0
    ? `<div style="text-align:center;padding:50px 20px;color:var(--mid)">
        <div style="font-size:48px;margin-bottom:12px"><i class="bi bi-card-text"></i></div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;color:var(--text);margin-bottom:6px">Sin registros</div>
        <div style="font-size:13px">Aún no hay OAs registradas</div>
      </div>`
    : filtrados.map((r) => {
      const prio = getPrioridad(r.tipo);
      const fechaLimite = calcFechaLimite(r.fechaAperturaISO, r.diasLimite ?? prio.diasLimite);
      const diasDesv = r.fechaAperturaISO ? calcDiasDesviacion(r.fechaAperturaISO, r.fechaCierreISO) : '—';
      const vencida = r.estatus === 'abierta' && r.fechaAperturaISO && (r.diasLimite ?? prio.diasLimite) !== null && diasDesv > (r.diasLimite ?? prio.diasLimite);
      return `
    <div class="reg-card" id="regcard-${r.folio}">
      <div class="reg-card-head" onclick="verDetalle('${r.folio}')">
        <div class="status-dot ${r.estatus}"></div>
        <div class="reg-folio">${r.folio}</div>
        <div class="reg-status-badge ${r.estatus}">${r.estatus==='abierta'?'Abierta':'Cerrada'}</div>
      </div>
      <div class="reg-card-body" onclick="verDetalle('${r.folio}')">
        <div class="reg-tipo">${r.tipo}</div>
        <div style="margin:6px 0 4px">
          <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${prio.bg};color:${prio.color}">
                ${prioridadIcon(prio)} ${prio.nivel}
          </span>
          ${vencida ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:rgba(220,38,38,0.1);color:#DC2626;margin-left:5px"><i class="bi bi-alarm"></i> Vencida</span>` : ''}
        </div>
        <div class="reg-meta">
          <div class="reg-meta-item"><i class="bi bi-geo-alt-fill"></i> ${r.area}</div>
          <div class="reg-meta-item"><i class="bi bi-calendar-event"></i> ${r.fecha} ${r.hora}</div>
        </div>
        <div class="reg-meta" style="margin-top:4px">
          <div class="reg-meta-item"><i class="bi bi-hourglass-split"></i> Límite: ${fechaLimite}</div>
          <div class="reg-meta-item"><i class="bi bi-calendar3"></i> Días: ${diasDesv}</div>
        </div>
      </div>
      ${r.foto ? `<img class="reg-img-thumb" src="${r.foto}" onclick="abrirVisor(${JSON.stringify(r.fotos && r.fotos.length ? r.fotos : [r.foto])},0)" style="cursor:zoom-in">` : ''}
      <div class="reg-card-footer">
        <button class="btn-ver-detalle" onclick="verDetalle('${r.folio}')">Ver detalle →</button>
        <button class="btn-eliminar-oa" onclick="confirmarEliminar('${r.folio}', event)"><i class="bi bi-trash3"></i> Eliminar</button>
      </div>
    </div>
  `}).join('');
}

function confirmarEliminar(folio, e) {
  e.stopPropagation();
  const card = document.getElementById('regcard-' + folio);
  // Mostrar confirmación inline en la tarjeta
  const footer = card.querySelector('.reg-card-footer');
  footer.innerHTML = `
    <span style="font-size:12px;color:var(--red);font-weight:600;">¿Eliminar esta OA?</span>
    <div style="display:flex;gap:8px">
      <button class="btn-eliminar-oa" onclick="eliminarOA('${folio}')">Sí, eliminar</button>
      <button class="btn-ver-detalle" onclick="cancelarEliminar('${folio}')">Cancelar</button>
    </div>
  `;
  footer.style.background = 'rgba(220,38,38,0.05)';
  footer.style.borderTop = '1px solid rgba(220,38,38,0.2)';
}

function cancelarEliminar(folio) {
  const card = document.getElementById('regcard-' + folio);
  const footer = card.querySelector('.reg-card-footer');
  footer.innerHTML = `
    <button class="btn-ver-detalle" onclick="verDetalle('${folio}')">Ver detalle →</button>
    <button class="btn-eliminar-oa" onclick="confirmarEliminar('${folio}', event)"><i class="bi bi-trash3"></i> Eliminar</button>
  `;
  footer.style.background = '';
  footer.style.borderTop = '';
}

function eliminarOA(folio) {
  registros = registros.filter(r => r.folio !== folio);
  guardarEnStorage();
  updateStats();
  renderRegistros();
  showToast('<i class="bi bi-trash3"></i> OA ' + folio + ' eliminada');
}

function filterReg(tipo, el) {
  filterActual = tipo;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  renderRegistros();
}

// =================== DETALLE ===================
function verDetalle(folio) {
  currentDetalle = registros.find(r=>r.folio===folio);
  if (!currentDetalle) return;

  const r = currentDetalle;
  const prio = getPrioridad(r.tipo);
  const fechaLimite = calcFechaLimite(r.fechaAperturaISO, r.diasLimite ?? prio.diasLimite);
  const diasDesv = r.fechaAperturaISO ? calcDiasDesviacion(r.fechaAperturaISO, r.fechaCierreISO) : '—';
  const vencida = r.estatus === 'abierta' && diasDesv > (r.diasLimite ?? prio.diasLimite);

  document.getElementById('detalleFolioTitle').textContent = r.folio;
  document.getElementById('detalleStatusSub').innerHTML = r.estatus==='abierta'
    ? '<i class="bi bi-circle-fill" style="color:#FCD34D"></i> Abierta'
    : '<i class="bi bi-circle-fill" style="color:#6EE7B7"></i> Cerrada';

  document.getElementById('detalleInfo').innerHTML = `
    <div class="detalle-row">
      <span class="dr-key">Inspector</span>
      <span class="dr-val">${r.inspector || '—'}</span>
    </div>
    <div class="detalle-row">
      <span class="dr-key">Área</span>
      <span class="dr-val">${r.area}</span>
    </div>
    <div class="detalle-row">
      <span class="dr-key">Incumplimiento</span>
      <span class="dr-val" style="max-width:200px;text-align:right">${r.tipo}</span>
    </div>
    <div class="detalle-row">
      <span class="dr-key">Nivel</span>
      <span class="dr-val">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;background:${prio.bg};color:${prio.color}">
              ${prioridadIcon(prio)} ${prio.nivel}
        </span>
      </span>
    </div>
    <div class="detalle-row">
      <span class="dr-key">Fecha apertura</span>
      <span class="dr-val">${r.fecha} ${r.hora}</span>
    </div>
    <div class="detalle-row">
      <span class="dr-key">Fecha límite</span>
      <span class="dr-val" style="color:${vencida?'#DC2626':'inherit'};font-weight:${vencida?'700':'600'}">${fechaLimite} ${vencida?'<i class="bi bi-alarm"></i>':''}
      </span>
    </div>
    <div class="detalle-row">
      <span class="dr-key">Fecha cierre</span>
      <span class="dr-val">${r.fechaCierreISO ? formatFechaISO(r.fechaCierreISO) : '—'}</span>
    </div>
    <div class="detalle-row">
      <span class="dr-key">Días de desviación</span>
      <span class="dr-val" style="color:${vencida?'#DC2626':'inherit'}">${diasDesv} día${diasDesv!==1?'s':''}</span>
    </div>
    ${r.notas ? `<div class="detalle-row"><span class="dr-key">Notas</span><span class="dr-val" style="max-width:200px;text-align:right">${r.notas}</span></div>` : ''}
  `;

  const fotoCard = document.getElementById('detalleFotoCard');
  const fotosBody = document.getElementById('detalleFotosBody');
  const fotos = r.fotos && r.fotos.length ? r.fotos : (r.foto ? [r.foto] : []);
  if (fotos.length) {
    fotoCard.style.display='block';
    fotosBody.innerHTML = fotos.map((src,i) => `
      <div style="position:relative;cursor:zoom-in" onclick="abrirVisor(${JSON.stringify(fotos)},${i})">
        <img src="${src}" style="width:100%;border-radius:10px;object-fit:contain;max-height:280px;background:#f8f9fb;display:block">
        <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.5);color:white;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;backdrop-filter:blur(4px)">Foto ${i+1}</div>
        <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.5);color:white;font-size:11px;padding:3px 8px;border-radius:10px;backdrop-filter:blur(4px)"><i class="bi bi-zoom-in"></i></div>
      </div>
    `).join('');
  } else {
    fotoCard.style.display='none';
  }

  const dot = document.getElementById('detalleDot');
  const val = document.getElementById('detalleEstatusVal');
  dot.className = 'status-dot ' + r.estatus;
  val.className = 'ec-val ' + r.estatus;
  val.textContent = r.estatus==='abierta'?'Abierta':'Cerrada';

  nuevoEstatus = r.estatus;
  document.getElementById('btnEstatusAbierta').classList.toggle('active', r.estatus==='abierta');
  document.getElementById('btnEstatusCerrada').classList.toggle('active', r.estatus==='cerrada');

  goTo('screenPasados','screenDetalle');
}

function selEstatus(est, el) {
  nuevoEstatus = est;
  document.getElementById('btnEstatusAbierta').classList.toggle('active', est==='abierta');
  document.getElementById('btnEstatusCerrada').classList.toggle('active', est==='cerrada');
  const dot = document.getElementById('detalleDot');
  const val = document.getElementById('detalleEstatusVal');
  dot.className = 'status-dot ' + est;
  val.className = 'ec-val ' + est;
  val.textContent = est==='abierta'?'Abierta':'Cerrada';
}

function guardarEstatus() {
  if (!currentDetalle || !nuevoEstatus) return;
  const reg = registros.find(r=>r.folio===currentDetalle.folio);
  if (reg) {
    reg.estatus = nuevoEstatus;
    if (nuevoEstatus === 'cerrada' && !reg.fechaCierreISO) {
      reg.fechaCierreISO = new Date().toISOString();
    } else if (nuevoEstatus === 'abierta') {
      reg.fechaCierreISO = null;
    }
  }
  guardarEnStorage();
  updateStats();
  showToast('<i class="bi bi-check-lg"></i> Estatus actualizado a: ' + (nuevoEstatus==='abierta'?'Abierta':'Cerrada'));
  setTimeout(()=>goBack('screenDetalle','screenPasados'),900);
}

// =================== GENERAR PDF ===================
function generarPDF() {
  if (!currentDetalle) return;
  const r = currentDetalle;
  const prio = getPrioridad(r.tipo);
  const fechaLimite = calcFechaLimite(r.fechaAperturaISO, r.diasLimite ?? prio.diasLimite);
  const diasDesv = r.fechaAperturaISO ? calcDiasDesviacion(r.fechaAperturaISO, r.fechaCierreISO) : '—';
  const fotos = (r.fotos && r.fotos.length) ? r.fotos : (r.foto ? [r.foto] : []);

  const logoHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <img src="logo_tng.png" alt="TNG" style="height:42px;width:auto;display:block">
    </div>
  `;

  // Fotos HTML — máx 2 por fila
  let fotosHTML = '';
  if (fotos.length > 0) {
    const filas = [];
    for (let i = 0; i < fotos.length; i += 2) {
      filas.push(fotos.slice(i, i + 2));
    }
    fotosHTML = `
      <div style="margin:24px 0 28px">
        ${filas.map(fila => `
          <div style="display:flex;gap:12px;margin-bottom:12px">
            ${fila.map((src, idx) => `
              <div style="flex:1;position:relative">
                <img src="${src}" style="width:100%;height:220px;object-fit:cover;border-radius:6px;display:block;border:1px solid #dde3ee">
                <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.55);color:white;font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px">
                  Foto ${fotos.indexOf(src) + 1}
                </div>
              </div>
            `).join('')}
            ${fila.length === 1 ? '<div style="flex:1"></div>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // Filas de la tabla
  const filaTabla = (label, valor, highlight=false) => `
    <tr>
      <td style="background:#4472C4;color:white;font-weight:700;font-size:12px;padding:10px 16px;width:30%;border:1px solid #3a62b0;font-family:Arial">${label}</td>
      <td style="padding:10px 16px;font-size:12px;color:#1a1a1a;border:1px solid #dde3ee;background:${highlight?'#fff8e1':'white'};font-family:Arial;text-align:center">${valor}</td>
    </tr>
  `;

  const contenido = `
    <!DOCTYPE html>
    <html>
        <head>
          <meta charset="UTF-8">
          <title>${r.folio} — Observación Ambiental</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
          <style>
        @media print {
          body { margin: 0; }
          @page { margin: 20mm 18mm; size: A4; }
        }
        body { font-family: Arial, sans-serif; color: #1a1a1a; background: white; margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      <div style="max-width:720px;margin:0 auto;padding:32px 40px">

        <!-- Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;border-bottom:2px solid #0D2B5E;padding-bottom:16px">
            ${logoHTML}
          <div style="text-align:right">
            <div style="font-size:10px;color:#6B7B9A;font-family:Arial">Folio</div>
            <div style="font-size:13px;font-weight:700;color:#0D2B5E;font-family:Arial">${r.folio}</div>
            <div style="font-size:10px;color:#6B7B9A;margin-top:4px;font-family:Arial">Estatus</div>
            <div style="font-size:12px;font-weight:700;color:${r.estatus==='cerrada'?'#16A34A':'#D97706'};font-family:Arial">
              ${r.estatus==='cerrada'
                ? '<i class="bi bi-check-lg"></i> Cerrada'
                : '<i class="bi bi-circle-fill"></i> Abierta'}
            </div>
          </div>
        </div>

        <!-- Título -->
        <h1 style="text-align:center;font-size:22px;font-weight:700;color:#0D2B5E;margin:0 0 24px;font-family:Arial">
          Observación Ambiental N°${r.folio.split('-').pop()}
        </h1>

        <!-- Fotos -->
        ${fotosHTML}

        <!-- Tabla de datos -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          ${filaTabla('Área', r.area)}
          ${filaTabla('Categoría', r.tipo)}
          ${filaTabla('Comentario', r.notas || '—')}
              ${filaTabla('Nivel de Atención', `${prioridadIcon(prio)} ${prio.nivel.toUpperCase()} / ${prio.diasLimite === 0 ? 'INMEDIATO' : prio.diasLimite + ' DÍA' + (prio.diasLimite !== 1 ? 'S' : '')}`, true)}
          ${filaTabla('Fecha de Apertura', r.fecha + ' ' + r.hora)}
          ${filaTabla('Fecha Límite de Cierre', fechaLimite)}
          ${filaTabla('Fecha Real de Cierre', r.fechaCierreISO ? formatFechaISO(r.fechaCierreISO) : '—')}
          ${filaTabla('Días de Desviación', diasDesv + ' día' + (diasDesv !== 1 ? 's' : ''))}
        </table>

        <!-- Pie de página -->
        <div style="border-top:1px solid #dde3ee;padding-top:12px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:9px;color:#2B7EC1;font-weight:700;letter-spacing:0.5px;font-family:Arial">
            HUTCHISON PORTS TNG | OBSERVACIÓN AMBIENTAL
          </div>
          <div style="font-size:9px;color:#9CA3AF;font-family:Arial">
            Generado: ${new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}
          </div>
        </div>

      </div>
    </body>
    </html>
  `;

  // Abrir en nueva ventana e imprimir como PDF
  const win = window.open('', '_blank');
  if (!win) {
    showToast('<i class="bi bi-exclamation-triangle-fill"></i> Permite ventanas emergentes para generar el PDF');
    return;
  }
  win.document.write(contenido);
  win.document.close();
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };
}

// =================== EXPORTAR EXCEL ===================
function exportarExcel() {
  if (!registros || registros.length === 0) {
    showToast('<i class="bi bi-exclamation-triangle"></i> No hay OAs para exportar');
    return;
  }

  // SheetJS (xlsx) - cargado dinámicamente
  if (typeof XLSX === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload = () => _generarExcel();
    document.head.appendChild(script);
  } else {
    _generarExcel();
  }
}

function _generarExcel() {
  const wb = XLSX.utils.book_new();

  // ============ HOJA: NIVEL DE ATENCIÓN (idéntica al original) ============
  const nivelData = [
    ['PRIORIDAD DE ATENCIÓN','Nivel','Días',null,'NIVELES','BAJO','MEDIO ','ALTO ','INMEDIATO'],
    ['Incorrecta Segregación de Residuos RP','Alto',1,null,'DÍA DE CIERRE',4,2,1,0],
    ['Incorrecta Segregación de Residuos RME','Bajo',4],
    ['Incorrecto Almacenaje de Materiales','Medio',2],
    ['Orden y Limpieza','Medio',2],
    ['Movimiento de Residuos','Bajo',4],
    ['Contaminación al Suelo (DERRAMES)','Inmediato',0],
    ['Agotamiento de los Recursos (FUGAS)','Alto',1],
    [],
    ['Estatus'],
    ['Abierto'],
    ['Cerrado'],
  ];
  const wsNivel = XLSX.utils.aoa_to_sheet(nivelData);
  wsNivel['!cols'] = [{wch:35},{wch:12},{wch:8},{wch:4},{wch:14},{wch:8},{wch:8},{wch:8},{wch:12}];
  XLSX.utils.book_append_sheet(wb, wsNivel, 'NIVEL DE ATENCIÓN');

  // ============ HOJA: BITÁCORA — mismas columnas que el original ============
  // A=FOLIO OA, B=Hora inicio, C=Hora finalización, D=Fecha, E=Correo electrónico,
  // F=Columna1, G=SUPERINTENDENTE, H=RESPONSABLE, I=ÁREA, J=NUMERO DE PROYECTO,
  // K=Área, L=Categorías, M=Nivel, N=Días, O=Comentario,
  // P=Día Esperado de Cierre, Q=Dias Transcurridos, R=Hoy, S=Estatus, T= , U=Tiempo de Cierre

  const headers = [
    'FOLIO OA','Hora de inicio','Hora de finalización','Fecha',
    'Correo electrónico','Columna1','SUPERINTENDENTE','RESPONSABLE',
    'ÁREA ','NUMERO DE PROYECTO','Área','Categorías',
    'Nivel','Días','Comentario Obligatoria "Se detecto ..."',
    'Día Esperado de Cierre','Dias Transcurridos','Hoy',
    'Estatus',' ','Tiempo de Cierre'
  ];

  const filas = [headers];

  registros.forEach((r, i) => {
    const rowNum = i + 2;
    const prio = getPrioridad(r.tipo);

    let horaInicio = '', horaFin = '', fechaStr = '';
    let diaEsperado = '', diasTransc = '', hoy = '', fechaCierreStr = '', tiempoCierre = '';

    if (r.fechaAperturaISO) {
      const dt = new Date(r.fechaAperturaISO);
      horaInicio = dt.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
      horaFin    = horaInicio;
      fechaStr   = dt.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
      const diasLim = r.diasLimite ?? prio.diasLimite ?? 0;
      const limite = new Date(dt);
      limite.setDate(limite.getDate() + diasLim);
      diaEsperado = limite.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
      const fin = r.fechaCierreISO ? new Date(r.fechaCierreISO) : new Date();
      diasTransc  = Math.floor((fin - dt)/(1000*60*60*24));
      hoy         = new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
    }

    if (r.fechaCierreISO) {
      const dc = new Date(r.fechaCierreISO);
      fechaCierreStr = dc.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'});
      if (r.fechaAperturaISO) {
        const da = new Date(r.fechaAperturaISO);
        tiempoCierre = Math.floor((dc - da)/(1000*60*60*24));
      }
    }

    filas.push([
      r.folio || '',          // A - FOLIO OA
      horaInicio,             // B - Hora de inicio
      horaFin,                // C - Hora de finalización
      fechaStr,               // D - Fecha
      r.inspector || '—',    // E - Correo electrónico (inspector)
      '',                     // F - Columna1
      '—',                    // G - SUPERINTENDENTE
      '—',                    // H - RESPONSABLE
      r.area || '',           // I - ÁREA
      '—',                    // J - NUMERO DE PROYECTO
      '—',                    // K - Área funcional
      r.tipo || '',           // L - Categorías
      prio.nivel || '—',      // M - Nivel
      r.diasLimite ?? prio.diasLimite ?? '—',  // N - Días
      r.notas || '',          // O - Comentario
      diaEsperado,            // P - Día Esperado de Cierre
      diasTransc,             // Q - Dias Transcurridos
      hoy,                    // R - Hoy
      r.estatus === 'cerrada' ? 'Cerrado' : 'Abierto',  // S - Estatus
      fechaCierreStr,         // T - (espacio = fecha cierre real)
      tiempoCierre,           // U - Tiempo de Cierre
    ]);
  });

  const wsBit = XLSX.utils.aoa_to_sheet(filas);

  // Anchos exactos del original
  wsBit['!cols'] = [
    {wch:11.66},{wch:16},{wch:20.88},{wch:20.88},{wch:19.88},{wch:19.88},
    {wch:23.10},{wch:20},{wch:23.10},{wch:18.33},{wch:13},{wch:34},
    {wch:13},{wch:12.55},{wch:32.10},{wch:16.33},{wch:13.33},{wch:11.10},
    {wch:16.33},{wch:11.44},{wch:15.44}
  ];

  // Freeze fila 1
  wsBit['!freeze'] = {xSplit:0, ySplit:1, topLeftCell:'A2', activePane:'bottomLeft', state:'frozen'};

  XLSX.utils.book_append_sheet(wb, wsBit, 'Bitacora');

  const fecha = new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'-');
  XLSX.writeFile(wb, `Bitacora_OA_TNG_${fecha}.xlsx`);
  showToast('<i class="bi bi-file-earmark-excel"></i> Bitácora exportada correctamente');
}

// =================== TOAST ===================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2800);
}

// Init
updateStats();
