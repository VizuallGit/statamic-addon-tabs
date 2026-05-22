<?php

namespace Vizuall\Tabs\Fieldtypes;

use Statamic\Fields\Fieldtype;

class Tab extends Fieldtype
{
    protected static $handle = 'tab';

    public function component(): string
    {
        return 'tab';
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
