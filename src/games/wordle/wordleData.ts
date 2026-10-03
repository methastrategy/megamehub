export interface WordleDictionary {
  thai: string[];
  english: string[];
}

export const WORDLE_DATA: WordleDictionary = {
  english: [
    'APPLE', 'BEACH', 'BRAIN', 'BREAD', 'CHAIR', 'CHESS', 'CLOUD', 'CROWN',
    'DANCE', 'DREAM', 'EARTH', 'FLAME', 'FRUIT', 'GHOST', 'GRAPE', 'HEART',
    'HONEY', 'HOUSE', 'JUICE', 'LEMON', 'LIGHT', 'MAGIC', 'MANGO', 'MONEY',
    'MUSIC', 'NIGHT', 'OCEAN', 'PAINT', 'PARTY', 'PEACE', 'PIZZA', 'PLANT',
    'POWER', 'QUEEN', 'RADIO', 'RIVER', 'ROBOT', 'SHINE', 'SKILL', 'SMILE',
    'SNAKE', 'SPACE', 'STORM', 'SUGAR', 'SWEET', 'TABLE', 'TIGER', 'TRAIN',
    'WATER', 'WORLD', 'ZEBRA', 'REACT', 'SMART', 'GAMES', 'SUPER'
  ],
  thai: [
    'กาแฟ', 'รถไฟ', 'ทะเล', 'กล้วย', 'มะนาว', 'ส้มตำ', 'สายตา', 'น้ำใจ',
    'ข้าว', 'ความรัก', 'ดนตรี', 'สายลม', 'ดอกไม้', 'รอยยิ้ม', 'เมฆา', 'ปัญญา',
    'ท้องฟ้า', 'เพื่อน', 'แม่น้ำ', 'ความสุข', 'ความฝัน', 'สายฝน', 'ภูเขา', 'อาหาร'
  ]
};

// Normalized length for English is 5 characters.
// For Thai words, we can support 4-5 core characters or standard Thai words.
