import { definePlugin } from '../core';
import { createHttpClient } from '../http/client';
import { registerHttpOptionSource } from '../options/providers/http';

export function createOptionsHttpPlugin() {
  return definePlugin({
    name: 'options-http',
    setup({ services }) {
      registerHttpOptionSource(services.options.registry, createHttpClient());
    },
  });
}
