const STORAGE_KEY = 'slacker-earner-v1';
console.log('SlackerEarner.js loaded (v2)');

let state = {
    settings: {
        mode: 'part-time', // 'part-time' | 'full-time'
        hourlyRate: 0,
        monthlySalary: 0,
        workHoursPerDay: 8,
        workDaysPerMonth: 22
    },
    slackerTypes: ['go_toilet', 'coffee_break', 'smoke_break'],
    records: [],
    activeRecord: null,
    i18n: {},
    locale: 'en_US'
};

let _activeUpdateTimer = null;

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            Object.assign(state, parsed);
            // Migrate old break_type format to i18n keys
            migrateBreakTypes();
        } catch (e) { console.warn('failed load', e); }
    }
}

function migrateBreakTypes() {
    // Convert old display names to i18n keys
    const mapping = {
        'Go toilet': 'go_toilet',
        'Coffee break': 'coffee_break',
        'Smoke break': 'smoke_break'
    };

    if (state.records && Array.isArray(state.records)) {
        state.records.forEach(r => {
            if (r.break_type && mapping[r.break_type]) {
                r.break_type = mapping[r.break_type];
            }
        });
    }

    if (state.activeRecord && state.activeRecord.break_type && mapping[state.activeRecord.break_type]) {
        state.activeRecord.break_type = mapping[state.activeRecord.break_type];
    }
}

function formatHours(h) {
    const hours = Math.floor(h);
    const minutes = (h - hours) * 60;
    return `${hours}h${minutes.toFixed(1)}m`;
}
function formatMoney(m) { return Number(m).toFixed(2); }

/* i18n */
async function loadI18n(locale) {
    try {
        const res = await fetch(`i18n/${locale}.json`);
        const data = await res.json();
        state.i18n = data;
        state.locale = locale;
        applyTranslations();
        if (typeof renderSlackerList === 'function') renderSlackerList();
        save();
    } catch (e) { console.warn('i18n load fail', e); }
}

function t(key) { return state.i18n[key] || key; }

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const k = el.getAttribute('data-i18n');
        el.textContent = t(k);
    });
}

/* UI rendering */
function renderSettings() {
    // Sync radios from state, but prefer actual checked radio if present (handles browser/preview overrides)
    document.querySelectorAll('input[name="mode"]').forEach(r => r.checked = (r.value === state.settings.mode));
    const checked = document.querySelector('input[name="mode"]:checked');
    const mode = checked ? checked.value : state.settings.mode;
    // keep state in sync
    state.settings.mode = mode;
    document.getElementById('hourly-rate').value = state.settings.hourlyRate || '';
    document.getElementById('monthly-salary').value = state.settings.monthlySalary || '';
    document.getElementById('work-hours').value = state.settings.workHoursPerDay;
    document.getElementById('work-days').value = state.settings.workDaysPerMonth;
    const daySalaryEl = document.getElementById('day-salary');
    if (daySalaryEl) daySalaryEl.textContent = formatMoney(calculateDailySalary());
    // show/hide fields based on resolved mode
    document.getElementById('field-hourly').style.display = mode === 'part-time' ? '' : 'none';
    document.getElementById('field-monthly').style.display = mode === 'full-time' ? '' : 'none';
    const workDaysEl = document.getElementById('field-work-days');
    if (workDaysEl) workDaysEl.style.display = mode === 'full-time' ? '' : 'none';
}

function renderSlackerList() {
    const container = document.getElementById('slacker-list');
    container.innerHTML = '';
    const active = state.activeRecord && !state.activeRecord.end ? state.activeRecord : null;
    state.slackerTypes.forEach((s, idx) => {
        const btn = document.createElement('button');
        btn.className = 'slacker-btn';
        btn.dataset.idx = idx;
        btn.setAttribute('data-variant', 'secondary');
        const label = t(s);

        // if there's an active break, disable other buttons
        if (active) {
            if (active.index === idx) {
                btn.disabled = false; // keep active one clickable to end
            } else {
                btn.disabled = true;
            }
        }

        // set initial text
        if (active && active.index === idx) {
            // active button shows primary variant and elapsed time
            btn.setAttribute('data-variant', 'primary');
            btn.textContent = `${label} • ${formatElapsed(active.start)}`;
        } else {
            btn.textContent = label;
        }

        btn.addEventListener('click', () => toggleSlacker(idx));
        container.appendChild(btn);
    });

    // if active, start interval to update its button text
    if (_activeUpdateTimer) { clearInterval(_activeUpdateTimer); _activeUpdateTimer = null; }
    if (active) {
        _activeUpdateTimer = setInterval(() => {
            const b = container.querySelector(`button[data-idx=\"${active.index}\"]`);
            if (b) b.textContent = `${t(state.slackerTypes[active.index])} • ${formatElapsed(active.start)}`;
        }, 1000);
    }
}

function formatTimeShort(iso) {
    try {
        const d = new Date(iso);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    } catch (e) { return iso; }
}

function formatElapsed(startIso) {
    try {
        const start = new Date(startIso);
        const diff = Date.now() - start.getTime();
        return formatDurationFromMs(diff);
    } catch (e) { return '00:00:00' }
}

function formatDurationFromMs(ms) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function renderToday() {
    const today = new Date();
    const yyyy = today.toISOString().slice(0, 10);
    const todays = state.records.filter(r => r.date === yyyy);
    const totalHours = todays.reduce((s, r) => s + (r.duration_hours || 0), 0);
    const totalEl = document.getElementById('total-break');
    if (totalEl) totalEl.textContent = formatHours(totalHours);
    const lost = calculateLostMoney(totalHours);
    const lostEl = document.getElementById('lost-money');
    if (lostEl) lostEl.textContent = formatMoney(lost);

    const recs = document.getElementById('records');
    if (recs) {
        recs.innerHTML = '';
        todays.forEach(r => {
            const div = document.createElement('div');
            div.className = 'record';
            const typeLabel = t(r.break_type || r.break_type);
            div.textContent = `${typeLabel} | ${r.start} → ${r.end || '-'} | ${formatHours(r.duration_hours || 0)}`;
            recs.appendChild(div);
        });
    }
}

/* calculations */
function calculateDailySalary() {
    const s = state.settings;
    if (s.mode === 'part-time') {
        return (s.hourlyRate || 0) * (s.workHoursPerDay || 0);
    } else {
        return (s.monthlySalary || 0) / (s.workDaysPerMonth || 1);
    }
}

function getEffectiveHourlyRate() {
    const s = state.settings;
    if (s.mode === 'part-time') return s.hourlyRate || 0;
    const r = (s.monthlySalary || 0) / ((s.workDaysPerMonth || 1) * (s.workHoursPerDay || 1));
    return r;
}

function calculateLostMoney(totalHours) {
    const rate = getEffectiveHourlyRate();
    return rate * totalHours;
}

/* slacker toggle */
function toggleSlacker(idx) {
    const type = state.slackerTypes[idx];
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    if (state.activeRecord && state.activeRecord.break_type === type && !state.activeRecord.end) {
        // close
        state.activeRecord.end = now.toISOString();
        const diffMs = new Date(state.activeRecord.end) - new Date(state.activeRecord.start);
        state.activeRecord.duration_hours = diffMs / 3600000;
        state.records.push({ ...state.activeRecord });
        state.activeRecord = null;
        if (_activeUpdateTimer) { clearInterval(_activeUpdateTimer); _activeUpdateTimer = null; }
    } else {
        // start new
        state.activeRecord = { date, start: now.toISOString(), end: null, break_type: type, duration_hours: 0, index: idx };
    }
    save();
    renderToday();
    renderSlackerList();
}

/* CSV export/import */
function exportCSV() {
    const header = ['date', 'start', 'end', 'break_type', 'duration_hours', 'notes'];
    const rows = [header.join(',')];
    state.records.forEach(r => {
        const row = [r.date, r.start, r.end || '', r.break_type, r.duration_hours || 0, (r.notes || '')];
        rows.push(row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `slacker-records-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function importCSVFile(file, merge = true) {
    // legacy: read directly and import
    const reader = new FileReader();
    reader.onload = e => importCSVFromText(e.target.result, merge);
    reader.readAsText(file, 'utf-8');
}

function importCSVFromText(text, merge = true) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;
    const header = lines.shift().split(',').map(h => h.trim().replace(/^\"|\"$/g, ''));
    const rows = lines.map(l => parseCSVLine(l));
    const parsed = rows.map(cols => {
        const obj = {};
        header.forEach((h, i) => obj[h] = cols[i] || '');
        obj.duration_hours = Number(obj.duration_hours) || 0;
        return obj;
    });
    if (!merge) state.records = parsed; else state.records = state.records.concat(parsed);
    save(); renderToday();
}

function parseCSVLine(line) {
    const regex = /(?:\s*\"([^\"]*(?:\"\"[^\"]*)*)\"\s*|([^,]+))/g;
    const out = [];
    let m;
    while ((m = regex.exec(line)) !== null) {
        const v = m[1] !== undefined ? m[1].replace(/""/g, '"') : (m[2] || '');
        out.push(v);
        if (regex.lastIndex >= line.length) break;
    }
    return out;
}

/* import/export JSON */
function exportJSON() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'slacker-state.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function importJSONFile(file, merge = true) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (merge) {
                state.records = (state.records || []).concat(parsed.records || []);
                state.slackerTypes = Array.from(new Set([...(state.slackerTypes || []), ...(parsed.slackerTypes || [])]));
                Object.assign(state.settings, parsed.settings || {});
            } else {
                Object.assign(state, parsed);
            }
            save(); renderAll();
        } catch (err) { alert('Invalid JSON'); }
    };
    reader.readAsText(file);
}

function importJSONFromText(text, merge = true) {
    try {
        const parsed = JSON.parse(text);
        if (merge) {
            state.records = (state.records || []).concat(parsed.records || []);
            state.slackerTypes = Array.from(new Set([...(state.slackerTypes || []), ...(parsed.slackerTypes || [])]));
            Object.assign(state.settings, parsed.settings || {});
        } else {
            Object.assign(state, parsed);
        }
        save(); renderAll();
    } catch (err) { throw new Error('Invalid JSON'); }
}

/* wiring */
function bind() {
    const openRecordsBtn = document.getElementById('open-records');
    if (openRecordsBtn) {
        openRecordsBtn.addEventListener('click', () => {
            window.location.href = 'records.html';
        });
    }

    const openSettingsBtn = document.getElementById('open-settings');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    const addSlackerBtn = document.getElementById('add-slacker');
    const newSlackerInput = document.getElementById('new-slacker');
    if (addSlackerBtn && newSlackerInput) {
        addSlackerBtn.addEventListener('click', () => {
            const v = newSlackerInput.value.trim();
            if (!v) return;
            state.slackerTypes.push(v);
            newSlackerInput.value = '';
            save();
            renderSlackerList();
        });
    }

    document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', e => {
        state.settings.mode = e.target.value; renderSettings(); save(); renderToday();
    }));

    // ensure work-days visibility is synced when user clicks labels that may not trigger render immediately
    document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('click', e => {
        const workDaysEl = document.getElementById('field-work-days');
        if (workDaysEl) workDaysEl.style.display = (e.target.value === 'full-time') ? '' : 'none';
    }));

    ['hourly-rate', 'monthly-salary', 'work-hours', 'work-days'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => {
            const v = Number(input.value) || 0;
            if (id === 'hourly-rate') state.settings.hourlyRate = v;
            if (id === 'monthly-salary') state.settings.monthlySalary = v;
            if (id === 'work-hours') state.settings.workHoursPerDay = v;
            if (id === 'work-days') state.settings.workDaysPerMonth = v;
            save(); renderSettings(); renderToday();
        });
    });
}

/* Import flow with validation and modal */
function handleImportFile(file, kind) {
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        let validation;
        try {
            if (kind === 'csv') validation = validateCSVText(text);
            else validation = validateJSONText(text);
        } catch (err) { validation = { ok: false, errors: [err.message] }; }
        if (!validation.ok) {
            showImportModal({ ok: false, errors: validation.errors });
            return;
        }
        // store pending
        window._pendingImport = { kind, text };
        showImportModal({ ok: true, errors: [] });
    };
    reader.readAsText(file, 'utf-8');
}

function validateCSVText(text) {
    const required = ['date', 'start', 'end', 'break_type', 'duration_hours'];
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return { ok: false, errors: ['Empty file'] };
    const header = lines.shift().split(',').map(h => h.trim().replace(/^\"|\"$/g, ''));
    const missing = required.filter(r => !header.includes(r));
    if (missing.length) return { ok: false, errors: [`Missing columns: ${missing.join(', ')}`] };
    // check first few rows for date parse and numeric duration
    const sample = lines.slice(0, 5);
    const errors = [];
    sample.forEach((l, idx) => {
        const cols = parseCSVLine(l);
        const obj = {};
        header.forEach((h, i) => obj[h] = cols[i] || '');
        if (obj.start && isNaN(Date.parse(obj.start))) errors.push(`Row ${idx + 2}: invalid start date`);
        if (obj.end && obj.end.trim() && isNaN(Date.parse(obj.end))) errors.push(`Row ${idx + 2}: invalid end date`);
        if (obj.duration_hours && isNaN(Number(obj.duration_hours))) errors.push(`Row ${idx + 2}: invalid duration_hours`);
    });
    return { ok: errors.length === 0, errors };
}

function validateJSONText(text) {
    try {
        const parsed = JSON.parse(text);
        if (!parsed.records || !Array.isArray(parsed.records)) return { ok: false, errors: ['JSON must include records array'] };
        const sample = parsed.records.slice(0, 5);
        const errors = [];
        sample.forEach((r, idx) => {
            if (r.start && isNaN(Date.parse(r.start))) errors.push(`Record ${idx + 1}: invalid start`);
            if (r.end && r.end.trim() && isNaN(Date.parse(r.end))) errors.push(`Record ${idx + 1}: invalid end`);
            if (r.duration_hours && isNaN(Number(r.duration_hours))) errors.push(`Record ${idx + 1}: invalid duration_hours`);
        });
        return { ok: errors.length === 0, errors };
    } catch (e) { return { ok: false, errors: ['Invalid JSON'] }; }
}

function showImportModal({ ok, errors }) {
    const modal = document.getElementById('import-modal');
    const errorsEl = modal.querySelector('#import-errors');
    errorsEl.textContent = errors && errors.length ? errors.join('; ') : '';
    // Use native dialog when available
    if (typeof modal.showModal === 'function') {
        modal.showModal();
    } else {
        modal.style.display = 'flex';
    }
    document.getElementById('import-confirm').onclick = () => {
        const mode = document.querySelector('input[name="import-mode"]:checked').value;
        const merge = mode === 'merge';
        const pending = window._pendingImport;
        try {
            if (pending.kind === 'csv') importCSVFromText(pending.text, merge);
            else importJSONFromText(pending.text, merge);
        } catch (err) { alert(err.message || 'Import failed'); }
        window._pendingImport = null;
        if (typeof modal.close === 'function') modal.close(); else modal.style.display = 'none';
    };
    document.getElementById('import-cancel').onclick = () => { window._pendingImport = null; if (typeof modal.close === 'function') modal.close(); else modal.style.display = 'none'; };
}

function renderAll() { renderSettings(); renderSlackerList(); renderToday(); }

/* init */
load();
document.addEventListener('DOMContentLoaded', async () => {
    bind();
    renderAll();
    // load default i18n
    const loc = state.locale || 'en_US';
    await loadI18n(loc);
    // no service worker: app uses localStorage only
});

