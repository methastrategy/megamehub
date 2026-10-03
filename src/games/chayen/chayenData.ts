import type { ChayenDeck } from '../../sdk/types';

export const DEFAULT_CHAYEN_DECKS: ChayenDeck[] = [
  {
    id: 'food',
    name: 'ของกิน & อาหารไทย',
    emoji: '🍲',
    description: 'เมนูเด็ด สตรีทฟู้ด ขนมหวาน และของกินยอดฮิต',
    color: 'from-amber-500 to-orange-600',
    words: [
      'ส้มตำปูปลาร้า', 'ต้มยำกุ้งน้ำข้น', 'ชานมไข่มุก', 'ผัดไทยกุ้งสด',
      'ข้าวเหนียวมะม่วง', 'หมูกระทะ', 'หมูปิ้งโบราณ', 'ข้าวซอยไก่',
      'ขนมครกใบเตย', 'โรตีสายไหม', 'ชาเย็น', 'ข้าวมันไก่ตอน',
      'กะเพราหมูกรอบไข่ดาว', 'ก๋วยเตี๋ยวเรือน้ำตก', 'บัวลอยน้ำกะทิ', 'แกงเขียวหวาน',
      'ยำวุ้นเส้นรวมมิตร', 'กุ้งเผาน้ำจิ้มซีฟู้ด', 'ไส้กรอกอีสาน', 'หอยทอดกระทะร้อน',
      'ทุเรียนหมอนทอง', 'น้ำตกหมู', 'ทอดมันกุ้ง', 'ปาท่องโก๋นมข้น',
      'น้ำพริกกะปิปลาทู', 'บิงซูมะม่วง', 'เครปเย็น', 'ลูกชิ้นปิ้ง',
      'ขนมเบื้องหวาน', 'ไก่ย่างวิเชียรบุรี'
    ]
  },
  {
    id: 'movies',
    name: 'หนัง ละคร & เพลงฮิต',
    emoji: '🎬',
    description: 'ภาพยนตร์ดัง ซีรีส์ ละครไทย และเพลงฮิตติดหู',
    color: 'from-rose-500 to-pink-600',
    words: [
      'บุพเพสันนิวาส', 'พี่มากพระโขนง', 'ธี่หยด', 'แฟนฉัน',
      'ทรงอย่างแบด', 'คุกกี้เสี่ยงทาย', 'สัปเหร่อ', 'สิ่งเล็กๆ ที่เรียกว่ารัก',
      'ทองเอก หมอยาท่าโฉลง', 'วันทอง', 'กรงกรรม', 'ฉลาดเกมส์โกง',
      'ไทบ้านเดอะซีรีส์', 'รถไฟฟ้ามาหานะเธอ', 'ชัตเตอร์ กดติดวิญญาณ', 'นาคี',
      'รักแท้ดูแลไม่ได้', 'สองรัก', 'วาฬเกยตื้น', 'โต๊ะริม',
      'ซ่อนกลิ่น', 'นะหน้าทอง', 'เลือดข้นคนจาง', 'Friend Zone ระวัง..สิ้นสุดทางเพื่อน'
    ]
  },
  {
    id: 'animals',
    name: 'สัตว์โลกน่ารัก & ตัวตึง',
    emoji: '🦁',
    description: 'สัตว์เลี้ยง สัตว์ป่า และดาราขวัญใจโซเชียล',
    color: 'from-emerald-500 to-teal-600',
    words: [
      'หมูเด้ง', 'คาปิบารา', 'หมีแพนด้า', 'แรคคูน',
      'นกเพนกวิน', 'วาฬเพชฌฆาต', 'ตุ่นปากเป็ด', 'กิ้งก่าคาเมเลียน',
      'แมวส้ม', 'หมาไซบีเรียนฮัสกี', 'ยีราฟคอยาว', 'ช้างไทย',
      'จระเข้น้ำจืด', 'สลอธ', 'เมียร์แคต', 'นกฮูก',
      'โลมาสีชมพู', 'กระรอกบิน', 'ปลาวาฬสีน้ำเงิน', 'เสือโคร่ง',
      'กอริลลา', 'ลิงชิมแปนซี', 'กบเคโรโระ', 'หมีขั้วโลก'
    ]
  },
  {
    id: 'slang',
    name: 'สแลงฮิต & คำศัพท์วัยรุ่น',
    emoji: '💬',
    description: 'ศัพท์ Gen Z ตัวมารดา ฟีลแฟน ช็อตฟีล',
    color: 'from-purple-500 to-indigo-600',
    words: [
      'ตัวมารดา', 'ช็อตฟีล', 'ฟีลแฟน', 'นอยด์อะแก',
      'ฉ่ำ', 'จึ้งมากแม่', 'สู้ชีวิตแต่ชีวิตสู้กลับ', 'วาสนาผู้ใดหนอ',
      'เกินเบอร์', 'แกก็แรงเกิน', 'สวยสะบัด', 'ตัวลูก',
      'คุณน้า', 'เอาดีๆ', 'อย่าลืมหอยแครง', 'แก้วใจ',
      'พักก่อน', 'ใจเกเร', 'เหม่อ', 'กราบแม่',
      'อย่าหาทำ', 'ลักชูรี่', 'อวยยศ', 'มูฟออนเป็นวงกลม'
    ]
  },
  {
    id: 'actions',
    name: 'ท่าทางห้ามพูดเสียง (Act It Out)',
    emoji: '🎭',
    description: 'หมวดสำหรับเพื่อนใบ้ท่าทาง ห้ามพูดแม้แต่คำเดียว!',
    color: 'from-blue-500 to-cyan-600',
    words: [
      'ขับรถติดไฟแดง', 'โดนผึ้งต่อยตูด', 'เล่นน้ำสงกรานต์', 'ตกปลาตัวใหญ่',
      'ชกมวยสากล', 'ร้องไห้กลางสายฝน', 'เปลี่ยนผ้าอ้อมเด็ก', 'เดินบนก้อนน้ำแข็งลื่น',
      'กินก๋วยเตี๋ยวเผ็ดพริก 10 เม็ด', 'เล่นโทรศัพท์ตอนเดินชนเสา', 'จับจิ้งจกในห้องน้ำ', 'ปีนหน้าผาสูง',
      'กระโดดร่มชูชีพ', 'เล่นฮูลาฮูป', 'แปลงฟันแล้วโฟมฟูมปาก', 'เต้นระบำฮาวาย',
      'หิวข้าวจนไส้กิ่ว', 'ถ่ายเซลฟี่มุม 45 องศา', 'เล่นซูโม่', 'แอบจามตอนประชุม'
    ]
  },
  {
    id: 'places',
    name: 'ประเทศ & แหล่งท่องเที่ยว',
    emoji: '🌍',
    description: 'แลนด์มาร์กดัง จุดเช็กอิน และประเทศรอบโลก',
    color: 'from-amber-600 to-yellow-600',
    words: [
      'ประเทศญี่ปุ่น', 'ฝรั่งเศส', 'วัดพระแก้ว', 'ภูเขาไฟฟูจิ',
      'หอไอเฟล', 'ประเทศเกาหลีใต้', 'มัลดีฟส์', 'น้ำตกทีลอซู',
      'ดอยอินทนนท์', 'เกาะพีพี', 'ทัชมาฮาล', 'พีระมิดกิซา',
      'กำแพงเมืองจีน', 'นครเวนิส', 'สิงคโปร์', 'ถนนข้าวสาร',
      'เขาใหญ่', 'ไอซ์แลนด์', 'นครวัด', 'เทพีเสรีภาพ'
    ]
  }
];

const CUSTOM_DECKS_KEY = 'megamehub_chayen_custom_decks';

export function loadAllDecks(): ChayenDeck[] {
  try {
    const customJson = localStorage.getItem(CUSTOM_DECKS_KEY);
    if (customJson) {
      const customs: ChayenDeck[] = JSON.parse(customJson);
      return [...DEFAULT_CHAYEN_DECKS, ...customs];
    }
  } catch (e) {
    console.warn('Failed to load custom decks:', e);
  }
  return DEFAULT_CHAYEN_DECKS;
}

export function saveCustomDeck(deck: ChayenDeck) {
  try {
    const currentAll = loadAllDecks();
    const customs = currentAll.filter(d => d.isCustom);
    const existingIndex = customs.findIndex(d => d.id === deck.id);
    
    if (existingIndex >= 0) {
      customs[existingIndex] = deck;
    } else {
      customs.push(deck);
    }

    localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(customs));
  } catch (e) {
    console.warn('Failed to save custom deck:', e);
  }
}

export function deleteCustomDeck(deckId: string) {
  try {
    const currentAll = loadAllDecks();
    const customs = currentAll.filter(d => d.isCustom && d.id !== deckId);
    localStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(customs));
  } catch (e) {
    console.warn('Failed to delete custom deck:', e);
  }
}
