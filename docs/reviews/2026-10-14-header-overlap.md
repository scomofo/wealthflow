# Header / native caption overlap

Baseline: `master` at `63f665cb956c8f3e37b58c33788a7ade10040060`, after PR #17.

The supplied Windows screenshot shows native minimize/maximize/close controls
covering the renderer's theme, settings and profile controls. The header had
24px right padding while `titleBarOverlay` allowed caption controls to occupy
the same pixels.

The header now reserves the difference between the viewport width and the
native safe area's right edge, plus its existing 24px gap. The inset follows
Electron's `titlebar-area-x` / `titlebar-area-width` environment variables
instead of assuming a fixed three-button width. The inset is enabled while
the overlay is visible and its reported rectangle has positive dimensions.
Geometry changes update the inset. Windows Electron may retain `visible=true`
in fullscreen; an empty rectangle removes the inset, while an advertised caption
area remains reserved. Ordinary browser views keep the original spacing.

The title may shrink with ellipsis, the action group remains intact, and long
profile names are bounded with the full escaped name available in a tooltip.
The existing draggable header and non-draggable controls remain in place.

The safe-area contract follows [Electron's custom-title-bar documentation](https://www.electronjs.org/docs/latest/tutorial/custom-title-bar#creating-a-custom-title-bar).

## Evidence

- `npm run lint` and `git diff --check` pass.
- `TZ=Etc/UTC npm test -- --runInBand` and the same suite in
  `America/Edmonton`: 453 passing tests in 63 suites. The host's unrelated
  Asia/Seoul timezone causes two existing UTC-dated notification fixtures to
  cross into another calendar date; notification code is unchanged.
- A native Electron component runner loads the actual header, sidebar,
  window-overlay initialization and styles, using an isolated temporary
  profile and no financial database or AI service.
- Five headless Linux cases pass: 1024×700 and 1400×900, dark/light themes,
  long names, expanded/collapsed sidebar, and 80%/125% page zoom. The runner
  waits for viewport and caption geometry to settle before comparing bounds.
- Reusing the original stylesheet reproduces a failing assertion:
  `minimum-dark: app controls overlap native caption buttons`.
- Screenshots were inspected in both themes. Geometry checks verify a 24px
  caption gap, separation between title/actions/buttons/profile, and
  unobstructed browser hit targets.

`npm run test:header` runs the same checks in native Electron. The Windows CI
job also checks maximization, native theme/settings mouse clicks and adaptation
to fullscreen caption geometry, and uploads screenshots plus geometry.
The runner covers the header component and native caption integration; it
does not certify the installed app's complete startup/import workflows.
