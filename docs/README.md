# Documentation

This folder collects the focused guides for `humming`.

If you want a lightweight web-style documentation entry, open `./index.html`.

For GitHub Pages deployment, the static docs entry is exported by `bun run build:pages`.

If you are new to the project, start here:

1. [Overview](./overview.md)
2. [Plugin System](./plugin-system.md)
3. [CLI](./cli.md)
4. [Transport](./transport.md)
5. [Production](./production.md)
6. [Benchmark](./benchmark.md)

## Guides

### Product And Architecture

- [Overview](./overview.md): what `humming` is, where it fits, and how the core pieces connect
- [Plugin System](./plugin-system.md): plugin mental model, runtime behavior, governance, and extension patterns

### Tooling

- [CLI](./cli.md): scaffold CLI usage and template behavior
- [Benchmark](./benchmark.md): local forward benchmark workflow

### Runtime

- [Transport](./transport.md): transport strategies, retry policy, keepalive usage, and custom transport boundaries

### Operations

- [Production](./production.md): deployment and operational guidance

## Recommended Reading Paths

If you are evaluating whether `humming` fits your team:

1. [Overview](./overview.md)
2. [Repository README](../README.md)
3. [Plugin System](./plugin-system.md)

If you want to start a new project quickly:

1. [CLI](./cli.md)
2. [Repository README](../README.md)
3. `examples/`

If you want to build custom extensions:

1. [Plugin System](./plugin-system.md)
2. [Plugin Guide](../PLUGIN_GUIDE.md)
3. [Transport](./transport.md)

If you are preparing for production rollout:

1. [Transport](./transport.md)
2. [Production](./production.md)
3. [Benchmark](./benchmark.md)
