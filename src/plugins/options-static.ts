import { definePlugin } from '../core';
import { registerStaticOptionSource } from '../options/providers/static';

export function createOptionsStaticPlugin() {
  return definePlugin({
    name: 'options-static',
    setup({ services }) {
      registerStaticOptionSource(services.options.registry);
    },
  });
}
