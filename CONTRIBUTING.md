# Contributing

Thanks for spending time on `humming`.

This repository is intentionally small and explicit. The best contributions are usually focused, well-tested, and aligned with the project's core promise:

- Bun-first runtime
- plugin-first lightweight BFF core
- `health`, `options`, and `forward` remain in core
- business-specific and operational behavior prefers plugins

## Prerequisites

- Bun `1.3.11` or newer
- Git

Install dependencies:

```bash
bun install
```

## Common Commands

- `bun run typecheck`: TypeScript validation
- `bun run build`: produce the published `dist/` artifacts
- `bun run test`: run the full test suite
- `bun run test:entry`: verify the public package entry surface
- `bun run test:consumer`: verify the packed tarball from a fresh consumer project
- `bun run test:examples`: smoke test all runnable examples

## Local Development

Use the repository entrypoint for quick local iteration:

```bash
bun run dev
```

Run individual examples:

```bash
bun run example:basic
bun run example:with-plugins
bun run example:with-forward
bun run example:with-async-plugin
```

## Contribution Workflow

1. Start from a branch based on `main`.
2. Keep changes focused. Small PRs are much easier to review and release.
3. Add or update tests when behavior changes.
4. Update docs when public behavior or APIs change.
5. Before opening a PR, run:

```bash
bun run typecheck
bun run build
bun run test:entry
bun run test:consumer
bun run test:examples
bun run test
```

## Scope Guidelines

Good fits:

- fixes to core behavior
- plugin improvements
- docs and example improvements
- release and packaging polish
- tests and CI improvements

Discuss first if the change is large or changes project direction:

- expanding core responsibilities beyond `health`, `options`, and `forward`
- adding framework-like conventions or hidden runtime magic
- large plugin API redesigns
- runtime support beyond the current Bun-first scope

## Release Notes And Changelog

For user-visible changes, update the relevant release docs:

- `CHANGELOG.md`
- `RELEASE_NOTES_v0.1.0.md` or the current release notes draft
- `README.md` when public usage changes

## Reporting Issues

When filing an issue, include:

- Bun version
- operating system
- minimal reproduction
- expected behavior
- actual behavior

## Questions Before Large Changes

If you're unsure whether something belongs in core or should live in a plugin, open an issue first. That is the most important design boundary in this project.
