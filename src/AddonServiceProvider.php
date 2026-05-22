<?php

namespace Vizuall\Tabs;

use Statamic\Providers\AddonServiceProvider as BaseAddonServiceProvider;

class AddonServiceProvider extends BaseAddonServiceProvider
{
    protected $fieldtypes = [
        Fieldtypes\Tab::class,
        Fieldtypes\Tabby::class,
    ];

    protected $scripts = [
        __DIR__.'/../resources/js/addon.js',
    ];
}
