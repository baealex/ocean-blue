# Ocean Blue Product Theme Tokens

Updated: 2026-05-25

## Purpose

Ocean Blue uses a product-owned theme instead of copying another Ocean product's colors or shapes. The shared contract is the role name; the actual value belongs to Ocean Blue.

## Current structure

- `packages/web/src/styles/tailwind.css` owns Tailwind theme tokens and global base tokens.
- `packages/web/src/styles/background.css` owns the app canvas reset and reads the background token.
- `packages/web/src/shared/ui/*` contains reusable UI primitives. Prefer these primitives before adding page-level style classes.
- Some route-specific screens still use direct Tailwind colors and arbitrary values. That is acceptable for one-off screen treatment, but repeated role values should move into product tokens.

## Minimum token contract

| Role | Token | Purpose |
| --- | --- | --- |
| Accent | `--ocean-blue-color-accent` | Primary action and active navigation color |
| Accent hover | `--ocean-blue-color-accent-hover` | Hover state for accent controls |
| Focus | `--ocean-blue-color-focus` | Visible focus ring color |
| Success colors | `--ocean-blue-color-success-*` | Positive state border, surface, text, and indicator colors |
| Success shadows | `--ocean-blue-shadow-success-*` | Positive state panel and indicator shadows |
| Danger colors | `--ocean-blue-color-danger-*` | Error state border, surface, and text colors |
| Surface | `--ocean-blue-color-surface` | Glass-like card or panel background |
| Surface strong | `--ocean-blue-color-surface-strong` | Stronger panel background |
| Border | `--ocean-blue-color-border` | Subtle panel and control border |
| Text | `--ocean-blue-color-text` | Main text color |
| Muted text | `--ocean-blue-color-text-muted` | Secondary text color |
| App background | `--ocean-blue-background-app` | Product canvas background |
| Surface shadow | `--ocean-blue-shadow-surface` | Shared elevated panel shadow |

Tailwind exposes matching utility tokens such as `bg-ocean-blue-surface`, `border-ocean-blue-border`, `text-ocean-blue-accent`, `ring-ocean-blue-focus`, `shadow-ocean-blue-surface`, `bg-ocean-blue-success-surface`, and `text-ocean-blue-danger-text`.

## Usage rules

1. Keep product tokens semantic. Prefer role names over raw palette names in shared UI primitives.
2. Do not migrate every existing class at once. Replace repeated values when touching nearby code.
3. Keep page-specific visual experiments local when they are not reused.
4. New shared primitives should use the token contract for repeated surface, border, focus, text, and accent roles.
