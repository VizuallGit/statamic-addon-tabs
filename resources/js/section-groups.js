(function () {
    'use strict';

    /**
     * Segmented tab control and accordion cards for every `.publish-fields` list.
     *
     * Lives here — not in Visual Editor — so Admin, Statamic Live Preview, and
     * any other publish form get the same tabs and icons without the editor.
     *
     * A `tab` marker starts a segment; `style: accordion` starts a panel inside
     * it. A `tabby` with no marker ahead of it is a segment on its own. Read from
     * the rendered form: a field hidden by a condition is simply not there.
     */

    const FIELD_LIST = '.publish-fields';
    const TOGGLE_ATTR = 'data-sve-section-toggle';
    const TRACK_ATTR = 'data-sve-section-track';
    const GROUP_ATTR = 'data-sve-section-group';
    const SEG_ATTR = 'data-sve-section-seg';
    const ACTIVE_ATTR = 'data-sve-section-active';
    const CONTENT_KEY = '__content';
    const PANEL_ATTR = 'data-sve-section-panel';
    const PANEL_CARD_ATTR = 'data-sve-panel-card';
    const PANEL_HEAD_ATTR = 'data-sve-panel-head';
    const PANEL_BODY_ATTR = 'data-sve-panel-body';
    const PANEL_OPEN_ATTR = 'data-sve-panel-open';
    const PANEL_OWNER_ATTR = 'data-sve-panel-owner';
    const FILL_ATTR = 'data-sve-fill';
    const ICON_ATTR = 'data-sve-icon';
    const OFF_CLASS = 'sve-off';
    const STYLE_ID = 'tabs-section-groups-style';

    function fieldListOf(el) {
        return el?.closest?.(FIELD_LIST) || null;
    }

    function sectionFieldRows(list) {
        return [...list.children].filter((row) => !row.hasAttribute(TOGGLE_ATTR));
    }

    function rowFieldtype(row, name) {
        const el = row.classList?.contains(name) ? row : row.querySelector(`.${name}`);

        return el && fieldListOf(el) === row.parentElement ? el : null;
    }

    function ownDescendants(list, selector) {
        return [...list.querySelectorAll(selector)].filter((el) => fieldListOf(el) === list);
    }

    function ownDescendant(list, selector) {
        return ownDescendants(list, selector)[0] || null;
    }

    function inPreviewPanel(win, el) {
        return !!(
            el.closest('.live-preview-editor') ||
            new URLSearchParams(win.location.search).has('sve-panel')
        );
    }

    function applyToggleWidth(row, fill) {
        row.toggleAttribute(FILL_ATTR, fill);
    }

    function tabMarkerConfig(el) {
        const chip = el.matches?.('[data-tab-marker]') ? el : el.querySelector('[data-tab-marker]');
        const fallback = () => {
            const spans = [...el.querySelectorAll('span')];

            return ((spans.length ? spans[spans.length - 1] : el).textContent || '')
                .replace(/^[^\p{L}\p{N}]+/u, '')
                .trim();
        };

        return {
            label: chip?.getAttribute('data-tab-label') || fallback(),
            handle: chip?.getAttribute('data-tab-handle') || '',
            accordion: chip?.getAttribute('data-tab-style') === 'accordion',
            icon: chip?.getAttribute('data-tab-icon') || null,
            defaultOpen: chip?.hasAttribute('data-tab-default') || false,
            ready: !!chip,
        };
    }

    function fieldLabel(row) {
        return (row.querySelector('label')?.textContent || '').trim();
    }

    function contentLabel(win) {
        const fromEditor = win.Statamic?.$config?.get?.('sveStrings')?.section_content;

        if (fromEditor) {
            return fromEditor;
        }

        const locale = String(
            win.Statamic?.$config?.get?.('locale') ||
            win.document?.documentElement?.lang ||
            ''
        );

        return locale.toLowerCase().startsWith('da') ? 'Indhold' : 'Content';
    }

    function sectionGroups(win, list) {
        const rows = sectionFieldRows(list);

        if (!rows.length) {
            return null;
        }

        const groups = [];
        const loose = [];
        const markers = [];
        let open = null;
        let panel = null;
        let seq = 0;
        let pending = false;

        const panelKey = (label) => `p-${label.replace(/\s+/g, '-').toLowerCase()}`;

        const openPanel = (key, label, icon, rows_ = [], card = null) => {
            panel = { key, label, icon, rows: rows_, card };
            (open ? open.panels : loose.panels).push(panel);
        };

        loose.panels = [];

        rows.forEach((row) => {
            if (row.hasAttribute(PANEL_CARD_ATTR)) {
                const body = row.querySelector(`[${PANEL_BODY_ATTR}]`);

                openPanel(
                    row.getAttribute(PANEL_ATTR),
                    row.getAttribute('data-sve-panel-label') || '',
                    row.getAttribute('data-sve-panel-icon') || null,
                    body ? [...body.children] : [],
                    row
                );

                return;
            }

            const marker = rowFieldtype(row, 'tab-fieldtype');

            if (marker) {
                const cfg = tabMarkerConfig(marker);

                if (!cfg.ready) {
                    pending = true;

                    return;
                }

                markers.push(row);

                if (cfg.accordion) {
                    const key = panelKey(cfg.label);
                    const existing = ownDescendant(list, `[${PANEL_CARD_ATTR}][${PANEL_ATTR}="${key}"]`);

                    if (existing) {
                        panel = {
                            key,
                            label: cfg.label,
                            icon: cfg.icon,
                            rows: [],
                            card: existing,
                            marker: row,
                        };
                        (open ? open.panels : loose.panels).push(panel);

                        return;
                    }

                    openPanel(key, cfg.label, cfg.icon, [], null);
                    panel.marker = row;

                    return;
                }

                panel = null;
                open = {
                    key: cfg.handle || `tab-${seq++}`,
                    label: cfg.label,
                    icon: cfg.icon,
                    defaultOpen: cfg.defaultOpen,
                    rows: [],
                    panels: [],
                };
                groups.push(open);

                return;
            }

            if (!panel && rowFieldtype(row, 'group-fieldtype')) {
                const label = fieldLabel(row);

                if (label) {
                    const key = panelKey(label);

                    if (!ownDescendant(list, `[${PANEL_CARD_ATTR}][${PANEL_ATTR}="${key}"]`)) {
                        openPanel(key, label, null, [row]);
                    }

                    row.setAttribute(PANEL_OWNER_ATTR, '');
                    panel = null;

                    return;
                }
            }

            if (panel) {
                panel.rows.push(row);

                return;
            }

            if (open) {
                open.rows.push(row);

                return;
            }

            if (rowFieldtype(row, 'tabby-fieldtype')) {
                groups.push({ key: `tabby-${seq++}`, label: fieldLabel(row), rows: [row], panels: [] });

                return;
            }

            loose.push(row);
        });

        if (pending) {
            return null;
        }

        const named = groups.filter((group) => group.rows.length || group.panels.length);

        if (loose.length || loose.panels.length) {
            named.unshift({
                key: CONTENT_KEY,
                label: contentLabel(win),
                rows: [...loose],
                panels: loose.panels,
            });
        }

        const worthDrawing = named.length > 1 || named.some((group) => group.panels.length);

        return worthDrawing ? { groups: named, markers } : null;
    }

    const PANEL_ICONS = {
        color: {
            box: '2.15 2.15 19.7 19.7',
            paths: '<path d="M12 3v18a6 6 0 0 0 0-12 6 6 0 0 1 0-6Z"/><circle cx="12" cy="12" r="9"/>',
        },
        spacing: {
            box: '2.15 2.15 19.7 19.7',
            paths: '<path d="M3 6h18M7 12h10M3 18h18"/>',
        },
        background: {
            box: '2.15 2.15 19.7 19.7',
            paths: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/>',
        },
        text: {
            box: '3.15 3.15 17.7 17.7',
            paths: '<path d="M4 6h16M4 12h10M4 18h13"/>',
        },
        code: {
            box: '3.15 3.15 17.7 17.7',
            paths: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>',
        },
        layout: {
            box: '2.15 2.15 19.7 19.7',
            paths: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
        },
        image: {
            box: '2.15 2.15 19.7 19.7',
            paths: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
        },
        block: {
            box: '2.15 5.15 19.7 13.7',
            paths: '<rect x="3" y="6" width="18" height="12" rx="2"/>',
        },
        settings: {
            box: '1.45 1.45 21.1 21.1',
            paths: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 11.5 4a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9 2 2 0 1 1 0 4Z"/>',
        },
    };

    const iconifyCache = new Map();

    function adoptSvg(el, markup) {
        el.innerHTML = markup;

        const svg = el.querySelector('svg');

        if (!svg) {
            return;
        }

        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.querySelectorAll('[stroke]:not([stroke="none"])').forEach((node) => {
            node.setAttribute('stroke', 'currentColor');
        });
    }

    function panelIcon(doc, name) {
        if (!name) {
            return null;
        }

        const holder = doc.createElement('span');

        holder.setAttribute(ICON_ATTR, '');

        if (/^\s*<svg[\s>]/i.test(name)) {
            adoptSvg(holder, name);

            return holder;
        }

        if (/^[a-z0-9-]+:[a-z0-9-]+$/i.test(name)) {
            const cached = iconifyCache.get(name);

            if (typeof cached === 'string') {
                adoptSvg(holder, cached);

                return holder;
            }

            const [prefix, icon] = name.split(':');
            const pending = cached ?? fetch(`https://api.iconify.design/${prefix}/${icon}.svg`)
                .then((res) => (res.ok ? res.text() : ''))
                .then((markup) => {
                    iconifyCache.set(name, markup);

                    return markup;
                })
                .catch(() => '');

            iconifyCache.set(name, pending);
            pending.then((markup) => markup && adoptSvg(holder, markup));

            return holder;
        }

        const builtIn = PANEL_ICONS[name] ?? PANEL_ICONS[name.replace(/[-_ :].*$/, '')];

        if (builtIn) {
            const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');

            svg.setAttribute('viewBox', builtIn.box);
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '1.7');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');
            svg.innerHTML = builtIn.paths;
            holder.appendChild(svg);

            return holder;
        }

        holder.textContent = [...name].length <= 2 ? name : '';

        return holder;
    }

    function emitChunk(list) {
        list.dispatchEvent(new CustomEvent('sve-tab-chunk', {
            bubbles: true,
            detail: {
                list,
                group: list.getAttribute(ACTIVE_ATTR) || '',
                panel: list.getAttribute(PANEL_OPEN_ATTR) || '',
            },
        }));
    }

    function paintSectionToggle(list, active) {
        ownDescendants(list, `[${SEG_ATTR}]`).forEach((btn) => {
            btn.setAttribute('aria-pressed', btn.getAttribute(SEG_ATTR) === active ? 'true' : 'false');
        });

        const openPanel = list.getAttribute(PANEL_OPEN_ATTR);

        ownDescendants(list, `[${GROUP_ATTR}]`).forEach((row) => {
            if (row.hasAttribute(PANEL_CARD_ATTR)) {
                return;
            }

            row.classList.toggle(OFF_CLASS, row.getAttribute(GROUP_ATTR) !== active);
        });

        ownDescendants(list, `[${PANEL_CARD_ATTR}]`).forEach((card) => {
            card.classList.toggle(OFF_CLASS, card.getAttribute(GROUP_ATTR) !== active);
            card
                .querySelector(`[${PANEL_HEAD_ATTR}]`)
                ?.setAttribute('aria-expanded', card.getAttribute(PANEL_ATTR) === openPanel ? 'true' : 'false');
        });
    }

    function setSectionGroup(list, key) {
        list.setAttribute(ACTIVE_ATTR, key);
        paintSectionToggle(list, key);
        emitChunk(list);
    }

    function setSectionPanel(list, key) {
        const next = list.getAttribute(PANEL_OPEN_ATTR) === key ? '' : key;

        list.setAttribute(PANEL_OPEN_ATTR, next);
        paintSectionToggle(list, list.getAttribute(ACTIVE_ATTR) || '');
        emitChunk(list);
    }

    function revealSegmentsFor(el, doc) {
        let node = el;

        while (node && node !== doc.body) {
            const row = node.closest(`[${GROUP_ATTR}], [${PANEL_ATTR}]`);
            const list = row && fieldListOf(row);

            if (!row || !list) {
                return;
            }

            const group = row.closest(`[${GROUP_ATTR}]`)?.getAttribute(GROUP_ATTR);
            const panel = row.getAttribute(PANEL_ATTR);

            if (group) {
                setSectionGroup(list, group);
            }

            if (panel && list.getAttribute(PANEL_OPEN_ATTR) !== panel) {
                setSectionPanel(list, panel);
            }

            node = list.parentElement;
        }
    }

    function buildPanelCard(win, list, panel, groupKey, gridGap) {
        const doc = win.document;
        const card = doc.createElement('div');

        card.setAttribute(PANEL_CARD_ATTR, '');
        card.setAttribute(PANEL_ATTR, panel.key);
        card.setAttribute(GROUP_ATTR, groupKey);
        card.setAttribute('data-sve-panel-label', panel.label);

        if (panel.icon) {
            card.setAttribute('data-sve-panel-icon', panel.icon);
        }

        card.style.setProperty('--sve-grid-gap', gridGap);

        const head = doc.createElement('button');

        head.type = 'button';
        head.setAttribute(PANEL_HEAD_ATTR, '');

        const icon = panelIcon(doc, panel.icon);

        if (icon) {
            head.appendChild(icon);
        }

        const label = doc.createElement('span');

        label.setAttribute('data-sve-panel-title', '');
        label.textContent = panel.label;
        head.appendChild(label);

        const tile = doc.createElement('span');

        tile.setAttribute('data-sve-panel-tile', '');

        const chevron = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');

        chevron.setAttribute('data-sve-chevron', '');
        chevron.setAttribute('viewBox', '0 0 24 24');
        chevron.setAttribute('fill', 'none');
        chevron.setAttribute('stroke', 'currentColor');
        chevron.setAttribute('stroke-width', '2.2');
        chevron.setAttribute('stroke-linecap', 'round');
        chevron.setAttribute('stroke-linejoin', 'round');
        chevron.innerHTML = '<path d="m6 9 6 6 6-6"/>';
        tile.appendChild(chevron);
        head.appendChild(tile);

        head.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            setSectionPanel(list, panel.key);
        });

        const body = doc.createElement('div');

        body.setAttribute(PANEL_BODY_ATTR, '');

        card.appendChild(head);
        card.appendChild(body);

        return card;
    }

    function enhanceSectionGroups(win, list) {
        const divided = sectionGroups(win, list);

        if (!divided) {
            return;
        }

        const { groups, markers } = divided;

        const active = list.getAttribute(ACTIVE_ATTR);
        const preferred = groups.find((group) => group.defaultOpen)?.key;
        const current = groups.some((group) => group.key === active)
            ? active
            : preferred || groups[0].key;

        groups.forEach((group) => {
            group.rows.forEach((row) => row.setAttribute(GROUP_ATTR, group.key));

            group.panels.forEach((panel) => {
                const anchor = panel.rows[0] || panel.marker;

                if (!anchor) {
                    return;
                }

                let card = panel.card
                    || ownDescendant(list, `[${PANEL_CARD_ATTR}][${PANEL_ATTR}="${panel.key}"]`);

                if (!card) {
                    const holder = anchor.parentElement;
                    const gap = win.getComputedStyle?.(holder)?.rowGap || '32px';

                    card = buildPanelCard(win, list, panel, group.key, gap);

                    if (panel.rows[0]) {
                        holder.insertBefore(card, panel.rows[0]);
                    } else {
                        anchor.after(card);
                    }
                }

                const body = card.querySelector(`[${PANEL_BODY_ATTR}]`);

                panel.rows.forEach((row) => {
                    row.setAttribute(PANEL_ATTR, panel.key);
                    row.removeAttribute(GROUP_ATTR);

                    if (row.parentElement !== body) {
                        body.appendChild(row);
                    }

                    if (row.hasAttribute(PANEL_OWNER_ATTR)) {
                        row.querySelector('label')?.classList.add(OFF_CLASS);
                    }
                });
            });
        });

        markers.forEach((row) => row.classList.add(OFF_CLASS));

        if (!list.hasAttribute(PANEL_OPEN_ATTR)) {
            const first = groups.find((group) => group.panels.length)?.panels[0];

            list.setAttribute(PANEL_OPEN_ATTR, first ? first.key : '');
        }

        if (groups.length < 2) {
            setSectionGroup(list, current);

            return;
        }

        let row = ownDescendant(list, `[${TOGGLE_ATTR}]`);

        if (!row) {
            const doc = win.document;

            row = doc.createElement('div');
            row.setAttribute(TOGGLE_ATTR, '');

            const track = doc.createElement('div');

            track.setAttribute(TRACK_ATTR, '');

            groups.forEach((group) => {
                const btn = doc.createElement('button');

                btn.type = 'button';
                btn.setAttribute(SEG_ATTR, group.key);

                const segIcon = panelIcon(doc, group.icon);

                if (segIcon) {
                    btn.appendChild(segIcon);
                }

                const segLabel = doc.createElement('span');

                segLabel.textContent = group.label;
                btn.appendChild(segLabel);

                btn.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSectionGroup(list, group.key);
                });
                track.appendChild(btn);
            });

            row.appendChild(track);
            list.insertBefore(row, list.firstChild);
        }

        applyToggleWidth(row, inPreviewPanel(win, list));

        setSectionGroup(list, current);
    }

    function enhanceSectionGroupsIn(win, root = win.document) {
        root.querySelectorAll(FIELD_LIST).forEach((list) => {
            try {
                enhanceSectionGroups(win, list);
            } catch {
                // One malformed list must not stop the rest of the form from working.
            }
        });
    }

    function settleUngroupedFieldLists(win, root = win.document) {
        const chips = root.querySelectorAll('[data-tab-marker]');

        if (!chips.length) {
            return;
        }

        const lists = new Set();

        chips.forEach((chip) => {
            const list = fieldListOf(chip);

            if (list) {
                lists.add(list);
            }
        });

        lists.forEach((list) => {
            try {
                enhanceSectionGroups(win, list);
            } catch {
                // One malformed list must not stop the rest of the form from settling.
            }
        });
    }

    function ensureStyles(doc) {
        if (doc.getElementById(STYLE_ID)) {
            return;
        }

        const style = doc.createElement('style');

        style.id = STYLE_ID;
        style.textContent = `
            [${TOGGLE_ATTR}] {
                grid-column: 1 / -1;
                display: flex;
            }
            [${TRACK_ATTR}] {
                display: flex;
                flex: 0 1 auto;
                flex-wrap: nowrap;
                max-width: 100%;
                overflow-x: auto;
                overscroll-behavior-x: contain;
                scrollbar-width: none;
                gap: 0;
                padding: 5px;
                border-radius: 0.5rem;
                background: rgba(128, 128, 128, .16);
            }
            [${TRACK_ATTR}]::-webkit-scrollbar {
                display: none;
            }
            [${FILL_ATTR}] [${TRACK_ATTR}],
            [${FILL_ATTR}] [${SEG_ATTR}] {
                flex: 1 1 auto;
            }
            [${SEG_ATTR}] {
                all: unset;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.65em;
                flex: 0 0 auto;
                box-sizing: border-box;
                min-width: 0;
                height: 28px;
                padding: 0 12px;
                border: 1px solid transparent;
                border-radius: 0.375rem;
                font-size: 12px;
                font-weight: 500;
                line-height: 1;
                opacity: .75;
            }
            [${SEG_ATTR}][aria-pressed="true"] {
                background: color-mix(in oklab, var(--theme-color-primary, #4f46e5) 90%, transparent);
                color: #fff;
                border-color: transparent;
                box-shadow: none;
                opacity: 1;
            }
            [${PANEL_CARD_ATTR}] {
                grid-column: 1 / -1;
                overflow: hidden;
                border: 1px solid rgba(128, 128, 128, .16);
                border-radius: 0.75rem;
                background: rgba(128, 128, 128, .08);
            }
            [${PANEL_HEAD_ATTR}] {
                all: unset;
                cursor: pointer;
                border-bottom: 1px solid transparent;
                display: flex !important;
                align-items: center;
                gap: 0.85em;
                box-sizing: border-box;
                width: 100%;
                margin: 0;
                padding: 1.05em;
                font-size: 0.8125rem;
                font-weight: 600;
                line-height: 1;
                text-align: left;
            }
            [${PANEL_HEAD_ATTR}][aria-expanded="true"] {
                border-bottom-color: rgba(128, 128, 128, .20);
            }
            [data-sve-panel-title] {
                flex: 1 1 auto;
            }
            [data-sve-panel-tile] {
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 2.15em;
                height: 2.15em;
                border-radius: 0.6em;
                background: rgba(128, 128, 128, .16);
            }
            [data-sve-chevron] {
                display: block;
                width: 1em;
                height: 1em;
                transition: transform .18s;
            }
            [${PANEL_HEAD_ATTR}][aria-expanded="true"] [data-sve-chevron] {
                transform: rotate(180deg);
            }
            [${PANEL_BODY_ATTR}] {
                display: none;
                grid-template-columns: repeat(12, 1fr);
                gap: var(--sve-grid-gap, 2rem);
                padding: 1.125rem 0.875rem;
            }
            [${PANEL_HEAD_ATTR}][aria-expanded="true"] + [${PANEL_BODY_ATTR}] {
                display: grid;
            }
            [${ICON_ATTR}] {
                flex: 0 0 auto;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 1.1em;
                height: 1.1em;
                font-size: 1em;
                line-height: 1;
                opacity: .85;
            }
            [${ICON_ATTR}] svg {
                display: block;
                width: 100%;
                height: 100%;
            }
            .${OFF_CLASS} {
                display: none !important;
            }
        `;
        doc.head.appendChild(style);
    }

    function watch(win) {
        const doc = win.document;

        ensureStyles(doc);

        let scheduled = false;
        let quietUntil = 0;
        let settleTimer = null;

        const runPass = () => {
            scheduled = false;
            quietUntil = Date.now() + 800;

            try {
                enhanceSectionGroupsIn(win);
            } catch (err) {
                console.error('[tabs] section groups', err);
            }

            quietUntil = Date.now() + 800;
        };

        const schedulePass = () => {
            if (Date.now() < quietUntil) {
                return;
            }

            if (scheduled) {
                return;
            }

            scheduled = true;
            win.requestAnimationFrame(runPass);
        };

        const scheduleSettle = () => {
            if (settleTimer) {
                win.clearTimeout(settleTimer);
            }

            settleTimer = win.setTimeout(() => {
                settleTimer = null;
                schedulePass();
            }, Math.max(400, quietUntil - Date.now() + 16));
        };

        const onMutation = () => {
            try {
                settleUngroupedFieldLists(win);
            } catch {
                // Never let this stop the passes below from running.
            }

            schedulePass();
            scheduleSettle();
        };

        onMutation();
        new win.MutationObserver(onMutation).observe(doc.body, { childList: true, subtree: true });
    }

    window.VizuallTabs = Object.assign(window.VizuallTabs || {}, {
        revealFor: revealSegmentsFor,
        setGroup: setSectionGroup,
        enhanceIn: enhanceSectionGroupsIn,
        settle: settleUngroupedFieldLists,
        panelIcon,
        attrs: {
            toggle: TOGGLE_ATTR,
            group: GROUP_ATTR,
            seg: SEG_ATTR,
            active: ACTIVE_ATTR,
            panel: PANEL_ATTR,
        },
    });

    const boot = () => {
        try {
            watch(window);
        } catch (err) {
            console.error('[tabs] section groups boot', err);
        }
    };

    if (window.Statamic?.booting) {
        window.Statamic.booting(boot);
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
