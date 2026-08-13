<?php

namespace Vizuall\Tabs;

use Statamic\Providers\AddonServiceProvider as BaseAddonServiceProvider;
use Statamic\Statamic;

class AddonServiceProvider extends BaseAddonServiceProvider
{
    protected $fieldtypes = [
        Fieldtypes\Tab::class,
        Fieldtypes\Tabby::class,
    ];

    // Registreres manuelt i bootAddon med indholds-hash (ellers cacher browseren gammel JS).
    protected $scripts = [];

    public function bootAddon(): void
    {
        $script = __DIR__.'/../resources/js/addon.js';

        $this->publishes([
            $script => public_path('vendor/tabs/js/addon.js'),
        ], 'tabs');

        if (is_file($script)) {
            Statamic::script('tabs', 'addon.js?v='.md5_file($script));
        }
    }
}
