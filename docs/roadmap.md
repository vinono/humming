# Roadmap

This page turns the current project assessment into a practical roadmap.

The goal is not to make `humming` bigger for its own sake.
The goal is to make the plugin-first BFF core more stable, more observable, and easier to adopt with confidence.

## Planning Assumption

This roadmap assumes the near-term goal is:

- make `humming` safe to recommend as a real Bun-first BFF foundation
- keep core narrow
- mature the plugin platform before adding broad new surface area

If that goal changes, the priorities should change with it.

## P0: Must Close Next

These are the highest-priority gaps.
They are the main blockers between a strong `v0.1` project and a platform other teams can adopt more confidently.

### 1. Plugin Lifecycle

Current state:

- plugins have a strong startup model through `setup()`
- plugin ordering, mode filtering, dependencies, and conflicts already exist
- there is no standard shutdown or disposal path

Why it matters:

- Redis-backed plugins, timers, long-lived clients, and other external resources need a cleanup story
- without lifecycle closure, the plugin system stays useful but not fully production-shaped

Target outcome:

- add a standard plugin cleanup path such as `dispose()` or equivalent lifecycle hooks
- make async teardown first-class
- define what happens when one plugin fails during startup or shutdown
- document lifecycle expectations for official and custom plugins

Exit criteria:

- plugins can register resources and release them cleanly
- teardown behavior is covered by tests
- the plugin authoring docs explain startup and shutdown responsibilities clearly

### 2. Runtime Observability For Plugins And Forward

Current state:

- startup logs show which plugins are enabled or skipped
- runtime side effects are still hard to inspect directly

Why it matters:

- once multiple plugins are mounted, debugging route ownership and hook behavior gets expensive
- plugin-first systems need transparent runtime behavior, not just clean startup

Target outcome:

- expose clearer startup summaries for routes, middleware, options providers, and forward hooks
- make forward logs easier to attribute to rule, transport, and plugin behavior
- add lightweight debugging surfaces without turning core into a tracing framework

Exit criteria:

- a developer can tell which plugin mounted a route or hook
- forward execution logs separate matching, hook, transport, and error stages clearly
- the docs show how to inspect plugin and forward behavior in development and production

### 3. Stable API Boundary And Compatibility Policy

Current state:

- the package already exports a meaningful surface area
- there is not yet a sharp contract for what is stable, provisional, or internal

Why it matters:

- adoption gets harder when users cannot tell which APIs are safe to build on
- `0.x` projects especially need explicit compatibility expectations

Target outcome:

- define which exports are public and intended for long-term use
- mark unstable areas clearly in docs and release notes
- add a deprecation policy for upcoming changes

Exit criteria:

- public APIs are documented intentionally instead of only being discoverable from exports
- release notes can describe compatibility impact consistently
- internal-only implementation details are easier to keep flexible

### 4. Stronger Release And Regression Coverage

Current state:

- core tests, examples, and docs are already in good shape
- the project still needs a tighter release-confidence loop across module boundaries

Why it matters:

- framework-style projects are judged by whether combinations keep working over time
- regressions often happen at the seams: CLI templates, plugin composition, example apps, and package entrypoints

Target outcome:

- expand smoke coverage for scaffolded apps and official templates
- verify main package entrypoints and common plugin combinations
- tighten release checks around build, test, example, and packaging workflows

Exit criteria:

- the main adoption paths are covered by automated checks
- release risk is concentrated in known areas instead of hidden integration seams
- `humming` can ship changes without relying on manual confidence alone

## P1: Recommended Next

These are the best next investments after P0 is in place.
They improve composition, adoption, and operational clarity without changing the core identity of the project.

### 1. Better Plugin Ordering Semantics

Current `priority` support is useful, but still coarse.

Recommended direction:

- support clearer `before` and `after` style ordering where it adds real value
- improve route and hook ownership visibility
- avoid letting plugin order become guesswork as official plugins grow

### 2. Presets, Not Just Plugins

The project already has official plugins and CLI templates.
The next maturity step is reusable presets for common BFF shapes.

Recommended direction:

- define a few opinionated bundles such as `basic-web-bff`, `internal-tools`, or `forward-heavy`
- document when each preset fits
- keep presets explicit so they do not blur the core boundary

### 3. Configuration Governance

Configuration is already meaningful across env parsing, forward rules, transports, and plugins.
That makes clarity more important over time.

Recommended direction:

- standardize config examples and error guidance
- document recommended defaults and risky overrides
- keep schema expectations easy to reason about during first adoption

### 4. Production Telemetry Conventions

`humming` already has metrics, logging, and benchmark guidance.
The next layer is convention, not just capability.

Recommended direction:

- define tracing and correlation guidance
- standardize labels and debug markers for plugins and forward phases
- keep core small while making team-level telemetry patterns easier to reuse

### 5. Reference Apps

The examples are strong for feature discovery.
The next step is realistic reference apps that show complete usage patterns.

Recommended direction:

- add a few end-to-end examples closer to real frontend BFF scenarios
- show how official plugins compose in practical deployments
- use reference apps to teach boundaries, not just APIs

## P2: Can Wait

These ideas may be valuable later, but they should not compete with P0 and P1 right now.

### 1. Expanding Core Built-Ins

Do not move optional concerns into core just because the repository already ships official plugins.

Examples to keep out of core for now:

- auth
- cache
- rate limiting
- broader policy layers

### 2. Full Gateway-Style Features

This project is not trying to become a general-purpose gateway control plane.

Examples to defer:

- dynamic service discovery
- platform-wide routing governance
- large multi-team policy orchestration

### 3. Early Ecosystem Expansion

A broad plugin marketplace sounds attractive, but ecosystem work should follow stronger lifecycle and observability foundations.

### 4. Heavy Performance Chasing

The transport and benchmark work already gives a useful baseline.
Until real bottlenecks show up, platform maturity should outrank micro-optimizations.

## Suggested Delivery Order

The practical implementation order is:

1. plugin lifecycle
2. plugin and forward observability
3. public API boundary and compatibility policy
4. release-confidence and regression coverage
5. ordering semantics and presets
6. config and telemetry conventions
7. reference apps

## What Success Looks Like

This roadmap is working if `humming` becomes easier to trust without becoming much larger.

That means:

- teams can adopt it without guessing which APIs are stable
- plugin authors can manage real resources safely
- runtime behavior is easier to inspect when multiple plugins interact
- releases feel predictable
- the project still reads like a small BFF kernel, not an expanding framework
