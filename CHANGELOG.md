# Changelog

## [2.3.0] - 2026-06-30

### Added

- Optional question timer: countdown bar with color gradient (teal → amber → red), auto-lock on expiry, toggle in Settings
- Sound effects via Web Audio API: pop on answer select, chime on correct, buzz on wrong, fanfare on completion, toggle in Settings
- Focus mode: hides top bar and sidebar during quiz for distraction-free study, toggle in Settings
- Haptic feedback: short vibration on correct, double buzz on wrong (mobile), toggle in Settings
- Per-module high scores: best correct/wrong tracked per module, saved to localStorage, shown in Settings
- Quiz progress persistence: session state saved to localStorage on each navigation, auto-restored on page reload
- Spaced repetition: wrong question IDs tracked per module for future review workflows
- Settings toggles for all new features (timer, sound, focus, haptic) with toggle-switch UI
- High scores section in Settings showing best accuracy per module

### Changed

- Carousel: timer bar displayed above progress bar when enabled
- QuizCard: haptic feedback triggers on answer lock
- TopBar and Sidebar hidden during focus mode
- Quiz completion now saves high score and clears persisted progress

## [2.2.1] - 2026-06-25

### Fixed

- Mobile: floating nav arrows no longer overlap answers and the Check Answers button; relocated to a right-docked vertical stack (44px)
- Mobile: top-bar icon buttons and sidebar question rows now meet the 44px tap-target minimum
- Mobile: sidebar close (X) button enlarged to 44px; backdrop given a distinct aria-label ("Tap outside to close sidebar") to fix a duplicate accessible name

### Changed

- Mobile: question ID badge demoted from the header to a subtle monospaced footer line (header was cluttered on small screens); still visible on desktop and for favorites import/export

## [2.2.0] - 2026-01-11

### Added

- Seamless full-screen question view (removed card-based layout)
- Centered content with max-width for better readability on desktop
- Responsive padding (compact on mobile, generous on desktop)
- Theme and Font selectors moved to Settings modal for cleaner top bar

### Changed

- Answer bilingual text now displays stacked (English above Vietnamese) instead of inline
- Vertical slide transitions now seamless (questions stack without gaps)

### Fixed

- Mouse wheel scroll now works correctly on long questions without triggering navigation

## [2.1.1] - 2026-01-10

### Fixed

- Bilingual parser now handles multiple text formats (slash delimiter, parentheses, VN: prefix)
- Fixed nested parentheses parsing for acronyms like (WBS) in bilingual text
- Fixed trailing whitespace issue in parentheses format detection
- Fixed SvelteKit router initialization error on page refresh

## [2.1.0] - 2026-01-10

### Added

- Bilingual Text system (English styling for questions and answers)
- Customizable English text settings (Size and Opacity)
- New Settings Modal for display preferences

### Fixed

- SvelteKit router conflict by replacing history.replaceState with navigate imports

## [2.0.0] - 2026-01-08

### Added

- Project management quizzes and subject information
- Question text field to CurrentQuestion and Quiz types
- Image URL support in database schema

### Changed

- Refactored quiz content parsing and database schema
- Refactored TopBar component for better accessibility
- Enhanced global state management
- Improved Carousel and QuizCard components for better navigation
- Enhanced quiz functionality with improved state management and UI

### Fixed

- Answer button styling for better text handling

## [1.6.0] - Initial tracked version

- Initial release with module-based quiz navigation
- Favorites system
- Mobile-first design
