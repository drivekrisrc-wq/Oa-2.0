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

function actualizarFolioNuevo(val) {
  const tag  = document.getElementById('folioTag');
  const warn = document.getElementById('folioWarn');
  if (val && parseInt(val) > 0) {
    const folioPropuesto = 'OA-' + String(parseInt(val)).padStart(4,'0');
    // Verificar solo contra registros que existen actualmente en memoria
    const duplicado = registros.some(r => r.folio === folioPropuesto);
    if (duplicado) {
      if (tag)  { tag.textContent = '⚠ Ocupado'; tag.style.background = 'rgba(220,38,38,0.12)'; tag.style.color = '#DC2626'; }
      if (warn) { warn.textContent = folioPropuesto + ' ya está en uso. Elige otro número.'; warn.style.display = 'block'; }
      document.getElementById('btnGuardar').disabled = true;
    } else {
      if (tag)  { tag.textContent = folioPropuesto; tag.style.background = 'rgba(0,155,222,0.1)'; tag.style.color = 'var(--blue)'; }
      if (warn) { warn.style.display = 'none'; }
      checkForm();
    }
  } else {
    if (tag)  { tag.textContent = 'AUTO'; tag.style.background = ''; tag.style.color = ''; }
    if (warn) { warn.style.display = 'none'; }
    checkForm();
  }
}

function actualizarProyecto(val) {
  const chk = document.getElementById('chkProyecto');
  if (chk) chk.classList.toggle('on', val && val.length === 4);
}

function actualizarDepto(val) {
  const chk = document.getElementById('chkDepto');
  if (chk) chk.classList.toggle('on', val && val.length > 0);
}
let supervisorActual = null;

function selResponsable(siglas) {
  supervisorActual = siglas;
  showToast('<i class="bi bi-person-check-fill"></i> Supervisor: ' + siglas);
  goTo('screenResponsable', 'screenNuevo');
  // Mostrar badge del supervisor en el topbar
  const sub = document.getElementById('nuevoFolioSub');
  if (sub) sub.textContent = (sub.textContent.split('·')[0]).trim() + ' · ' + siglas;
  // Inicializar campo folio con el siguiente número automático
  setTimeout(() => {
    const fi = document.getElementById('folioInput');
    if (fi && !fi.value) {
      fi.placeholder = String(folioCounter).padStart(4,'0');
    }
  }, 100);
}

// =================== EDITAR OA ===================
let editState = { area: null, inc: null };

function abrirEditar() {
  if (!currentDetalle) return;
  const r = currentDetalle;
  document.getElementById('editarFolioSub').textContent = r.folio;

  editState.area = r.area;
  editState.inc  = r.tipo;

  setTimeout(() => {
    // Precargar folio (solo los números)
    const folioEl = document.getElementById('editFolioInput');
    if (folioEl) folioEl.value = parseInt(r.folio.replace(/\D/g,'')) || '';

    // Precargar proyecto
    const proyEl = document.getElementById('editProyectoInput');
    if (proyEl) proyEl.value = r.proyecto ? r.proyecto.replace('R-','') : '';

    // Precargar departamento
    const deptoEl = document.getElementById('editDeptoInput');
    if (deptoEl) deptoEl.value = r.departamento || '';

    // Precargar foto de vista previa
    const previewImg   = document.getElementById('editFotoPreviewImg');
    const previewEmpty = document.getElementById('editFotoPreviewEmpty');
    const primeraFoto  = (r.fotos && r.fotos[0]) || r.foto || '';
    if (primeraFoto) {
      previewImg.src = primeraFoto;
      previewImg.style.display = 'block';
      if (previewEmpty) previewEmpty.style.display = 'none';
    } else {
      previewImg.style.display = 'none';
      if (previewEmpty) previewEmpty.style.display = 'block';
    }

    // Marcar área
    document.querySelectorAll('#editAreaList .area-list-item').forEach(el => {
      const name = el.querySelector('.ali-name')?.textContent;
      if (name && (name === r.area || name.replace('—','-') === r.area.replace('—','-')))
        el.classList.add('sel');
    });
    // Marcar incumplimiento
    document.querySelectorAll('#screenEditar .inc-item').forEach(el => {
      if (el.querySelector('.inc-text')?.textContent === r.tipo) el.classList.add('sel');
    });
    // Notas
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

function onEditFotoPreviewChange(input) {
  if (!input.files || !input.files[0] || !currentDetalle) return;
  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result;
    // Actualizar preview visual
    const previewImg   = document.getElementById('editFotoPreviewImg');
    const previewEmpty = document.getElementById('editFotoPreviewEmpty');
    previewImg.src = base64;
    previewImg.style.display = 'block';
    if (previewEmpty) previewEmpty.style.display = 'none';
    // Guardar en editState para que guardarEdicion la use
    editState.fotoPreview = base64;
  };
  reader.readAsDataURL(input.files[0]);
}

function guardarEdicion() {
  if (!currentDetalle) return;
  const reg = registros.find(r => r.folio === currentDetalle.folio);
  if (!reg) return;

  // Nuevo folio
  const folioInputEl = document.getElementById('editFolioInput');
  if (folioInputEl && folioInputEl.value) {
    const num = parseInt(folioInputEl.value);
    if (num > 0) {
      const nuevoFolio = 'OA-' + String(num).padStart(4,'0');
      // Si el folio cambió, actualizar contador
      if (nuevoFolio !== reg.folio) {
        reg.folio = nuevoFolio;
        if (num >= folioCounter) folioCounter = num + 1;
        guardarEnStorage();
        localStorage.setItem('tng_oa_folio', String(folioCounter));
      }
    }
  }

  // Proyecto
  const proyEl = document.getElementById('editProyectoInput');
  if (proyEl) {
    reg.proyecto = proyEl.value ? 'R-' + proyEl.value : '';
  }

  // Departamento responsable
  const deptoEl2 = document.getElementById('editDeptoInput');
  if (deptoEl2) reg.departamento = deptoEl2.value || '';

  const notasVal = document.getElementById('editNotasTa')?.value || '';
  if (editState.area) reg.area = editState.area;
  if (editState.inc) {
    reg.tipo = editState.inc;
    const prio = getPrioridad(editState.inc);
    reg.nivel = prio.nivel;
    reg.diasLimite = prio.diasLimite;
  }
  reg.notas = notasVal;

  // Si se cambió la foto de vista previa, ponerla como primera foto
  if (editState.fotoPreview) {
    if (!reg.fotos) reg.fotos = [];
    reg.fotos[0] = editState.fotoPreview;
    reg.foto = editState.fotoPreview;
    editState.fotoPreview = null;
  }

  guardarEnStorage();
  sincronizarNube();
  sincronizarSheets();
  showToast('<i class="bi bi-check-lg"></i> OA actualizada correctamente');
  currentDetalle = reg;

  setTimeout(() => {
    goTo('screenEditar', 'screenDetalle');
    verDetalle(reg.folio);
  }, 800);
}

// =================== SUPABASE ===================
const SB_URL  = 'https://rbvoxtqvcavapxwjwmaf.supabase.co';
const SB_KEY  = 'sb_publishable_SBYEEhjW06rB_qr-jDPt3Q_HLisHjtk';
const SYNC_KEY = 'tng_last_sync';
let sincronizando = false;

function sbHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Prefer': 'return=minimal'
  };
}

// Subir una foto base64 al bucket y devolver URL pública
async function subirFoto(base64, folio, idx) {
  if (!base64 || base64 === '[foto]' || !base64.startsWith('data:image')) return null;
  try {
    const res  = await fetch(base64);
    const blob = await res.blob();
    const ext  = blob.type.includes('png') ? 'png' : 'jpg';
    const path = `${folio}/foto_${idx}.${ext}`;

    const resp = await fetch(`${SB_URL}/storage/v1/object/fotos-oa/${path}`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': blob.type,
        'x-upsert': 'true',
        'cache-control': '3600'
      },
      body: blob
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.warn('Error subiendo foto:', resp.status, err);
      showToast('<i class="bi bi-exclamation-triangle"></i> Error al subir foto: ' + resp.status);
      return null;
    }
    return `${SB_URL}/storage/v1/object/public/fotos-oa/${path}`;
  } catch(e) {
    console.warn('Exception subiendo foto:', e);
    return null;
  }
}

// Sincronizar una OA a Supabase (upsert)
async function sincronizarOA(r) {
  // Subir fotos que sean base64 y reemplazar por URLs
  const fotosUrls = await Promise.all(
    (r.fotos || []).map((f, i) =>
      f && f.startsWith('data:image') ? subirFoto(f, r.folio, i) : Promise.resolve(f)
    )
  );
  const fotoUrlFiltradas = fotosUrls.filter(Boolean);

  const payload = {
    folio:          r.folio,
    supervisor:     r.supervisor || '—',
    area:           r.area,
    tipo:           r.tipo,
    nivel:          r.nivel || '',
    fecha:          r.fecha,
    hora:           r.hora,
    estatus:        r.estatus,
    fecha_apertura: r.fechaAperturaISO || null,
    fecha_cierre:   r.fechaCierreISO   || null,
    dias_limite:    r.diasLimite ?? null,
    notas:          r.notas || '',
    proyecto:       r.proyecto || '',
    departamento:   r.departamento || '',
    fotos:          fotoUrlFiltradas
  };

  const resp = await fetch(`${SB_URL}/rest/v1/oas?folio=eq.${encodeURIComponent(r.folio)}`, {
    method: 'GET',
    headers: sbHeaders()
  });
  const existe = resp.ok && (await resp.json()).length > 0;

  if (existe) {
    await fetch(`${SB_URL}/rest/v1/oas?folio=eq.${encodeURIComponent(r.folio)}`, {
      method: 'PATCH',
      headers: sbHeaders(),
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(`${SB_URL}/rest/v1/oas`, {
      method: 'POST',
      headers: { ...sbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify(payload)
    });
  }

  // Actualizar URLs en el registro local
  if (fotoUrlFiltradas.length > 0) {
    r.fotos = fotoUrlFiltradas;
    r.foto  = fotoUrlFiltradas[0];
    guardarEnStorage();
  }
}

async function sincronizarNube() {
  if (sincronizando) return;
  sincronizando = true;
  mostrarSyncStatus('syncing');
  try {
    await Promise.all(registros.map(r => sincronizarOA(r)));
    localStorage.setItem(SYNC_KEY, new Date().toISOString());
    mostrarSyncStatus('ok');
    showToast('<i class="bi bi-cloud-check-fill"></i> Sincronizado correctamente');
  } catch(e) {
    mostrarSyncStatus('error');
    showToast('<i class="bi bi-cloud-slash-fill"></i> Error al sincronizar');
  } finally {
    sincronizando = false;
  }
}

async function cargarDesdeNube() {
  mostrarSyncStatus('syncing');
  try {
    const resp = await fetch(
      `${SB_URL}/rest/v1/oas?select=*&order=fecha_apertura.desc`,
      { headers: sbHeaders() }
    );
    if (!resp.ok) { mostrarSyncStatus('offline'); return false; }
    const data = await resp.json();
    if (!data || data.length === 0) { mostrarSyncStatus('ok'); return false; }

    // Mapa de fotos locales base64 para no perderlas
    const fotosLocales = {};
    registros.forEach(r => {
      const b64 = (r.fotos || []).filter(f => f && f.startsWith('data:image'));
      if (b64.length) fotosLocales[r.folio] = { fotos: r.fotos, foto: r.foto };
    });

    const foliosNube = new Set(data.map(r => r.folio));
    const soloLocales = registros.filter(r => !foliosNube.has(r.folio));

    registros = [
      ...data.map(r => {
        const local = fotosLocales[r.folio];
        const fotos = local ? local.fotos : (r.fotos || []);
        const foto  = local ? local.foto  : (fotos[0] || '');
        return {
          folio:            r.folio,
          supervisor:       r.supervisor || '—',
          area:             r.area,
          tipo:             r.tipo,
          nivel:            r.nivel,
          fecha:            r.fecha,
          hora:             r.hora,
          estatus:          r.estatus,
          fechaAperturaISO: r.fecha_apertura,
          fechaCierreISO:   r.fecha_cierre || null,
          diasLimite:       r.dias_limite,
          notas:            r.notas || '',
          proyecto:         r.proyecto || '',
          departamento:     r.departamento || '',
          fotos,
          foto
        };
      }),
      ...soloLocales
    ];

    // Actualizar folio counter
    const maxNum = registros.reduce((max, r) => {
      const n = parseInt((r.folio || '').replace(/\D/g,'')) || 0;
      return n > max ? n : max;
    }, folioCounter);
    if (maxNum >= folioCounter) folioCounter = maxNum + 1;

    guardarEnStorage();
    updateStats();
    localStorage.setItem(SYNC_KEY, new Date().toISOString());
    mostrarSyncStatus('ok');
    return true;
  } catch(e) {
    mostrarSyncStatus('offline');
    return false;
  }
}

// Eliminar OA de Supabase
async function eliminarDeNube(folio) {
  try {
    await fetch(`${SB_URL}/rest/v1/oas?folio=eq.${encodeURIComponent(folio)}`, {
      method: 'DELETE',
      headers: sbHeaders()
    });
  } catch(e) {}
}

function mostrarSyncStatus(estado) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  const map = {
    syncing: { icon:'bi-cloud-arrow-up-fill', color:'#D97706', text:'Sincronizando...' },
    ok:      { icon:'bi-cloud-check-fill',    color:'#6EE7B7', text:'Sincronizado'     },
    error:   { icon:'bi-cloud-slash-fill',    color:'#F87171', text:'Error'            },
    offline: { icon:'bi-cloud-slash-fill',    color:'#9CA3AF', text:'Sin conexión'     },
  };
  const s = map[estado] || map.offline;
  const last = localStorage.getItem(SYNC_KEY);
  const lastStr = last ? new Date(last).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—';
  el.innerHTML = `
    <i class="bi ${s.icon}" style="color:${s.color};font-size:14px"></i>
    <span style="font-size:11px;color:${s.color};font-weight:600">${s.text}</span>
    <span style="font-size:10px;color:rgba(255,255,255,0.4);margin-left:4px">· ${lastStr}</span>
  `;
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

  // Folio: manual si se ingresó, automático si no
  const folioInputEl = document.getElementById('folioInput');
  const folioManual = folioInputEl && folioInputEl.value ? parseInt(folioInputEl.value) : null;
  const numFolio = folioManual && folioManual > 0 ? folioManual : folioCounter;
  const nuevoFolio = 'OA-' + String(numFolio).padStart(4,'0');

  // Validar duplicado
  if (registros.some(r => r.folio === nuevoFolio)) {
    showToast('<i class="bi bi-exclamation-triangle-fill"></i> ' + nuevoFolio + ' ya existe — cambia el número');
    const warn = document.getElementById('folioWarn');
    if (warn) { warn.textContent = nuevoFolio + ' ya está registrado. Elige otro número.'; warn.style.display = 'block'; }
    const folioInputEl2 = document.getElementById('folioInput');
    if (folioInputEl2) folioInputEl2.focus();
    return;
  }

  // Actualizar contador
  if (numFolio >= folioCounter) folioCounter = numFolio + 1;
  else folioCounter++;

  // Proyecto
  const proyEl = document.getElementById('proyectoInput');
  const proyecto = proyEl && proyEl.value && proyEl.value.length === 4 ? 'R-' + proyEl.value : '';

  // Departamento responsable
  const deptoEl = document.getElementById('deptoInput');
  const departamento = deptoEl ? deptoEl.value : '';

  const tipo = fState.inc;
  const prio = getPrioridad(tipo);

  const nuevo = {
    folio: nuevoFolio,
    supervisor: supervisorActual || '—',
    area: fState.area,
    tipo: tipo,
    nivel: prio.nivel,
    diasLimite: prio.diasLimite,
    proyecto: proyecto,
    departamento: departamento,
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
  sincronizarNube();
  sincronizarSheets();
  updateStats();
  showToast('<i class="bi bi-check-lg"></i> OA ' + nuevoFolio + ' registrada correctamente');

  setTimeout(() => {
    resetNuevo();
    goTo('screenNuevo', 'screenMenu');
    document.getElementById('nuevoFolioSub').textContent = 'OA-' + String(folioCounter).padStart(4,'0');
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
  // Limpiar folio y proyecto
  const fi = document.getElementById('folioInput');
  if (fi) { fi.value=''; fi.placeholder=String(folioCounter).padStart(4,'0'); }
  const ft = document.getElementById('folioTag');
  if (ft) { ft.textContent='AUTO'; ft.style.background=''; ft.style.color=''; }
  // Limpiar advertencia de folio duplicado
  const fw = document.getElementById('folioWarn');
  if (fw) { fw.style.display='none'; fw.textContent=''; }
  const pi = document.getElementById('proyectoInput');
  if (pi) pi.value='';
  const cp = document.getElementById('chkProyecto');
  if (cp) cp.classList.remove('on');
  const di = document.getElementById('deptoInput');
  if (di) di.value='';
  const cd = document.getElementById('chkDepto');
  if (cd) cd.classList.remove('on');
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
        ${r.proyecto ? `<div style="font-size:11px;font-weight:700;color:var(--blue);margin:2px 0 4px"><i class="bi bi-briefcase-fill"></i> ${r.proyecto}</div>` : ''}
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
  eliminarDeNube(folio);
  sincronizarSheets();
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
      <span class="dr-key">Supervisor</span>
      <span class="dr-val">${r.supervisor || '—'}</span>
    </div>
    ${r.proyecto ? `
    <div class="detalle-row">
      <span class="dr-key">Proyecto</span>
      <span class="dr-val" style="font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--blue)">${r.proyecto}</span>
    </div>` : ''}
    ${r.departamento ? `
    <div class="detalle-row">
      <span class="dr-key">Depto. Responsable</span>
      <span class="dr-val">${r.departamento}</span>
    </div>` : ''}
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
  sincronizarNube();
  sincronizarSheets();
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
          ${r.proyecto ? filaTabla('Proyecto', r.proyecto) : ''}
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
        <div style="border-top:1px solid #dde3ee;padding-top:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:9px;color:#2B7EC1;font-weight:700;letter-spacing:0.5px;font-family:Arial">
              HUTCHISON PORTS TNG | OBSERVACIÓN AMBIENTAL
            </div>
            <div style="font-size:9px;color:#9CA3AF;font-family:Arial">
              Generado: ${new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
          <div style="font-size:9px;color:#6B7280;font-family:Arial;font-style:italic;text-align:center;padding-top:6px;border-top:1px dashed #eef0f4">
            Cualquier duda o comentario, comunicarse con el número de Protección Ambiental: 2295489455
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
  // A=FOLIO OA, B=Hora inicio, C=Hora finalización, D=Fecha, E=Supervisor,
  // F=SUPERINTENDENTE, G=RESPONSABLE, H=ÁREA, I=PROYECTO,
  // J=Categorías, K=Nivel, L=Días, M=Comentario,
  // N=Día Esperado de Cierre, O=Dias Transcurridos, P=Hoy, Q=Estatus, R=Fecha Cierre, S=Tiempo de Cierre

  const headers = [
    'FOLIO OA','Hora de inicio','Hora de finalización','Fecha',
    'Supervisor','SUPERINTENDENTE','RESPONSABLE',
    'ÁREA','NUMERO DE PROYECTO','Categorías',
    'Nivel','Días','Comentario Obligatoria "Se detecto ..."',
    'Día Esperado de Cierre','Dias Transcurridos','Hoy',
    'Estatus','Fecha de Cierre','Tiempo de Cierre'
  ];

  const filas = [headers];

  // De más antigua a más nueva
  const registrosOrdenados = [...registros].reverse();

  registrosOrdenados.forEach((r, i) => {
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
      r.folio || '',                              // A - FOLIO OA
      horaInicio,                                 // B - Hora de inicio
      horaFin,                                    // C - Hora de finalización
      fechaStr,                                   // D - Fecha
      r.supervisor || '—',                        // E - Supervisor
      '—',                                        // F - SUPERINTENDENTE
      '—',                                        // G - RESPONSABLE
      r.area || '',                               // H - ÁREA
      r.proyecto || '',                           // I - NUMERO DE PROYECTO
      r.tipo || '',                               // J - Categorías
      prio.nivel || '—',                          // K - Nivel
      r.diasLimite ?? prio.diasLimite ?? '—',     // L - Días
      r.notas || '',                              // M - Comentario
      diaEsperado,                                // N - Día Esperado de Cierre
      diasTransc,                                 // O - Dias Transcurridos
      hoy,                                        // P - Hoy
      r.estatus === 'cerrada' ? 'Cerrado' : 'Abierto', // Q - Estatus
      fechaCierreStr,                             // R - Fecha de Cierre
      tiempoCierre,                               // S - Tiempo de Cierre
    ]);
  });

  const wsBit = XLSX.utils.aoa_to_sheet(filas);

  // Anchos de columnas
  wsBit['!cols'] = [
    {wch:11.66},{wch:16},{wch:20.88},{wch:20.88},{wch:19.88},
    {wch:23.10},{wch:20},{wch:23.10},{wch:18.33},{wch:34},
    {wch:13},{wch:12.55},{wch:32.10},{wch:16.33},{wch:13.33},
    {wch:11.10},{wch:16.33},{wch:11.44},{wch:15.44}
  ];

  // Freeze fila 1
  wsBit['!freeze'] = {xSplit:0, ySplit:1, topLeftCell:'A2', activePane:'bottomLeft', state:'frozen'};

  XLSX.utils.book_append_sheet(wb, wsBit, 'Bitacora');

  const fecha = new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'-');
  XLSX.writeFile(wb, `Bitacora_OA_TNG_${fecha}.xlsx`);
  showToast('<i class="bi bi-file-earmark-excel"></i> Bitácora exportada correctamente');
}

// =================== REPORTE SEMANAL ===================
function generarReporteSemanal() {
  if (!registros || registros.length === 0) {
    showToast('<i class="bi bi-exclamation-triangle"></i> No hay OAs para generar el reporte');
    return;
  }

  // Calcular semana actual (lunes a viernes)
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=dom, 1=lun ... 6=sab
  const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() + diffLunes); lunes.setHours(0,0,0,0);
  const viernes = new Date(lunes); viernes.setDate(lunes.getDate() + 4); viernes.setHours(23,59,59,999);

  // Número de semana ISO
  const semanaNum = (() => {
    const d = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  })();

  const fmtFecha = d => d.toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const fmtCorto = d => d.toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit'});

  // Filtrar OAs para el reporte
  const oasReporte = registros.filter(r => {
    const apertura = r.fechaAperturaISO ? new Date(r.fechaAperturaISO) : null;
    const cierre   = r.fechaCierreISO   ? new Date(r.fechaCierreISO)   : null;
    if (r.estatus === 'abierta') return true; // todas las abiertas
    if (r.estatus === 'cerrada' && cierre && cierre >= lunes && cierre <= viernes) return true; // cerradas esta semana
    return false;
  });

  // KPIs
  const total    = registros.length;
  const cerradas = registros.filter(r => r.estatus === 'cerrada').length;
  const abiertas = registros.filter(r => r.estatus === 'abierta').length;
  const diasCierre = registros
    .filter(r => r.estatus === 'cerrada' && r.fechaAperturaISO && r.fechaCierreISO)
    .map(r => Math.abs((new Date(r.fechaCierreISO) - new Date(r.fechaAperturaISO)) / 86400000));
  const promDias = diasCierre.length ? (diasCierre.reduce((a,b)=>a+b,0) / diasCierre.length).toFixed(1) : '—';
  const pctCerradas = total ? Math.round(cerradas / total * 100) : 0;

  // OAs por mes
  const porMes = {};
  registros.forEach(r => {
    if (!r.fechaAperturaISO) return;
    const d = new Date(r.fechaAperturaISO);
    const key = d.toLocaleDateString('es-MX',{month:'short',year:'numeric'});
    const mes = d.toLocaleDateString('es-MX',{month:'short'});
    if (!porMes[key]) porMes[key] = {label: mes.charAt(0).toUpperCase()+mes.slice(1), cerradas:0, abiertas:0};
    if (r.estatus === 'cerrada') porMes[key].cerradas++;
    else porMes[key].abiertas++;
  });
  const meses = Object.values(porMes).slice(-4);
  const maxMes = Math.max(...meses.map(m => m.cerradas + m.abiertas), 1);

  // Niveles de riesgo
  const PRIOS = getPrioridad;
  const niveles = {Bajo:0, Medio:0, Alto:0, Inmediato:0};
  registros.forEach(r => {
    const p = getPrioridad(r.tipo);
    if (p && p.nivel) niveles[p.nivel] = (niveles[p.nivel]||0) + 1;
  });

  // Categorías — % de cierre por tipo
  const catMap = {};
  registros.forEach(r => {
    if (!catMap[r.tipo]) catMap[r.tipo] = {total:0, cerradas:0};
    catMap[r.tipo].total++;
    if (r.estatus === 'cerrada') catMap[r.tipo].cerradas++;
  });
  const categorias = Object.entries(catMap)
    .map(([tipo,v]) => ({tipo, pct: Math.round(v.cerradas/v.total*100)}))
    .sort((a,b) => b.pct - a.pct);

  // Abreviaturas de categorías
  const abrevTipo = t => t
    .replace('Incorrecta Segregación RP','Seg. Residuos RP')
    .replace('Incorrecta Segregación RME','Seg. Residuos RME')
    .replace('Incorrecto Almacenaje de Materiales','Almacenaje Incorrecto')
    .replace('Contaminación al Suelo — DERRAME','Contam. Suelo')
    .replace('Agotamiento de Recursos — FUGA','Agotamiento / Fugas')
    .replace('Movimiento de Residuos','Movimiento Residuos');

  // Proyectos — % de cierre
  const proyMap = {};
  registros.filter(r => r.proyecto).forEach(r => {
    const k = r.proyecto;
    if (!proyMap[k]) proyMap[k] = {total:0, cerradas:0};
    proyMap[k].total++;
    if (r.estatus === 'cerrada') proyMap[k].cerradas++;
  });
  const proyectos = Object.entries(proyMap)
    .map(([p,v]) => ({nombre:p, pct: Math.round(v.cerradas/v.total*100)}))
    .sort((a,b) => b.pct - a.pct)
    .slice(0,6);

  // Áreas — % de cierre (por grupos de área)
  const areaMap = {};
  registros.forEach(r => {
    const grp = r.area ? r.area.split(' ')[0] : 'Otro';
    if (!areaMap[grp]) areaMap[grp] = {total:0, cerradas:0};
    areaMap[grp].total++;
    if (r.estatus === 'cerrada') areaMap[grp].cerradas++;
  });
  const areas = Object.entries(areaMap)
    .map(([a,v]) => ({nombre:a, pct: Math.round(v.cerradas/v.total*100)}))
    .sort((a,b) => b.pct - a.pct)
    .slice(0,5);

  // OAs abiertas agrupadas por supervisor
  const oasAbiertas = registros.filter(r => r.estatus === 'abierta');
  const supMap = {};
  oasAbiertas.forEach(r => {
    const k = r.supervisor || '—';
    if (!supMap[k]) supMap[k] = {area: r.area, oas: []};
    supMap[k].oas.push(r);
  });

  // Helpers HTML
  const colorBarra = pct => pct >= 85 ? '#1e7e34' : pct >= 60 ? '#d35400' : '#c0392b';
  const barraHTML = (nombre, pct) => `
    <div class="brow">
      <div class="bname">${nombre}</div>
      <div class="btrack"><div class="bfill" style="width:${pct}%;background:${colorBarra(pct)}">
        <span class="bpct">${pct}%</span>
      </div></div>
    </div>`;

  const colBarra = pct => pct === 100 ? '#1e7e34' : pct >= 75 ? '#d35400' : '#c0392b';
  const vBarHTML = (m) => {
    const tot = m.cerradas + m.abiertas;
    const hC = tot ? Math.round(m.cerradas/maxMes*70) : 0;
    const hA = tot ? Math.round(m.abiertas/maxMes*70) : 0;
    return `<div class="vcol">
      <div class="vtop">${tot}</div>
      <div class="vstack">
        ${hA ? `<div class="vseg" style="height:${hA}px;background:#c0392b;border-radius:3px 3px 0 0"></div>` : ''}
        ${hC ? `<div class="vseg" style="height:${hC}px;background:#1e7e34;border-radius:${hA?'0':'3px 3px'} 0 0"></div>` : ''}
      </div>
      <div class="vbot">${m.label}</div>
    </div>`;
  };

  const nivelTag = nivel => {
    const map = {
      'Inmediato': 't-inm', 'Alto': 't-alt', 'Medio': 't-med', 'Bajo': 't-bajo'
    };
    return map[nivel] || 't-bajo';
  };

  // Contar niveles por supervisor
  const supNiveles = (oas) => {
    const n = {Inmediato:0, Alto:0, Medio:0, Bajo:0};
    oas.forEach(r => { const p = getPrioridad(r.tipo); if(p) n[p.nivel] = (n[p.nivel]||0)+1; });
    return Object.entries(n).filter(([,v])=>v>0);
  };

  // OA vencida?
  const esVencida = r => {
    if (r.estatus !== 'abierta' || !r.fechaAperturaISO) return false;
    const prio = getPrioridad(r.tipo);
    const diasLim = r.diasLimite ?? prio?.diasLimite ?? 0;
    const apertura = new Date(r.fechaAperturaISO);
    const limite = new Date(apertura); limite.setDate(apertura.getDate() + diasLim);
    return new Date() > limite;
  };

  const diasTranscurridos = r => {
    if (!r.fechaAperturaISO) return 0;
    return Math.floor((new Date() - new Date(r.fechaAperturaISO)) / 86400000);
  };

  const abrevTipoCorto = t => t
    .replace('Incorrecta Segregación RP','Seg. Res. RP')
    .replace('Incorrecta Segregación RME','Seg. Res. RME')
    .replace('Incorrecto Almacenaje de Materiales','Almacenaje')
    .replace('Contaminación al Suelo — DERRAME','Contam. Suelo')
    .replace('Agotamiento de Recursos — FUGA','Agotamiento/Fuga')
    .replace('Movimiento de Residuos','Mov. Residuos')
    .replace('Orden y Limpieza','Orden y Limpieza');

  // Tarjetas de superintendentes
  const supCardsHTML = Object.entries(supMap).map(([sup, {area, oas}]) => {
    const nvls = supNiveles(oas);
    const vencidas = oas.filter(r => esVencida(r));
    const oasListHTML = oas.map(r => {
      const dias = diasTranscurridos(r);
      const v = esVencida(r);
      return `<div class="fitem${v?' vencida':''}">
        <span class="ftag">${r.folio}</span>
        <span>${abrevTipoCorto(r.tipo)} · ${fmtCorto(new Date(r.fechaAperturaISO))} · ${dias} día${dias!==1?'s':''}</span>
      </div>`;
    }).join('');
    return `
    <div class="sup-card">
      <div class="sup-hdr">
        <div>
          <div class="sup-name">${sup}</div>
          <div class="sup-area">${area}</div>
        </div>
        <div class="sup-badge"><div class="sup-badge-num">${oas.length}</div><div class="sup-badge-lbl">OAs</div></div>
      </div>
      <div class="sup-body">
        <div class="ntags">${nvls.map(([n,c])=>`<span class="ntag ${nivelTag(n)}">${n} ${c}</span>`).join('')}</div>
        ${vencidas.length ? `<div class="venc">⚠ ${vencidas.length} vencida${vencidas.length>1?'s':''}</div>` : ''}
        <div class="flist">${oasListHTML}</div>
      </div>
    </div>`;
  }).join('');

  // Montar HTML completo
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Dashboard OA S${semanaNum} ${hoy.getFullYear()}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter','Helvetica Neue',Arial,sans-serif; background:#F4F5F7; color:#1a1a2e; }
  .page,.page2 { max-width:900px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.10); }
  .page2 { margin-top:0; margin-bottom:32px; }
  .hdr { background:#0d3b7a; padding:14px 24px; display:flex; justify-content:space-between; align-items:center; }
  .hdr-left { display:flex; align-items:center; gap:14px; }
  .hdr-sep { width:1px; height:34px; background:rgba(255,255,255,.25); }
  .hdr-title { font-size:13px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:.06em; line-height:1.3; }
  .hdr-right { text-align:right; font-size:10px; color:rgba(255,255,255,.65); line-height:1.7; }
  .kpi-strip { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid #eef0f4; }
  .kpi { padding:16px 20px 14px; border-right:1px solid #eef0f4; position:relative; }
  .kpi:last-child { border-right:none; }
  .kpi::after { content:''; position:absolute; bottom:0; left:20px; right:20px; height:3px; border-radius:3px 3px 0 0; }
  .kpi.blue::after { background:#0d3b7a; } .kpi.green::after { background:#1e7e34; }
  .kpi.red::after { background:#c0392b; } .kpi.orange::after { background:#d35400; }
  .kpi-label { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:#9aa0b0; margin-bottom:4px; }
  .kpi-value { font-size:36px; font-weight:700; line-height:1; }
  .kpi.blue .kpi-value { color:#0d3b7a; } .kpi.green .kpi-value { color:#1e7e34; }
  .kpi.red .kpi-value { color:#c0392b; } .kpi.orange .kpi-value { color:#d35400; }
  .kpi-sub { font-size:10px; color:#aab0be; margin-top:4px; }
  .body { padding:16px; background:#F4F5F7; display:flex; flex-direction:column; gap:12px; }
  .row { display:grid; gap:12px; }
  .r-half { grid-template-columns:1fr 1fr; } .r-16 { grid-template-columns:1.6fr 1fr; } .r-13 { grid-template-columns:1fr 2.6fr; }
  .card { background:#fff; border-radius:8px; overflow:hidden; border:1px solid #eef0f4; }
  .card-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#9aa0b0; padding:10px 16px 8px; border-bottom:1px solid #f0f2f5; }
  .bars { padding:10px 16px 12px; display:flex; flex-direction:column; gap:6px; }
  .brow { display:flex; align-items:center; gap:8px; }
  .bname { font-size:10px; color:#555e72; width:148px; flex-shrink:0; text-align:right; }
  .btrack { flex:1; height:16px; background:#f0f2f5; border-radius:4px; overflow:hidden; }
  .bfill { height:100%; border-radius:4px; display:flex; align-items:center; justify-content:flex-end; padding-right:7px; }
  .bpct { font-size:10px; font-weight:700; color:#fff; }
  .donut-wrap { display:flex; align-items:center; justify-content:center; padding:16px 10px; }
  .donut-rel { position:relative; width:110px; height:110px; }
  .donut-svg { width:110px; height:110px; }
  .donut-ctr { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; }
  .donut-pct { font-size:22px; font-weight:700; color:#1e7e34; line-height:1; }
  .donut-lbl { font-size:10px; color:#aab0be; margin-top:2px; }
  .vbars-wrap { padding:10px 20px 12px; }
  .vbars { display:flex; align-items:flex-end; gap:16px; height:90px; margin-bottom:8px; }
  .vcol { display:flex; flex-direction:column; align-items:center; flex:1; }
  .vstack { display:flex; flex-direction:column; align-items:center; gap:1px; width:100%; justify-content:flex-end; height:76px; }
  .vseg { width:100%; }
  .vtop { font-size:11px; font-weight:700; color:#333; margin-bottom:2px; }
  .vbot { font-size:10px; color:#9aa0b0; margin-top:4px; }
  .vlegend { display:flex; gap:12px; }
  .vl-dot { width:9px; height:9px; border-radius:2px; display:inline-block; margin-right:3px; vertical-align:middle; }
  .vl-txt { font-size:9px; color:#9aa0b0; vertical-align:middle; }
  .niv-grid { display:grid; grid-template-columns:repeat(4,1fr); }
  .niv { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:14px 6px; text-align:center; border-right:1px solid #f0f2f5; }
  .niv:last-child { border-right:none; }
  .niv-lbl { font-size:8px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; margin-bottom:3px; }
  .niv-num { font-size:32px; font-weight:700; line-height:1; }
  .niv-pct { font-size:10px; margin-top:3px; }
  .nb { background:#edfaf1; } .nb .niv-lbl,.nb .niv-pct,.nb .niv-num { color:#1e7e34; }
  .nm { background:#fff8f0; } .nm .niv-lbl,.nm .niv-pct,.nm .niv-num { color:#d35400; }
  .na { background:#fdf0f0; } .na .niv-lbl,.na .niv-pct,.na .niv-num { color:#c0392b; }
  .ni { background:#fdf0f6; } .ni .niv-lbl,.ni .niv-pct,.ni .niv-num { color:#8e1552; }
  .foot { text-align:center; font-size:9px; color:#c8ccd6; padding:10px 16px 12px; margin-top:4px; }
  /* Página 2 */
  .p2-body { padding:20px 24px; }
  .p2-sec { font-size:11px; font-weight:700; color:#0d3b7a; text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; }
  .p2-intro { font-size:10px; color:#8a90a0; margin-bottom:16px; line-height:1.5; }
  .sup-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .sup-card { border-radius:8px; overflow:hidden; border:1px solid #eef0f4; }
  .sup-hdr { background:#0d3b7a; color:#fff; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; }
  .sup-name { font-size:11px; font-weight:700; }
  .sup-area { font-size:9px; color:rgba(255,255,255,.65); margin-top:2px; }
  .sup-badge { text-align:center; background:rgba(255,255,255,.15); border-radius:6px; padding:4px 8px; flex-shrink:0; }
  .sup-badge-num { font-size:18px; font-weight:700; line-height:1; }
  .sup-badge-lbl { font-size:8px; color:rgba(255,255,255,.7); }
  .sup-body { padding:10px 12px; display:flex; flex-direction:column; gap:7px; }
  .ntags { display:flex; flex-wrap:wrap; gap:4px; }
  .ntag { font-size:9px; font-weight:700; padding:2px 7px; border-radius:4px; }
  .t-inm { background:#fdf0f6; color:#8e1552; border:1px solid #8e155240; }
  .t-alt { background:#fdf0f0; color:#c0392b; border:1px solid #c0392b40; }
  .t-med { background:#fff8f0; color:#d35400; border:1px solid #d3540040; }
  .t-bajo { background:#edfaf1; color:#1e7e34; border:1px solid #1e7e3440; }
  .venc { font-size:9px; font-weight:700; color:#c0392b; padding:3px 8px; background:#fdf0f0; border-left:3px solid #c0392b; border-radius:0 4px 4px 0; }
  .flist { display:flex; flex-direction:column; gap:4px; }
  .fitem { display:flex; align-items:center; gap:6px; font-size:9px; color:#555e72; padding:3px 0; border-bottom:1px solid #f5f6f8; }
  .fitem:last-child { border-bottom:none; }
  .fitem.vencida { background:#fff8f8; border-left:2px solid #c0392b; padding-left:4px; border-radius:0 3px 3px 0; }
  .ftag { background:#eef0f4; border-radius:3px; padding:1px 5px; font-weight:700; font-size:8px; color:#0d3b7a; flex-shrink:0; }
  .p2-legend { display:flex; gap:12px; align-items:center; margin-top:16px; flex-wrap:wrap; }
  .leg-i { display:flex; align-items:center; gap:4px; font-size:9px; color:#555e72; }
  .leg-sq { width:12px; height:12px; border-radius:2px; flex-shrink:0; }
  @media print {
    body { background:#fff; }
    .page,.page2 { margin:0; box-shadow:none; border-radius:0; page-break-after:always; }
    .page2 { page-break-after:auto; }
  }
</style>
</head>
<body>

<!-- PÁGINA 1 -->
<div class="page">
  <div class="hdr">
    <div class="hdr-left">
      <div class="hdr-sep"></div>
      <div class="hdr-title">Dashboard · Observaciones Ambientales ${hoy.getFullYear()}</div>
    </div>
    <div class="hdr-right">Corte: ${fmtFecha(hoy)}<br>Bitácora OA · Semana S${semanaNum}</div>
  </div>

  <div class="kpi-strip">
    <div class="kpi blue">
      <div class="kpi-label">Total OAs</div>
      <div class="kpi-value">${total}</div>
      <div class="kpi-sub">registradas ${hoy.getFullYear()}</div>
    </div>
    <div class="kpi green">
      <div class="kpi-label">Cerradas</div>
      <div class="kpi-value">${cerradas}</div>
      <div class="kpi-sub">${pctCerradas}% del total</div>
    </div>
    <div class="kpi red">
      <div class="kpi-label">Abiertas</div>
      <div class="kpi-value">${abiertas}</div>
      <div class="kpi-sub">${100 - pctCerradas}% del total</div>
    </div>
    <div class="kpi orange">
      <div class="kpi-label">Prom. Días</div>
      <div class="kpi-value">${promDias}</div>
      <div class="kpi-sub">días promedio cierre</div>
    </div>
  </div>

  <div class="body">
    <div class="row r-16">
      <!-- Categorías -->
      <div class="card">
        <div class="card-title">Categorías de Observación</div>
        <div class="bars">
          ${categorias.map(c => barraHTML(abrevTipo(c.tipo), c.pct)).join('')}
        </div>
      </div>
      <!-- Dona -->
      <div class="card">
        <div class="card-title">Estatus General</div>
        <div class="donut-wrap">
          <div class="donut-rel">
            <svg class="donut-svg" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="42" fill="none" stroke="#eef0f4" stroke-width="13"/>
              <circle cx="55" cy="55" r="42" fill="none" stroke="#1e7e34" stroke-width="13"
                stroke-dasharray="${2*Math.PI*42*pctCerradas/100} ${2*Math.PI*42}"
                stroke-dashoffset="${2*Math.PI*42*0.25}"
                stroke-linecap="round" transform="rotate(-90 55 55)"/>
              ${abiertas > 0 ? `<circle cx="55" cy="55" r="42" fill="none" stroke="#c0392b" stroke-width="13"
                stroke-dasharray="${2*Math.PI*42*(100-pctCerradas)/100} ${2*Math.PI*42}"
                stroke-dashoffset="${2*Math.PI*42*(1 - pctCerradas/100 + 0.25)}"
                stroke-linecap="round" transform="rotate(-90 55 55)"/>` : ''}
            </svg>
            <div class="donut-ctr">
              <div class="donut-pct">${pctCerradas}%</div>
              <div class="donut-lbl">cerradas</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row r-13">
      <!-- Barras verticales por mes -->
      <div class="card">
        <div class="card-title">OAs por Mes</div>
        <div class="vbars-wrap">
          <div class="vbars">
            ${meses.map(m => vBarHTML(m)).join('')}
          </div>
          <div class="vlegend">
            <div><span class="vl-dot" style="background:#1e7e34"></span><span class="vl-txt">Cerradas</span></div>
            <div><span class="vl-dot" style="background:#c0392b"></span><span class="vl-txt">Abiertas</span></div>
          </div>
        </div>
      </div>
      <!-- Niveles de riesgo -->
      <div class="card">
        <div class="card-title">Nivel de Riesgo</div>
        <div class="niv-grid">
          <div class="niv nb">
            <div class="niv-lbl">Bajo</div>
            <div class="niv-num">${niveles.Bajo||0}</div>
            <div class="niv-pct">${total ? Math.round((niveles.Bajo||0)/total*100) : 0}%</div>
          </div>
          <div class="niv nm">
            <div class="niv-lbl">Medio</div>
            <div class="niv-num">${niveles.Medio||0}</div>
            <div class="niv-pct">${total ? Math.round((niveles.Medio||0)/total*100) : 0}%</div>
          </div>
          <div class="niv na">
            <div class="niv-lbl">Alto</div>
            <div class="niv-num">${niveles.Alto||0}</div>
            <div class="niv-pct">${total ? Math.round((niveles.Alto||0)/total*100) : 0}%</div>
          </div>
          <div class="niv ni">
            <div class="niv-lbl">Inmediato</div>
            <div class="niv-num">${niveles.Inmediato||0}</div>
            <div class="niv-pct">${total ? Math.round((niveles.Inmediato||0)/total*100) : 0}%</div>
          </div>
        </div>
      </div>
    </div>

    ${proyectos.length || areas.length ? `
    <div class="row r-half">
      ${proyectos.length ? `
      <div class="card">
        <div class="card-title">Proyectos / Buques</div>
        <div class="bars">
          ${proyectos.map(p => barraHTML(p.nombre, p.pct)).join('')}
        </div>
      </div>` : ''}
      ${areas.length ? `
      <div class="card">
        <div class="card-title">Áreas</div>
        <div class="bars">
          ${areas.map(a => barraHTML(a.nombre, a.pct)).join('')}
        </div>
      </div>` : ''}
    </div>` : ''}
  </div>

  <div class="foot">Sistema de Gestión Ambiental &nbsp;·&nbsp; Semana S${semanaNum} &nbsp;·&nbsp; Generado el ${fmtFecha(hoy)}</div>
</div>

<!-- PÁGINA 2 -->
<div class="page2">
  <div class="hdr">
    <div class="hdr-left">
      <div class="hdr-sep"></div>
      <div class="hdr-title">Dashboard · Observaciones Ambientales ${hoy.getFullYear()}</div>
    </div>
    <div class="hdr-right">Corte: ${fmtFecha(hoy)}<br>Bitácora OA · Semana S${semanaNum}</div>
  </div>

  <div class="p2-body">
    <div class="p2-sec">OAs Abiertas — Seguimiento por Supervisor</div>
    <div class="p2-intro">Resumen de observaciones pendientes de cierre agrupadas por supervisor responsable.</div>
    ${oasAbiertas.length === 0
      ? `<div style="text-align:center;padding:40px;color:#1e7e34;font-weight:700;font-size:14px">✅ No hay OAs abiertas esta semana</div>`
      : `<div class="sup-grid">${supCardsHTML}</div>`
    }
    <div class="p2-legend">
      <div class="leg-i"><div class="leg-sq" style="background:#fdf0f6;border:1px solid #8e1552;"></div><span style="color:#8e1552;font-weight:600;">Inmediato</span></div>
      <div class="leg-i"><div class="leg-sq" style="background:#fdf0f0;border:1px solid #c0392b;"></div><span style="color:#c0392b;font-weight:600;">Alto</span></div>
      <div class="leg-i"><div class="leg-sq" style="background:#fff8f0;border:1px solid #d35400;"></div><span style="color:#d35400;font-weight:600;">Medio</span></div>
      <div class="leg-i"><div class="leg-sq" style="background:#edfaf1;border:1px solid #1e7e34;"></div><span style="color:#1e7e34;font-weight:600;">Bajo</span></div>
      <div class="leg-i" style="margin-left:auto;">
        <div class="leg-sq" style="background:#fff8f8;border-left:3px solid #c0392b;border-radius:0 2px 2px 0;"></div>
        <span>Fecha de cierre vencida</span>
      </div>
    </div>
  </div>

  <div class="foot">Sistema de Gestión Ambiental &nbsp;·&nbsp; Semana S${semanaNum} &nbsp;·&nbsp; Generado el ${fmtFecha(hoy)}</div>
</div>

<script>window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    showToast('<i class="bi bi-exclamation-triangle-fill"></i> Permite ventanas emergentes para generar el reporte');
    return;
  }
  win.document.write(html);
  win.document.close();
}

// =================== GOOGLE SHEETS SYNC ===================
const GS_URL = 'https://script.google.com/macros/s/AKfycbwDcUe0r5JrLOqxruRItESlDeBf5YqETUaH-J7wsCqGBwAIJ8-SYVw905-Lxa0JXJctMQ/exec';

function sincronizarSheets() {
  try {
    const datos = registros.map(r => ({
      folio:            r.folio,
      supervisor:       r.supervisor || '—',
      area:             r.area,
      tipo:             r.tipo,
      nivel:            r.nivel || '',
      fecha:            r.fecha,
      hora:             r.hora,
      estatus:          r.estatus,
      fechaAperturaISO: r.fechaAperturaISO || '',
      fechaCierreISO:   r.fechaCierreISO   || '',
      diasLimite:       r.diasLimite ?? '',
      notas:            r.notas || '',
      proyecto:         r.proyecto || '',
      departamento:     r.departamento || ''
    }));

    const payload = JSON.stringify({ action: 'sync', registros: datos });

    const iframeId = 'gs_iframe_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeId;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GS_URL;
    form.target = iframeId;
    form.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = payload;
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      if (form.parentNode) form.parentNode.removeChild(form);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 5000);

  } catch(e) {
    console.warn('Error sincronizando Sheets:', e);
  }
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
cargarDesdeNube().then(cargado => {
  if (cargado) { renderRegistros(); updateStats(); }
  sincronizarSheets();
});
