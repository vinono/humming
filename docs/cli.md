# CLI

`humming` ships with a small scaffold CLI for starting new projects quickly.

The CLI is intentionally narrow: it focuses on generating a clean project starter, not on becoming a full framework toolchain.

If you are evaluating the project first, read [overview.md](./overview.md) before choosing a template.

## Command

Create a new project:

```bash
bunx humming init my-bff
```

You can also select a template:

```bash
bunx humming init my-bff --template with-plugins
```

If the target directory is not empty:

```bash
bunx humming init my-bff --force
```

## Available Templates

### `basic`

Smallest useful app.

Includes:

- `health`
- `options`
- no forward terminal
- minimal starter file

Good for:

- first-time evaluation
- tiny BFFs
- internal demos

### `with-plugins`

Starter app with official plugin usage.

Includes:

- auth
- metrics
- rate limiting
- cache
- CORS
- custom route plugin
- custom options source example

Good for:

- learning plugin composition
- starting a more realistic app quickly
- seeing recommended plugin patterns

### `with-forward`

Starter app focused on forward rules and hooks.

Includes:

- forward terminal enabled
- mock upstream server
- request hook example
- response hook example

Good for:

- evaluating forwarding behavior
- local proxy experiments
- hook testing

## Picking A Template

Use `basic` when you want the smallest possible starter.

Use `with-plugins` when you want to learn the recommended extension model.

Use `with-forward` when your main goal is proxying and upstream integration.

## Generated Files

The CLI currently generates:

- `package.json`
- `tsconfig.json`
- `.gitignore`
- `README.md`
- `src/main.ts`

The generated project uses:

- Bun
- TypeScript
- the published `humming` package

## Expected Flow After Scaffolding

After generating a project:

```bash
cd my-bff
bun install
bun run dev
```

Then open the endpoints that belong to your chosen template.

## Design Notes

The CLI is intentionally simple:

- no hidden global config
- no network lookup during generation
- no project registry
- no multi-step interactive wizard yet

That keeps it predictable and easy to maintain.

## What The CLI Is For

The CLI is best treated as:

- a bootstrap tool
- a preset launcher
- a way to encode official starting patterns

It is not currently intended to:

- manage deployments
- own environment configuration
- install ecosystem plugins from a marketplace
- replace project-level build tooling

## Likely Next Step

As the project grows, the CLI will probably become most valuable through stronger presets, for example:

- `with-auth`
- `with-cache`
- `with-metrics`
- `with-forward`
- composition-friendly team presets

That keeps the CLI aligned with `humming` itself: small core, explicit building blocks, practical project starters.
