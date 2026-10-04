export type Token = {
  text: string;
  sentenceEnd: boolean;
  paragraphEnd: boolean;
};

export type Settings = {
  wpm: number;
  punctuationPauses: boolean;
  longWordSlowdown: boolean;
  easeIn: boolean;
};

export const WPM_MIN = 100;
export const WPM_MAX = 1000;
export const EASE_IN_STEPS = 4;

export const DEFAULT_SETTINGS: Settings = {
  wpm: 300,
  punctuationPauses: true,
  longWordSlowdown: true,
  easeIn: true,
};
