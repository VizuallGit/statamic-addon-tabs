(function () {
    'use strict';

    // ── Fieldset / Blueprint builder: mark Tab & Accordion rows ───────────────
    //
    // Edit Fieldset lists every field as the same grey card. Tab markers used to
    // stand out (accent tint + "Tab"/"Accordion" chip). Restore that so authors
    // can see the structure without opening each field's settings.
    const FS_STYLE_ID = 'tabs-fieldset-marker-style';
    const FS_BADGE_ATTR = 'data-tabs-badge';

    function ensureFieldsetMarkerStyles() {
        if (document.getElementById(FS_STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = FS_STYLE_ID;
        style.textContent = `
            .blueprint-section-field[data-tabs-marker] {
                --tabs-marker: var(--tabs-cp-accent, #4f46e5);
                border-left: 3px solid var(--tabs-marker) !important;
                background:
                    color-mix(in srgb, var(--tabs-marker) calc(22% * var(--tabs-marker-strength, 1)), transparent)
                    !important;
                box-shadow: none;
            }
            .blueprint-section-field[data-tabs-marker][data-tabs-depth="1"] {
                --tabs-marker-strength: 0.65;
            }
            .blueprint-section-field[data-tabs-marker][data-tabs-depth="2"] {
                --tabs-marker-strength: 0.4;
            }
            .blueprint-section-field [${FS_BADGE_ATTR}] {
                display: inline-flex;
                align-items: center;
                margin-inline-start: .4rem;
                padding: .1rem .45rem;
                border-radius: .25rem;
                font-size: 10px;
                font-weight: 650;
                letter-spacing: .03em;
                line-height: 1.4;
                text-transform: none;
                color: #fff;
                background: var(--tabs-marker, #4f46e5);
                border: 1px solid color-mix(in srgb, var(--tabs-marker, #4f46e5) 70%, #000);
                vertical-align: middle;
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(style);
    }

    /** Same purple as the CP Save button when we can read it. */
    function cpAccentColor() {
        const btn = [...document.querySelectorAll('button')].find((el) =>
            /^(save|gem|save & publish|gem & publicér|gem og publicér)$/i.test(
                (el.textContent || '').replace(/\s+/g, ' ').trim()
            )
        );

        if (btn) {
            const bg = getComputedStyle(btn).backgroundColor;

            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                return bg;
            }
        }

        const css =
            getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() ||
            getComputedStyle(document.documentElement).getPropertyValue('--theme-color-primary').trim();

        return css || '#4f46e5';
    }

    function vueFieldFromRow(el) {
        let c = el.__vueParentComponent;

        while (c) {
            const field = c.props?.field;

            if (field && (field.fieldtype || field.config)) {
                return field;
            }

            c = c.parent;
        }

        return null;
    }

    function tabStyleOf(field) {
        const style = field?.config?.style;

        return style === 'accordion' ? 'accordion' : 'tab';
    }

    /** Tab fieldtype, including an import whose type lives on config. */
    function isTabField(field) {
        return (field?.fieldtype || field?.config?.type) === 'tab';
    }

    /**
     * Cards that belong to this list, not to a nested one inside it.
     *
     * A replicator set (and a Bard/Grid set) renders its own
     * `.blueprint-section-draggable-zone`. The fieldset page keeps the
     * outer zone in the DOM; the set's fields sit in a later zone — often
     * inside a stack. querySelector() only saw the first zone, so those
     * rows never got a badge. Each zone is its own list: accordion depth
     * starts over, and a parent list must not paint a child's cards.
     */
    function cardsInZone(zone) {
        return [...zone.querySelectorAll('.blueprint-section-field')].filter(
            (card) => card.closest('.blueprint-section-draggable-zone') === zone
        );
    }

    function paintZone(zone, accent) {
        const cards = cardsInZone(zone);
        let accordionDepth = 0;

        cards.forEach((card) => {
            const field = vueFieldFromRow(card);

            if (!isTabField(field)) {
                if (card.hasAttribute('data-tabs-marker')) {
                    card.removeAttribute('data-tabs-marker');
                    card.removeAttribute('data-tabs-style');
                    card.removeAttribute('data-tabs-depth');
                    card.querySelector(`[${FS_BADGE_ATTR}]`)?.remove();
                }

                return;
            }

            const kind = tabStyleOf(field);
            let depth = 0;

            if (kind === 'tab') {
                accordionDepth = 0;
                depth = 0;
            } else {
                accordionDepth = Math.min(accordionDepth + 1, 2);
                depth = accordionDepth;
            }

            const depthStr = String(depth);

            if (
                card.getAttribute('data-tabs-marker') !== null &&
                card.getAttribute('data-tabs-style') === kind &&
                card.getAttribute('data-tabs-depth') === depthStr
            ) {
                const existing = card.querySelector(`[${FS_BADGE_ATTR}]`);
                const want = kind === 'accordion' ? 'Accordion' : 'Tab';

                if (existing && existing.textContent === want) {
                    return;
                }
            }

            card.setAttribute('data-tabs-marker', '');
            card.setAttribute('data-tabs-style', kind);
            card.setAttribute('data-tabs-depth', depthStr);
            card.style.setProperty('--tabs-marker', accent);

            const nameBtn = card.querySelector('button.cursor-pointer');
            const labelHost = nameBtn?.parentElement;
            let badge = card.querySelector(`[${FS_BADGE_ATTR}]`);

            if (!badge && labelHost && nameBtn) {
                badge = document.createElement('span');
                badge.setAttribute(FS_BADGE_ATTR, '');
                nameBtn.after(badge);
            }

            if (badge) {
                const want = kind === 'accordion' ? 'Accordion' : 'Tab';

                if (badge.textContent !== want) {
                    badge.textContent = want;
                }
            }
        });
    }

    function paintFieldsetTabRows() {
        const zones = document.querySelectorAll('.blueprint-section-draggable-zone');

        if (!zones.length) {
            return;
        }

        ensureFieldsetMarkerStyles();

        const accent = cpAccentColor();
        document.documentElement.style.setProperty('--tabs-cp-accent', accent);

        zones.forEach((zone) => paintZone(zone, accent));
    }

    function watchFieldsetBuilder() {
        let scheduled = false;
        let timer = null;

        const run = () => {
            scheduled = false;
            timer = null;

            if (!/\/(fieldsets|blueprints)\//.test(window.location.pathname)) {
                return;
            }

            try {
                paintFieldsetTabRows();
            } catch (err) {
                console.error('[tabs] fieldset markers', err);
            }
        };

        // Debounce — rAF på hver DOM-mutation frøs CP (derfor var dette slået fra).
        const schedule = () => {
            clearTimeout(timer);
            scheduled = true;
            timer = setTimeout(run, 120);
        };

        Statamic.booting(() => {
            schedule();

            new MutationObserver(() => {
                if (/\/(fieldsets|blueprints)\//.test(window.location.pathname)) {
                    schedule();
                }
            }).observe(document.body, {
                childList: true,
                subtree: true,
            });
        });
    }

    watchFieldsetBuilder();

    Statamic.booting(() => {
        const { h, ref, computed, watch } = window.Vue;
        const { PublishFieldsProvider, PublishFields } = window.__STATAMIC__?.ui || {};

        const TAB_ACTIVE   = 'border-0 border-b-2 border-blue-500 dark:border-blue-400 px-3.5 py-2 text-xs font-medium text-blue-600 dark:text-blue-300 bg-transparent cursor-pointer transition-colors';
        const TAB_INACTIVE = 'border-0 border-b-2 border-transparent px-3.5 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-transparent cursor-pointer transition-colors hover:text-gray-700 dark:hover:text-gray-200';

        const makePrefix = (base, handle) => base ? `${base}.${handle}` : handle;

        // Iconify SVGs already fetched, so a second marker on the same name costs
        // nothing. The value is the markup, or the promise while it is on its way.
        const iconCache = new Map();

        /** Strip a fetched SVG down to something that inherits the chip's colour. */
        const adoptSvg = (el, markup) => {
            el.innerHTML = markup;

            const svg = el.querySelector('svg');

            if (!svg) return;

            // The holder decides the size; the icon fills it.
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.querySelectorAll('[stroke]:not([stroke="none"])').forEach((node) => {
                node.setAttribute('stroke', 'currentColor');
            });
        };

        // What counts as an icon, in the order it is recognised: SVG markup pasted
        // straight in, an Iconify name like `mdi:palette`, and anything else short
        // enough to be an emoji. Statamic's own Icon component is deliberately not
        // used — it only resolves the sets registered in the CP and warns to the
        // console on everything else, Iconify names included.
        //
        // Same vocabulary as the Visual Editor's panel headers, so a marker looks
        // the same wherever it is drawn.
        const MarkerIcon = {
            props: { name: { type: String, default: '' } },
            setup(props) {
                const holder = ref(null);
                const emoji = ref('');

                const draw = (markup) => {
                    if (holder.value) adoptSvg(holder.value, markup);
                };

                const load = () => {
                    const name = (props.name || '').trim();

                    emoji.value = '';
                    if (holder.value) holder.value.innerHTML = '';

                    if (!name) return;

                    if (/^<svg[\s>]/i.test(name)) {
                        draw(name);

                        return;
                    }

                    if (!/^[a-z0-9-]+:[a-z0-9-]+$/i.test(name)) {
                        emoji.value = name;

                        return;
                    }

                    const cached = iconCache.get(name);

                    if (typeof cached === 'string') {
                        draw(cached);

                        return;
                    }

                    const [prefix, icon] = name.split(':');
                    const pending = cached ?? fetch(`https://api.iconify.design/${prefix}/${icon}.svg`)
                        .then((res) => (res.ok ? res.text() : ''))
                        .then((markup) => {
                            iconCache.set(name, markup);

                            return markup;
                        })
                        .catch(() => '');

                    iconCache.set(name, pending);

                    // The name can change while the icon is in flight — a slow
                    // network must not paint an icon the marker no longer names.
                    pending.then((markup) => {
                        if (markup && (props.name || '').trim() === name) draw(markup);
                    });
                };

                watch(() => props.name, load, { flush: 'post' });
                watch(holder, load, { flush: 'post', immediate: true });

                return () => emoji.value
                    ? h('span', { class: 'text-gray-400', style: 'font-size:0.875rem;line-height:1' }, emoji.value)
                    : h('span', {
                        ref: holder,
                        class: 'text-gray-400',
                        style: 'display:inline-flex;width:0.875rem;height:0.875rem;line-height:1',
                    });
            },
        };

        // The marker's chip. Its style and icon ride out on data attributes as
        // well as being drawn: the form is the only place that config reaches,
        // and the Visual Editor reads the rendered panel, not the blueprint.
        Statamic.$components.register('tab-fieldtype', {
            props: { config: { type: Object, default: () => ({}) } },
            setup(props) {
                const label = () => props.config.display || props.config.handle;
                const style = () => props.config.style === 'accordion' ? 'accordion' : 'tab';

                return () => {
                    const attrs = {
                        'class': 'flex items-center gap-2 px-3 py-1.5 rounded border bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600',
                        'data-tab-marker': '',
                        'data-tab-style': style(),
                        'data-tab-label': label(),
                        ...(props.config.tab_icon ? { 'data-tab-icon': props.config.tab_icon } : {}),
                        ...(props.config.default_open ? { 'data-tab-default': '' } : {}),
                    };

                    return h('div', attrs, [
                        h('span', {
                            class: 'text-gray-400 text-xs',
                        }, style() === 'accordion' ? '⌄' : '⇥'),
                        props.config.tab_icon
                            ? h(MarkerIcon, { name: props.config.tab_icon })
                            : null,
                        h('span', {
                            class: 'text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide',
                        }, label()),
                    ]);
                };
            },
        });

        Statamic.$components.register('tabby-fieldtype', {
            props: {
                value:           { default: () => ({}) },
                meta:            { type: Object,  default: () => ({}) },
                config:          { type: Object,  default: () => ({}) },
                handle:          { type: String },
                fieldPathPrefix: { type: String,  default: null },
                metaPathPrefix:  { type: String,  default: null },
                readOnly:        { type: Boolean, default: false },
            },
            setup(props) {
                const tabs = computed(() => {
                    const result = [];
                    let current = null;
                    for (const field of (props.config.fields || [])) {
                        if (field.type === 'tab') {
                            current = { display: field.display || field.handle, fields: [] };
                            result.push(current);
                        } else if (current) {
                            current.fields.push(field);
                        }
                    }
                    return result;
                });

                const activeIdx = ref(0);

                const activeFields = computed(() => {
                    if (!tabs.value.length) return (props.config.fields || []).filter(f => f.type !== 'tab');
                    return tabs.value[activeIdx.value]?.fields || [];
                });

                const pathPrefix = computed(() => makePrefix(props.fieldPathPrefix, props.handle));
                const metaPrefix = computed(() => makePrefix(props.metaPathPrefix,  props.handle));

                return () => {
                    const tabBar = tabs.value.length > 1
                        ? h('div', {
                            class: 'flex border-b border-gray-200 dark:border-gray-700',
                        }, tabs.value.map((tab, i) =>
                            h('button', {
                                type: 'button',
                                class: activeIdx.value === i ? TAB_ACTIVE : TAB_INACTIVE,
                                onClick: () => { activeIdx.value = i; },
                            }, tab.display)
                        ))
                        : null;

                    const inner = PublishFieldsProvider && PublishFields
                        ? h(PublishFieldsProvider, {
                            fields:          activeFields.value,
                            asConfig:        false,
                            readOnly:        props.readOnly,
                            fieldPathPrefix: pathPrefix.value,
                            metaPathPrefix:  metaPrefix.value,
                        }, () => h(PublishFields, { class: 'pt-4' }))
                        : null;

                    return h('div', {
                        class: 'border border-gray-200 dark:border-gray-900 rounded-lg overflow-hidden bg-white dark:bg-gray-800',
                    }, [
                        tabBar,
                        h('div', { class: 'px-4 pb-4' }, inner),
                    ]);
                };
            },
        });
    });
}());
