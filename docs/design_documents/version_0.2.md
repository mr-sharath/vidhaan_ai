# Vidhaan AI - Version 0.2 Design & Release Document

*   **Active Release Version**: `v0.2`
*   **Release Milestone**: Mobilization, Workspace Utilities, and UI polish
*   **Status**: Deployed (Backend and Next.js Frontend compile with 0 warnings/errors)
*   **Release Date**: June 27, 2026

---

## 📋 1. Release Summary
Version 0.2 of Vidhaan AI shifts the focus from foundational indices (MVP launch) to user productivity, responsive device optimization, and brand-first Progressive Web App (PWA) packaging. The legal workbench now delivers an app-like standalone mobile package without the store overhead.

---

## ⚙️ 2. Core Implemented Features & Architecture

### 2.1. Sovereign PWA Installation
*   **Next.js Metadata manifest**: Configured `manifest.ts` returning standalone parameters:
    ```typescript
    display: 'standalone',
    background_color: '#0d131a',
    theme_color: '#0f2942'
    ```
*   **Android/Chrome Install Banner**: Displays a saffron prompt banner requesting installation, triggering Chrome's native package popover on click.
*   **iOS/Safari Install Ribbon**: Displays an iOS-specific tooltip informing users to click Safari's Share button and select `"Add to Home Screen for best experience"`.
*   **Refined 3D Skeuomorphic App Icon**: An embossed dark-leather texture launcher showing a metallic bronze scale of justice, green glowing microchip AI synapses, and faint circuit board document traces.

### 2.2. "My Notebook" Workspace
*   **Central Control Panel**: Relocated "My Notebook" into the left sidebar panel directly under the "New Research Chat" action button. Styled with a saffron-to-orange gradient.
*   **Statutory Citation Cards**: Added dual-action unpin/trash icon buttons side-by-side with reference insertions inside `/workspace` to let users easily clear pinned citations and start fresh.
*   **Email Formatting**: Added prefix tags so the header displays as `"USER: email"` instead of the bare email ID.

### 2.3. Layout Widescreen Optimization
*   **Widescreen Grid**: Expanded all core chat panels, bubble viewports, message forms, and status logs from `max-w-2xl` / `max-w-3xl` to **`max-w-5xl`** (1024px) for laptop screens while retaining perfect padding and mobile responsiveness.
*   **Dev Indicator Hider**: Configured `devIndicators: false` in `next.config.ts` to hide Next.js's floating development status overlay badge from the bottom-left of the sidebar.
*   **Logout Relocation**: Moved the user profile card and sign-out controls from the header ribbon to the bottom of the left sidebar footer on all screen widths, renamed simply as `"Logout"`.
