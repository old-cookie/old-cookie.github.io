const STORAGE_KEY = 'slacker-earner-v1';

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { locale: 'en_US', records: [], settings: {} };
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : { locale: 'en_US', records: [], settings: {} };
    } catch (e) {
        return { locale: 'en_US', records: [], settings: {} };
    }
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function t(key) {
    return window.__settingsI18n?.[key] || key;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
}

async function loadI18n(locale) {
    const res = await fetch(`i18n/${locale}.json`);
    window.__settingsI18n = await res.json();
    applyTranslations();
}

function exportJSON() {
    const state = loadState();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slacker-state.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function exportCSV() {
    const state = loadState();
    const records = Array.isArray(state.records) ? state.records : [];
    const header = ['date', 'start', 'end', 'break_type', 'duration_hours', 'notes'];
    const rows = [header.join(',')];
    records.forEach(r => {
        const row = [r.date, r.start, r.end || '', r.break_type, r.duration_hours || 0, r.notes || ''];
        rows.push(row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slacker-records-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

function validateCSVText(text) {
    const required = ['date', 'start', 'end', 'break_type', 'duration_hours'];
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return { ok: false, errors: ['Empty file'] };
    const header = lines.shift().split(',').map(h => h.trim().replace(/^\"|\"$/g, ''));
    const missing = required.filter(r => !header.includes(r));
    if (missing.length) return { ok: false, errors: [`Missing columns: ${missing.join(', ')}`] };
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

function importCSVFromText(text, merge = true) {
    const state = loadState();
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
    state.records = merge ? (state.records || []).concat(parsed) : parsed;
    saveState(state);
}

function importJSONFromText(text, merge = true) {
    const parsed = JSON.parse(text);
    const state = loadState();
    if (merge) {
        state.records = (state.records || []).concat(parsed.records || []);
        state.slackerTypes = Array.from(new Set([...(state.slackerTypes || []), ...(parsed.slackerTypes || [])]));
        state.settings = Object.assign({}, state.settings || {}, parsed.settings || {});
        state.locale = parsed.locale || state.locale || 'en_US';
    } else {
        Object.assign(state, parsed);
    }
    saveState(state);
}

function showImportModal(errors, kind, text) {
    const modal = document.getElementById('import-modal');
    const errorsEl = modal.querySelector('#import-errors');
    errorsEl.textContent = errors && errors.length ? errors.join('; ') : '';
    if (typeof modal.showModal === 'function') modal.showModal(); else modal.style.display = 'flex';

    document.getElementById('import-confirm').onclick = () => {
        const mode = document.querySelector('input[name="import-mode"]:checked').value;
        const merge = mode === 'merge';
        if (kind === 'csv') importCSVFromText(text, merge); else importJSONFromText(text, merge);
        if (typeof modal.close === 'function') modal.close(); else modal.style.display = 'none';
    };
    document.getElementById('import-cancel').onclick = () => {
        if (typeof modal.close === 'function') modal.close(); else modal.style.display = 'none';
    };
}

function handleImportFile(file, kind) {
    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        let validation;
        try {
            validation = kind === 'csv' ? validateCSVText(text) : validateJSONText(text);
        } catch (err) { validation = { ok: false, errors: [err.message] }; }
        if (!validation.ok) {
            showImportModal(validation.errors, kind, text);
            return;
        }
        showImportModal([], kind, text);
    };
    reader.readAsText(file, 'utf-8');
}

document.addEventListener('DOMContentLoaded', async () => {
    const state = loadState();
    const localeSelect = document.getElementById('lang-select');
    if (localeSelect && state.locale) localeSelect.value = state.locale;
    await loadI18n((state.locale || 'en_US'));

    const backBtn = document.getElementById('back-home');
    if (backBtn) backBtn.addEventListener('click', () => window.location.href = 'SlackerEarner.html');
    const recordsBtn = document.getElementById('open-records');
    if (recordsBtn) recordsBtn.addEventListener('click', () => window.location.href = 'records.html');

    if (localeSelect) {
        localeSelect.addEventListener('change', e => {
            const current = loadState();
            current.locale = e.target.value;
            saveState(current);
            loadI18n(e.target.value);
        });
    }

    document.getElementById('export-json')?.addEventListener('click', exportJSON);
    document.getElementById('export-csv')?.addEventListener('click', exportCSV);
    document.getElementById('import-json')?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = e => { const f = e.target.files[0]; if (f) handleImportFile(f, 'json'); };
        input.click();
    });
    const importCsv = document.getElementById('import-csv');
    if (importCsv) {
        importCsv.addEventListener('change', e => {
            const f = e.target.files[0];
            if (f) handleImportFile(f, 'csv');
            e.target.value = '';
        });
    }
});