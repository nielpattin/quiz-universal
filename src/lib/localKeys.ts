// Local storage keys and types for app state

export const APP_VERSION_KEY = 'app_version';
export const CURRENT_VIEW_KEY = 'currentView';
export const FAVORITE_QUESTIONS_KEY = 'favoriteQuestions';
export const APPSTATE_ALL_KEY = 'appState_all';
export const STYLE_KEY = 'app_style';
export const FONT_KEY = 'app_font';
export const EN_SIZE_KEY = 'app_en_size';
export const EN_OPACITY_KEY = 'app_en_opacity';
export const TIMER_ENABLED_KEY = 'quiz_timer_enabled';
export const SOUND_ENABLED_KEY = 'quiz_sound_enabled';
export const FOCUS_MODE_KEY = 'quiz_focus_mode';
export const HAPTIC_ENABLED_KEY = 'quiz_haptic_enabled';
export const HIGH_SCORES_KEY = 'quiz_high_scores';
export const QUIZ_PROGRESS_PREFIX = 'quiz_progress_';
export const WRONG_QUESTIONS_PREFIX = 'quiz_wrong_';
export const TOTAL_POINTS_KEY = 'quiz_total_points';
export const REDEMPTION_ENABLED_KEY = 'quiz_redemption_enabled';
export const REDEMPTION_BAG_KEY = 'quiz_redemption_bag_';

export interface FavoritesLocalState {
	module: string;
	questionIndex: number;
}

export const DEFAULT_FAVORITES_LOCAL: FavoritesLocalState = {
	module: 'all',
	questionIndex: 0
};
export interface AppStateAll {
	modules: string[];
	currentIndex: number;
}

export const DEFAULT_APPSTATE_ALL: AppStateAll = {
	modules: ['all'],
	currentIndex: 0
};
