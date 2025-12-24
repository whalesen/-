
export interface Point {
  x: number;
  y: number;
}

export type GameMode = 'ADVENTURE' | 'SEQUENCE' | 'BREATHING' | 'MIST_CLEAR';

export interface GameObject {
  id: string;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  type: 'star' | 'wisp' | 'stress-bubble' | 'target' | 'mist' | 'core' | 'shadow' | 'fragment';
  opacity: number;
  pulse: number;
  label?: string;
  progress?: number;
  isCleared?: boolean;
}

export interface HandData {
  landmarks: Point[];
  isVisible: boolean;
  velocity: number;
}

export enum GameState {
  LOBBY = 'LOBBY',
  INSTRUCTIONS = 'INSTRUCTIONS',
  MODE_SELECT = 'MODE_SELECT',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED'
}
