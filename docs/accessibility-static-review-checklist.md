# Accessibility static-review checklist

This checklist is source-review guidance for the final hardening branch. It is not a substitute for keyboard, screen-reader, contrast, responsive, or real-device testing.

## Forms and controls

- Every input/select/textarea has a programmatic label.
- Icon-only controls have an accessible name.
- Toggle buttons expose pressed state where appropriate.
- Destructive actions state their scope before confirmation.
- Disabled controls do not hide the reason the action is unavailable.
- File inputs expose the expected file type and local-processing behavior.

## Dynamic feedback

- Persistence/import/delete errors use an alert or equivalent assertive announcement when the user needs to act.
- Successful background/local actions use a polite status region rather than stealing focus.
- Loading states are announced without repeatedly re-announcing unchanged content.
- Progress updates for large local imports are throttled and do not flood assistive technology.

## Focus and keyboard

- All interactive controls are keyboard reachable in logical document order.
- Focus visibility is not removed by CSS.
- Expanding swap/import/detail regions does not create unreachable controls.
- Destructive confirmations do not leave focus on a control that disappeared.
- Bottom navigation and live-workout controls remain usable at 200% zoom and narrow widths.

## Motion and timers

- Non-essential animation respects `prefers-reduced-motion`.
- Rest timer state is available as text and does not depend only on animation, vibration, notification, or colour.
- Wake Lock failure never blocks ordinary workout controls.

## Health and safety copy

- Safety-hold messages are exposed as text, not colour alone.
- Current/stale/partial/failed/insufficient health states have textual labels.
- Consent and external-share dialogs name the destination and selected scopes.
- Preventive reminder status does not imply clinical urgency beyond the user-entered due date.

## Verification boundary

Source inspection may identify missing semantics, but final accessibility acceptance requires actual keyboard navigation, zoom/responsive checks, contrast inspection, and representative screen-reader testing under #42/#82.
