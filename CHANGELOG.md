# Changelog

## [2.5.0] - 2026-07-03

### Added

- Redemption bag: wrong answers are added to a bag and auto-reviewed at random intervals during the quiz.
- Single and multiple choice support in redemption overlay with QuizCard-style feedback per answer.
- Sound effects for redemption overlay (select, correct, wrong, pop-up).
- Settings toggle for Redemption Bag (default: on).

### Fixed

- Timer no longer stays enabled when user turns it off in Settings.
- Pop animation no longer triggers on answer unselect in MCQ.
-redemption no longer pops up immediately after answering — only shows on forward navigation.
- Timer freezes while redemption overlay is active.

## [2.4.0] - 2026-07-03

### Changed

- Bilingual quiz content moved from single-field heuristics to separate `question_text_en` / `question_text_vi` and `answer_text_en` / `answer_text_vi` fields.
- Updated database schema, API, and frontend components (`BilingualText`, `Carousel`, `QuizCard`) to consume separate language fields.

### Migration

- Run `node sync_universal.js --clean` against the target database after deploying this release.
- Users must clear site data / localStorage in their browser to avoid stale saved progress that references the old answer/shuffle state. In Chrome: DevTools → Application → Storage → Clear site data.

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
