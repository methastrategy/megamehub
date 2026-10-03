import type { Card, Suit, Rank } from './CardTypes';

export class DeckEngine {
  public static createStandardDeck(faceUp = true): Card[] {
    const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const deck: Card[] = [];

    suits.forEach(suit => {
      ranks.forEach((rank, idx) => {
        deck.push({
          id: `${suit}_${rank}_${Math.random().toString(36).substring(2, 7)}`,
          suit,
          rank,
          value: idx + 1, // 1 to 13
          faceUp
        });
      });
    });

    return deck;
  }

  // Multi-deck shoe for Casino games (e.g. 6 or 8 decks for Blackjack/Baccarat)
  public static createShoe(deckCount = 6): Card[] {
    const shoe: Card[] = [];
    for (let i = 0; i < deckCount; i++) {
      shoe.push(...this.createStandardDeck());
    }
    return this.shuffle(shoe);
  }

  // Fisher-Yates Shuffle
  public static shuffle(cards: Card[]): Card[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Slave (President) rank values: 3 (low) to 2 (high)
  // 3=1, 4=2, 5=3, ..., K=11, A=12, 2=13
  public static getSlaveValue(rank: Rank): number {
    switch (rank) {
      case '3': return 1;
      case '4': return 2;
      case '5': return 3;
      case '6': return 4;
      case '7': return 5;
      case '8': return 6;
      case '9': return 7;
      case '10': return 8;
      case 'J': return 9;
      case 'Q': return 10;
      case 'K': return 11;
      case 'A': return 12;
      case '2': return 13;
      default: return 0;
    }
  }

  // Suit strength for tie-breaking in Slave: ♣ < ♦ < ♥ < ♠
  public static getSuitValue(suit: Suit): number {
    switch (suit) {
      case 'clubs': return 1;
      case 'diamonds': return 2;
      case 'hearts': return 3;
      case 'spades': return 4;
    }
  }

  // Blackjack value calculation for a hand
  public static calculateBlackjackScore(cards: Card[]): { score: number; isBust: boolean; isBlackjack: boolean } {
    let score = 0;
    let aces = 0;

    cards.forEach(card => {
      if (['K', 'Q', 'J', '10'].includes(card.rank)) {
        score += 10;
      } else if (card.rank === 'A') {
        aces += 1;
        score += 11;
      } else {
        score += parseInt(card.rank, 10);
      }
    });

    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    const isBlackjack = cards.length === 2 && score === 21;
    const isBust = score > 21;

    return { score, isBust, isBlackjack };
  }

  // Baccarat score calculation (mod 10)
  public static calculateBaccaratScore(cards: Card[]): number {
    let total = 0;
    cards.forEach(card => {
      if (['K', 'Q', 'J', '10'].includes(card.rank)) {
        total += 0;
      } else if (card.rank === 'A') {
        total += 1;
      } else {
        total += parseInt(card.rank, 10);
      }
    });
    return total % 10;
  }
}
