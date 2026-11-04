export const THEME_STORAGE_KEY = "yod:theme";
export const MOTION_STORAGE_KEY = "yod:reduce-motion";
export const SOUND_STORAGE_KEY = "yod:soft-chime";
export const TEXT_SIZE_STORAGE_KEY = "yod:text-size";

export type ThemeMode = "system" | "light" | "dark";
export type TextSize = "default" | "large";

export const PREFERENCES_INIT_SCRIPT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){d.dataset.theme=t}var m=localStorage.getItem("${MOTION_STORAGE_KEY}");if(m==="true"){d.dataset.reduceMotion="true"}var s=localStorage.getItem("${TEXT_SIZE_STORAGE_KEY}");if(s==="large"){d.dataset.textSize="large"}}catch(e){}})();`;
