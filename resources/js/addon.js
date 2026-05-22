(function () {
    'use strict';

    Statamic.booting(() => {
        const { h, ref, computed } = window.Vue;
        const { PublishFieldsProvider, PublishFields } = window.__STATAMIC__?.ui || {};

        const TAB_ACTIVE   = 'border-0 border-b-2 border-blue-500 dark:border-blue-400 px-3.5 py-2 text-xs font-medium text-blue-600 dark:text-blue-300 bg-transparent cursor-pointer transition-colors';
        const TAB_INACTIVE = 'border-0 border-b-2 border-transparent px-3.5 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-transparent cursor-pointer transition-colors hover:text-gray-700 dark:hover:text-gray-200';

        const makePrefix = (base, handle) => base ? `${base}.${handle}` : handle;

        Statamic.$components.register('tab-fieldtype', {
            props: { config: { type: Object, default: () => ({}) } },
            setup(props) {
                return () => h('div', {
                    class: 'flex items-center gap-2 px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600',
                }, [
                    h('span', { class: 'text-gray-400 text-xs' }, '⇥'),
                    h('span', { class: 'text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide' },
                        props.config.display || props.config.handle
                    ),
                ]);
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
