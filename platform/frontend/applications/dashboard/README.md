# Platform Dashboard

## Colour Palette

**Theme:** Dark background, high contrast text, futuristic neon accents, and colour-blind-friendly differentiation.

### Text

| Role | Hex | RGB | Usage |
| --- | --- | --- | --- |
| Primary text | #F8FAFF | (248, 250, 255) | Main body text, headings |
| Secondary text | #D7E0F5 | (215, 224, 245) | Supporting labels, metadata |
| Muted text | #A9B6D3 | (169, 182, 211) | Placeholder/help text |
| Link / Accent text | #5CC8FF | (92, 200, 255) | Links and interactive highlights |

### Background

| Role | Hex | RGB | Usage |
| --- | --- | --- | --- |
| App background | #0B0F14 | (11, 15, 20) | Global page background |
| Surface / card | #121826 | (18, 24, 38) | Panels, cards, forms |
| Elevated surface | #1A2233 | (26, 34, 51) | Hovered/active surfaces |
| Border / divider | #2B344A | (43, 52, 74) | Borders, separators |

### Accent (Non-status) Colours

| Role | Hex | RGB | Usage |
| --- | --- | --- | --- |
| Primary accent (cyan) | #5CC8FF | (92, 200, 255) | Buttons, active nav, focus |
| Secondary accent (violet) | #B08CFF | (176, 140, 255) | Secondary actions |
| Highlight accent (magenta) | #FF7BE5 | (255, 123, 229) | Highlights, callouts |

### CVE Status Representation

> Green, red, and yellow are reserved exclusively for vulnerability severity/status.

| Status | Colour | Hex | Non-colour cue (required) |
| --- | --- | --- | --- |
| Critical | Red | #FF4D4F | `Critical` label + warning icon + bold badge |
| High | Orange/Amber | #FF9F43 | `High` label + triangle icon |
| Medium | Yellow | #FFD166 | `Medium` label + dash icon |
| Low | Green | #34D399 | `Low` label + check/circle icon |

### Accessibility Guidelines

- Do not rely on colour alone for severity; always pair with text labels and icons.
- Ensure minimum WCAG AA contrast (`>= 4.5:1`) for normal text.
- Use visible focus rings (recommended: `#5CC8FF`) for keyboard navigation.
- Keep long-form text in primary/secondary neutrals; use neon colours for emphasis only.