export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;        // Numerical ranking for game logic
  faceUp?: boolean;
}

export const SUIT_INFO: Record<Suit, { nameTh: string; symbol: string; color: string; isRed: boolean }> = {
  hearts: { nameTh: 'โพแดง', symbol: '♥', color: 'text-rose-500', isRed: true },
  diamonds: { nameTh: 'ข้าวหลามตัด', symbol: '♦', color: 'text-amber-500', isRed: true },
  clubs: { nameTh: 'ดอกจิก', symbol: '♣', color: 'text-emerald-400', isRed: false },
  spades: { nameTh: 'โพดำ', symbol: '♠', color: 'text-slate-200', isRed: false },
};

export const RANKS_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
