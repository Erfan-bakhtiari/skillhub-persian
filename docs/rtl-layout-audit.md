# RTL layout audit

Date: 2026-10-15. Scope: Persian layout and alignment in the React application,
with English retained for checking direction changes in the same session.

## Changes

- Shared inputs, textareas, select triggers, dialog headers and toast contents
  use logical text alignment. Namespace/member forms and token dialogs no longer
  override their headings with centered alignment. Confirmation dialogs retain
  their intentionally centered composition.
- Form alignment follows the RTL interface even when the field itself uses
  `dir="ltr"` or an empty `dir="auto"`. Empty placeholders use RTL direction and
  the UI font; filled technical values retain their original LTR direction and
  value. This covers search, login, registration, password reset and shared
  textareas.
- Desktop header navigation sits between equal-width side columns, keeping both
  the anonymous two-link menu and authenticated menu centered independently of
  the widths of the logo and account controls. Mobile navigation stays collapsed.
- Search sorting uses newest, downloads, relevance in DOM order, placing newest
  on the right in Persian and keeping keyboard order consistent with display.
- Theme, notification preference and system authentication switches move their
  thumbs in the current layout direction and keep them inside their tracks.
  Notification badges inherit layout direction; their numbers are isolated.
- Namespace and user metadata, email table cells, token names, suite coordinates
  and version labels preserve alignment with the surrounding UI. Technical
  strings use nested bidi isolation instead of changing the entire cell's or
  block's direction.
- Review controls, social actions, lists, status accents and suite separators use
  logical margins, padding, borders and alignment. The suite support column uses
  a vertical separator on desktop and a horizontal separator below the article
  on mobile. Existing flex/grid direction inheritance mirrors the dashboard
  sidebar, navigation, tables and suite columns.
- The install command and copy button occupy separate flex items. The control
  moves to the end of the current UI direction without covering the LTR command.
  Clipboard content is unchanged.
- Markdown headings and review prose follow their own content direction. Lists
  and quotes resolve their container direction from the first letter, including
  when nested paragraphs/items establish independent direction. This supports
  Persian sections after an English introduction.

## Intentional physical directions

Source code, command bodies, terminal examples and diff line-number gutters keep
their LTR presentation. Centered dialogs/toasts use physical centering, and Radix
side animations follow the actual placement side. Decorative background shapes
do not determine content order. The VitePress guide already sets Persian locale
direction and transforms layout CSS with postcss-rtlcss; that pipeline is outside
this React change.

## Validation

- Production build, TypeScript project build, ESLint and all 936 Vitest tests
  across 221 files passed.
- `web/e2e/rtl-layout.spec.ts` adds fourteen browser tests at 360px, 1024px,
  1334px and 1440px. They
  measure switch thumb containment and movement, sidebar/column placement,
  separator sides, table bidi isolation, dialog/select alignment, mixed Markdown,
  live Persian/English switching and document overflow. The browser-comment
  follow-up also checks header centering/overlap, sort order and URL behavior,
  placeholder alignment/direction, and unchanged filled credentials.
- The discovery tests also measure that the copy button is to the left of the
  command in Persian without overlap, and verify the unchanged clipboard value.
- The final combined Persian authentication, publishing, discovery, management,
  profile, security and RTL layout run passed all 31 tests. Mobile/desktop suite,
  member-dialog, search and login screenshots were visually reviewed. The header
  was also checked at the desktop breakpoint after switching Persian/English;
  compact spacing prevents the authenticated English menu overlapping controls.

Browser checks use explicit API fixtures against the source Vite preview at
http://127.0.0.1:3001. They validate rendering and interaction, not real backend
publication or authorization. The running Docker images were not rebuilt by this
change. Not every conditional role, dataset or screen has been visually tested.
