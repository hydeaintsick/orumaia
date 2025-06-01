# ORUMA Testing Strategy

This document outlines the testing strategy for the ORUMA application. Due to current environmental limitations (especially around reliable Expo CLI execution in the sandbox), automated test execution and full verification are challenging at this stage.

## Levels of Testing

### 1. Unit Tests
*   **Framework:** Jest with `jest-expo` preset and `ts-jest` for TypeScript.
*   **Mocking:**
    *   `expo-sqlite`: Mocked to simulate database operations in memory for `src/database/database.ts` tests. The mock aims to cover basic CRUD behaviors and constraint checks (e.g., UNIQUE).
    *   `expo-contacts`: Will be mocked for `ContactSyncService.ts` to simulate fetching device contacts and permission handling.
    *   `expo-notifications`: Will be mocked for `NotificationService.ts` to simulate permission handling and notification scheduling.
*   **Scope:**
    *   **Database (`src/database/database.ts`):** Test all CRUD operations for categories, contacts, events, and news. Verify schema initialization effects (e.g., default categories). Test data integrity logic where possible with mocks.
    *   **Services (`src/services/`):**
        *   `ContactSyncService.ts`: Test permission requests, contact fetching logic, and synchronization logic (checking for existing contacts, adding new ones).
        *   `NotificationService.ts`: Test permission requests, birthday parsing, and notification scheduling/cancellation logic.
    *   **Utility functions (if any).**
*   **Location:** `__tests__` subdirectories next to the files being tested (e.g., `src/database/__tests__`).
*   **Current Status:** Basic tests for category management in `database.test.ts` are implemented with a mock. More tests need to be added.

### 2. Component Tests (Future - Requires Runnable & Stable Environment)
*   **Framework:** React Native Testing Library (`@testing-library/react-native`) with `@testing-library/jest-native` matchers.
*   **Scope:** Test individual React components for:
    *   Correct rendering based on props.
    *   State changes and updates.
    *   User interactions (presses, text input).
    *   Accessibility props.
*   **Examples:**
    *   Test if `ContactListScreen` displays contacts correctly.
    *   Test if input fields in `ContactDetailScreen` update state.
    *   Test button presses and form submissions.
*   **Location:** `__tests__` subdirectories or next to component files.

### 3. Integration Tests (Future - Requires Runnable & Stable Environment)
*   **Framework:** Jest can be used, potentially with helpers from React Native Testing Library.
*   **Scope:** Test interactions between different parts of the app:
    *   Syncing contacts and verifying they appear in the `ContactsListScreen` (mocking UI navigation and rendering).
    *   Adding a category in `SettingsScreen` and verifying it's available in the `ContactDetailScreen` picker.
    *   Saving a contact detail and verifying the updated information is displayed and persisted.
    *   Scheduling a notification and verifying the underlying service call.

### 4. End-to-End (E2E) Tests (Future - Requires Runnable & Stable Environment, and E2E Framework)
*   **Framework:** Consider tools like Detox or Appium if full E2E automation is desired.
*   **Scope:** Simulate full user flows through the application UI on a device/simulator.

### 5. Manual Testing (Essential - Ongoing, Critical When Environment Allows Builds)
Once the application can be reliably built and run:
*   **Full User Flow Testing:** Execute all user stories and edge cases manually.
*   **Platform Specific Testing:** Test on both iOS and Android if possible.
*   **Device Variety:** Test on different screen sizes/resolutions if possible.

**Key User Flows for Manual Testing (as previously outlined, remains relevant):**
*   First-Time Setup (permissions, initial sync).
*   Contact List & Syncing (view, manual sync, no duplicates).
*   Category Management (add, view, verify in pickers).
*   Contact Detail Screen (view, edit all fields, save, category change, add/view events & news).
*   Birthday Notifications (set birthday, verify scheduling, test "Schedule All").
*   UI/UX (theme, styles, layout, touch feedback, `LayoutAnimation` effects).
*   Data Persistence (close/reopen app, verify all data).
*   Error Handling (e.g., no network, permission denied, invalid input).

## Running Tests (Conceptual - requires fixing environment issues)
The `package.json` is configured to run Jest tests:
```bash
npm test
# or
# yarn test
```
This will execute all `*.test.ts` and `*.test.js` files within the project.

## Current Challenges & Limitations
*   **Sandbox Environment:** The primary challenge is the instability of the development environment provided, particularly regarding `node_modules` integrity and the inability to execute Expo CLI commands like `expo export` or `expo start`. This prevents any form of automated component, integration, or E2E testing that requires a running app or bundler.
*   **Mocking Complexity:** Thoroughly mocking native module functionality (like `expo-sqlite`, `expo-contacts`, `expo-notifications`) can be complex and may not fully represent real device behavior.
*   **No Visual Verification:** Animations, styling, and overall UX cannot be automatically verified without running the app.

The immediate focus for automated testing will be on unit tests for business logic in database and service layers, using robust mocks. Higher-level testing will depend on resolving environment stability and build capabilities.
