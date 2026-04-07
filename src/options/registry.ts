import type { OptionItem, OptionRequest, OptionRule, OptionRuntimeContext } from './types';

export type OptionSourceResolver = (input: {
  rule: OptionRule;
  request: OptionRequest;
  runtime: OptionRuntimeContext;
}) => Promise<OptionItem[]>;

export type OptionSourceRegistry = {
  register: (type: string, resolver: OptionSourceResolver) => void;
  resolve: (type: string) => OptionSourceResolver | undefined;
};

export function createOptionSourceRegistry(): OptionSourceRegistry {
  const resolvers = new Map<string, OptionSourceResolver>();

  return {
    register(type, resolver) {
      const normalizedType = type.trim();
      if (!normalizedType) {
        throw new Error('Option source type is required');
      }

      resolvers.set(normalizedType, resolver);
    },
    resolve(type) {
      return resolvers.get(type.trim());
    },
  };
}
