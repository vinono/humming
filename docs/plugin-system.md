# Plugin System

The plugin system is the main way `humming` grows without making core heavy.

If core is the thin kernel, plugins are the place where most real application behavior should live.

If you want code-level authoring details after this guide, continue with [PLUGIN_GUIDE.md](../PLUGIN_GUIDE.md).

## Why Plugins Matter Here

`humming` deliberately keeps core small:

- `health`
- `options`
- `forward`
- shared request/runtime services

That means features such as auth, cache, metrics, rate limiting, request logging, and project-specific routes should be expressed as plugins instead of being moved into core.

## Plugin Shape

A plugin is a plain object created with `definePlugin()`:

```ts
definePlugin({
  name: 'my-plugin',
  setup(context) {
    // register middleware, routes, option sources, or forward hooks
  },
});
```

This shape is intentionally small:

- `name`: stable identity for logs and governance
- `meta`: optional governance hints
- `setup(context)`: the place where the plugin attaches behavior

## What A Plugin Can Do

Inside `setup()`, a plugin can:

- mount routes with `route()`
- register middleware with `use()`
- extend the options system through `services.options`
- extend forward behavior through `services.forwardProxy`
- read shared env and logger state
- interact with shared runtime services

In practice, that covers most project-level BFF extensions.

## Plugin Context

Each plugin receives:

- `app`
- `env`
- `logger`
- `services.options`
- `services.forwardProxy`
- `services.localDebugRuntime`
- `use(path, middleware)`
- `route(path, routes)`

This is a deliberate balance:

- enough power to build real features
- not so much abstraction that authors lose track of what is happening

## Runtime Behavior

At startup, plugin resolution happens before setup runs.

The runtime currently supports:

- sync setup through `createAppSync()`
- async setup through `createApp()`
- mode filtering
- priority ordering
- dependency validation
- conflict validation
- duplicate-name detection
- startup resolution logs

That means plugins are not just an array of callbacks anymore. There is already a lightweight governance layer.

## Governance Metadata

Plugins can declare:

- `priority`
- `mode`
- `debugLabel`
- `dependencies`
- `conflicts`

### `priority`

Higher numbers run earlier.

This is the coarse-grained ordering tool.

### `mode`

Allows a plugin to be enabled only in:

- `development`
- `test`
- `production`
- `all`
- or an array of those modes

### `debugLabel`

Adds a readable hint for logs and error messages.

### `dependencies`

Lets a plugin declare that another plugin must also be enabled.

This is useful when one plugin assumes another has already registered middleware, routes, or shared behavior.

### `conflicts`

Lets a plugin explicitly reject another plugin being enabled at the same time.

This is useful when two plugins would both try to own the same concern.

## What The Current System Does Well

The current plugin system is already strong in a few ways:

### Small API Surface

It is easy to learn and easy to explain.

### Explicit Runtime

There is no hidden scanning or container magic.

### Practical Official Examples

The official plugins show that the model can handle:

- auth
- cache
- CORS
- metrics
- rate limiting
- options providers
- request logging

### Good Fit For Project Plugins

This system is especially well suited for:

- app-local plugins
- internal team conventions
- official repository plugins
- preset-based project scaffolds

## Current Limits

The plugin system is good, but it is not a full ecosystem platform yet.

It still has a few clear limits:

### No Full Lifecycle Model

Right now the main lifecycle hook is `setup()`.

That means there is no standard plugin-level `dispose()` or shutdown hook for:

- Redis clients
- timers
- long-lived resources
- external connections

### Ordering Is Still Coarse

`priority` is useful, but it is still broad.

There is no explicit:

- `before`
- `after`
- hook chain labeling
- route ownership map

### Runtime Side Effects Are Not Fully Visible

Startup logs show which plugins are enabled or skipped, but they do not yet show:

- which routes a plugin mounted
- which middleware a plugin added
- which forward hooks it registered
- which plugin changed a given request or response

### Dependency Semantics Are Name-Based

Dependencies and conflicts are string-based today.

That is enough for lightweight governance, but it is not the same as a richer capability graph.

## Best Practices

If you build plugins for `humming`, these patterns fit the system well:

### Keep Plugins Single-Purpose

Good plugins usually own one concern clearly:

- auth
- metrics
- project routes
- request logging

### Prefer Explicit Options

Give each plugin a well-typed options object instead of reading lots of ambient state.

### Use Metadata Early

If order or environment matters, declare it in `meta` instead of relying on array position alone.

### Keep Core Boundaries Intact

If a feature feels very project-specific, it probably belongs in a plugin, not in core.

### Favor Composition

Multiple small plugins are usually easier to reason about than one large plugin that owns unrelated concerns.

## What This Means Strategically

The plugin system is already one of the strongest parts of `humming`.

It is mature enough for:

- official repository plugins
- team-owned project plugins
- CLI presets
- thin BFF extension patterns

The next maturity step is not “add more plugins first”.

The next maturity step is:

- stronger lifecycle handling
- better runtime observability
- clearer ordering semantics
- better preset composition

That would move the system from “solid extension model” to “strong reusable plugin platform”.
