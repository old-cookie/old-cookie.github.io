---
name: oat-ui
description: "Implement and refactor pages with Oat UI components while writing as little custom CSS as possible and without changing colors by default. Use when building semantic HTML/CSS UI, mapping requirements to Oat components, or migrating custom UI to Oat patterns from https://oat.ink/components/."
argument-hint: "頁面或功能需求（例如：做一個含 sidebar、table、toast 的設定頁）"
user-invocable: true
---

# Oat UI Component Workflow

## When to Use

- Build new UI with Oat (no framework, semantic HTML-first).
- Refactor existing markup/classes to Oat component patterns.
- Choose correct Oat components and attributes quickly.
- Minimize self-written CSS and rely on Oat defaults/variants first.
- Keep Oat default color system unchanged unless user explicitly requests color changes.
- Keep accessibility and native semantics while minimizing custom JS.

## Inputs to Collect

- Target page/file path and expected user flow.
- Required components (for example: sidebar, tabs, table, dialog, toast).
- Constraints (mobile behavior, accessibility, no extra dependencies).

## Procedure

1. Translate requirements into semantic structure first.
   - Define page skeleton (`header` / `main` / `aside` / `nav` / `form` / `dialog`) before styling details.
2. Map each UI need to an Oat component and native element.
   - Prefer native semantic tags that Oat styles automatically.
   - Use Oat attributes/variants only where needed (`data-variant`, `role`, component wrappers like `ot-tabs`, `ot-dropdown`).
   - Treat custom CSS as last resort, not the default path.
3. Implement minimal markup for each component.
   - Follow Oat examples from https://oat.ink/components/ and each component permalink page.
   - Avoid introducing non-Oat custom classes unless required by existing project constraints.
   - If custom CSS is unavoidable, keep it tiny, scoped, and only for gaps not covered by Oat.
   - Do not override colors (`color`, `background`, `border-color`, status colors) unless explicitly requested.
4. Handle interaction using native/browser features first.
   - Use built-ins like `dialog`, `details/summary`, `popover`, `title`, and form semantics.
   - Use Oat JS APIs only when needed (for example `ot.toast(...)`).
5. Validate behavior and accessibility.
   - Keyboard flow, focus behavior, ARIA/roles, and responsive layout behavior.
   - Confirm current Oat release notes if behavior differs from docs (project is currently sub-v1).
6. Final cleanup.
   - Remove redundant wrapper markup/classes.
   - Keep implementation small, semantic, and dependency-free.

## Decision Points

- If a native element already solves the problem, use it instead of custom JS.
- If both attribute-based and class-based variants exist, prefer semantic attributes/roles first.
- If a component is dynamic (`ot-tabs`, `ot-dropdown`, toast), implement static fallback-friendly markup where possible.
- If Oat provides a component/variant for the requirement, do not replace it with custom CSS styling.
- If user did not explicitly request color changes, preserve Oat default palette and states.
- If requirement conflicts with Oat conventions, keep custom code isolated and minimal.

## Completion Checklist

- Requirements are mapped to concrete Oat components.
- Markup is semantic and readable without framework-specific structure.
- Accessibility essentials are present (`aria-*`, roles, labels, focus/keyboard behavior).
- Mobile and desktop behavior match expected interaction.
- Custom CSS is minimal and justified by a clear Oat coverage gap.
- No color overrides are introduced unless explicitly requested by the user.
- No unnecessary dependencies or heavy custom JS added.

## Quick Component Mapping Hints

- Collapsible content: `details` + `summary`
- Modal: `dialog` + command attributes
- Notifications: `ot.toast(...)`
- Navigation sidebar: `data-sidebar-layout`, `data-sidebar`, `data-sidebar-toggle`
- Tabs/dropdown: `ot-tabs`, `ot-dropdown`
- Form validation state: `data-field=\"error\"`

## References

- Main components index: https://oat.ink/components/
- Usage docs: https://oat.ink/usage/
- Customizing docs: https://oat.ink/customizing/
- Official GitHub repository: https://github.com/knadh/oat
- Releases (check for breaking changes): https://github.com/knadh/oat/releases
