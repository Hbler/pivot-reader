# Safeguards

Non-negotiable boundaries. Every REASONS canvas links here as its second **S** section. Changing one requires an explicit decision recorded below.

## Invariants

- The pivot letter appears at exactly the same screen position for every token, at every font size and screen width.
- Reading position is never lost: it is saved on every pause, step and page hide.
- Every keyboard action is also available as an on-screen control usable on a phone.

## Performance Limits

- App shell (JS + CSS, excluding fonts and lazily loaded importers): under 100 KB gzipped.
- Opening a 500-page EPUB or PDF must not freeze the page; show progress for long imports.
- Playback timing stays accurate at 1000 WPM (60 ms per word).

## Security & Privacy

- Texts never leave the device. No server, no accounts, no analytics, no third-party requests at runtime.
- Fonts and all assets are self-hosted.

## Scope Boundaries

Pivot Reader will not have:

- accounts or sync between devices
- social or sharing features
- reading stats, streaks or gamification
- AI summaries or any other AI features

It is a reader for one person, not a platform.

## Change Log

| Date       | Safeguard | Change      | Reason        |
| ---------- | --------- | ----------- | ------------- |
| 2026-10-04 | All       | Initial set | Project setup |
