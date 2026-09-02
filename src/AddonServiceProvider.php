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
        $files = [
            'addon.js',
            'section-groups.js',
        ];

        foreach ($files as $file) {
            $script = __DIR__.'/../resources/js/'.$file;
            $public = public_path('vendor/tabs/js/'.$file);

            if (! is_file($script)) {
                continue;
            }

            $this->publishes([
                $script => $public,
            ], 'tabs');

            if (! is_file($public) || md5_file($script) !== md5_file($public)) {
                @mkdir(dirname($public), 0755, true);
                copy($script, $public);
            }

            Statamic::script('tabs', $file.'?v='.md5_file($script));
        }
    }
}
