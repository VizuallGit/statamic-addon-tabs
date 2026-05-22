<?php

namespace Vizuall\Tabs\Fieldtypes;

use Statamic\Fields\Fields;
use Statamic\Fields\Fieldtype;
use Statamic\Fields\Values;
use Statamic\Support\Arr;

class Tabby extends Fieldtype
{
    protected static $handle = 'tabby';

    public function component(): string
    {
        return 'tabby';
    }

    protected function configFieldItems(): array
    {
        return [
            [
                'display' => 'Fields',
                'fields' => [
                    'fields' => [
                        'display' => 'Fields',
                        'type' => 'fields',
                        'full_width_setting' => true,
                    ],
                ],
            ],
        ];
    }

    public function fields(): Fields
    {
        $fields = collect($this->config('fields', []))
            ->filter(fn($f) => !(is_array($f['field'] ?? null) && ($f['field']['type'] ?? null) === 'tab'))
            ->all();

        return new Fields($fields, $this->field()->parent(), $this->field());
    }

    public function process($data): array
    {
        $values = $this->fields()->addValues($data ?? [])->process()->values()->all();
        return Arr::removeNullValues($values);
    }

    public function preProcess($data): array
    {
        return $this->fields()->addValues($data ?? [])->preProcess()->values()->all();
    }

    public function augment($value)
    {
        return new Values($this->fields()->addValues($value ?? [])->augment()->values()->all());
    }

    public function shallowAugment($value)
    {
        return new Values($this->fields()->addValues($value ?? [])->shallowAugment()->values()->all());
    }

    public function preload(): array
    {
        return $this->fields()
            ->addValues($this->field->value() ?? $this->defaultFieldData())
            ->meta()
            ->toArray();
    }

    protected function defaultFieldData(): array
    {
        return $this->fields()->all()->map(function ($field) {
            return $field->fieldtype()->preProcess($field->defaultValue());
        })->all();
    }

    public function rules(): array
    {
        return ['array'];
    }

    public function extraRules(): array
    {
        $rules = $this
            ->fields()
            ->addValues((array) $this->field->value())
            ->validator()
            ->withContext(['prefix' => $this->field->validationContext('prefix')])
            ->rules();

        return collect($rules)->mapWithKeys(function ($rules, $handle) {
            return [$this->field->handle().'.'.$handle => $rules];
        })->all();
    }

    public function extraValidationAttributes(): array
    {
        return collect($this->fields()->validator()->attributes())->mapWithKeys(function ($attribute, $handle) {
            return [$this->field->handle().'.'.$handle => $attribute];
        })->all();
    }

    public function preProcessValidatable($value): array
    {
        return array_merge(
            $value ?? [],
            $this->fields()
                ->addValues($value ?? [])
                ->preProcessValidatables()
                ->values()
                ->all(),
        );
    }
}
