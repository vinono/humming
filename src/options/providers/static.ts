import { z } from 'zod';
import type { OptionSourceRegistry } from '../registry';
import type { OptionItem } from '../types';

const PrimitiveSchema = z.union([z.string(), z.number(), z.boolean()]);

const StaticOptionRuleSchema = z.object({
  type: z.literal('static'),
  items: z.array(z.record(z.string(), z.unknown())),
});

function asOptionPrimitive(value: unknown): string | number | boolean {
  return PrimitiveSchema.parse(value);
}

function getByPath(value: unknown, path: string | undefined): unknown {
  if (!path) {
    return value;
  }

  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return (current as Record<string, unknown>)[segment];
  }, value);
}

export function mapArrayToOptions(items: unknown[], valueField?: string, labelField?: string): OptionItem[] {
  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      const primitive = asOptionPrimitive(item);
      return {
        value: primitive,
        label: primitive,
      };
    }

    const record = item as Record<string, unknown>;
    const value = asOptionPrimitive(valueField ? getByPath(record, valueField) : record.value);
    const label = asOptionPrimitive(labelField ? getByPath(record, labelField) : record.label);

    return {
      ...record,
      value,
      label,
    };
  });
}

export function registerStaticOptionSource(registry: OptionSourceRegistry) {
  registry.register('static', async ({ rule }) => {
    const parsedRule = StaticOptionRuleSchema.parse(rule);
    return mapArrayToOptions(parsedRule.items);
  });
}
