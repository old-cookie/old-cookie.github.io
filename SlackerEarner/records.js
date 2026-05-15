const STORAGE_KEY = 'slacker-earner-v1';

let i18n = {};

async function loadI18n(locale) {
    try {
        const res = await fetch(`i18n/${locale}.json`);
        i18n = await res.json();
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[key]) el.textContent = i18n[key];
        });
    } catch (e) {
        console.warn('records i18n load fail', e);
    }
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { records: [] };
    try {
        const parsed = JSON.parse(raw);
        const state = parsed && Array.isArray(parsed.records) ? parsed : { records: [] };
        migrateBreakTypes(state);
        return state;
    } catch (e) {
        return { records: [] };
    }
}

function migrateBreakTypes(state) {
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
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatHours(h) {
    const hours = Math.floor(h);
    const minutes = (h - hours) * 60;
    return `${hours}h${minutes.toFixed(1)}m`;
}

function formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
}

function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString();
}

function isSameDate(iso1, iso2) {
    if (!iso1 || !iso2) return false;
    const d1 = new Date(iso1);
    const d2 = new Date(iso2);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return false;
    return d1.toLocaleDateString() === d2.toLocaleDateString();
}

function formatTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString();
}

function renderRecords() {
    const state = loadState();
    const records = (state.records || [])
        .map((record, originalIndex) => ({ record, originalIndex }))
        .sort((a, b) => String(b.record.start).localeCompare(String(a.record.start)));
    const total = records.length;
    const totalHours = records.reduce((sum, item) => sum + (Number(item.record.duration_hours) || 0), 0);

    const totalEl = document.getElementById('records-total');
    const hoursEl = document.getElementById('records-hours');
    const listEl = document.getElementById('records');

    if (totalEl) totalEl.textContent = String(total);
    if (hoursEl) hoursEl.textContent = formatHours(totalHours);

    if (listEl) {
        listEl.innerHTML = '';
        records.forEach(({ record, originalIndex }) => {
            const tr = document.createElement('tr');
            const sameDateStartEnd = isSameDate(record.start, record.end);
            const typeLabel = i18n[record.break_type] || record.break_type;
            const cells = [
                typeLabel,
                formatDate(record.start),
                sameDateStartEnd ? formatTime(record.start) : formatDateTime(record.start),
                sameDateStartEnd ? formatTime(record.end) : formatDateTime(record.end),
                formatHours(record.duration_hours || 0)
            ];
            cells.forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });

            const actionTd = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.textContent = i18n.delete || 'Delete';
            deleteBtn.setAttribute('data-variant', 'danger');
            deleteBtn.addEventListener('click', () => {
                const confirmed = window.confirm(`${i18n.delete || 'Delete'}?`);
                if (!confirmed) return;
                const currentState = loadState();
                if (!Array.isArray(currentState.records)) return;
                currentState.records.splice(originalIndex, 1);
                saveState(currentState);
                renderRecords();
            });
            actionTd.appendChild(deleteBtn);
            tr.appendChild(actionTd);
            listEl.appendChild(tr);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-home');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'SlackerEarner.html';
        });
    }

    const openSettingsBtn = document.getElementById('open-settings');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    const state = loadState();
    loadI18n(state.locale || 'en_US').finally(() => renderRecords());
});