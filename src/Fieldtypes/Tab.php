<?php

namespace Vizuall\Tabs\Fieldtypes;

use Statamic\Fields\Fieldtype;

/**
 * A divider, not a field. It stores nothing and augments to nothing; its whole
 * job is to say where one group of fields ends and the next begins.
 *
 * Inside a `tabby` it splits that field's own tabs. On its own, among a set's
 * fields, it divides them for whoever renders the form — the Visual Editor turns
 * those divisions into the section panel's controls. Holding no value is what
 * makes it cheap: marking up an existing fieldset moves no data and leaves every
 * handle and path where the author put it.
 */
class Tab extends Fieldtype
{
    protected static $handle = 'tab';

    public function component(): string
    {
        return 'tab';
    }

    protected function configFieldItems(): array
    {
        return [
            [
                'display' => 'Tab',
                'fields' => [
                    'style' => [
                        'display' => 'Style',
                        'instructions' => 'How the group this starts is shown. **Tab** puts it in the row across the top. **Accordion** makes it a panel inside the tab it sits in, one open at a time — which reads better once a tab holds more than a handful of fields.',
                        'type' => 'select',
                        'options' => [
                            'tab' => 'Tab',
                            'accordion' => 'Accordion',
                        ],
                        'default' => 'tab',
                        'width' => 50,
                    ],
                    // Not `icon`: Statamic reserves that key for the fieldtype's
                    // own icon in the blueprint builder and strips it from every
                    // inline field's config on save — silently, so the value
                    // simply never reaches the YAML. See FieldTransformer.
                    'tab_icon' => [
                        'display' => 'Icon',
                        'instructions' => 'Optional. Shown beside the label. An Iconify name such as `mdi:palette`, an emoji, or a pasted SVG.',
                        'type' => 'text',
                        'width' => 50,
                    ],
                ],
            ],
        ];
    }

    public function preProcess($value)
    {
        return null;
    }

    public function process($value)
    {
        return null;
    }

    public function augment($value)
    {
        return null;
    }
}
