import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PenTool,
  PlayCircle,
  CheckCircle,
  XCircle,
  Trophy,
  Star,
  RefreshCcw,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Volume2,
  X,
  BadgeCheck,
  BookOpen,
  Tag,
  Sparkles,
} from "lucide-react";

/* STREAMING_CHUNK:Configuring custom styles and animations... */
// ── 폰트 및 스타일 설정 ──────────────────────────────────────────────────
const CUSTOM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700;900&display=swap');
  .font-kanji {
    font-family: 'Noto Serif JP', 'Yu Mincho', 'MS Mincho', serif;
    font-weight: 700;
  }

  @keyframes slideInFromRight {
    from { transform: translateX(56px) scale(0.97); opacity: 0; }
    to { transform: translateX(0) scale(1); opacity: 1; }
  }
  @keyframes slideInFromLeft {
    from { transform: translateX(-56px) scale(0.97); opacity: 0; }
    to { transform: translateX(0) scale(1); opacity: 1; }
  }
  .slide-next { animation: slideInFromRight 0.32s cubic-bezier(0.22, 1, 0.36, 1); }
  .slide-prev { animation: slideInFromLeft 0.32s cubic-bezier(0.22, 1, 0.36, 1); }

  ruby { ruby-position: over; }
  rt { user-select: none; }

  @keyframes feedbackSlideUp {
    from { transform: translateY(24px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .feedback-slide-up { animation: feedbackSlideUp 0.24s cubic-bezier(0.22, 1, 0.36, 1); }

  @keyframes popIn {
    0% { transform: scale(0.85); opacity: 0; }
    60% { transform: scale(1.03); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  .pop-in { animation: popIn 0.22s cubic-bezier(0.22, 1, 0.36, 1); }
`;

/* STREAMING_CHUNK:Configuring audio and TTS utilities... */
// ── 오디오 효과음 설정 ──────────────────────────────────────────────────
const playTone = (freq, type, duration) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

const playCorrectSound = () => {
  playTone(600, "sine", 0.1);
  setTimeout(() => playTone(800, "sine", 0.15), 100);
  setTimeout(() => playTone(1000, "sine", 0.2), 200);
};

const playWrongSound = () => {
  playTone(300, "sawtooth", 0.3);
  setTimeout(() => playTone(220, "sawtooth", 0.25), 120);
};

// ── 일본어 발음 (Web Speech API) ────────────────────────────────────────
let cachedJaVoice = null;
const getJapaneseVoice = () => {
  if (cachedJaVoice) return cachedJaVoice;
  const voices = window.speechSynthesis
    ? window.speechSynthesis.getVoices()
    : [];
  cachedJaVoice =
    voices.find((v) => v.lang === "ja-JP") ||
    voices.find((v) => v.lang?.startsWith("ja")) ||
    null;
  return cachedJaVoice;
};
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedJaVoice = null;
    getJapaneseVoice();
  };
}

const speakJapanese = (text) => {
  if (!text) return;
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.85;
    utterance.pitch = 1;
    const voice = getJapaneseVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch (e) {}
};

const SpeakButton = ({
  text,
  iconSize = 14,
  diameter = 32,
  className = "",
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      speakJapanese(text);
    }}
    onTouchStart={(e) => e.stopPropagation()}
    onTouchMove={(e) => e.stopPropagation()}
    onTouchEnd={(e) => e.stopPropagation()}
    className={`inline-flex items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-700 active:scale-95 transition-all shadow-sm shrink-0 ${className}`}
    style={{
      width: `${diameter}px`,
      height: `${diameter}px`,
      minWidth: `${diameter}px`,
      minHeight: `${diameter}px`,
    }}
    aria-label="발음 듣기"
  >
    <Volume2 size={iconSize} />
  </button>
);

// ── 후리가나(한자 위 발음 표시) 컴포넌트 ─────────────────────────────────
// segments: [{ t: "표기 텍스트", r?: "읽는 법 (한자일 때만)" }, ...]
const Furigana = ({ segments, fontSize = "1.5rem", className = "" }) => {
  if (!segments || segments.length === 0) return null;
  return (
    <span
      className={`font-kanji text-slate-800 inline-flex flex-wrap items-baseline justify-center ${className}`}
      style={{ fontSize, lineHeight: 2.5 }}
    >
      {segments.map((seg, i) =>
        seg.blank ? (
          <span
            key={i}
            className="inline-flex items-center justify-center text-blue-500 font-black border-b-4 border-blue-400"
            style={{ margin: "0 2px", minWidth: "1.6em" }}
          >
            {seg.t || "○○○"}
          </span>
        ) : seg.r ? (
          <ruby key={i} style={{ margin: "0 1px" }}>
            {seg.t}
            <rt
              style={{
                fontSize: "0.36em",
                color: "#d97706",
                fontWeight: 700,
                fontFamily:
                  "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
                letterSpacing: "0.01em",
              }}
            >
              {seg.r}
            </rt>
          </ruby>
        ) : (
          <span key={i}>{seg.t}</span>
        )
      )}
    </span>
  );
};

/* STREAMING_CHUNK:Defining Kana and Kanji datasets... */
// ── 가나 데이터 (청음, 탁음, 반탁음 타입 추가) ────────────────────────────────────────────────────────
const KANA_DATA = [
  {
    row: "あ행",
    type: "청음",
    kana: ["あ", "い", "う", "え", "お"],
    kata: ["ア", "イ", "ウ", "エ", "オ"],
    kr: ["아", "이", "우", "에", "오"],
    romaji: ["a", "i", "u", "e", "o"],
  },
  {
    row: "か행",
    type: "청음",
    kana: ["か", "き", "く", "け", "こ"],
    kata: ["カ", "キ", "ク", "ケ", "コ"],
    kr: ["카", "키", "쿠", "케", "코"],
    romaji: ["ka", "ki", "ku", "ke", "ko"],
  },
  {
    row: "さ행",
    type: "청음",
    kana: ["さ", "し", "す", "せ", "そ"],
    kata: ["サ", "シ", "ス", "セ", "ソ"],
    kr: ["사", "시", "스", "세", "소"],
    romaji: ["sa", "shi", "su", "se", "so"],
  },
  {
    row: "た행",
    type: "청음",
    kana: ["た", "ち", "つ", "て", "と"],
    kata: ["タ", "チ", "ツ", "テ", "ト"],
    kr: ["타", "치", "츠", "테", "토"],
    romaji: ["ta", "chi", "tsu", "te", "to"],
  },
  {
    row: "な행",
    type: "청음",
    kana: ["な", "に", "ぬ", "ね", "の"],
    kata: ["ナ", "ニ", "ヌ", "ネ", "ノ"],
    kr: ["나", "니", "누", "네", "노"],
    romaji: ["na", "ni", "nu", "ne", "no"],
  },
  {
    row: "は행",
    type: "청음",
    kana: ["は", "ひ", "ふ", "へ", "ほ"],
    kata: ["ハ", "ヒ", "フ", "ヘ", "ホ"],
    kr: ["하", "히", "후", "헤", "호"],
    romaji: ["ha", "hi", "fu", "he", "ho"],
  },
  {
    row: "ま행",
    type: "청음",
    kana: ["ま", "み", "む", "め", "も"],
    kata: ["マ", "ミ", "ム", "メ", "モ"],
    kr: ["마", "미", "무", "메", "모"],
    romaji: ["ma", "mi", "mu", "me", "mo"],
  },
  {
    row: "や행",
    type: "청음",
    kana: ["や", null, "ゆ", null, "よ"],
    kata: ["ヤ", null, "ユ", null, "ヨ"],
    kr: ["야", null, "유", null, "요"],
    romaji: ["ya", null, "yu", null, "yo"],
  },
  {
    row: "ら행",
    type: "청음",
    kana: ["ら", "り", "る", "れ", "ろ"],
    kata: ["ラ", "リ", "ル", "レ", "ロ"],
    kr: ["라", "리", "루", "레", "로"],
    romaji: ["ra", "ri", "ru", "re", "ro"],
  },
  {
    row: "わ행",
    type: "청음",
    kana: ["わ", null, null, null, "を"],
    kata: ["ワ", null, null, null, "ヲ"],
    kr: ["와", null, null, null, "오"],
    romaji: ["wa", null, null, null, "wo"],
  },
  {
    row: "ん",
    type: "청음",
    kana: [null, null, null, null, "ん"],
    kata: [null, null, null, null, "ン"],
    kr: [null, null, null, null, "응"],
    romaji: [null, null, null, null, "n"],
  },
  {
    row: "が행",
    type: "탁음",
    kana: ["が", "ぎ", "ぐ", "げ", "ご"],
    kata: ["ガ", "ギ", "グ", "ゲ", "ゴ"],
    kr: ["가", "기", "구", "게", "고"],
    romaji: ["ga", "gi", "gu", "ge", "go"],
  },
  {
    row: "ざ행",
    type: "탁음",
    kana: ["ざ", "じ", "ず", "ぜ", "ぞ"],
    kata: ["ザ", "ジ", "ズ", "ゼ", "ゾ"],
    kr: ["자", "지", "즈", "제", "조"],
    romaji: ["za", "ji", "zu", "ze", "zo"],
  },
  {
    row: "だ행",
    type: "탁음",
    kana: ["だ", "ぢ", "づ", "で", "ど"],
    kata: ["ダ", "ヂ", "ヅ", "デ", "ド"],
    kr: ["다", "지", "즈", "데", "도"],
    romaji: ["da", "ji", "zu", "de", "do"],
  },
  {
    row: "ば행",
    type: "탁음",
    kana: ["ば", "び", "ぶ", "べ", "ぼ"],
    kata: ["バ", "ビ", "ブ", "ベ", "ボ"],
    kr: ["바", "비", "부", "베", "보"],
    romaji: ["ba", "bi", "bu", "be", "bo"],
  },
  {
    row: "ぱ행",
    type: "반탁음",
    kana: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"],
    kata: ["パ", "ピ", "プ", "ペ", "ポ"],
    kr: ["파", "피", "푸", "페", "포"],
    romaji: ["pa", "pi", "pu", "pe", "po"],
  },
];

const KANJI_DATA = {
  N5: [
    {
      kanji: "人",
      meaning: "사람",
      sound: "인",
      examples: [
        { word: "人", reading: "ひと", meaning: "사람, 인간" },
        { word: "三人", reading: "さんにん", meaning: "세 사람" },
      ],
      altReadings: [
        { sound: "닌 / 진", meaning: "사람을 세는 단위 (명) · 음독" },
      ],
    },
    {
      kanji: "大",
      meaning: "큰",
      sound: "대",
      examples: [{ word: "大きい", reading: "おおきい", meaning: "크다" }],
    },
    {
      kanji: "一",
      meaning: "한",
      sound: "일",
      examples: [
        { word: "一", reading: "いち", meaning: "일, 하나" },
        { word: "一つ", reading: "ひとつ", meaning: "한 개" },
      ],
      altReadings: [{ sound: "히토(츠)", meaning: "~개, 하나 · 훈독" }],
    },
    {
      kanji: "分",
      meaning: "나눌",
      sound: "분",
      examples: [
        { word: "分", reading: "ふん / ぷん", meaning: "-분 (시간 단위)" },
      ],
      altReadings: [
        { sound: "와(ける)", meaning: "나누다 (分ける)" },
        { sound: "와(かる)", meaning: "이해하다 (分かる)" },
      ],
    },
    {
      kanji: "見",
      meaning: "볼",
      sound: "견",
      examples: [
        { word: "見る", reading: "みる", meaning: "보다" },
        { word: "見学", reading: "けんがく", meaning: "견학" },
      ],
      altReadings: [
        { sound: "켄", meaning: "보다, 견학 · 음독" },
        { sound: "미(せる)", meaning: "보여주다 (見せる)" },
      ],
    },
    {
      kanji: "出",
      meaning: "날",
      sound: "출",
      examples: [
        { word: "出る", reading: "でる", meaning: "나가다, 나오다" },
        { word: "出発", reading: "しゅっぱつ", meaning: "출발" },
      ],
      altReadings: [
        { sound: "슈츠", meaning: "나가다, 출발 · 음독" },
        { sound: "다(す)", meaning: "꺼내다 (出す)" },
      ],
    },
    {
      kanji: "日",
      meaning: "날",
      sound: "일",
      examples: [
        { word: "日", reading: "ひ", meaning: "날, 해, 낮" },
        { word: "日曜日", reading: "にちようび", meaning: "일요일" },
      ],
      altReadings: [{ sound: "니치 / 지츠", meaning: "날, 요일 · 음독" }],
    },
    {
      kanji: "行",
      meaning: "다닐",
      sound: "행",
      examples: [
        { word: "行く", reading: "いく", meaning: "가다" },
        { word: "旅行", reading: "りょこう", meaning: "여행" },
      ],
      altReadings: [
        { sound: "코우", meaning: "가다, 여행 · 음독" },
        { sound: "교우", meaning: "행하다 (銀行 등) · 음독" },
      ],
    },
    {
      kanji: "前",
      meaning: "앞",
      sound: "전",
      examples: [{ word: "前", reading: "まえ", meaning: "앞, 이전" }],
    },
    {
      kanji: "時",
      meaning: "때",
      sound: "시",
      examples: [{ word: "時間", reading: "じかん", meaning: "시간 (기간)" }],
    },
    {
      kanji: "生",
      meaning: "날",
      sound: "생",
      examples: [
        { word: "生きる", reading: "いきる", meaning: "살다" },
        { word: "生まれる", reading: "うまれる", meaning: "태어나다" },
      ],
      altReadings: [
        { sound: "세이 / 쇼우", meaning: "학생, 인생 등 · 음독" },
        { sound: "나마", meaning: "날것, 생것 (生)" },
      ],
    },
    {
      kanji: "本",
      meaning: "근본",
      sound: "본",
      examples: [{ word: "本", reading: "ほん", meaning: "책" }],
    },
    {
      kanji: "中",
      meaning: "가운데",
      sound: "중",
      examples: [{ word: "中", reading: "なか", meaning: "안, 속, 가운데" }],
    },
    {
      kanji: "今",
      meaning: "이제",
      sound: "금",
      examples: [{ word: "今", reading: "いま", meaning: "지금" }],
    },
    {
      kanji: "間",
      meaning: "사이",
      sound: "간",
      examples: [{ word: "間", reading: "あいだ", meaning: "사이, 간격" }],
      altReadings: [{ sound: "마", meaning: "틈, 사이 (間に合う 등)" }],
    },
    {
      kanji: "年",
      meaning: "해",
      sound: "년",
      examples: [{ word: "年", reading: "とし", meaning: "해, 나이" }],
    },
    {
      kanji: "子",
      meaning: "아들",
      sound: "자",
      examples: [{ word: "子供", reading: "こども", meaning: "어린이" }],
    },
    {
      kanji: "長",
      meaning: "길",
      sound: "장",
      examples: [{ word: "長い", reading: "ながい", meaning: "길다" }],
    },
    {
      kanji: "上",
      meaning: "윗",
      sound: "상",
      examples: [
        { word: "上", reading: "うえ", meaning: "위" },
        { word: "上がる", reading: "あがる", meaning: "오르다" },
      ],
      altReadings: [
        { sound: "조우(じょう)", meaning: "위, 상 · 음독" },
        { sound: "아(がる)", meaning: "오르다 (上がる)" },
      ],
    },
    {
      kanji: "入",
      meaning: "들",
      sound: "입",
      examples: [{ word: "入る", reading: "はいる", meaning: "들어가다" }],
    },
    {
      kanji: "後",
      meaning: "뒤",
      sound: "후",
      examples: [{ word: "後ろ", reading: "うしろ", meaning: "뒤" }],
    },
    {
      kanji: "気",
      meaning: "기운",
      sound: "기",
      examples: [{ word: "気", reading: "き", meaning: "기운, 마음" }],
    },
    {
      kanji: "来",
      meaning: "올",
      sound: "래",
      examples: [{ word: "来る", reading: "くる", meaning: "오다" }],
    },
    {
      kanji: "話",
      meaning: "말씀",
      sound: "화",
      examples: [{ word: "話す", reading: "はなす", meaning: "말하다" }],
    },
    {
      kanji: "女",
      meaning: "계집",
      sound: "녀",
      examples: [{ word: "女", reading: "おんな", meaning: "여자" }],
    },
    {
      kanji: "国",
      meaning: "나라",
      sound: "국",
      examples: [{ word: "国", reading: "くに", meaning: "나라, 국가" }],
    },
    {
      kanji: "金",
      meaning: "쇠",
      sound: "금",
      examples: [
        { word: "お金", reading: "おかね", meaning: "돈" },
        { word: "金曜日", reading: "きんようび", meaning: "금요일" },
      ],
      altReadings: [{ sound: "킨", meaning: "돈, 금요일 · 음독" }],
    },
    {
      kanji: "高",
      meaning: "높을",
      sound: "고",
      examples: [{ word: "高い", reading: "たかい", meaning: "높다" }],
    },
    {
      kanji: "下",
      meaning: "아래",
      sound: "하",
      examples: [
        { word: "下", reading: "した", meaning: "아래" },
        { word: "下さい", reading: "ください", meaning: "주세요" },
      ],
      altReadings: [
        { sound: "카 / 게", meaning: "아래, 하 · 음독" },
        { sound: "쿠다(さい)", meaning: "내리다, 주시다 (下さい)" },
      ],
    },
    {
      kanji: "学",
      meaning: "배울",
      sound: "학",
      examples: [{ word: "学ぶ", reading: "まなぶ", meaning: "배우다" }],
    },
    {
      kanji: "先",
      meaning: "먼저",
      sound: "선",
      examples: [{ word: "先", reading: "さき", meaning: "앞, 먼저" }],
    },
    {
      kanji: "外",
      meaning: "바깥",
      sound: "외",
      examples: [{ word: "外", reading: "そと", meaning: "밖" }],
    },
    {
      kanji: "何",
      meaning: "어찌",
      sound: "하",
      examples: [{ word: "何", reading: "なに", meaning: "무엇" }],
    },
    {
      kanji: "男",
      meaning: "사내",
      sound: "남",
      examples: [{ word: "男", reading: "おとこ", meaning: "남자" }],
    },
    {
      kanji: "名",
      meaning: "이름",
      sound: "명",
      examples: [{ word: "名前", reading: "なまえ", meaning: "이름" }],
    },
    {
      kanji: "月",
      meaning: "달",
      sound: "월",
      examples: [{ word: "月", reading: "つき", meaning: "달" }],
    },
    {
      kanji: "小",
      meaning: "작을",
      sound: "소",
      examples: [{ word: "小さい", reading: "ちいさい", meaning: "작다" }],
    },
    {
      kanji: "聞",
      meaning: "들을",
      sound: "문",
      examples: [{ word: "聞く", reading: "きく", meaning: "듣다" }],
    },
    {
      kanji: "食",
      meaning: "먹을",
      sound: "식",
      examples: [{ word: "食べる", reading: "たべる", meaning: "먹다" }],
    },
    {
      kanji: "書",
      meaning: "글",
      sound: "서",
      examples: [{ word: "書く", reading: "かく", meaning: "쓰다" }],
    },
    {
      kanji: "山",
      meaning: "뫼",
      sound: "산",
      examples: [{ word: "山", reading: "やま", meaning: "산" }],
    },
    {
      kanji: "電",
      meaning: "번개",
      sound: "전",
      examples: [{ word: "電気", reading: "でんき", meaning: "전기" }],
    },
    {
      kanji: "二",
      meaning: "두",
      sound: "이",
      examples: [{ word: "二", reading: "に", meaning: "이, 둘" }],
    },
    {
      kanji: "車",
      meaning: "수레",
      sound: "차",
      examples: [{ word: "車", reading: "くるま", meaning: "자동차" }],
    },
    {
      kanji: "水",
      meaning: "물",
      sound: "수",
      examples: [
        { word: "水", reading: "みず", meaning: "물" },
        { word: "水曜日", reading: "すいようび", meaning: "수요일" },
      ],
      altReadings: [{ sound: "스이", meaning: "물, 수요일 · 음독" }],
    },
    {
      kanji: "木",
      meaning: "나무",
      sound: "목",
      examples: [
        { word: "木", reading: "き", meaning: "나무" },
        { word: "木曜日", reading: "もくようび", meaning: "목요일" },
      ],
      altReadings: [{ sound: "모쿠", meaning: "나무, 목요일 · 음독" }],
    },
    {
      kanji: "母",
      meaning: "어미",
      sound: "모",
      examples: [{ word: "母", reading: "はは", meaning: "어머니" }],
    },
    {
      kanji: "校",
      meaning: "학교",
      sound: "교",
      examples: [{ word: "学校", reading: "がっこう", meaning: "학교" }],
    },
    {
      kanji: "父",
      meaning: "아비",
      sound: "부",
      examples: [{ word: "父", reading: "ちち", meaning: "아버지" }],
    },
    {
      kanji: "白",
      meaning: "흰",
      sound: "백",
      examples: [{ word: "白い", reading: "しろい", meaning: "하얗다" }],
    },
    {
      kanji: "語",
      meaning: "말씀",
      sound: "어",
      examples: [{ word: "日本語", reading: "にほんご", meaning: "일본어" }],
    },
    {
      kanji: "十",
      meaning: "열",
      sound: "십",
      examples: [{ word: "十", reading: "じゅう", meaning: "십, 열" }],
    },
    {
      kanji: "万",
      meaning: "일만",
      sound: "만",
      examples: [{ word: "一万", reading: "いちまん", meaning: "1만" }],
    },
    {
      kanji: "友",
      meaning: "벗",
      sound: "우",
      examples: [{ word: "友だち", reading: "ともだち", meaning: "친구" }],
    },
    {
      kanji: "川",
      meaning: "내",
      sound: "천",
      examples: [{ word: "川", reading: "かわ", meaning: "강" }],
    },
    {
      kanji: "三",
      meaning: "석",
      sound: "삼",
      examples: [{ word: "三", reading: "さん", meaning: "삼, 셋" }],
    },
    {
      kanji: "天",
      meaning: "하늘",
      sound: "천",
      examples: [{ word: "天気", reading: "てんき", meaning: "날씨" }],
    },
    {
      kanji: "東",
      meaning: "동녘",
      sound: "동",
      examples: [{ word: "東", reading: "ひがし", meaning: "동쪽" }],
    },
    {
      kanji: "半",
      meaning: "반",
      sound: "반",
      examples: [{ word: "半分", reading: "はんぶん", meaning: "절반" }],
    },
    {
      kanji: "北",
      meaning: "북녘",
      sound: "북",
      examples: [{ word: "北", reading: "きた", meaning: "북쪽" }],
    },
    {
      kanji: "火",
      meaning: "불",
      sound: "화",
      examples: [
        { word: "火", reading: "ひ", meaning: "불" },
        { word: "火曜日", reading: "かようび", meaning: "화요일" },
      ],
      altReadings: [{ sound: "카", meaning: "불, 화요일 · 음독" }],
    },
    {
      kanji: "土",
      meaning: "흙",
      sound: "토",
      examples: [
        { word: "土", reading: "つち", meaning: "흙" },
        { word: "土曜日", reading: "どようび", meaning: "토요일" },
      ],
      altReadings: [{ sound: "도", meaning: "흙, 토요일 · 음독" }],
    },
    {
      kanji: "南",
      meaning: "남녘",
      sound: "남",
      examples: [{ word: "南", reading: "みなみ", meaning: "남쪽" }],
    },
    {
      kanji: "千",
      meaning: "일천",
      sound: "천",
      examples: [{ word: "千", reading: "せん", meaning: "천" }],
    },
    {
      kanji: "西",
      meaning: "서녘",
      sound: "서",
      examples: [{ word: "西", reading: "にし", meaning: "서쪽" }],
    },
    {
      kanji: "毎",
      meaning: "매양",
      sound: "매",
      examples: [{ word: "毎日", reading: "まいにち", meaning: "매일" }],
    },
    {
      kanji: "休",
      meaning: "쉴",
      sound: "휴",
      examples: [{ word: "休む", reading: "やすむ", meaning: "쉬다" }],
    },
    {
      kanji: "八",
      meaning: "여덟",
      sound: "팔",
      examples: [{ word: "八", reading: "はち", meaning: "팔, 여덟" }],
    },
    {
      kanji: "読",
      meaning: "읽을",
      sound: "독",
      examples: [{ word: "読む", reading: "よむ", meaning: "읽다" }],
    },
    {
      kanji: "五",
      meaning: "다섯",
      sound: "오",
      examples: [{ word: "五", reading: "ご", meaning: "오, 다섯" }],
    },
    {
      kanji: "四",
      meaning: "넉",
      sound: "사",
      examples: [{ word: "四", reading: "よん", meaning: "사, 넷" }],
    },
    {
      kanji: "百",
      meaning: "일백",
      sound: "백",
      examples: [{ word: "百", reading: "ひゃく", meaning: "백" }],
    },
    {
      kanji: "円",
      meaning: "둥글",
      sound: "원",
      examples: [{ word: "円", reading: "えん", meaning: "엔" }],
    },
    {
      kanji: "午",
      meaning: "낮",
      sound: "오",
      examples: [{ word: "午後", reading: "ごご", meaning: "오후" }],
    },
    {
      kanji: "七",
      meaning: "일곱",
      sound: "칠",
      examples: [{ word: "七", reading: "なな", meaning: "칠, 일곱" }],
    },
    {
      kanji: "左",
      meaning: "왼",
      sound: "좌",
      examples: [{ word: "左", reading: "ひだり", meaning: "왼쪽" }],
    },
    {
      kanji: "右",
      meaning: "오른",
      sound: "우",
      examples: [{ word: "右", reading: "みぎ", meaning: "오른쪽" }],
    },
    {
      kanji: "雨",
      meaning: "비",
      sound: "우",
      examples: [{ word: "雨", reading: "あめ", meaning: "비" }],
    },
    {
      kanji: "六",
      meaning: "여섯",
      sound: "육",
      examples: [{ word: "六", reading: "ろく", meaning: "육, 여섯" }],
    },
    {
      kanji: "九",
      meaning: "아홉",
      sound: "구",
      examples: [{ word: "九", reading: "きゅう", meaning: "구, 아홉" }],
    },
  ],
  N4: [],
  N3: [],
  N2: [],
  N1: [],
};

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];

/* STREAMING_CHUNK:Defining Vocabulary and Grammar datasets... */
// ── 단어 & 문법 데이터 (JLPT 급수별 단어, 형용사, 조사 등) ─────────────────────
const VOCAB_DATA = {
  N5: [
    {
      word: "大きい",
      reading: "おおきい",
      meaning: "크다",
      pron: "오-키-",
      pos: "い형용사",
      furigana: [{ t: "大", r: "おお" }, { t: "きい" }],
      example: {
        segments: [
          { t: "東京", r: "とうきょう" },
          { t: "は" },
          { t: "大", r: "おお" },
          { t: "きい" },
          { t: "都市", r: "とし" },
          { t: "です。" },
        ],
        pron: "토-쿄-와 오-키- 토시데스.",
        kr: "도쿄는 큰 도시입니다.",
      },
    },
    {
      word: "小さい",
      reading: "ちいさい",
      meaning: "작다",
      pron: "치-사이",
      pos: "い형용사",
      furigana: [{ t: "小", r: "ちい" }, { t: "さい" }],
      example: {
        segments: [
          { t: "この" },
          { t: "犬", r: "いぬ" },
          { t: "は" },
          { t: "小", r: "ちい" },
          { t: "さいです。" },
        ],
        pron: "코노 이누와 치-사이데스.",
        kr: "이 개는 작습니다.",
      },
    },
    {
      word: "高い",
      reading: "たかい",
      meaning: "높다, 비싸다",
      pron: "타카이",
      pos: "い형용사",
      furigana: [{ t: "高", r: "たか" }, { t: "い" }],
      example: {
        segments: [
          { t: "この" },
          { t: "本", r: "ほん" },
          { t: "は" },
          { t: "高", r: "たか" },
          { t: "いです。" },
        ],
        pron: "코노 홍와 타카이데스.",
        kr: "이 책은 비쌉니다.",
      },
    },
    {
      word: "安い",
      reading: "やすい",
      meaning: "싸다",
      pron: "야스이",
      pos: "い형용사",
      furigana: [{ t: "安", r: "やす" }, { t: "い" }],
      example: {
        segments: [
          { t: "この" },
          { t: "りんごは" },
          { t: "安", r: "やす" },
          { t: "いです。" },
        ],
        pron: "코노 링고와 야스이데스.",
        kr: "이 사과는 쌉니다.",
      },
    },
    {
      word: "新しい",
      reading: "あたらしい",
      meaning: "새롭다",
      pron: "아타라시-",
      pos: "い형용사",
      furigana: [{ t: "新", r: "あたら" }, { t: "しい" }],
      example: {
        segments: [
          { t: "新", r: "あたら" },
          { t: "しい" },
          { t: "車", r: "くるま" },
          { t: "を" },
          { t: "買", r: "か" },
          { t: "いました。" },
        ],
        pron: "아타라시- 쿠루마오 카이마시타.",
        kr: "새 차를 샀습니다.",
      },
    },
    {
      word: "古い",
      reading: "ふるい",
      meaning: "낡다, 오래되다",
      pron: "후루이",
      pos: "い형용사",
      furigana: [{ t: "古", r: "ふる" }, { t: "い" }],
      example: {
        segments: [
          { t: "この" },
          { t: "家", r: "いえ" },
          { t: "は" },
          { t: "古", r: "ふる" },
          { t: "いです。" },
        ],
        pron: "코노 이에와 후루이데스.",
        kr: "이 집은 낡았습니다.",
      },
    },
    {
      word: "良い",
      reading: "いい / よい",
      meaning: "좋다",
      pron: "이-",
      pos: "い형용사",
      furigana: [{ t: "良", r: "よ" }, { t: "い" }],
      example: {
        segments: [
          { t: "天気", r: "てんき" },
          { t: "が" },
          { t: "良", r: "よ" },
          { t: "いですね。" },
        ],
        pron: "텡키가 요이데스네.",
        kr: "날씨가 좋네요.",
      },
    },
    {
      word: "悪い",
      reading: "わるい",
      meaning: "나쁘다",
      pron: "와루이",
      pos: "い형용사",
      furigana: [{ t: "悪", r: "わる" }, { t: "い" }],
      example: {
        segments: [
          { t: "天気", r: "てんき" },
          { t: "が" },
          { t: "悪", r: "わる" },
          { t: "いです。" },
        ],
        pron: "텡키가 와루이데스.",
        kr: "날씨가 나쁩니다.",
      },
    },
    {
      word: "暑い",
      reading: "あつい",
      meaning: "덥다",
      pron: "아츠이",
      pos: "い형용사",
      furigana: [{ t: "暑", r: "あつ" }, { t: "い" }],
      example: {
        segments: [
          { t: "今日", r: "きょう" },
          { t: "は" },
          { t: "暑", r: "あつ" },
          { t: "いです。" },
        ],
        pron: "쿄-와 아츠이데스.",
        kr: "오늘은 덥습니다.",
      },
    },
    {
      word: "寒い",
      reading: "さむい",
      meaning: "춥다",
      pron: "사무이",
      pos: "い형용사",
      furigana: [{ t: "寒", r: "さむ" }, { t: "い" }],
      example: {
        segments: [
          { t: "冬", r: "ふゆ" },
          { t: "は" },
          { t: "寒", r: "さむ" },
          { t: "いです。" },
        ],
        pron: "후유와 사무이데스.",
        kr: "겨울은 춥습니다.",
      },
    },
    {
      word: "忙しい",
      reading: "いそがしい",
      meaning: "바쁘다",
      pron: "이소가시-",
      pos: "い형용사",
      furigana: [{ t: "忙", r: "いそが" }, { t: "しい" }],
      example: {
        segments: [
          { t: "毎日", r: "まいにち" },
          { t: "忙", r: "いそが" },
          { t: "しいです。" },
        ],
        pron: "마이니치 이소가시-데스.",
        kr: "매일 바쁩니다.",
      },
    },
    {
      word: "面白い",
      reading: "おもしろい",
      meaning: "재미있다",
      pron: "오모시로이",
      pos: "い형용사",
      furigana: [{ t: "面白", r: "おもしろ" }, { t: "い" }],
      example: {
        segments: [
          { t: "この" },
          { t: "映画", r: "えいが" },
          { t: "は" },
          { t: "面白", r: "おもしろ" },
          { t: "いです。" },
        ],
        pron: "코노 에-가와 오모시로이데스.",
        kr: "이 영화는 재미있습니다.",
      },
    },
    {
      word: "静か",
      reading: "しずか",
      meaning: "조용함",
      pron: "시즈카",
      pos: "な형용사",
      furigana: [{ t: "静", r: "しず" }, { t: "か" }],
      example: {
        segments: [
          { t: "この" },
          { t: "部屋", r: "へや" },
          { t: "は" },
          { t: "静", r: "しず" },
          { t: "かです。" },
        ],
        pron: "코노 헤야와 시즈카데스.",
        kr: "이 방은 조용합니다.",
      },
    },
    {
      word: "元気",
      reading: "げんき",
      meaning: "건강함, 활기참",
      pron: "겡키",
      pos: "な형용사",
      furigana: [{ t: "元気", r: "げんき" }],
      example: {
        segments: [
          { t: "母", r: "はは" },
          { t: "は" },
          { t: "元気", r: "げんき" },
          { t: "です。" },
        ],
        pron: "하하와 겡키데스.",
        kr: "어머니는 건강합니다.",
      },
    },
    {
      word: "有名",
      reading: "ゆうめい",
      meaning: "유명함",
      pron: "유-메-",
      pos: "な형용사",
      furigana: [{ t: "有名", r: "ゆうめい" }],
      example: {
        segments: [
          { t: "この" },
          { t: "歌手", r: "かしゅ" },
          { t: "は" },
          { t: "有名", r: "ゆうめい" },
          { t: "です。" },
        ],
        pron: "코노 카슈와 유-메-데스.",
        kr: "이 가수는 유명합니다.",
      },
    },
    {
      word: "便利",
      reading: "べんり",
      meaning: "편리함",
      pron: "벤리",
      pos: "な형용사",
      furigana: [{ t: "便利", r: "べんり" }],
      example: {
        segments: [
          { t: "この" },
          { t: "アプリは" },
          { t: "便利", r: "べんり" },
          { t: "です。" },
        ],
        pron: "코노 아푸리와 벤리데스.",
        kr: "이 앱은 편리합니다.",
      },
    },
    {
      word: "簡単",
      reading: "かんたん",
      meaning: "간단함",
      pron: "칸탄",
      pos: "な형용사",
      furigana: [{ t: "簡単", r: "かんたん" }],
      example: {
        segments: [
          { t: "この" },
          { t: "問題", r: "もんだい" },
          { t: "は" },
          { t: "簡単", r: "かんたん" },
          { t: "です。" },
        ],
        pron: "코노 몬다이와 칸탄데스.",
        kr: "이 문제는 간단합니다.",
      },
    },
    {
      word: "親切",
      reading: "しんせつ",
      meaning: "친절함",
      pron: "신세츠",
      pos: "な형용사",
      furigana: [{ t: "親切", r: "しんせつ" }],
      example: {
        segments: [
          { t: "彼", r: "かれ" },
          { t: "は" },
          { t: "親切", r: "しんせつ" },
          { t: "です。" },
        ],
        pron: "카레와 신세츠데스.",
        kr: "그는 친절합니다.",
      },
    },
    {
      word: "好き",
      reading: "すき",
      meaning: "좋아함",
      pron: "스키",
      pos: "な형용사",
      furigana: [{ t: "好", r: "す" }, { t: "き" }],
      example: {
        segments: [
          { t: "私", r: "わたし" },
          { t: "は" },
          { t: "ねこが" },
          { t: "好", r: "す" },
          { t: "きです。" },
        ],
        pron: "와타시와 네코가 스키데스.",
        kr: "저는 고양이를 좋아합니다.",
      },
    },
    {
      word: "嫌い",
      reading: "きらい",
      meaning: "싫어함",
      pron: "키라이",
      pos: "な형용사",
      furigana: [{ t: "嫌", r: "きら" }, { t: "い" }],
      example: {
        segments: [
          { t: "私", r: "わたし" },
          { t: "は" },
          { t: "虫", r: "むし" },
          { t: "が" },
          { t: "嫌", r: "きら" },
          { t: "いです。" },
        ],
        pron: "와타시와 무시가 키라이데스.",
        kr: "저는 벌레를 싫어합니다.",
      },
    },
    {
      word: "食べる",
      reading: "たべる",
      meaning: "먹다",
      pron: "타베루",
      pos: "동사",
      furigana: [{ t: "食", r: "た" }, { t: "べる" }],
      example: {
        segments: [
          { t: "朝", r: "あさ" },
          { t: "ごはんを" },
          { t: "食", r: "た" },
          { t: "べます。" },
        ],
        pron: "아사고항오 타베마스.",
        kr: "아침밥을 먹습니다.",
      },
    },
    {
      word: "飲む",
      reading: "のむ",
      meaning: "마시다",
      pron: "노무",
      pos: "동사",
      furigana: [{ t: "飲", r: "の" }, { t: "む" }],
      example: {
        segments: [
          { t: "水", r: "みず" },
          { t: "を" },
          { t: "飲", r: "の" },
          { t: "みます。" },
        ],
        pron: "미즈오 노미마스.",
        kr: "물을 마십니다.",
      },
    },
    {
      word: "行く",
      reading: "いく",
      meaning: "가다",
      pron: "이쿠",
      pos: "동사",
      furigana: [{ t: "行", r: "い" }, { t: "く" }],
      example: {
        segments: [
          { t: "学校", r: "がっこう" },
          { t: "へ" },
          { t: "行", r: "い" },
          { t: "きます。" },
        ],
        pron: "각코-에 이키마스.",
        kr: "학교에 갑니다.",
      },
    },
    {
      word: "来る",
      reading: "くる",
      meaning: "오다",
      pron: "쿠루",
      pos: "동사",
      furigana: [{ t: "来", r: "く" }, { t: "る" }],
      example: {
        segments: [
          { t: "友達", r: "ともだち" },
          { t: "が" },
          { t: "家", r: "いえ" },
          { t: "に" },
          { t: "来", r: "き" },
          { t: "ます。" },
        ],
        pron: "토모다치가 이에니 키마스.",
        kr: "친구가 집에 옵니다.",
      },
    },
    {
      word: "する",
      reading: "する",
      meaning: "하다",
      pron: "스루",
      pos: "동사",
      furigana: [{ t: "する" }],
      example: {
        segments: [
          { t: "毎日", r: "まいにち" },
          { t: "勉強", r: "べんきょう" },
          { t: "を" },
          { t: "します。" },
        ],
        pron: "마이니치 벵쿄-오 시마스.",
        kr: "매일 공부를 합니다.",
      },
    },
    {
      word: "見る",
      reading: "みる",
      meaning: "보다",
      pron: "미루",
      pos: "동사",
      furigana: [{ t: "見", r: "み" }, { t: "る" }],
      example: {
        segments: [{ t: "テレビを" }, { t: "見", r: "み" }, { t: "ます。" }],
        pron: "테레비오 미마스.",
        kr: "텔레비전을 봅니다.",
      },
    },
    {
      word: "は",
      reading: "は",
      meaning: "~은/는 (주제)",
      pron: "와",
      pos: "조사",
      furigana: [{ t: "は" }],
      example: {
        segments: [{ t: "これ" }, { t: "は" }, { t: "本", r: "ほん" }, { t: "です。" }],
        pron: "코레와 혼데스.",
        kr: "이것은 책입니다.",
      },
    },
    {
      word: "が",
      reading: "が",
      meaning: "~이/가 (주격)",
      pron: "가",
      pos: "조사",
      furigana: [{ t: "が" }],
      example: {
        segments: [
          { t: "猫", r: "ねこ" },
          { t: "が" },
          { t: "好", r: "す" },
          { t: "きです。" },
        ],
        pron: "네코가 스키데스.",
        kr: "고양이를 좋아합니다.",
      },
    },
    {
      word: "を",
      reading: "を",
      meaning: "~을/를 (목적격)",
      pron: "오",
      pos: "조사",
      furigana: [{ t: "を" }],
      example: {
        segments: [{ t: "パンを" }, { t: "食", r: "た" }, { t: "べます。" }],
        pron: "팡오 타베마스.",
        kr: "빵을 먹습니다.",
      },
    },
    {
      word: "に",
      reading: "に",
      meaning: "~에, ~에게",
      pron: "니",
      pos: "조사",
      furigana: [{ t: "に" }],
      example: {
        segments: [
          { t: "七時", r: "しちじ" },
          { t: "に" },
          { t: "起", r: "お" },
          { t: "きます。" },
        ],
        pron: "시치지니 오키마스.",
        kr: "7시에 일어납니다.",
      },
    },
    {
      word: "で",
      reading: "で",
      meaning: "~에서 (장소/수단)",
      pron: "데",
      pos: "조사",
      furigana: [{ t: "で" }],
      example: {
        segments: [
          { t: "図書館", r: "としょかん" },
          { t: "で" },
          { t: "勉強", r: "べんきょう" },
          { t: "します。" },
        ],
        pron: "토쇼칸데 벵쿄-시마스.",
        kr: "도서관에서 공부합니다.",
      },
    },
    {
      word: "と",
      reading: "と",
      meaning: "~와/과",
      pron: "토",
      pos: "조사",
      furigana: [{ t: "と" }],
      example: {
        segments: [
          { t: "友達", r: "ともだち" },
          { t: "と" },
          { t: "話", r: "はな" },
          { t: "します。" },
        ],
        pron: "토모다치토 하나시마스.",
        kr: "친구와 이야기합니다.",
      },
    },
    {
      word: "も",
      reading: "も",
      meaning: "~도",
      pron: "모",
      pos: "조사",
      furigana: [{ t: "も" }],
      example: {
        segments: [
          { t: "私", r: "わたし" },
          { t: "も" },
          { t: "学生", r: "がくせい" },
          { t: "です。" },
        ],
        pron: "와타시모 각세-데스.",
        kr: "저도 학생입니다.",
      },
    },
    {
      word: "から",
      reading: "から",
      meaning: "~부터, ~때문에",
      pron: "카라",
      pos: "조사",
      furigana: [{ t: "から" }],
      example: {
        segments: [
          { t: "九時", r: "くじ" },
          { t: "から" },
          { t: "働", r: "はたら" },
          { t: "きます。" },
        ],
        pron: "쿠지카라 하타라키마스.",
        kr: "9시부터 일합니다.",
      },
    },
    {
      word: "まで",
      reading: "まで",
      meaning: "~까지",
      pron: "마데",
      pos: "조사",
      furigana: [{ t: "まで" }],
      example: {
        segments: [
          { t: "五時", r: "ごじ" },
          { t: "まで" },
          { t: "勉強", r: "べんきょう" },
          { t: "します。" },
        ],
        pron: "고지마데 벵쿄-시마스.",
        kr: "5시까지 공부합니다.",
      },
    },
    {
      word: "とても",
      reading: "とても",
      meaning: "매우, 아주",
      pron: "토테모",
      pos: "부사",
      furigana: [{ t: "とても" }],
      example: {
        segments: [
          { t: "今日", r: "きょう" },
          { t: "は" },
          { t: "とても" },
          { t: "暑", r: "あつ" },
          { t: "いです。" },
        ],
        pron: "쿄-와 토테모 아츠이데스.",
        kr: "오늘은 매우 덥습니다.",
      },
    },
    {
      word: "少し",
      reading: "すこし",
      meaning: "조금",
      pron: "스코시",
      pos: "부사",
      furigana: [{ t: "少", r: "すこ" }, { t: "し" }],
      example: {
        segments: [
          { t: "少", r: "すこ" },
          { t: "し" },
          { t: "休", r: "やす" },
          { t: "みましょう。" },
        ],
        pron: "스코시 야스미마쇼-.",
        kr: "조금 쉽시다.",
      },
    },
    {
      word: "たくさん",
      reading: "たくさん",
      meaning: "많이",
      pron: "타쿠상",
      pos: "부사",
      furigana: [{ t: "たくさん" }],
      example: {
        segments: [
          { t: "本", r: "ほん" },
          { t: "を" },
          { t: "たくさん" },
          { t: "読", r: "よ" },
          { t: "みます。" },
        ],
        pron: "홍오 타쿠상 요미마스.",
        kr: "책을 많이 읽습니다.",
      },
    },
    {
      word: "また",
      reading: "また",
      meaning: "또, 다시",
      pron: "마타",
      pos: "부사",
      furigana: [{ t: "また" }],
      example: {
        segments: [{ t: "また" }, { t: "会", r: "あ" }, { t: "いましょう。" }],
        pron: "마타 아이마쇼-.",
        kr: "또 만납시다.",
      },
    },
  ],
  N4: [],
};

const JLPT_VOCAB_LEVELS = ["N5", "N4"];

// 배열 셔플 헬퍼 함수
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/* STREAMING_CHUNK:Grouping Kana data by types... */
// 가나 데이터를 종류별(청음, 탁음, 반탁음)로 그룹화합니다.
const groupedKana = KANA_DATA.reduce((acc, item) => {
  if (!acc[item.type]) {
    acc[item.type] = [];
  }
  acc[item.type].push(item);
  return acc;
}, {});

/* STREAMING_CHUNK:Initializing React App component and state... */
// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function App() {
  const [appMode, setAppMode] = useState("learn"); // 'learn' | 'test'

  // 학습 모드 상태
  const [currentScreen, setCurrentScreen] = useState("menu");
  const [activeType, setActiveType] = useState(null);
  const [activeKana, setActiveKana] = useState(null);
  const [activeLevel, setActiveLevel] = useState(null);
  const [activeKanji, setActiveKanji] = useState(null);
  const [activeVocabLevel, setActiveVocabLevel] = useState(null);
  const [activeVocabIndex, setActiveVocabIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState("next");

  // 테스트 모드 상태
  const [testScreen, setTestScreen] = useState("menu");
  const [testType, setTestType] = useState(null);
  const [selectedTestItems, setSelectedTestItems] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [shake, setShake] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const scrollPosRef = useRef({ kanaList: 0, kanjiList: 0, vocabList: 0, testSelectList: 0 });
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    if (appMode === "learn") {
      if (currentScreen === "kanaList")
        setTimeout(() => window.scrollTo(0, scrollPosRef.current.kanaList), 0);
      else if (currentScreen === "kanjiList")
        setTimeout(() => window.scrollTo(0, scrollPosRef.current.kanjiList), 0);
      else if (currentScreen === "vocabList")
        setTimeout(() => window.scrollTo(0, scrollPosRef.current.vocabList), 0);
      else window.scrollTo(0, 0);
    } else {
      if (testScreen === "select")
        setTimeout(
          () => window.scrollTo(0, scrollPosRef.current.testSelectList),
          0
        );
      else window.scrollTo(0, 0);
    }
  }, [currentScreen, testScreen, appMode]);

  /* STREAMING_CHUNK:Rendering ModeSwitcher Component... */
  // ── 공통 모드 스위처 (색상 가시성 문제 해결) ────────────────────────────
  const ModeSwitcher = () => {
    const isTest = appMode === "test";
    return (
      <div className="flex justify-center mb-8">
        <button
          type="button"
          role="switch"
          aria-checked={isTest}
          onClick={() => setAppMode(isTest ? "learn" : "test")}
          className="relative flex items-center rounded-full p-1 select-none focus:outline-none active:scale-95"
          style={{
            width: "224px",
            height: "52px",
            backgroundColor: isTest ? "#1e293b" : "#e2e8f0",
            transition:
              "background-color 0.32s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease-out",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
          }}
        >
          {/* 슬라이딩 손잡이 (iOS 토글 knob) */}
          <span
            className="absolute top-1 bottom-1 bg-white rounded-full shadow-md pointer-events-none"
            style={{
              width: "calc(50% - 4px)",
              left: isTest ? "calc(50% + 2px)" : "4px",
              transition: "left 0.34s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
          <span
            className="relative z-10 flex-1 text-center text-sm font-bold pointer-events-none"
            style={{
              color: isTest ? "#ffffff" : "#1e293b",
              transition: "color 0.3s ease-out",
            }}
          >
            학습
          </span>
          <span
            className="relative z-10 flex-1 text-center text-sm font-bold pointer-events-none"
            style={{
              color: isTest ? "#1e293b" : "#64748b",
              transition: "color 0.3s ease-out",
            }}
          >
            테스트
          </span>
        </button>
      </div>
    );
  };

  /* STREAMING_CHUNK:Learning Mode Logic and Rendering... */
  // ── 학습 모드 로직 ────────────────────────────────────────────────────────
  const goBackLearn = () => {
    if (currentScreen === "kanaDetail") setCurrentScreen("kanaList");
    else if (currentScreen === "kanaList") setCurrentScreen("menu");
    else if (currentScreen === "kanjiDetail") setCurrentScreen("kanjiList");
    else if (currentScreen === "kanjiList") setCurrentScreen("kanjiLevels");
    else if (currentScreen === "kanjiLevels") setCurrentScreen("menu");
    else if (currentScreen === "vocabDetail") setCurrentScreen("vocabList");
    else if (currentScreen === "vocabList") setCurrentScreen("vocabLevels");
    else if (currentScreen === "vocabLevels") setCurrentScreen("menu");
  };

  const openKanaDetail = (rowItem, charIdx) => {
    scrollPosRef.current.kanaList = window.scrollY;
    setActiveKana({ rowItem, charIdx });
    setCurrentScreen("kanaDetail");
  };

  const openKanjiDetail = (kanjiObj) => {
    scrollPosRef.current.kanjiList = window.scrollY;
    setActiveKanji(kanjiObj);
    setCurrentScreen("kanjiDetail");
  };

  const openVocabDetail = (idx) => {
    scrollPosRef.current.vocabList = window.scrollY;
    setActiveVocabIndex(idx);
    setCurrentScreen("vocabDetail");
  };

  const renderLearnMode = () => {
    if (currentScreen === "menu") {
      return (
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4 animate-in fade-in">
          <button
            onClick={() => {
              setActiveType("hiragana");
              setCurrentScreen("kanaList");
            }}
            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-rose-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex justify-center items-center text-3xl font-bold">
                あ
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-800">
                  히라가나 학습
                </div>
                <div className="text-sm text-slate-400">청음, 탁음, 반탁음</div>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-rose-500 transition-colors" />
          </button>

          <button
            onClick={() => {
              setActiveType("katakana");
              setCurrentScreen("kanaList");
            }}
            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-blue-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex justify-center items-center text-3xl font-bold">
                ア
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-800">
                  가타카나 학습
                </div>
                <div className="text-sm text-slate-400">청음, 탁음, 반탁음</div>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </button>

          <button
            onClick={() => setCurrentScreen("kanjiLevels")}
            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-amber-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex justify-center items-center text-3xl font-bold">
                漢
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-800">
                  한자 학습
                </div>
                <div className="text-sm text-slate-400">JLPT 급수별 한자</div>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-amber-500 transition-colors" />
          </button>

          <button
            onClick={() => setCurrentScreen("vocabLevels")}
            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-emerald-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex justify-center items-center">
                <BookOpen size={28} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-800">
                  단어 &amp; 문법 학습
                </div>
                <div className="text-sm text-slate-400">
                  JLPT 급수별 단어, 형용사, 조사
                </div>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </button>
        </div>
      );
    }

    if (currentScreen === "kanaList") {
      const isHiragana = activeType === "hiragana";
      const colorTheme = isHiragana ? "text-rose-600" : "text-blue-600";
      const bgTheme = isHiragana ? "bg-rose-50" : "bg-blue-50";
      const borderTheme = isHiragana
        ? "hover:border-rose-300"
        : "hover:border-blue-300";
      const titleColor = isHiragana ? "bg-rose-500" : "bg-blue-500";

      return (
        <div className="w-full max-w-lg mx-auto pb-10">
          <div className="flex items-center mb-6 pt-4 relative">
            <button
              onClick={goBackLearn}
              className="absolute left-0 p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="w-full text-center text-2xl font-black text-slate-800">
              {isHiragana ? "히라가나" : "가타카나"} 목록
            </h2>
          </div>
          <div className="space-y-8">
            {Object.entries(groupedKana).map(([type, rows], groupIdx) => (
              <div
                key={groupIdx}
                className="space-y-4 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${groupIdx * 100}ms` }}
              >
                <div className="flex items-center gap-2 px-2">
                  <div className={`h-4 w-1 rounded-full ${titleColor}`}></div>
                  <h3 className="text-lg font-black text-slate-800">{type}</h3>
                </div>
                <div className="space-y-3">
                  {rows.map((rowItem, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200"
                    >
                      <h4 className="text-sm font-bold text-slate-400 mb-3 px-2">
                        {rowItem.row}
                      </h4>
                      <div className="grid grid-cols-5 gap-2">
                        {rowItem.kana.map((char, charIdx) => {
                          const displayChar = isHiragana
                            ? char
                            : rowItem.kata[charIdx];
                          if (!displayChar) return <div key={charIdx} />;
                          return (
                            <button
                              key={charIdx}
                              onClick={() => openKanaDetail(rowItem, charIdx)}
                              className={`aspect-square rounded-2xl flex justify-center items-center text-3xl font-bold bg-slate-50 border border-slate-100 transition-all ${borderTheme} hover:${bgTheme} hover:${colorTheme}`}
                            >
                              {displayChar}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (currentScreen === "kanaDetail") {
      const isHiragana = activeType === "hiragana";
      const colorTheme = isHiragana ? "text-rose-500" : "text-blue-500";
      const bgTheme = isHiragana ? "bg-rose-50" : "bg-blue-50";

      const { rowItem, charIdx } = activeKana;
      const charArray = isHiragana ? rowItem.kana : rowItem.kata;

      const currentChar = charArray[charIdx];
      const currentKr = rowItem.kr[charIdx];
      const currentRomaji = rowItem.romaji[charIdx];

      const getPrevIdx = () => {
        let idx = charIdx - 1;
        while (idx >= 0 && !charArray[idx]) idx--;
        return idx >= 0 ? idx : null;
      };
      const getNextIdx = () => {
        let idx = charIdx + 1;
        while (idx < charArray.length && !charArray[idx]) idx++;
        return idx < charArray.length ? idx : null;
      };

      const prevIdx = getPrevIdx();
      const nextIdx = getNextIdx();

      const handlePrev = () => {
        if (prevIdx !== null) {
          setSlideDirection("prev");
          setActiveKana({ rowItem, charIdx: prevIdx });
        }
      };
      const handleNext = () => {
        if (nextIdx !== null) {
          setSlideDirection("next");
          setActiveKana({ rowItem, charIdx: nextIdx });
        }
      };

      const handleTouchStart = (e) => {
        touchStartX.current = e.changedTouches[0].screenX;
        touchEndX.current = e.changedTouches[0].screenX;
      };
      const handleTouchMove = (e) => {
        touchEndX.current = e.changedTouches[0].screenX;
      };
      const handleTouchEnd = () => {
        const distance = touchStartX.current - touchEndX.current;
        if (distance > 50) handleNext();
        if (distance < -50) handlePrev();
        touchStartX.current = 0;
        touchEndX.current = 0;
      };

      return (
        <div className="w-full flex flex-col items-center justify-center relative">
          <button
            onClick={goBackLearn}
            className="absolute left-4 top-4 p-3 text-slate-500 hover:text-slate-900 bg-white rounded-full shadow-sm z-10"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-slate-400 font-bold text-sm mb-6 mt-16 px-4 py-2 bg-white rounded-full shadow-sm">
            {rowItem.row} ({rowItem.type})
          </div>

          <div
            className="w-full flex items-center justify-between max-w-lg mx-auto overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <button
              onClick={handlePrev}
              className={`p-3 mx-2 rounded-full transition-all ${
                prevIdx !== null
                  ? "text-slate-400 hover:text-slate-800 hover:bg-white shadow-sm"
                  : "opacity-0 cursor-default"
              }`}
              disabled={prevIdx === null}
            >
              <ChevronLeft size={36} />
            </button>

            <div
              key={currentChar}
              className={`bg-white w-full flex flex-col items-center p-8 shadow-xl ${
                slideDirection === "next" ? "slide-next" : "slide-prev"
              }`}
              style={{ maxWidth: "280px", borderRadius: "3rem" }}
            >
              <div
                className={`relative w-full flex justify-center items-center aspect-square ${bgTheme} border border-slate-100 mb-8`}
                style={{ borderRadius: "2rem" }}
              >
                <span
                  className={colorTheme}
                  style={{ fontSize: "6.5rem", lineHeight: 1, fontWeight: 900 }}
                >
                  {currentChar}
                </span>
                <SpeakButton
                  text={currentChar}
                  iconSize={16}
                  diameter={34}
                  className="absolute bottom-3 right-3"
                />
              </div>
              <div className="text-center space-y-2 w-full">
                <div className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-1">
                  발음 기호
                </div>
                <div className="bg-slate-100 py-4 rounded-2xl w-full">
                  <span className="text-4xl font-black text-slate-800">
                    {currentKr}
                  </span>
                </div>
                <div className="bg-slate-50 py-3 rounded-2xl w-full border border-slate-100">
                  <span className="text-2xl font-bold text-slate-400">
                    {currentRomaji}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleNext}
              className={`p-3 mx-2 rounded-full transition-all ${
                nextIdx !== null
                  ? "text-slate-400 hover:text-slate-800 hover:bg-white shadow-sm"
                  : "opacity-0 cursor-default"
              }`}
              disabled={nextIdx === null}
            >
              <ChevronRight size={36} />
            </button>
          </div>

          <div className="mt-10 text-slate-400 font-bold text-sm flex gap-2">
            좌우로 스와이프하여 열 넘기기 · 🔊 버튼으로 발음 듣기
          </div>
        </div>
      );
    }

    if (currentScreen === "kanjiLevels") {
      return (
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center mb-10 pt-4 relative">
            <button
              onClick={goBackLearn}
              className="absolute left-0 p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="w-full text-center text-2xl font-black text-slate-800">
              JLPT 한자 학습
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {JLPT_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => {
                  setActiveLevel(level);
                  setCurrentScreen("kanjiList");
                }}
                className="w-full bg-white py-8 px-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-amber-400 hover:bg-amber-50/30 transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex justify-center items-center text-2xl font-black">
                    {level}
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-black text-slate-800 mb-1">
                      {level} 급수
                    </div>
                    <div className="text-sm font-semibold text-slate-400">
                      {KANJI_DATA[level]?.length || 0}개의 한자
                    </div>
                  </div>
                </div>
                <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-amber-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (currentScreen === "kanjiList") {
      const kanjiList = KANJI_DATA[activeLevel] || [];
      return (
        <div className="w-full max-w-5xl mx-auto pb-10">
          <div className="flex items-center mb-6 pt-4 relative bg-slate-50 sticky top-0 z-10 py-4">
            <button
              onClick={goBackLearn}
              className="absolute left-0 p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="w-full text-center text-2xl font-black text-slate-800">
              {activeLevel} 한자 목록
            </h2>
          </div>
          {kanjiList.length === 0 ? (
            <div className="text-center text-slate-500 py-20 font-medium">
              업데이트 예정입니다.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4">
              {kanjiList.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => openKanjiDetail(item)}
                  className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-3 aspect-square hover:shadow-md hover:border-amber-400 hover:bg-amber-50 transition-all duration-200"
                >
                  <div className="text-3xl sm:text-4xl font-black text-slate-800 mb-2 font-kanji">
                    {item.kanji}
                  </div>
                  <div className="w-full flex justify-center items-center text-xs font-medium text-slate-600 px-1 gap-1">
                    <span>{item.meaning}</span>
                    <span>{item.sound}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (currentScreen === "kanjiDetail") {
      return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-4 sticky top-4 z-10">
            <button
              onClick={goBackLearn}
              className="p-3 text-slate-500 hover:text-slate-900 bg-white rounded-full shadow-md"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          <div className="bg-white w-full rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6 flex flex-col items-center p-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="relative w-48 h-48 border border-slate-200 bg-slate-50 rounded-2xl flex justify-center items-center mb-2">
              <span
                className="text-slate-800 font-kanji"
                style={{ fontSize: "5.5rem", lineHeight: 1 }}
              >
                {activeKanji.kanji}
              </span>
              <SpeakButton
                text={activeKanji.examples?.[0]?.reading || activeKanji.kanji}
                iconSize={14}
                diameter={30}
                className="absolute bottom-2 right-2"
              />
            </div>
            <div className="text-center mt-4">
              <div className="text-slate-400 font-bold mb-1">대표 뜻과 음</div>
              <div className="flex justify-center items-end gap-2">
                <span className="text-3xl font-black text-slate-800">
                  {activeKanji.meaning}
                </span>
                <span className="text-3xl font-black text-slate-800">
                  {activeKanji.sound}
                </span>
              </div>
            </div>
          </div>
          {activeKanji.altReadings && activeKanji.altReadings.length > 0 && (
            <div className="bg-white w-full rounded-3xl shadow-sm border border-slate-200 p-8 mb-6 animate-in slide-in-from-bottom-4 duration-300 delay-75">
              <div className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                <Sparkles size={16} /> 이 한자, 이렇게도 읽고 쓰여요
              </div>
              <div className="flex flex-wrap gap-2">
                {activeKanji.altReadings.map((alt, idx) => (
                  <div
                    key={idx}
                    className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-2.5 text-sm"
                  >
                    <span className="font-black text-amber-700">
                      {alt.sound}
                    </span>
                    <span className="text-amber-500 font-medium">
                      {" "}
                      · {alt.meaning}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white w-full rounded-3xl shadow-sm border border-slate-200 p-8 animate-in slide-in-from-bottom-4 duration-300 delay-100">
            <div className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2">
              <PenTool size={16} /> 예시 단어
            </div>
            <div className="flex flex-col gap-6">
              {activeKanji.examples &&
                activeKanji.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="border-b border-slate-100 pb-5 last:border-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="mb-2">
                        <span className="text-2xl font-black text-slate-800 font-kanji">
                          {ex.word}
                        </span>
                        <span className="text-xl font-bold text-amber-600 ml-2">
                          【{ex.reading}】
                        </span>
                      </div>
                      <div className="text-slate-600 font-medium leading-relaxed">
                        {ex.meaning}
                      </div>
                    </div>
                    <SpeakButton
                      text={ex.reading || ex.word}
                      iconSize={15}
                      diameter={32}
                    />
                  </div>
                ))}
              {(!activeKanji.examples || activeKanji.examples.length === 0) && (
                <div className="text-slate-400 text-center py-4">
                  등록된 예시 단어가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (currentScreen === "vocabLevels") {
      return (
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center mb-10 pt-4 relative">
            <button
              onClick={goBackLearn}
              className="absolute left-0 p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="w-full text-center text-2xl font-black text-slate-800">
              단어 &amp; 문법 학습
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {JLPT_VOCAB_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => {
                  setActiveVocabLevel(level);
                  setCurrentScreen("vocabList");
                }}
                className="w-full bg-white py-8 px-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex justify-center items-center text-2xl font-black">
                    {level}
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-black text-slate-800 mb-1">
                      {level} 급수
                    </div>
                    <div className="text-sm font-semibold text-slate-400">
                      {VOCAB_DATA[level]?.length || 0}개의 단어 · 문법
                    </div>
                  </div>
                </div>
                <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-emerald-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (currentScreen === "vocabList") {
      const vocabList = VOCAB_DATA[activeVocabLevel] || [];
      const posColors = {
        "い형용사": "bg-rose-50 text-rose-500",
        "な형용사": "bg-purple-50 text-purple-500",
        동사: "bg-blue-50 text-blue-500",
        조사: "bg-amber-50 text-amber-600",
        부사: "bg-teal-50 text-teal-600",
      };
      return (
        <div className="w-full max-w-3xl mx-auto pb-10">
          <div className="flex items-center mb-6 pt-4 relative bg-slate-50 sticky top-0 z-10 py-4">
            <button
              onClick={goBackLearn}
              className="absolute left-0 p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="w-full text-center text-2xl font-black text-slate-800">
              {activeVocabLevel} 단어 &amp; 문법
            </h2>
          </div>
          {vocabList.length === 0 ? (
            <div className="text-center text-slate-500 py-20 font-medium">
              업데이트 예정입니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {vocabList.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => openVocabDetail(idx)}
                  className="relative bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-4 hover:shadow-md hover:border-emerald-400 hover:bg-emerald-50/40 transition-all duration-200"
                >
                  <span
                    className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      posColors[item.pos] || "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.pos}
                  </span>
                  <div className="text-xl font-black text-slate-800 mt-4 mb-1 font-kanji">
                    {item.word}
                  </div>
                  <div className="text-xs font-medium text-slate-400">
                    {item.meaning}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (currentScreen === "vocabDetail") {
      const vocabList = VOCAB_DATA[activeVocabLevel] || [];
      const item = vocabList[activeVocabIndex];
      if (!item) return null;

      const posColors = {
        "い형용사": "bg-rose-50 text-rose-500",
        "な형용사": "bg-purple-50 text-purple-500",
        동사: "bg-blue-50 text-blue-500",
        조사: "bg-amber-50 text-amber-600",
        부사: "bg-teal-50 text-teal-600",
      };

      const hasPrev = activeVocabIndex > 0;
      const hasNext = activeVocabIndex < vocabList.length - 1;

      const handlePrev = () => {
        if (hasPrev) {
          setSlideDirection("prev");
          scrollPosRef.current.vocabList = window.scrollY;
          setActiveVocabIndex((i) => i - 1);
        }
      };
      const handleNext = () => {
        if (hasNext) {
          setSlideDirection("next");
          scrollPosRef.current.vocabList = window.scrollY;
          setActiveVocabIndex((i) => i + 1);
        }
      };

      const handleTouchStart = (e) => {
        touchStartX.current = e.changedTouches[0].screenX;
        touchEndX.current = e.changedTouches[0].screenX;
      };
      const handleTouchMove = (e) => {
        touchEndX.current = e.changedTouches[0].screenX;
      };
      const handleTouchEnd = () => {
        const distance = touchStartX.current - touchEndX.current;
        if (distance > 50) handleNext();
        if (distance < -50) handlePrev();
        touchStartX.current = 0;
        touchEndX.current = 0;
      };

      return (
        <div className="w-full flex flex-col items-center relative">
          <div className="w-full max-w-2xl flex justify-between items-center mb-4 px-1">
            <button
              onClick={goBackLearn}
              className="p-3 text-slate-500 hover:text-slate-900 bg-white rounded-full shadow-md"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="text-slate-400 font-bold text-sm px-4 py-2 bg-white rounded-full shadow-sm">
              {activeVocabIndex + 1} / {vocabList.length}
            </div>
          </div>

          <div
            className="w-full flex items-center justify-between max-w-2xl mx-auto overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <button
              onClick={handlePrev}
              className={`hidden sm:flex p-3 mx-1 rounded-full transition-all shrink-0 ${
                hasPrev
                  ? "text-slate-400 hover:text-slate-800 hover:bg-white shadow-sm"
                  : "opacity-0 cursor-default"
              }`}
              disabled={!hasPrev}
            >
              <ChevronLeft size={32} />
            </button>

            <div
              key={activeVocabIndex}
              className={`bg-white w-full flex flex-col items-center overflow-hidden ${
                slideDirection === "next" ? "slide-next" : "slide-prev"
              }`}
              style={{ borderRadius: "2rem" }}
            >
              <div className="bg-white w-full rounded-[2rem] shadow-sm border border-slate-200 flex flex-col items-center p-8">
                <div className="flex items-center gap-2 mb-6 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-bold">
                  <Tag size={14} /> {item.pos}
                </div>

                <div className="relative w-full flex justify-center items-center py-4 min-h-[110px]">
                  <Furigana
                    segments={item.furigana}
                    fontSize="clamp(2rem, 8vw, 3rem)"
                  />
                  <SpeakButton
                    text={item.reading || item.word}
                    iconSize={14}
                    diameter={32}
                    className="absolute right-0 sm:right-4 bottom-0"
                  />
                </div>

                {item.pron && (
                  <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-600 font-bold text-sm px-3 py-1 rounded-full mb-1">
                    {item.pron}
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-100 py-4 px-6 rounded-2xl w-full text-center mt-4">
                  <span className="text-2xl font-black text-slate-800">
                    {item.meaning}
                  </span>
                </div>
              </div>

              {item.example && (
                <div className="bg-white w-full rounded-[2rem] shadow-sm border border-slate-200 p-8 mt-6">
                  <div className="text-sm font-bold text-slate-400 mb-5 flex items-center gap-2">
                    <PenTool size={16} /> 예시 문장
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Furigana
                      segments={item.example.segments}
                      fontSize="1.4rem"
                      className="flex-1 leading-[2.6]"
                    />
                    <SpeakButton
                      text={item.example.segments.map((s) => s.t).join("")}
                      iconSize={14}
                      diameter={30}
                      className="shrink-0 mt-1"
                    />
                  </div>
                  {item.example.pron && (
                    <div className="text-indigo-500 font-bold text-sm mb-4">
                      {item.example.pron}
                    </div>
                  )}
                  <div className="text-slate-500 font-medium border-t border-slate-100 pt-4">
                    {item.example.kr}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              className={`hidden sm:flex p-3 mx-1 rounded-full transition-all shrink-0 ${
                hasNext
                  ? "text-slate-400 hover:text-slate-800 hover:bg-white shadow-sm"
                  : "opacity-0 cursor-default"
              }`}
              disabled={!hasNext}
            >
              <ChevronRight size={32} />
            </button>
          </div>

          {/* 모바일용 좌우 넘기기 버튼 */}
          <div className="flex sm:hidden items-center justify-center gap-4 mt-6">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`p-3 rounded-full bg-white shadow-sm transition-all ${
                hasPrev ? "text-slate-600" : "text-slate-200"
              }`}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className={`p-3 rounded-full bg-white shadow-sm transition-all ${
                hasNext ? "text-slate-600" : "text-slate-200"
              }`}
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="mt-4 text-slate-400 font-bold text-xs">
            좌우로 스와이프하여 단어 넘기기
          </div>
        </div>
      );
    }
  };

  /* STREAMING_CHUNK:Testing Mode Logic and State Management... */
  // ── 테스트 모드 로직 ────────────────────────────────────────────────────────
  const goBackTest = () => {
    if (testScreen === "select") {
      scrollPosRef.current.testSelectList = 0;
      setTestScreen("menu");
    } else if (testScreen === "result") setTestScreen("menu");
  };

  const getAvailableTestChars = () => {
    let pool = [];
    if (testType === "hiragana") {
      KANA_DATA.forEach((row) =>
        row.kana.forEach((char) => {
          if (char) pool.push(char);
        })
      );
    } else if (testType === "katakana") {
      KANA_DATA.forEach((row) =>
        row.kata.forEach((char) => {
          if (char) pool.push(char);
        })
      );
    } else if (testType === "kanji") {
      KANJI_DATA["N5"].forEach((item) => pool.push(item.kanji));
    } else if (testType === "vocab") {
      VOCAB_DATA["N5"].forEach((item) => pool.push(item.word));
    }
    return pool;
  };

  const toggleAllTestChars = () => {
    const available = getAvailableTestChars();
    const isAllSelected = available.every((c) => selectedTestItems.includes(c));
    if (isAllSelected) {
      setSelectedTestItems([]);
    } else {
      setSelectedTestItems(available);
    }
  };

  const toggleRowSelect = (chars) => {
    const validChars = chars.filter(Boolean);
    const isRowSelected = validChars.every((c) =>
      selectedTestItems.includes(c)
    );
    if (isRowSelected) {
      setSelectedTestItems((prev) =>
        prev.filter((c) => !validChars.includes(c))
      );
    } else {
      setSelectedTestItems((prev) => [...new Set([...prev, ...validChars])]);
    }
  };

  const toggleSingleChar = (char) => {
    if (!char) return;
    if (selectedTestItems.includes(char)) {
      setSelectedTestItems((prev) => prev.filter((c) => c !== char));
    } else {
      setSelectedTestItems((prev) => [...prev, char]);
    }
  };

  const toggleAccordion = (rowName) => {
    setExpandedRows((prev) => ({ ...prev, [rowName]: !prev[rowName] }));
  };

  // item.furigana(단어의 세그먼트 구성)와 정확히 일치하는 구간을 예문 세그먼트에서 찾습니다.
  // (활용형 예문은 세그먼트가 달라지므로 매칭되지 않으면 건너뜁니다)
  const findFuriganaMatch = (segments, furigana) => {
    if (!segments || !furigana || furigana.length === 0) return -1;
    for (let i = 0; i <= segments.length - furigana.length; i++) {
      let match = true;
      for (let j = 0; j < furigana.length; j++) {
        const seg = segments[i + j];
        const fseg = furigana[j];
        if (!seg || seg.t !== fseg.t || (seg.r || "") !== (fseg.r || "")) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  };

  // 단어의 예문 중 하나를 골라 해당 단어 부분을 빈칸으로 치환합니다.
  const buildSentenceBlank = (item) => {
    if (!item.examples || item.examples.length === 0) return null;
    for (const ex of shuffleArray(item.examples)) {
      const idx = findFuriganaMatch(ex.segments, item.furigana);
      if (idx !== -1) {
        const before = ex.segments.slice(0, idx);
        const after = ex.segments.slice(idx + item.furigana.length);
        return {
          segments: [...before, { t: "○○○○", blank: true }, ...after],
          kr: ex.kr,
          speakText: ex.segments.map((s) => s.t).join(""),
        };
      }
    }
    return null;
  };

  const buildTestPool = () => {
    let pool = [];
    if (testType === "hiragana") {
      KANA_DATA.forEach((row) => {
        row.kana.forEach((char, idx) => {
          if (char && selectedTestItems.includes(char))
            pool.push({ char, answer: row.kr[idx], type: "kana" });
        });
      });
    } else if (testType === "katakana") {
      KANA_DATA.forEach((row) => {
        row.kata.forEach((char, idx) => {
          if (char && selectedTestItems.includes(char))
            pool.push({ char, answer: row.kr[idx], type: "kana" });
        });
      });
    } else if (testType === "kanji") {
      KANJI_DATA["N5"].forEach((item) => {
        if (selectedTestItems.includes(item.kanji))
          pool.push({
            char: item.kanji,
            answer: `${item.meaning} ${item.sound}`,
            type: "kanji",
          });
      });
    } else if (testType === "vocab") {
      VOCAB_DATA["N5"].forEach((item) => {
        if (selectedTestItems.includes(item.word)) {
          pool.push({
            char: item.word,
            reading: item.reading,
            answer: item.meaning,
            displaySegments: item.furigana,
            type: "vocabMeaning",
          });
          pool.push({
            char: item.word,
            reading: item.reading,
            answer: item.reading,
            displaySegments: [{ t: item.word }],
            type: "vocabReading",
          });
          pool.push({
            char: item.meaning,
            answer: item.word,
            type: "vocabWord",
          });
          const blank = buildSentenceBlank(item);
          if (blank) {
            pool.push({
              char: item.word,
              reading: item.reading,
              answer: item.word,
              sentenceSegments: blank.segments,
              sentenceKr: blank.kr,
              speakText: blank.speakText,
              type: "vocabSentence",
            });
          }
        }
      });
    }
    return pool;
  };

  const startTest = () => {
    const fullPool = buildTestPool();
    if (fullPool.length < 4) return;

    const queue = shuffleArray([...fullPool]);
    setQuizQueue(queue);
    setScore(0);
    setQuestionIndex(0);
    loadTestQuestion(queue, 0, fullPool);
    setTestScreen("playing");
  };

  const loadTestQuestion = (queue, index, fullPool) => {
    const correct = queue[index];
    const poolWithoutCorrect = fullPool.filter(
      (item) => item.answer !== correct.answer && item.type === correct.type
    );
    const shuffledOthers = shuffleArray(poolWithoutCorrect).slice(0, 3);
    const finalOptions = shuffleArray([correct, ...shuffledOthers]);

    setCurrentQuestion(correct);
    setOptions(finalOptions);
    setSelectedAnswer(null);
    setIsRevealed(false);
  };

  const handleTestOptionSelect = (option) => {
    if (isRevealed) return;
    setSelectedAnswer(option);
    setIsRevealed(true);

    const isCorrect = option.answer === currentQuestion.answer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      playCorrectSound();
    } else {
      playWrongSound();
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const nextTestQuestion = () => {
    if (questionIndex + 1 >= quizQueue.length) {
      setTestScreen("result");
    } else {
      const fullPool = buildTestPool();
      setQuestionIndex((prev) => prev + 1);
      loadTestQuestion(quizQueue, questionIndex + 1, fullPool);
    }
  };

  /* STREAMING_CHUNK:Rendering Testing Mode Views... */
  const renderTestMode = () => {
    if (testScreen === "menu") {
      return (
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4 animate-in fade-in">
          <button
            onClick={() => {
              setTestType("hiragana");
              setSelectedTestItems([]);
              setTestScreen("select");
            }}
            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-rose-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex justify-center items-center text-3xl font-bold">
                あ
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-800">
                  히라가나 테스트
                </div>
                <div className="text-sm text-slate-400">맞춤형 실력 점검</div>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-rose-500 transition-colors" />
          </button>

          <button
            onClick={() => {
              setTestType("katakana");
              setSelectedTestItems([]);
              setTestScreen("select");
            }}
            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-blue-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex justify-center items-center text-3xl font-bold">
                ア
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-800">
                  가타카나 테스트
                </div>
                <div className="text-sm text-slate-400">맞춤형 실력 점검</div>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-blue-500 transition-colors" />
          </button>

          <button
            onClick={() => {
              setTestType("kanji");
              setSelectedTestItems([]);
              setTestScreen("select");
            }}
            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-amber-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex justify-center items-center text-3xl font-bold">
                漢
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-800">
                  한자 테스트
                </div>
                <div className="text-sm text-slate-400">의미/독음 맞추기</div>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-amber-500 transition-colors" />
          </button>

          <button
            onClick={() => {
              setTestType("vocab");
              setSelectedTestItems([]);
              setTestScreen("select");
            }}
            className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md hover:border-emerald-400 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex justify-center items-center">
                <BookOpen size={28} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="text-xl font-bold text-slate-800">
                  단어 &amp; 문법 테스트
                </div>
                <div className="text-sm text-slate-400">뜻과 발음 맞추기</div>
              </div>
            </div>
            <ChevronLeft className="rotate-180 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </button>
        </div>
      );
    }

    if (testScreen === "select") {
      const isHiragana = testType === "hiragana";
      const isKanji = testType === "kanji";
      const isVocab = testType === "vocab";
      const titleName = isHiragana
        ? "히라가나"
        : isKanji
        ? "한자"
        : isVocab
        ? "단어 & 문법"
        : "가타카나";
      const themeColor = isKanji
        ? "text-amber-500"
        : isVocab
        ? "text-emerald-500"
        : "text-green-500";
      const themeBg = isKanji
        ? "bg-amber-50"
        : isVocab
        ? "bg-emerald-50"
        : "bg-green-50";
      const themeBorder = isKanji
        ? "border-amber-500"
        : isVocab
        ? "border-emerald-500"
        : "border-green-500";
      const titleBarColor = isKanji
        ? "bg-amber-500"
        : isVocab
        ? "bg-emerald-500"
        : "bg-green-500";

      const availableChars = getAvailableTestChars();
      const isAllSelected =
        availableChars.length > 0 &&
        availableChars.every((c) => selectedTestItems.includes(c));

      return (
        <div className="w-full max-w-lg mx-auto pb-32">
          <div className="flex items-center justify-between mb-6 pt-4 relative">
            <button
              onClick={goBackTest}
              className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-black text-slate-800">
              {titleName} 테스트 설정
            </h2>
            <div className="w-10"></div>
          </div>

          <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="font-bold text-slate-700">전체 선택</div>
            <button
              onClick={toggleAllTestChars}
              className={`transition-colors ${
                isAllSelected ? themeColor : "text-slate-300"
              }`}
            >
              {isAllSelected ? <CheckSquare size={26} /> : <Square size={26} />}
            </button>
          </div>

          <div className="space-y-6">
            {!isKanji && !isVocab ? (
              Object.entries(groupedKana).map(([type, rows], groupIdx) => (
                <div key={groupIdx} className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div
                      className={`h-4 w-1 rounded-full ${titleBarColor}`}
                    ></div>
                    <h3 className="text-lg font-black text-slate-800">
                      {type}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {rows.map((rowItem, idx) => {
                      const rowChars = isHiragana ? rowItem.kana : rowItem.kata;
                      const validChars = rowChars.filter(Boolean);
                      const isRowSelected =
                        validChars.length > 0 &&
                        validChars.every((c) => selectedTestItems.includes(c));
                      const isExpanded = expandedRows[rowItem.row];

                      return (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                        >
                          <div className="flex justify-between items-center p-4">
                            <button
                              onClick={() => toggleAccordion(rowItem.row)}
                              className="flex items-center gap-2 flex-1 text-left font-bold text-slate-700"
                            >
                              {isExpanded ? (
                                <ChevronUp
                                  size={20}
                                  className="text-slate-400"
                                />
                              ) : (
                                <ChevronDown
                                  size={20}
                                  className="text-slate-400"
                                />
                              )}
                              {rowItem.row}
                            </button>
                            <button
                              onClick={() => toggleRowSelect(validChars)}
                              className={`p-1 transition-colors ${
                                isRowSelected ? themeColor : "text-slate-300"
                              }`}
                            >
                              {isRowSelected ? (
                                <CheckSquare size={24} />
                              ) : (
                                <Square size={24} />
                              )}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="p-4 pt-0 grid grid-cols-5 gap-2 border-t border-slate-100 bg-slate-50/50 mt-2">
                              {rowChars.map((char, charIdx) => {
                                if (!char) return <div key={charIdx} />;
                                const isSelected =
                                  selectedTestItems.includes(char);
                                return (
                                  <button
                                    key={charIdx}
                                    onClick={() => toggleSingleChar(char)}
                                    className={`relative aspect-square rounded-2xl flex justify-center items-center text-3xl font-bold border-2 transition-all duration-200 ${
                                      isSelected
                                        ? `${themeBg} ${themeBorder} ${themeColor}`
                                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                    }`}
                                  >
                                    {char}
                                    {isSelected && (
                                      <CheckCircle
                                        size={14}
                                        className="absolute top-1 right-1"
                                      />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : isKanji ? (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {KANJI_DATA["N5"].map((item, idx) => {
                    const isSelected = selectedTestItems.includes(item.kanji);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleSingleChar(item.kanji)}
                        className={`relative aspect-square rounded-2xl flex flex-col justify-center items-center border-2 transition-all duration-200 ${
                          isSelected
                            ? `${themeBg} ${themeBorder} ${themeColor}`
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`text-3xl font-black mb-1 font-kanji ${
                            isSelected ? themeColor : "text-slate-800"
                          }`}
                        >
                          {item.kanji}
                        </div>
                        <div
                          className={`text-xs font-bold flex gap-1 ${
                            isSelected ? themeColor : "text-slate-500"
                          }`}
                        >
                          <span>{item.meaning}</span>
                          <span>{item.sound}</span>
                        </div>
                        {isSelected && (
                          <CheckCircle
                            size={14}
                            className="absolute top-1 right-1"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {VOCAB_DATA["N5"].map((item, idx) => {
                    const isSelected = selectedTestItems.includes(item.word);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleSingleChar(item.word)}
                        className={`relative rounded-2xl flex flex-col justify-center items-center gap-1 border-2 py-4 px-2 transition-all duration-200 ${
                          isSelected
                            ? `${themeBg} ${themeBorder} ${themeColor}`
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`text-lg font-black font-kanji text-center ${
                            isSelected ? themeColor : "text-slate-800"
                          }`}
                        >
                          {item.word}
                        </div>
                        <div
                          className={`text-xs font-bold text-center ${
                            isSelected ? themeColor : "text-slate-500"
                          }`}
                        >
                          {item.meaning}
                        </div>
                        {isSelected && (
                          <CheckCircle
                            size={14}
                            className="absolute top-1 right-1"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div
            className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 z-50"
            style={{ boxShadow: "0 -10px 20px -10px rgba(0,0,0,0.05)" }}
          >
            <div className="max-w-md mx-auto flex flex-col gap-3">
              <button
                onClick={startTest}
                disabled={selectedTestItems.length < 4}
                className={`w-full py-4 rounded-xl text-white font-black text-lg flex items-center justify-center gap-2 transition-all ${
                  selectedTestItems.length < 4
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-slate-800 shadow-lg"
                }`}
              >
                <PlayCircle size={22} fill="currentColor" />
                {selectedTestItems.length < 4
                  ? "최소 4개 이상 선택 필요"
                  : `${selectedTestItems.length}개 선택됨 - 시작`}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (testScreen === "playing") {
      const total = quizQueue.length;
      const progressPercent = (questionIndex / total) * 100;
      const isCorrectAnswer =
        isRevealed && selectedAnswer?.answer === currentQuestion?.answer;

      // 문제 유형별 안내 문구
      const instructionText =
        currentQuestion?.type === "kanji"
          ? "한자의 뜻과 음을 고르세요!"
          : currentQuestion?.type === "vocabMeaning"
          ? "단어의 뜻을 고르세요!"
          : currentQuestion?.type === "vocabReading"
          ? "단어의 발음을 고르세요!"
          : currentQuestion?.type === "vocabWord"
          ? "뜻에 알맞은 단어를 고르세요!"
          : currentQuestion?.type === "vocabSentence"
          ? "빈칸에 들어갈 알맞은 단어를 고르세요!"
          : testType === "hiragana"
          ? "히라가나의 발음을 고르세요!"
          : "가타카나의 발음을 고르세요!";
      const isVocabQuestion =
        currentQuestion?.type === "vocabMeaning" ||
        currentQuestion?.type === "vocabReading";

      // 문제 카드 상단에 표시할 컨텐츠 (유형별로 레이아웃이 다름)
      let questionPromptNode;
      if (currentQuestion?.type === "vocabSentence") {
        questionPromptNode = (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex items-start gap-2 w-full justify-center">
              <Furigana
                segments={currentQuestion?.sentenceSegments}
                fontSize="clamp(1.3rem, 5.5vw, 1.75rem)"
                className="flex-1 leading-[2.4] justify-center"
              />
              <SpeakButton
                text={currentQuestion?.speakText}
                iconSize={14}
                diameter={30}
                className="shrink-0 mt-1"
              />
            </div>
            {currentQuestion?.sentenceKr && (
              <div className="text-slate-400 font-medium text-sm">
                {currentQuestion.sentenceKr}
              </div>
            )}
          </div>
        );
      } else if (currentQuestion?.type === "vocabWord") {
        questionPromptNode = (
          <div
            className="text-slate-800"
            style={{ fontSize: "2.5rem", lineHeight: 1.3, fontWeight: 900 }}
          >
            {currentQuestion?.char}
          </div>
        );
      } else if (isVocabQuestion) {
        questionPromptNode = (
          <div className="flex items-center gap-3">
            <Furigana
              segments={currentQuestion?.displaySegments}
              fontSize="clamp(2.25rem, 9vw, 3.25rem)"
            />
            <SpeakButton
              text={currentQuestion?.reading || currentQuestion?.char}
              iconSize={15}
              diameter={34}
              className="self-end mb-2"
            />
          </div>
        );
      } else {
        questionPromptNode = (
          <div className="flex items-center gap-3">
            <div
              className={`text-slate-800 ${
                currentQuestion?.type === "kanji" ? "font-kanji" : ""
              }`}
              style={{
                fontSize: "4.5rem",
                lineHeight: 1,
                fontWeight: 900,
              }}
            >
              {currentQuestion?.char}
            </div>
            <SpeakButton
              text={currentQuestion?.reading || currentQuestion?.char}
              iconSize={15}
              diameter={34}
              className="self-end mb-2"
            />
          </div>
        );
      }

      return (
        <div className="w-full max-w-md mx-auto pb-40 relative">
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              20% { transform: translateX(-10px); }
              40% { transform: translateX(10px); }
              60% { transform: translateX(-5px); }
              80% { transform: translateX(5px); }
            }
            .shake-anim { animation: shake 0.5s ease-in-out; }
          `}</style>

          {/* 상단 헤더: 닫기 버튼 + 진행률 배지 */}
          <div className="flex items-center justify-between mb-3 pt-4">
            <button
              onClick={() => setShowExitModal(true)}
              className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm"
              aria-label="테스트 종료"
            >
              <X size={22} />
            </button>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-4 py-1.5 rounded-full">
              <BadgeCheck size={16} className="text-blue-500" />
              <span className="text-slate-800 font-bold text-sm">
                {questionIndex + 1} / {total}
              </span>
            </div>
            <div className="w-[38px]" />
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 문제 카드 */}
          <div
            className={`bg-white w-full rounded-3xl shadow-sm border border-slate-200 overflow-hidden ${
              shake ? "shake-anim" : ""
            }`}
          >
            <div className="flex flex-col items-center py-10 px-6 bg-slate-50/50 text-center">
              <div className="text-slate-400 font-bold mb-5 text-sm">
                {instructionText}
              </div>
              {questionPromptNode}
              {isRevealed && (
                <div className="w-full mt-6 pt-5 border-t border-dashed border-slate-200 pop-in">
                  <span
                    className={`text-xl font-bold text-slate-500 ${
                      currentQuestion?.type === "vocabWord" ||
                      currentQuestion?.type === "vocabSentence"
                        ? "font-kanji"
                        : ""
                    }`}
                  >
                    {currentQuestion?.answer}
                  </span>
                </div>
              )}
            </div>

            {/* 선택지 */}
            <div className="grid grid-cols-2 gap-3 p-5">
              {options.map((option, index) => {
                const isSelected = selectedAnswer?.answer === option.answer;
                const isCorrect = currentQuestion?.answer === option.answer;

                let btnStyle =
                  "bg-white border-slate-200 hover:border-slate-300 text-slate-800";
                if (isRevealed) {
                  if (isCorrect)
                    btnStyle =
                      "bg-green-50 border-green-500 text-green-700 shadow-lg scale-105";
                  else if (isSelected)
                    btnStyle = "bg-red-50 border-red-500 text-red-700";
                  else
                    btnStyle =
                      "bg-slate-50 border-slate-100 text-slate-300 opacity-50";
                }

                return (
                  <button
                    key={index}
                    disabled={isRevealed}
                    onClick={() => handleTestOptionSelect(option)}
                    className={`relative py-6 px-3 rounded-2xl border-2 font-bold text-lg sm:text-xl transition-all duration-200 flex justify-center items-center text-center ${
                      currentQuestion?.type === "vocabWord" ||
                      currentQuestion?.type === "vocabSentence"
                        ? "font-kanji"
                        : ""
                    } ${btnStyle}`}
                  >
                    {option.answer}
                    {isRevealed && isCorrect && (
                      <CheckCircle
                        size={20}
                        className="absolute top-2 right-2 text-green-500"
                      />
                    )}
                    {isRevealed && isSelected && !isCorrect && (
                      <XCircle
                        size={20}
                        className="absolute top-2 right-2 text-red-500"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 하단 고정 피드백 바 (정답/오답 시에만 표시) */}
          {isRevealed && (
            <div
              className={`fixed bottom-0 left-0 w-full feedback-slide-up px-5 pt-4 pb-6 border-t z-50 ${
                isCorrectAnswer
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
              style={{ boxShadow: "0 -10px 20px -10px rgba(0,0,0,0.06)" }}
            >
              <div className="max-w-md mx-auto">
                <div
                  className={`flex items-center gap-2 font-black text-lg mb-1 ${
                    isCorrectAnswer ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isCorrectAnswer ? (
                    <CheckCircle size={22} />
                  ) : (
                    <XCircle size={22} />
                  )}
                  {isCorrectAnswer ? "잘했어요!" : "틀렸어요!"}
                </div>
                {!isCorrectAnswer && (
                  <div className="text-red-500 font-medium text-sm mb-4">
                    {currentQuestion?.type === "vocabSentence" ? (
                      <>
                        정답은{" "}
                        <span className="font-bold font-kanji">
                          {currentQuestion?.answer}
                        </span>{" "}
                        이에요.
                      </>
                    ) : (
                      <>
                        {currentQuestion?.char}
                        {"  "}
                        (은)는{" "}
                        <span
                          className={`font-bold ${
                            currentQuestion?.type === "vocabWord"
                              ? "font-kanji"
                              : ""
                          }`}
                        >
                          {currentQuestion?.answer}
                        </span>{" "}
                        (이)라고 해요.
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={nextTestQuestion}
                  className={`w-full py-4 rounded-2xl text-white font-black text-lg transition-all active:scale-[0.98] ${
                    isCorrectAnswer
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {questionIndex + 1 < total ? "다음" : "완료"}
                </button>
              </div>
            </div>
          )}

          {showExitModal && (
            <div className="fixed inset-0 bg-slate-900/40 flex justify-center items-center z-50 px-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  테스트 종료
                </h3>
                <p className="text-slate-500 mb-6 font-medium">
                  정말 테스트를 중지하고 나가시겠습니까?
                  <br />
                  진행 상황은 저장되지 않습니다.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExitModal(false)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      setShowExitModal(false);
                      setTestScreen("menu");
                      setSelectedTestItems([]);
                    }}
                    className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-md transition-colors"
                  >
                    종료하기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (testScreen === "result") {
      const total = quizQueue.length;
      const isPerfect = score === total;
      const isGood = score >= total * 0.7;

      return (
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl border border-slate-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 mx-auto">
          {isPerfect ? (
            <Trophy size={80} className="text-amber-500 mb-6" />
          ) : isGood ? (
            <Star size={80} className="text-blue-500 mb-6" />
          ) : (
            <RefreshCcw size={80} className="text-slate-400 mb-6" />
          )}

          <h2 className="text-2xl font-black text-slate-900 mb-6">
            테스트 완료!
          </h2>

          <div className="mb-8">
            <div
              className="text-slate-800 mb-2"
              style={{ fontSize: "3.75rem", fontWeight: 900, lineHeight: 1.1 }}
            >
              {score} <span className="text-3xl text-slate-300">/ {total}</span>
            </div>
            <p className="font-bold text-slate-500">
              {isPerfect
                ? "완벽합니다! 100점이에요! 🎉"
                : isGood
                ? "잘하셨어요! 조금만 더 해봐요! 👍"
                : "꾸준히 연습하면 늘 거예요! 💪"}
            </p>
          </div>

          <button
            onClick={() => {
              setTestScreen("menu");
              setSelectedTestItems([]);
            }}
            className="w-full py-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 shadow-md transition-colors"
          >
            새로운 테스트 시작하기
          </button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 pt-10 font-sans">
      <style>{CUSTOM_STYLES}</style>

      {/* 최상단 모드 스위처 (메인 메뉴와 설정 화면에서만 표시) */}
      {((appMode === "learn" && currentScreen === "menu") ||
        (appMode === "test" &&
          (testScreen === "menu" || testScreen === "select"))) && (
        <ModeSwitcher />
      )}

      {appMode === "learn" ? renderLearnMode() : renderTestMode()}
    </div>
  );
}
