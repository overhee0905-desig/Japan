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
            className="inline-flex items-center justify-center border-b-4 border-blue-400"
            style={{ margin: "0 2px", minWidth: "2.2em", height: "1em" }}
          />
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
      onyomi: [
        { reading: "ジン", kr: "진", word: "外人", wordReading: "がいじん", meaning: "외국인" },
        { reading: "ニン", kr: "닌", word: "三人", wordReading: "さんにん", meaning: "세 사람" },
      ],
      kunyomi: [
        { reading: "ひと", kr: "히토", word: "人", wordReading: "ひと", meaning: "사람, 인간" },
      ],
      examples: [
        { word: "人", reading: "ひと", meaning: "사람, 인간" },
        { word: "三人", reading: "さんにん", meaning: "세 사람" },
      ],
    },
    {
      kanji: "大",
      meaning: "큰",
      sound: "대",
      onyomi: [
        { reading: "ダイ", kr: "다이", word: "大学", wordReading: "だいがく", meaning: "대학" },
        { reading: "タイ", kr: "타이", word: "大切", wordReading: "たいせつ", meaning: "소중함" },
      ],
      kunyomi: [
        { reading: "おお", kr: "오오", word: "大きい", wordReading: "おおきい", meaning: "크다" },
      ],
      examples: [{ word: "大きい", reading: "おおきい", meaning: "크다" }],
    },
    {
      kanji: "一",
      meaning: "한",
      sound: "일",
      onyomi: [
        { reading: "イチ", kr: "이치", word: "一", wordReading: "いち", meaning: "일, 하나" },
        { reading: "イツ", kr: "이츠", word: "統一", wordReading: "とういつ", meaning: "통일" },
      ],
      kunyomi: [
        { reading: "ひと", kr: "히토", word: "一つ", wordReading: "ひとつ", meaning: "한 개" },
      ],
      examples: [
        { word: "一", reading: "いち", meaning: "일, 하나" },
        { word: "一つ", reading: "ひとつ", meaning: "한 개" },
      ],
    },
    {
      kanji: "分",
      meaning: "나눌",
      sound: "분",
      onyomi: [
        { reading: "ブン", kr: "분", word: "十分", wordReading: "じゅうぶん", meaning: "충분함" },
        { reading: "フン", kr: "훈", word: "分", wordReading: "ふん / ぷん", meaning: "-분 (시간 단위)" },
        { reading: "ブ", kr: "부", word: "一分", wordReading: "いちぶ", meaning: "일부, 약간" },
      ],
      kunyomi: [
        { reading: "わ", kr: "와", word: "分かる", wordReading: "わかる", meaning: "이해하다, 알다" },
      ],
      examples: [{ word: "分", reading: "ふん / ぷん", meaning: "-분 (시간 단위)" }],
    },
    {
      kanji: "見",
      meaning: "볼",
      sound: "견",
      onyomi: [
        { reading: "ケン", kr: "켄", word: "見学", wordReading: "けんがく", meaning: "견학" },
      ],
      kunyomi: [
        { reading: "み", kr: "미", word: "見る", wordReading: "みる", meaning: "보다" },
      ],
      examples: [
        { word: "見る", reading: "みる", meaning: "보다" },
        { word: "見学", reading: "けんがく", meaning: "견학" },
      ],
    },
    {
      kanji: "出",
      meaning: "날",
      sound: "출",
      onyomi: [
        { reading: "シュツ", kr: "슈츠", word: "出席", wordReading: "しゅっせき", meaning: "출석" },
        { reading: "スイ", kr: "스이", word: "出納", wordReading: "すいとう", meaning: "출납" },
      ],
      kunyomi: [
        { reading: "で", kr: "데", word: "出る", wordReading: "でる", meaning: "나가다, 나오다" },
        { reading: "だ", kr: "다", word: "出す", wordReading: "だす", meaning: "꺼내다, 내다" },
      ],
      examples: [
        { word: "出る", reading: "でる", meaning: "나가다, 나오다" },
        { word: "出発", reading: "しゅっぱつ", meaning: "출발" },
      ],
    },
    {
      kanji: "日",
      meaning: "날",
      sound: "일",
      onyomi: [
        { reading: "ニチ", kr: "니치", word: "日曜日", wordReading: "にちようび", meaning: "일요일" },
        { reading: "ジツ", kr: "지츠", word: "休日", wordReading: "きゅうじつ", meaning: "휴일" },
      ],
      kunyomi: [
        { reading: "ひ", kr: "히", word: "日", wordReading: "ひ", meaning: "날, 해, 낮" },
        { reading: "か", kr: "카", word: "三日", wordReading: "みっか", meaning: "3일" },
      ],
      examples: [
        { word: "日", reading: "ひ", meaning: "날, 해, 낮" },
        { word: "日曜日", reading: "にちようび", meaning: "일요일" },
      ],
    },
    {
      kanji: "行",
      meaning: "다닐",
      sound: "행",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "旅行", wordReading: "りょこう", meaning: "여행" },
        { reading: "ギョウ", kr: "교우", word: "行事", wordReading: "ぎょうじ", meaning: "행사" },
        { reading: "アン", kr: "안", word: "行脚", wordReading: "あんぎゃ", meaning: "순례, 방랑" },
      ],
      kunyomi: [
        { reading: "い", kr: "이", word: "行く", wordReading: "いく", meaning: "가다" },
        { reading: "おこな", kr: "오코나", word: "行う", wordReading: "おこなう", meaning: "행하다, 실시하다" },
      ],
      examples: [
        { word: "行く", reading: "いく", meaning: "가다" },
        { word: "旅行", reading: "りょこう", meaning: "여행" },
      ],
    },
    {
      kanji: "前",
      meaning: "앞",
      sound: "전",
      onyomi: [
        { reading: "ゼン", kr: "젠", word: "前後", wordReading: "ぜんご", meaning: "전후" },
      ],
      kunyomi: [
        { reading: "まえ", kr: "마에", word: "前", wordReading: "まえ", meaning: "앞, 이전" },
      ],
      examples: [{ word: "前", reading: "まえ", meaning: "앞, 이전" }],
    },
    {
      kanji: "時",
      meaning: "때",
      sound: "시",
      onyomi: [
        { reading: "ジ", kr: "지", word: "時間", wordReading: "じかん", meaning: "시간 (기간)" },
      ],
      kunyomi: [
        { reading: "とき", kr: "토키", word: "時々", wordReading: "ときどき", meaning: "가끔, 때때로" },
      ],
      examples: [{ word: "時間", reading: "じかん", meaning: "시간 (기간)" }],
    },
    {
      kanji: "生",
      meaning: "날",
      sound: "생",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "生徒", wordReading: "せいと", meaning: "학생, 생도" },
        { reading: "ショウ", kr: "쇼우", word: "一生", wordReading: "いっしょう", meaning: "일생, 평생" },
      ],
      kunyomi: [
        { reading: "い", kr: "이", word: "生きる", wordReading: "いきる", meaning: "살다" },
        { reading: "う", kr: "우", word: "生まれる", wordReading: "うまれる", meaning: "태어나다" },
        { reading: "なま", kr: "나마", word: "生ビール", wordReading: "なまビール", meaning: "생맥주" },
        { reading: "は", kr: "하", word: "生える", wordReading: "はえる", meaning: "자라나다, 나다" },
      ],
      examples: [
        { word: "生きる", reading: "いきる", meaning: "살다" },
        { word: "生まれる", reading: "うまれる", meaning: "태어나다" },
      ],
    },
    {
      kanji: "本",
      meaning: "근본",
      sound: "본",
      onyomi: [
        { reading: "ホン", kr: "혼", word: "本", wordReading: "ほん", meaning: "책" },
      ],
      kunyomi: [
        { reading: "もと", kr: "모토", word: "本より", wordReading: "もとより", meaning: "원래, 본래" },
      ],
      examples: [{ word: "本", reading: "ほん", meaning: "책" }],
    },
    {
      kanji: "中",
      meaning: "가운데",
      sound: "중",
      onyomi: [
        { reading: "チュウ", kr: "츄우", word: "中止", wordReading: "ちゅうし", meaning: "중지" },
      ],
      kunyomi: [
        { reading: "なか", kr: "나카", word: "中", wordReading: "なか", meaning: "안, 속, 가운데" },
      ],
      examples: [{ word: "中", reading: "なか", meaning: "안, 속, 가운데" }],
    },
    {
      kanji: "今",
      meaning: "이제",
      sound: "금",
      onyomi: [
        { reading: "コン", kr: "콘", word: "今回", wordReading: "こんかい", meaning: "이번" },
        { reading: "キン", kr: "킨", word: "今上", wordReading: "きんじょう", meaning: "현재의 천황(존칭)" },
      ],
      kunyomi: [
        { reading: "いま", kr: "이마", word: "今", wordReading: "いま", meaning: "지금" },
      ],
      examples: [{ word: "今", reading: "いま", meaning: "지금" }],
    },
    {
      kanji: "間",
      meaning: "사이",
      sound: "간",
      onyomi: [
        { reading: "カン", kr: "칸", word: "間隔", wordReading: "かんかく", meaning: "간격" },
        { reading: "ケン", kr: "켄", word: "世間", wordReading: "せけん", meaning: "세상" },
      ],
      kunyomi: [
        { reading: "あいだ", kr: "아이다", word: "間", wordReading: "あいだ", meaning: "사이, 간격" },
        { reading: "ま", kr: "마", word: "間に合う", wordReading: "まにあう", meaning: "시간에 맞추다" },
      ],
      examples: [{ word: "間", reading: "あいだ", meaning: "사이, 간격" }],
    },
    {
      kanji: "年",
      meaning: "해",
      sound: "년",
      onyomi: [
        { reading: "ネン", kr: "넨", word: "来年", wordReading: "らいねん", meaning: "내년" },
      ],
      kunyomi: [
        { reading: "とし", kr: "토시", word: "年", wordReading: "とし", meaning: "해, 나이" },
      ],
      examples: [{ word: "年", reading: "とし", meaning: "해, 나이" }],
    },
    {
      kanji: "子",
      meaning: "아들",
      sound: "자",
      onyomi: [
        { reading: "シ", kr: "시", word: "帽子", wordReading: "ぼうし", meaning: "모자" },
        { reading: "ス", kr: "스", word: "様子", wordReading: "ようす", meaning: "모습, 상황" },
      ],
      kunyomi: [
        { reading: "こ", kr: "코", word: "子供", wordReading: "こども", meaning: "어린이" },
      ],
      examples: [{ word: "子供", reading: "こども", meaning: "어린이" }],
    },
    {
      kanji: "長",
      meaning: "길",
      sound: "장",
      onyomi: [
        { reading: "チョウ", kr: "쵸우", word: "社長", wordReading: "しゃちょう", meaning: "사장" },
      ],
      kunyomi: [
        { reading: "なが", kr: "나가", word: "長い", wordReading: "ながい", meaning: "길다" },
      ],
      examples: [{ word: "長い", reading: "ながい", meaning: "길다" }],
    },
    {
      kanji: "上",
      meaning: "윗",
      sound: "상",
      onyomi: [
        { reading: "ジョウ", kr: "죠우", word: "上手", wordReading: "じょうず", meaning: "잘함, 능숙함" },
        { reading: "ショウ", kr: "쇼우", word: "上人", wordReading: "しょうにん", meaning: "스님(높임말)" },
      ],
      kunyomi: [
        { reading: "うえ", kr: "우에", word: "上", wordReading: "うえ", meaning: "위" },
        { reading: "あ", kr: "아", word: "上がる", wordReading: "あがる", meaning: "오르다" },
        { reading: "のぼ", kr: "노보", word: "上る", wordReading: "のぼる", meaning: "오르다" },
        { reading: "かみ", kr: "카미", word: "川上", wordReading: "かわかみ", meaning: "강 상류" },
      ],
      examples: [
        { word: "上", reading: "うえ", meaning: "위" },
        { word: "上がる", reading: "あがる", meaning: "오르다" },
      ],
    },
    {
      kanji: "入",
      meaning: "들",
      sound: "입",
      onyomi: [
        { reading: "ニュウ", kr: "뉴우", word: "入学", wordReading: "にゅうがく", meaning: "입학" },
      ],
      kunyomi: [
        { reading: "はい", kr: "하이", word: "入る", wordReading: "はいる", meaning: "들어가다" },
        { reading: "い", kr: "이", word: "入る", wordReading: "はいる", meaning: "들어가다" },
      ],
      examples: [{ word: "入る", reading: "はいる", meaning: "들어가다" }],
    },
    {
      kanji: "後",
      meaning: "뒤",
      sound: "후",
      onyomi: [
        { reading: "ゴ", kr: "고", word: "午後", wordReading: "ごご", meaning: "오후" },
        { reading: "コウ", kr: "코우", word: "後輩", wordReading: "こうはい", meaning: "후배" },
      ],
      kunyomi: [
        { reading: "うしろ", kr: "우시로", word: "後ろ", wordReading: "うしろ", meaning: "뒤" },
        { reading: "あと", kr: "아토", word: "後で", wordReading: "あとで", meaning: "나중에" },
        { reading: "のち", kr: "노치", word: "後ほど", wordReading: "のちほど", meaning: "나중에(격식)" },
      ],
      examples: [{ word: "後ろ", reading: "うしろ", meaning: "뒤" }],
    },
    {
      kanji: "気",
      meaning: "기운",
      sound: "기",
      onyomi: [
        { reading: "キ", kr: "키", word: "気", wordReading: "き", meaning: "기운, 마음" },
        { reading: "ケ", kr: "케", word: "気配", wordReading: "けはい", meaning: "기색, 기미" },
      ],
      kunyomi: [],
      examples: [{ word: "気", reading: "き", meaning: "기운, 마음" }],
    },
    {
      kanji: "来",
      meaning: "올",
      sound: "래",
      onyomi: [
        { reading: "ライ", kr: "라이", word: "来週", wordReading: "らいしゅう", meaning: "다음 주" },
      ],
      kunyomi: [
        { reading: "く", kr: "쿠", word: "来る", wordReading: "くる", meaning: "오다" },
        { reading: "きた", kr: "키타", word: "来る", wordReading: "きたる", meaning: "다가오는, 오는(격식)" },
      ],
      examples: [{ word: "来る", reading: "くる", meaning: "오다" }],
    },
    {
      kanji: "話",
      meaning: "말씀",
      sound: "화",
      onyomi: [
        { reading: "ワ", kr: "와", word: "会話", wordReading: "かいわ", meaning: "회화, 대화" },
      ],
      kunyomi: [
        { reading: "はな", kr: "하나", word: "話す", wordReading: "はなす", meaning: "말하다" },
        { reading: "はなし", kr: "하나시", word: "話", wordReading: "はなし", meaning: "이야기" },
      ],
      examples: [{ word: "話す", reading: "はなす", meaning: "말하다" }],
    },
    {
      kanji: "女",
      meaning: "계집",
      sound: "녀",
      onyomi: [
        { reading: "ジョ", kr: "죠", word: "女性", wordReading: "じょせい", meaning: "여성" },
        { reading: "ニョ", kr: "뇨", word: "天女", wordReading: "てんにょ", meaning: "선녀" },
      ],
      kunyomi: [
        { reading: "おんな", kr: "온나", word: "女", wordReading: "おんな", meaning: "여자" },
        { reading: "め", kr: "메", word: "女神", wordReading: "めがみ", meaning: "여신" },
      ],
      examples: [{ word: "女", reading: "おんな", meaning: "여자" }],
    },
    {
      kanji: "国",
      meaning: "나라",
      sound: "국",
      onyomi: [
        { reading: "コク", kr: "코쿠", word: "外国", wordReading: "がいこく", meaning: "외국" },
      ],
      kunyomi: [
        { reading: "くに", kr: "쿠니", word: "国", wordReading: "くに", meaning: "나라, 국가" },
      ],
      examples: [{ word: "国", reading: "くに", meaning: "나라, 국가" }],
    },
    {
      kanji: "金",
      meaning: "쇠",
      sound: "금",
      onyomi: [
        { reading: "キン", kr: "킨", word: "金曜日", wordReading: "きんようび", meaning: "금요일" },
        { reading: "コン", kr: "콘", word: "金色", wordReading: "こんじき", meaning: "금색(고어체)" },
      ],
      kunyomi: [
        { reading: "かね", kr: "카네", word: "お金", wordReading: "おかね", meaning: "돈" },
      ],
      examples: [
        { word: "お金", reading: "おかね", meaning: "돈" },
        { word: "金曜日", reading: "きんようび", meaning: "금요일" },
      ],
    },
    {
      kanji: "高",
      meaning: "높을",
      sound: "고",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "高校", wordReading: "こうこう", meaning: "고등학교" },
      ],
      kunyomi: [
        { reading: "たか", kr: "타카", word: "高い", wordReading: "たかい", meaning: "높다" },
      ],
      examples: [{ word: "高い", reading: "たかい", meaning: "높다" }],
    },
    {
      kanji: "下",
      meaning: "아래",
      sound: "하",
      onyomi: [
        { reading: "カ", kr: "카", word: "下記", wordReading: "かき", meaning: "하기(아래에 기재)" },
        { reading: "ゲ", kr: "게", word: "下車", wordReading: "げしゃ", meaning: "하차" },
      ],
      kunyomi: [
        { reading: "した", kr: "시타", word: "下", wordReading: "した", meaning: "아래" },
        { reading: "さ", kr: "사", word: "下さい", wordReading: "ください", meaning: "주세요" },
        { reading: "くだ", kr: "쿠다", word: "下さい", wordReading: "ください", meaning: "주세요" },
        { reading: "もと", kr: "모토", word: "足下", wordReading: "あしもと", meaning: "발밑" },
      ],
      examples: [
        { word: "下", reading: "した", meaning: "아래" },
        { word: "下さい", reading: "ください", meaning: "주세요" },
      ],
    },
    {
      kanji: "学",
      meaning: "배울",
      sound: "학",
      onyomi: [
        { reading: "ガク", kr: "가쿠", word: "学生", wordReading: "がくせい", meaning: "학생" },
      ],
      kunyomi: [
        { reading: "まな", kr: "마나", word: "学ぶ", wordReading: "まなぶ", meaning: "배우다" },
      ],
      examples: [{ word: "学ぶ", reading: "まなぶ", meaning: "배우다" }],
    },
    {
      kanji: "先",
      meaning: "먼저",
      sound: "선",
      onyomi: [
        { reading: "セン", kr: "센", word: "先生", wordReading: "せんせい", meaning: "선생님" },
      ],
      kunyomi: [
        { reading: "さき", kr: "사키", word: "先", wordReading: "さき", meaning: "앞, 먼저" },
      ],
      examples: [{ word: "先", reading: "さき", meaning: "앞, 먼저" }],
    },
    {
      kanji: "外",
      meaning: "바깥",
      sound: "외",
      onyomi: [
        { reading: "ガイ", kr: "가이", word: "外国", wordReading: "がいこく", meaning: "외국" },
        { reading: "ゲ", kr: "게", word: "外科", wordReading: "げか", meaning: "외과" },
      ],
      kunyomi: [
        { reading: "そと", kr: "소토", word: "外", wordReading: "そと", meaning: "밖" },
        { reading: "ほか", kr: "호카", word: "外", wordReading: "ほか", meaning: "다른 것, 밖" },
        { reading: "はず", kr: "하즈", word: "外す", wordReading: "はずす", meaning: "떼다, 벗기다" },
      ],
      examples: [{ word: "外", reading: "そと", meaning: "밖" }],
    },
    {
      kanji: "何",
      meaning: "어찌",
      sound: "하",
      onyomi: [
        { reading: "カ", kr: "카", word: "幾何学", wordReading: "きかがく", meaning: "기하학" },
      ],
      kunyomi: [
        { reading: "なに", kr: "나니", word: "何", wordReading: "なに", meaning: "무엇" },
        { reading: "なん", kr: "난", word: "何人", wordReading: "なんにん", meaning: "몇 명" },
      ],
      examples: [{ word: "何", reading: "なに", meaning: "무엇" }],
    },
    {
      kanji: "男",
      meaning: "사내",
      sound: "남",
      onyomi: [
        { reading: "ダン", kr: "단", word: "男性", wordReading: "だんせい", meaning: "남성" },
        { reading: "ナン", kr: "난", word: "長男", wordReading: "ちょうなん", meaning: "장남" },
      ],
      kunyomi: [
        { reading: "おとこ", kr: "오토코", word: "男", wordReading: "おとこ", meaning: "남자" },
      ],
      examples: [{ word: "男", reading: "おとこ", meaning: "남자" }],
    },
    {
      kanji: "名",
      meaning: "이름",
      sound: "명",
      onyomi: [
        { reading: "メイ", kr: "메이", word: "有名", wordReading: "ゆうめい", meaning: "유명" },
        { reading: "ミョウ", kr: "묘우", word: "名字", wordReading: "みょうじ", meaning: "성씨" },
      ],
      kunyomi: [
        { reading: "な", kr: "나", word: "名前", wordReading: "なまえ", meaning: "이름" },
      ],
      examples: [{ word: "名前", reading: "なまえ", meaning: "이름" }],
    },
    {
      kanji: "月",
      meaning: "달",
      sound: "월",
      onyomi: [
        { reading: "ゲツ", kr: "게츠", word: "月曜日", wordReading: "げつようび", meaning: "월요일" },
        { reading: "ガツ", kr: "가츠", word: "一月", wordReading: "いちがつ", meaning: "1월" },
      ],
      kunyomi: [
        { reading: "つき", kr: "츠키", word: "月", wordReading: "つき", meaning: "달" },
      ],
      examples: [{ word: "月", reading: "つき", meaning: "달" }],
    },
    {
      kanji: "小",
      meaning: "작을",
      sound: "소",
      onyomi: [
        { reading: "ショウ", kr: "쇼우", word: "小学校", wordReading: "しょうがっこう", meaning: "초등학교" },
      ],
      kunyomi: [
        { reading: "ちい", kr: "치이", word: "小さい", wordReading: "ちいさい", meaning: "작다" },
        { reading: "こ", kr: "코", word: "小型", wordReading: "こがた", meaning: "소형" },
      ],
      examples: [{ word: "小さい", reading: "ちいさい", meaning: "작다" }],
    },
    {
      kanji: "聞",
      meaning: "들을",
      sound: "문",
      onyomi: [
        { reading: "ブン", kr: "분", word: "新聞", wordReading: "しんぶん", meaning: "신문" },
        { reading: "モン", kr: "몬", word: "聴聞", wordReading: "ちょうもん", meaning: "청문" },
      ],
      kunyomi: [
        { reading: "き", kr: "키", word: "聞く", wordReading: "きく", meaning: "듣다" },
      ],
      examples: [{ word: "聞く", reading: "きく", meaning: "듣다" }],
    },
    {
      kanji: "食",
      meaning: "먹을",
      sound: "식",
      onyomi: [
        { reading: "ショク", kr: "쇼쿠", word: "食事", wordReading: "しょくじ", meaning: "식사" },
      ],
      kunyomi: [
        { reading: "た", kr: "타", word: "食べる", wordReading: "たべる", meaning: "먹다" },
        { reading: "く", kr: "쿠", word: "食う", wordReading: "くう", meaning: "먹다(거친 말투)" },
      ],
      examples: [{ word: "食べる", reading: "たべる", meaning: "먹다" }],
    },
    {
      kanji: "書",
      meaning: "글",
      sound: "서",
      onyomi: [
        { reading: "ショ", kr: "쇼", word: "図書館", wordReading: "としょかん", meaning: "도서관" },
      ],
      kunyomi: [
        { reading: "か", kr: "카", word: "書く", wordReading: "かく", meaning: "쓰다" },
      ],
      examples: [{ word: "書く", reading: "かく", meaning: "쓰다" }],
    },
    {
      kanji: "山",
      meaning: "뫼",
      sound: "산",
      onyomi: [
        { reading: "サン", kr: "산", word: "富士山", wordReading: "ふじさん", meaning: "후지산" },
      ],
      kunyomi: [
        { reading: "やま", kr: "야마", word: "山", wordReading: "やま", meaning: "산" },
      ],
      examples: [{ word: "山", reading: "やま", meaning: "산" }],
    },
    {
      kanji: "電",
      meaning: "번개",
      sound: "전",
      onyomi: [
        { reading: "デン", kr: "덴", word: "電気", wordReading: "でんき", meaning: "전기" },
      ],
      kunyomi: [],
      examples: [{ word: "電気", reading: "でんき", meaning: "전기" }],
    },
    {
      kanji: "二",
      meaning: "두",
      sound: "이",
      onyomi: [
        { reading: "ニ", kr: "니", word: "二", wordReading: "に", meaning: "이, 둘" },
      ],
      kunyomi: [
        { reading: "ふた", kr: "후타", word: "二つ", wordReading: "ふたつ", meaning: "두 개" },
      ],
      examples: [{ word: "二", reading: "に", meaning: "이, 둘" }],
    },
    {
      kanji: "車",
      meaning: "수레",
      sound: "차",
      onyomi: [
        { reading: "シャ", kr: "샤", word: "電車", wordReading: "でんしゃ", meaning: "전철" },
      ],
      kunyomi: [
        { reading: "くるま", kr: "쿠루마", word: "車", wordReading: "くるま", meaning: "자동차" },
      ],
      examples: [{ word: "車", reading: "くるま", meaning: "자동차" }],
    },
    {
      kanji: "水",
      meaning: "물",
      sound: "수",
      onyomi: [
        { reading: "スイ", kr: "스이", word: "水曜日", wordReading: "すいようび", meaning: "수요일" },
      ],
      kunyomi: [
        { reading: "みず", kr: "미즈", word: "水", wordReading: "みず", meaning: "물" },
      ],
      examples: [
        { word: "水", reading: "みず", meaning: "물" },
        { word: "水曜日", reading: "すいようび", meaning: "수요일" },
      ],
    },
    {
      kanji: "木",
      meaning: "나무",
      sound: "목",
      onyomi: [
        { reading: "モク", kr: "모쿠", word: "木曜日", wordReading: "もくようび", meaning: "목요일" },
        { reading: "ボク", kr: "보쿠", word: "大木", wordReading: "たいぼく", meaning: "큰 나무" },
      ],
      kunyomi: [
        { reading: "き", kr: "키", word: "木", wordReading: "き", meaning: "나무" },
        { reading: "こ", kr: "코", word: "木陰", wordReading: "こかげ", meaning: "나무 그늘" },
      ],
      examples: [
        { word: "木", reading: "き", meaning: "나무" },
        { word: "木曜日", reading: "もくようび", meaning: "목요일" },
      ],
    },
    {
      kanji: "母",
      meaning: "어미",
      sound: "모",
      onyomi: [
        { reading: "ボ", kr: "보", word: "母国", wordReading: "ぼこく", meaning: "모국" },
      ],
      kunyomi: [
        { reading: "はは", kr: "하하", word: "母", wordReading: "はは", meaning: "어머니" },
      ],
      examples: [{ word: "母", reading: "はは", meaning: "어머니" }],
    },
    {
      kanji: "校",
      meaning: "학교",
      sound: "교",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "学校", wordReading: "がっこう", meaning: "학교" },
      ],
      kunyomi: [],
      examples: [{ word: "学校", reading: "がっこう", meaning: "학교" }],
    },
    {
      kanji: "父",
      meaning: "아비",
      sound: "부",
      onyomi: [
        { reading: "フ", kr: "후", word: "父母", wordReading: "ふぼ", meaning: "부모" },
      ],
      kunyomi: [
        { reading: "ちち", kr: "치치", word: "父", wordReading: "ちち", meaning: "아버지" },
      ],
      examples: [{ word: "父", reading: "ちち", meaning: "아버지" }],
    },
    {
      kanji: "白",
      meaning: "흰",
      sound: "백",
      onyomi: [
        { reading: "ハク", kr: "하쿠", word: "白紙", wordReading: "はくし", meaning: "백지" },
        { reading: "ビャク", kr: "뱌쿠", word: "白夜", wordReading: "びゃくや", meaning: "백야" },
      ],
      kunyomi: [
        { reading: "しろ", kr: "시로", word: "白い", wordReading: "しろい", meaning: "하얗다" },
      ],
      examples: [{ word: "白い", reading: "しろい", meaning: "하얗다" }],
    },
    {
      kanji: "語",
      meaning: "말씀",
      sound: "어",
      onyomi: [
        { reading: "ゴ", kr: "고", word: "日本語", wordReading: "にほんご", meaning: "일본어" },
      ],
      kunyomi: [
        { reading: "かた", kr: "카타", word: "語る", wordReading: "かたる", meaning: "이야기하다" },
      ],
      examples: [{ word: "日本語", reading: "にほんご", meaning: "일본어" }],
    },
    {
      kanji: "十",
      meaning: "열",
      sound: "십",
      onyomi: [
        { reading: "ジュウ", kr: "쥬우", word: "十", wordReading: "じゅう", meaning: "십, 열" },
        { reading: "ジッ", kr: "짓", word: "十分", wordReading: "じっぷん", meaning: "10분" },
      ],
      kunyomi: [
        { reading: "とお", kr: "토오", word: "十日", wordReading: "とおか", meaning: "10일" },
      ],
      examples: [{ word: "十", reading: "じゅう", meaning: "십, 열" }],
    },
    {
      kanji: "万",
      meaning: "일만",
      sound: "만",
      onyomi: [
        { reading: "マン", kr: "만", word: "一万", wordReading: "いちまん", meaning: "1만" },
        { reading: "バン", kr: "반", word: "万歳", wordReading: "ばんざい", meaning: "만세" },
      ],
      kunyomi: [],
      examples: [{ word: "一万", reading: "いちまん", meaning: "1만" }],
    },
    {
      kanji: "友",
      meaning: "벗",
      sound: "우",
      onyomi: [
        { reading: "ユウ", kr: "유우", word: "友人", wordReading: "ゆうじん", meaning: "친구, 벗" },
      ],
      kunyomi: [
        { reading: "とも", kr: "토모", word: "友だち", wordReading: "ともだち", meaning: "친구" },
      ],
      examples: [{ word: "友だち", reading: "ともだち", meaning: "친구" }],
    },
    {
      kanji: "川",
      meaning: "내",
      sound: "천",
      onyomi: [
        { reading: "セン", kr: "센", word: "河川", wordReading: "かせん", meaning: "하천" },
      ],
      kunyomi: [
        { reading: "かわ", kr: "카와", word: "川", wordReading: "かわ", meaning: "강" },
      ],
      examples: [{ word: "川", reading: "かわ", meaning: "강" }],
    },
    {
      kanji: "三",
      meaning: "석",
      sound: "삼",
      onyomi: [
        { reading: "サン", kr: "산", word: "三", wordReading: "さん", meaning: "삼, 셋" },
      ],
      kunyomi: [
        { reading: "み", kr: "미", word: "三日月", wordReading: "みかづき", meaning: "초승달" },
      ],
      examples: [{ word: "三", reading: "さん", meaning: "삼, 셋" }],
    },
    {
      kanji: "天",
      meaning: "하늘",
      sound: "천",
      onyomi: [
        { reading: "テン", kr: "텐", word: "天気", wordReading: "てんき", meaning: "날씨" },
      ],
      kunyomi: [
        { reading: "あめ", kr: "아메", word: "天が下", wordReading: "あめがした", meaning: "온 세상(고어)" },
        { reading: "あま", kr: "아마", word: "天の川", wordReading: "あまのがわ", meaning: "은하수" },
      ],
      examples: [{ word: "天気", reading: "てんき", meaning: "날씨" }],
    },
    {
      kanji: "東",
      meaning: "동녘",
      sound: "동",
      onyomi: [
        { reading: "トウ", kr: "토우", word: "東西", wordReading: "とうざい", meaning: "동서" },
      ],
      kunyomi: [
        { reading: "ひがし", kr: "히가시", word: "東", wordReading: "ひがし", meaning: "동쪽" },
      ],
      examples: [{ word: "東", reading: "ひがし", meaning: "동쪽" }],
    },
    {
      kanji: "半",
      meaning: "반",
      sound: "반",
      onyomi: [
        { reading: "ハン", kr: "한", word: "半分", wordReading: "はんぶん", meaning: "절반" },
      ],
      kunyomi: [
        { reading: "なか", kr: "나카", word: "半ば", wordReading: "なかば", meaning: "절반, 중간" },
      ],
      examples: [{ word: "半分", reading: "はんぶん", meaning: "절반" }],
    },
    {
      kanji: "北",
      meaning: "북녘",
      sound: "북",
      onyomi: [
        { reading: "ホク", kr: "호쿠", word: "敗北", wordReading: "はいぼく", meaning: "패배" },
      ],
      kunyomi: [
        { reading: "きた", kr: "키타", word: "北", wordReading: "きた", meaning: "북쪽" },
      ],
      examples: [{ word: "北", reading: "きた", meaning: "북쪽" }],
    },
    {
      kanji: "火",
      meaning: "불",
      sound: "화",
      onyomi: [
        { reading: "カ", kr: "카", word: "火曜日", wordReading: "かようび", meaning: "화요일" },
      ],
      kunyomi: [
        { reading: "ひ", kr: "히", word: "火", wordReading: "ひ", meaning: "불" },
      ],
      examples: [
        { word: "火", reading: "ひ", meaning: "불" },
        { word: "火曜日", reading: "かようび", meaning: "화요일" },
      ],
    },
    {
      kanji: "土",
      meaning: "흙",
      sound: "토",
      onyomi: [
        { reading: "ド", kr: "도", word: "土曜日", wordReading: "どようび", meaning: "토요일" },
        { reading: "ト", kr: "토", word: "土地", wordReading: "とち", meaning: "토지" },
      ],
      kunyomi: [
        { reading: "つち", kr: "츠치", word: "土", wordReading: "つち", meaning: "흙" },
      ],
      examples: [
        { word: "土", reading: "つち", meaning: "흙" },
        { word: "土曜日", reading: "どようび", meaning: "토요일" },
      ],
    },
    {
      kanji: "南",
      meaning: "남녘",
      sound: "남",
      onyomi: [
        { reading: "ナン", kr: "난", word: "南極", wordReading: "なんきょく", meaning: "남극" },
        { reading: "ナ", kr: "나", word: "南", wordReading: "みなみ", meaning: "남쪽" },
      ],
      kunyomi: [
        { reading: "みなみ", kr: "미나미", word: "南", wordReading: "みなみ", meaning: "남쪽" },
      ],
      examples: [{ word: "南", reading: "みなみ", meaning: "남쪽" }],
    },
    {
      kanji: "千",
      meaning: "일천",
      sound: "천",
      onyomi: [
        { reading: "セン", kr: "센", word: "千", wordReading: "せん", meaning: "천" },
      ],
      kunyomi: [
        { reading: "ち", kr: "치", word: "千歳", wordReading: "ちとせ", meaning: "천년, 오랜 세월" },
      ],
      examples: [{ word: "千", reading: "せん", meaning: "천" }],
    },
    {
      kanji: "西",
      meaning: "서녘",
      sound: "서",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "西洋", wordReading: "せいよう", meaning: "서양" },
        { reading: "サイ", kr: "사이", word: "西方", wordReading: "さいほう", meaning: "서쪽, 서방" },
      ],
      kunyomi: [
        { reading: "にし", kr: "니시", word: "西", wordReading: "にし", meaning: "서쪽" },
      ],
      examples: [{ word: "西", reading: "にし", meaning: "서쪽" }],
    },
    {
      kanji: "毎",
      meaning: "매양",
      sound: "매",
      onyomi: [
        { reading: "マイ", kr: "마이", word: "毎日", wordReading: "まいにち", meaning: "매일" },
      ],
      kunyomi: [],
      examples: [{ word: "毎日", reading: "まいにち", meaning: "매일" }],
    },
    {
      kanji: "休",
      meaning: "쉴",
      sound: "휴",
      onyomi: [
        { reading: "キュウ", kr: "큐우", word: "休憩", wordReading: "きゅうけい", meaning: "휴게, 휴식" },
      ],
      kunyomi: [
        { reading: "やす", kr: "야스", word: "休む", wordReading: "やすむ", meaning: "쉬다" },
      ],
      examples: [{ word: "休む", reading: "やすむ", meaning: "쉬다" }],
    },
    {
      kanji: "八",
      meaning: "여덟",
      sound: "팔",
      onyomi: [
        { reading: "ハチ", kr: "하치", word: "八", wordReading: "はち", meaning: "팔, 여덟" },
      ],
      kunyomi: [
        { reading: "や", kr: "야", word: "八百屋", wordReading: "やおや", meaning: "채소 가게" },
      ],
      examples: [{ word: "八", reading: "はち", meaning: "팔, 여덟" }],
    },
    {
      kanji: "読",
      meaning: "읽을",
      sound: "독",
      onyomi: [
        { reading: "ドク", kr: "도쿠", word: "読書", wordReading: "どくしょ", meaning: "독서" },
        { reading: "トク", kr: "토쿠", word: "読本", wordReading: "とくほん", meaning: "독본(읽기 교재)" },
      ],
      kunyomi: [
        { reading: "よ", kr: "요", word: "読む", wordReading: "よむ", meaning: "읽다" },
      ],
      examples: [{ word: "読む", reading: "よむ", meaning: "읽다" }],
    },
    {
      kanji: "五",
      meaning: "다섯",
      sound: "오",
      onyomi: [
        { reading: "ゴ", kr: "고", word: "五", wordReading: "ご", meaning: "오, 다섯" },
      ],
      kunyomi: [
        { reading: "いつ", kr: "이츠", word: "五日", wordReading: "いつか", meaning: "5일" },
      ],
      examples: [{ word: "五", reading: "ご", meaning: "오, 다섯" }],
    },
    {
      kanji: "四",
      meaning: "넉",
      sound: "사",
      onyomi: [
        { reading: "シ", kr: "시", word: "四季", wordReading: "しき", meaning: "사계절" },
      ],
      kunyomi: [
        { reading: "よ", kr: "요", word: "四", wordReading: "よん", meaning: "사, 넷" },
        { reading: "よん", kr: "욘", word: "四", wordReading: "よん", meaning: "사, 넷" },
      ],
      examples: [{ word: "四", reading: "よん", meaning: "사, 넷" }],
    },
    {
      kanji: "百",
      meaning: "일백",
      sound: "백",
      onyomi: [
        { reading: "ヒャク", kr: "햐쿠", word: "百", wordReading: "ひゃく", meaning: "백" },
      ],
      kunyomi: [],
      examples: [{ word: "百", reading: "ひゃく", meaning: "백" }],
    },
    {
      kanji: "円",
      meaning: "둥글",
      sound: "원",
      onyomi: [
        { reading: "エン", kr: "엔", word: "円", wordReading: "えん", meaning: "엔" },
      ],
      kunyomi: [
        { reading: "まる", kr: "마루", word: "円い", wordReading: "まるい", meaning: "둥글다" },
      ],
      examples: [{ word: "円", reading: "えん", meaning: "엔" }],
    },
    {
      kanji: "午",
      meaning: "낮",
      sound: "오",
      onyomi: [
        { reading: "ゴ", kr: "고", word: "午後", wordReading: "ごご", meaning: "오후" },
      ],
      kunyomi: [],
      examples: [{ word: "午後", reading: "ごご", meaning: "오후" }],
    },
    {
      kanji: "七",
      meaning: "일곱",
      sound: "칠",
      onyomi: [
        { reading: "シチ", kr: "시치", word: "七月", wordReading: "しちがつ", meaning: "7월" },
      ],
      kunyomi: [
        { reading: "なな", kr: "나나", word: "七", wordReading: "なな", meaning: "칠, 일곱" },
      ],
      examples: [{ word: "七", reading: "なな", meaning: "칠, 일곱" }],
    },
    {
      kanji: "左",
      meaning: "왼",
      sound: "좌",
      onyomi: [
        { reading: "サ", kr: "사", word: "左右", wordReading: "さゆう", meaning: "좌우" },
      ],
      kunyomi: [
        { reading: "ひだり", kr: "히다리", word: "左", wordReading: "ひだり", meaning: "왼쪽" },
      ],
      examples: [{ word: "左", reading: "ひだり", meaning: "왼쪽" }],
    },
    {
      kanji: "右",
      meaning: "오른",
      sound: "우",
      onyomi: [
        { reading: "ウ", kr: "우", word: "右折", wordReading: "うせつ", meaning: "우회전" },
        { reading: "ユウ", kr: "유우", word: "座右の銘", wordReading: "ざゆうのめい", meaning: "좌우명" },
      ],
      kunyomi: [
        { reading: "みぎ", kr: "미기", word: "右", wordReading: "みぎ", meaning: "오른쪽" },
      ],
      examples: [{ word: "右", reading: "みぎ", meaning: "오른쪽" }],
    },
    {
      kanji: "雨",
      meaning: "비",
      sound: "우",
      onyomi: [
        { reading: "ウ", kr: "우", word: "雨天", wordReading: "うてん", meaning: "우천" },
      ],
      kunyomi: [
        { reading: "あめ", kr: "아메", word: "雨", wordReading: "あめ", meaning: "비" },
      ],
      examples: [{ word: "雨", reading: "あめ", meaning: "비" }],
    },
    {
      kanji: "六",
      meaning: "여섯",
      sound: "육",
      onyomi: [
        { reading: "ロク", kr: "로쿠", word: "六", wordReading: "ろく", meaning: "육, 여섯" },
      ],
      kunyomi: [
        { reading: "む", kr: "무", word: "六つ", wordReading: "むっつ", meaning: "여섯 개" },
      ],
      examples: [{ word: "六", reading: "ろく", meaning: "육, 여섯" }],
    },
    {
      kanji: "九",
      meaning: "아홉",
      sound: "구",
      onyomi: [
        { reading: "キュウ", kr: "큐우", word: "九", wordReading: "きゅう", meaning: "구, 아홉" },
        { reading: "ク", kr: "쿠", word: "九月", wordReading: "くがつ", meaning: "9월" },
      ],
      kunyomi: [
        { reading: "ここの", kr: "코코노", word: "九日", wordReading: "ここのか", meaning: "9일" },
      ],
      examples: [{ word: "九", reading: "きゅう", meaning: "구, 아홉" }],
    },
  ],
  N4: [
    {
      kanji: "朝",
      meaning: "아침",
      sound: "조",
      onyomi: [
        { reading: "チョウ", kr: "쵸우", word: "早朝", wordReading: "そうちょう", meaning: "이른 아침" },
      ],
      kunyomi: [
        { reading: "あさ", kr: "아사", word: "朝", wordReading: "あさ", meaning: "아침" },
      ],
      examples: [{ word: "朝", reading: "あさ", meaning: "아침" }],
    },
    {
      kanji: "昼",
      meaning: "낮",
      sound: "주",
      onyomi: [
        { reading: "チュウ", kr: "츄우", word: "昼食", wordReading: "ちゅうしょく", meaning: "점심 식사" },
      ],
      kunyomi: [
        { reading: "ひる", kr: "히루", word: "昼", wordReading: "ひる", meaning: "낮" },
      ],
      examples: [{ word: "昼", reading: "ひる", meaning: "낮" }],
    },
    {
      kanji: "晩",
      meaning: "저녁",
      sound: "만",
      onyomi: [
        { reading: "バン", kr: "반", word: "今晩", wordReading: "こんばん", meaning: "오늘 밤" },
      ],
      kunyomi: [],
      examples: [{ word: "今晩", reading: "こんばん", meaning: "오늘 밤" }],
    },
    {
      kanji: "夜",
      meaning: "밤",
      sound: "야",
      onyomi: [
        { reading: "ヤ", kr: "야", word: "夜間", wordReading: "やかん", meaning: "야간" },
      ],
      kunyomi: [
        { reading: "よる", kr: "요루", word: "夜", wordReading: "よる", meaning: "밤" },
        { reading: "よ", kr: "요", word: "夜", wordReading: "よる", meaning: "밤" },
      ],
      examples: [{ word: "夜", reading: "よる", meaning: "밤" }],
    },
    {
      kanji: "正",
      meaning: "바를",
      sound: "정",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "正確", wordReading: "せいかく", meaning: "정확" },
        { reading: "ショウ", kr: "쇼우", word: "正月", wordReading: "しょうがつ", meaning: "정월, 설" },
      ],
      kunyomi: [
        { reading: "ただ", kr: "타다", word: "正しい", wordReading: "ただしい", meaning: "옳다" },
        { reading: "まさ", kr: "마사", word: "正に", wordReading: "まさに", meaning: "바로, 틀림없이" },
      ],
      examples: [{ word: "正月", reading: "しょうがつ", meaning: "정월, 설" }],
    },
    {
      kanji: "週",
      meaning: "주(週)",
      sound: "주",
      onyomi: [
        { reading: "シュウ", kr: "슈우", word: "今週", wordReading: "こんしゅう", meaning: "이번 주" },
      ],
      kunyomi: [],
      examples: [{ word: "今週", reading: "こんしゅう", meaning: "이번 주" }],
    },
    {
      kanji: "去",
      meaning: "갈",
      sound: "거",
      onyomi: [
        { reading: "キョ", kr: "쿄", word: "去年", wordReading: "きょねん", meaning: "작년" },
        { reading: "コ", kr: "코", word: "過去", wordReading: "かこ", meaning: "과거" },
      ],
      kunyomi: [
        { reading: "さ", kr: "사", word: "去る", wordReading: "さる", meaning: "떠나다" },
      ],
      examples: [{ word: "去年", reading: "きょねん", meaning: "작년" }],
    },
    {
      kanji: "家",
      meaning: "집",
      sound: "가",
      onyomi: [
        { reading: "カ", kr: "카", word: "家族", wordReading: "かぞく", meaning: "가족" },
        { reading: "ケ", kr: "케", word: "本家", wordReading: "ほんけ", meaning: "본가" },
      ],
      kunyomi: [
        { reading: "いえ", kr: "이에", word: "家", wordReading: "いえ", meaning: "집" },
        { reading: "や", kr: "야", word: "大家", wordReading: "おおや", meaning: "집주인" },
      ],
      examples: [{ word: "家族", reading: "かぞく", meaning: "가족" }],
    },
    {
      kanji: "族",
      meaning: "겨레",
      sound: "족",
      onyomi: [
        { reading: "ゾク", kr: "조쿠", word: "家族", wordReading: "かぞく", meaning: "가족" },
      ],
      kunyomi: [],
      examples: [{ word: "家族", reading: "かぞく", meaning: "가족" }],
    },
    {
      kanji: "兄",
      meaning: "형",
      sound: "형",
      onyomi: [
        { reading: "ケイ", kr: "케이", word: "父兄", wordReading: "ふけい", meaning: "학부형" },
        { reading: "キョウ", kr: "쿄우", word: "兄弟", wordReading: "きょうだい", meaning: "형제" },
      ],
      kunyomi: [
        { reading: "あに", kr: "아니", word: "兄", wordReading: "あに", meaning: "형, 오빠" },
      ],
      examples: [{ word: "兄", reading: "あに", meaning: "형, 오빠" }],
    },
    {
      kanji: "弟",
      meaning: "아우",
      sound: "제",
      onyomi: [
        { reading: "テイ", kr: "테이", word: "師弟", wordReading: "してい", meaning: "사제(스승과 제자)" },
        { reading: "ダイ", kr: "다이", word: "兄弟", wordReading: "きょうだい", meaning: "형제" },
        { reading: "デ", kr: "데", word: "弟子", wordReading: "でし", meaning: "제자" },
      ],
      kunyomi: [
        { reading: "おとうと", kr: "오토우토", word: "弟", wordReading: "おとうと", meaning: "남동생" },
      ],
      examples: [{ word: "弟", reading: "おとうと", meaning: "남동생" }],
    },
    {
      kanji: "姉",
      meaning: "누이",
      sound: "자",
      onyomi: [
        { reading: "シ", kr: "시", word: "姉妹", wordReading: "しまい", meaning: "자매" },
      ],
      kunyomi: [
        { reading: "あね", kr: "아네", word: "姉", wordReading: "あね", meaning: "누나, 언니" },
      ],
      examples: [{ word: "姉", reading: "あね", meaning: "누나, 언니" }],
    },
    {
      kanji: "妹",
      meaning: "누이",
      sound: "매",
      onyomi: [
        { reading: "マイ", kr: "마이", word: "姉妹", wordReading: "しまい", meaning: "자매" },
      ],
      kunyomi: [
        { reading: "いもうと", kr: "이모우토", word: "妹", wordReading: "いもうと", meaning: "여동생" },
      ],
      examples: [{ word: "妹", reading: "いもうと", meaning: "여동생" }],
    },
    {
      kanji: "夫",
      meaning: "남편",
      sound: "부",
      onyomi: [
        { reading: "フ", kr: "후", word: "夫妻", wordReading: "ふさい", meaning: "부부" },
        { reading: "フウ", kr: "후우", word: "夫婦", wordReading: "ふうふ", meaning: "부부" },
      ],
      kunyomi: [
        { reading: "おっと", kr: "옷토", word: "夫", wordReading: "おっと", meaning: "남편" },
      ],
      examples: [{ word: "夫", reading: "おっと", meaning: "남편" }],
    },
    {
      kanji: "妻",
      meaning: "아내",
      sound: "처",
      onyomi: [
        { reading: "サイ", kr: "사이", word: "妻子", wordReading: "さいし", meaning: "처자식" },
      ],
      kunyomi: [
        { reading: "つま", kr: "츠마", word: "妻", wordReading: "つま", meaning: "아내" },
      ],
      examples: [{ word: "妻", reading: "つま", meaning: "아내" }],
    },
    {
      kanji: "主",
      meaning: "주인",
      sound: "주",
      onyomi: [
        { reading: "シュ", kr: "슈", word: "主人", wordReading: "しゅじん", meaning: "주인, 남편" },
        { reading: "ス", kr: "스", word: "坊主", wordReading: "ぼうず", meaning: "스님, 중" },
      ],
      kunyomi: [
        { reading: "ぬし", kr: "누시", word: "家主", wordReading: "やぬし", meaning: "집주인" },
        { reading: "おも", kr: "오모", word: "主に", wordReading: "おもに", meaning: "주로" },
      ],
      examples: [{ word: "主人", reading: "しゅじん", meaning: "주인, 남편" }],
    },
    {
      kanji: "奥",
      meaning: "속",
      sound: "오",
      onyomi: [
        { reading: "オウ", kr: "오우", word: "深奥", wordReading: "しんおう", meaning: "심오" },
      ],
      kunyomi: [
        { reading: "おく", kr: "오쿠", word: "奥さん", wordReading: "おくさん", meaning: "(남의) 부인, 아내" },
      ],
      examples: [{ word: "奥さん", reading: "おくさん", meaning: "(남의) 부인, 아내" }],
    },
    {
      kanji: "私",
      meaning: "나",
      sound: "사",
      onyomi: [
        { reading: "シ", kr: "시", word: "私", wordReading: "わたし", meaning: "나, 저" },
      ],
      kunyomi: [
        { reading: "わたし", kr: "와타시", word: "私", wordReading: "わたし", meaning: "나, 저" },
        { reading: "わたくし", kr: "와타쿠시", word: "私", wordReading: "わたくし", meaning: "저(공손한 표현)" },
      ],
      examples: [{ word: "私", reading: "わたし", meaning: "나, 저" }],
    },
    {
      kanji: "王",
      meaning: "임금",
      sound: "왕",
      onyomi: [
        { reading: "オウ", kr: "오우", word: "王様", wordReading: "おうさま", meaning: "임금님" },
      ],
      kunyomi: [],
      examples: [{ word: "王様", reading: "おうさま", meaning: "임금님" }],
    },
    {
      kanji: "様",
      meaning: "모양",
      sound: "양",
      onyomi: [
        { reading: "ヨウ", kr: "요우", word: "様相", wordReading: "ようそう", meaning: "양상" },
      ],
      kunyomi: [
        { reading: "さま", kr: "사마", word: "〜様", wordReading: "さま", meaning: "~님 (존칭)" },
      ],
      examples: [{ word: "〜様", reading: "さま", meaning: "~님 (존칭)" }],
    },
    {
      kanji: "才",
      meaning: "재주",
      sound: "재",
      onyomi: [
        { reading: "サイ", kr: "사이", word: "天才", wordReading: "てんさい", meaning: "천재" },
      ],
      kunyomi: [],
      examples: [{ word: "二十才", reading: "はたち", meaning: "스무 살" }],
    },
    {
      kanji: "赤",
      meaning: "붉을",
      sound: "적",
      onyomi: [
        { reading: "セキ", kr: "세키", word: "赤道", wordReading: "せきどう", meaning: "적도" },
        { reading: "シャク", kr: "샤쿠", word: "赤銅", wordReading: "しゃくどう", meaning: "적동(구리 합금)" },
      ],
      kunyomi: [
        { reading: "あか", kr: "아카", word: "赤い", wordReading: "あかい", meaning: "빨갛다" },
      ],
      examples: [{ word: "赤い", reading: "あかい", meaning: "빨갛다" }],
    },
    {
      kanji: "青",
      meaning: "푸를",
      sound: "청",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "青年", wordReading: "せいねん", meaning: "청년" },
        { reading: "ショウ", kr: "쇼우", word: "緑青", wordReading: "ろくしょう", meaning: "녹청(구리의 녹)" },
      ],
      kunyomi: [
        { reading: "あお", kr: "아오", word: "青い", wordReading: "あおい", meaning: "파랗다" },
      ],
      examples: [{ word: "青い", reading: "あおい", meaning: "파랗다" }],
    },
    {
      kanji: "黒",
      meaning: "검을",
      sound: "흑",
      onyomi: [
        { reading: "コク", kr: "코쿠", word: "暗黒", wordReading: "あんこく", meaning: "암흑" },
      ],
      kunyomi: [
        { reading: "くろ", kr: "쿠로", word: "黒い", wordReading: "くろい", meaning: "검다" },
      ],
      examples: [{ word: "黒い", reading: "くろい", meaning: "검다" }],
    },
    {
      kanji: "色",
      meaning: "색",
      sound: "색",
      onyomi: [
        { reading: "ショク", kr: "쇼쿠", word: "特色", wordReading: "とくしょく", meaning: "특색" },
        { reading: "シキ", kr: "시키", word: "景色", wordReading: "けしき", meaning: "경치" },
      ],
      kunyomi: [
        { reading: "いろ", kr: "이로", word: "色", wordReading: "いろ", meaning: "색, 색깔" },
      ],
      examples: [{ word: "色", reading: "いろ", meaning: "색, 색깔" }],
    },
    {
      kanji: "銀",
      meaning: "은",
      sound: "은",
      onyomi: [
        { reading: "ギン", kr: "긴", word: "銀行", wordReading: "ぎんこう", meaning: "은행" },
      ],
      kunyomi: [],
      examples: [{ word: "銀行", reading: "ぎんこう", meaning: "은행" }],
    },
    {
      kanji: "黄",
      meaning: "누를",
      sound: "황",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "黄河", wordReading: "こうが", meaning: "황하(강 이름)" },
        { reading: "オウ", kr: "오우", word: "黄金", wordReading: "おうごん", meaning: "황금" },
      ],
      kunyomi: [
        { reading: "き", kr: "키", word: "黄色", wordReading: "きいろ", meaning: "노란색" },
      ],
      examples: [{ word: "黄色", reading: "きいろ", meaning: "노란색" }],
    },
    {
      kanji: "緑",
      meaning: "푸를",
      sound: "록",
      onyomi: [
        { reading: "リョク", kr: "료쿠", word: "新緑", wordReading: "しんりょく", meaning: "신록(새싹의 푸르름)" },
        { reading: "ロク", kr: "로쿠", word: "緑青", wordReading: "ろくしょう", meaning: "녹청(구리의 녹)" },
      ],
      kunyomi: [
        { reading: "みどり", kr: "미도리", word: "緑", wordReading: "みどり", meaning: "초록색, 녹색" },
      ],
      examples: [{ word: "緑", reading: "みどり", meaning: "초록색, 녹색" }],
    },
    {
      kanji: "丸",
      meaning: "둥글",
      sound: "환",
      onyomi: [
        { reading: "ガン", kr: "간", word: "丸薬", wordReading: "がんやく", meaning: "환약(둥근 알약)" },
      ],
      kunyomi: [
        { reading: "まる", kr: "마루", word: "丸い", wordReading: "まるい", meaning: "둥글다" },
      ],
      examples: [{ word: "丸い", reading: "まるい", meaning: "둥글다" }],
    },
    {
      kanji: "玉",
      meaning: "구슬",
      sound: "옥",
      onyomi: [
        { reading: "ギョク", kr: "교쿠", word: "玉座", wordReading: "ぎょくざ", meaning: "옥좌" },
      ],
      kunyomi: [
        { reading: "たま", kr: "타마", word: "玉", wordReading: "たま", meaning: "구슬, 공" },
      ],
      examples: [{ word: "玉", reading: "たま", meaning: "구슬, 공" }],
    },
    {
      kanji: "春",
      meaning: "봄",
      sound: "춘",
      onyomi: [
        { reading: "シュン", kr: "슌", word: "青春", wordReading: "せいしゅん", meaning: "청춘" },
      ],
      kunyomi: [
        { reading: "はる", kr: "하루", word: "春", wordReading: "はる", meaning: "봄" },
      ],
      examples: [{ word: "春", reading: "はる", meaning: "봄" }],
    },
    {
      kanji: "夏",
      meaning: "여름",
      sound: "하",
      onyomi: [
        { reading: "カ", kr: "카", word: "夏季", wordReading: "かき", meaning: "하계, 여름철" },
        { reading: "ゲ", kr: "게", word: "夏至", wordReading: "げし", meaning: "하지" },
      ],
      kunyomi: [
        { reading: "なつ", kr: "나츠", word: "夏", wordReading: "なつ", meaning: "여름" },
      ],
      examples: [{ word: "夏", reading: "なつ", meaning: "여름" }],
    },
    {
      kanji: "秋",
      meaning: "가을",
      sound: "추",
      onyomi: [
        { reading: "シュウ", kr: "슈우", word: "秋分", wordReading: "しゅうぶん", meaning: "추분" },
      ],
      kunyomi: [
        { reading: "あき", kr: "아키", word: "秋", wordReading: "あき", meaning: "가을" },
      ],
      examples: [{ word: "秋", reading: "あき", meaning: "가을" }],
    },
    {
      kanji: "冬",
      meaning: "겨울",
      sound: "동",
      onyomi: [
        { reading: "トウ", kr: "토우", word: "立冬", wordReading: "りっとう", meaning: "입동" },
      ],
      kunyomi: [
        { reading: "ふゆ", kr: "후유", word: "冬", wordReading: "ふゆ", meaning: "겨울" },
      ],
      examples: [{ word: "冬", reading: "ふゆ", meaning: "겨울" }],
    },
    {
      kanji: "空",
      meaning: "빌",
      sound: "공",
      onyomi: [
        { reading: "クウ", kr: "쿠우", word: "空気", wordReading: "くうき", meaning: "공기" },
      ],
      kunyomi: [
        { reading: "そら", kr: "소라", word: "空", wordReading: "そら", meaning: "하늘" },
        { reading: "あ", kr: "아", word: "空く", wordReading: "あく", meaning: "비다" },
        { reading: "から", kr: "카라", word: "空", wordReading: "から", meaning: "빈, 공허함" },
      ],
      examples: [{ word: "空", reading: "そら", meaning: "하늘" }],
    },
    {
      kanji: "風",
      meaning: "바람",
      sound: "풍",
      onyomi: [
        { reading: "フウ", kr: "후우", word: "台風", wordReading: "たいふう", meaning: "태풍" },
        { reading: "フ", kr: "후", word: "風情", wordReading: "ふぜい", meaning: "운치, 정취" },
      ],
      kunyomi: [
        { reading: "かぜ", kr: "카제", word: "風", wordReading: "かぜ", meaning: "바람" },
      ],
      examples: [{ word: "風", reading: "かぜ", meaning: "바람" }],
    },
    {
      kanji: "台",
      meaning: "대",
      sound: "대",
      onyomi: [
        { reading: "ダイ", kr: "다이", word: "台所", wordReading: "だいどころ", meaning: "부엌" },
        { reading: "タイ", kr: "타이", word: "台風", wordReading: "たいふう", meaning: "태풍" },
      ],
      kunyomi: [],
      examples: [{ word: "台風", reading: "たいふう", meaning: "태풍" }],
    },
    {
      kanji: "雲",
      meaning: "구름",
      sound: "운",
      onyomi: [
        { reading: "ウン", kr: "운", word: "雲海", wordReading: "うんかい", meaning: "운해" },
      ],
      kunyomi: [
        { reading: "くも", kr: "쿠모", word: "雲", wordReading: "くも", meaning: "구름" },
      ],
      examples: [{ word: "雲", reading: "くも", meaning: "구름" }],
    },
    {
      kanji: "雪",
      meaning: "눈",
      sound: "설",
      onyomi: [
        { reading: "セツ", kr: "세츠", word: "除雪", wordReading: "じょせつ", meaning: "제설" },
      ],
      kunyomi: [
        { reading: "ゆき", kr: "유키", word: "雪", wordReading: "ゆき", meaning: "눈(내리는)" },
      ],
      examples: [{ word: "雪", reading: "ゆき", meaning: "눈(내리는)" }],
    },
    {
      kanji: "晴",
      meaning: "맑을",
      sound: "청",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "快晴", wordReading: "かいせい", meaning: "쾌청" },
      ],
      kunyomi: [
        { reading: "は", kr: "하", word: "晴れ", wordReading: "はれ", meaning: "맑음, 갬" },
      ],
      examples: [{ word: "晴れ", reading: "はれ", meaning: "맑음, 갬" }],
    },
    {
      kanji: "星",
      meaning: "별",
      sound: "성",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "星座", wordReading: "せいざ", meaning: "별자리" },
        { reading: "ショウ", kr: "쇼우", word: "明星", wordReading: "みょうじょう", meaning: "샛별, 금성" },
      ],
      kunyomi: [
        { reading: "ほし", kr: "호시", word: "星", wordReading: "ほし", meaning: "별" },
      ],
      examples: [{ word: "星", reading: "ほし", meaning: "별" }],
    },
    {
      kanji: "光",
      meaning: "빛",
      sound: "광",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "光線", wordReading: "こうせん", meaning: "광선" },
      ],
      kunyomi: [
        { reading: "ひかり", kr: "히카리", word: "光", wordReading: "ひかり", meaning: "빛" },
        { reading: "ひか", kr: "히카", word: "光", wordReading: "ひかり", meaning: "빛" },
      ],
      examples: [{ word: "光", reading: "ひかり", meaning: "빛" }],
    },
    {
      kanji: "地",
      meaning: "땅",
      sound: "지",
      onyomi: [
        { reading: "チ", kr: "치", word: "地図", wordReading: "ちず", meaning: "지도" },
        { reading: "ジ", kr: "지", word: "地面", wordReading: "じめん", meaning: "지면(땅바닥)" },
      ],
      kunyomi: [],
      examples: [{ word: "地図", reading: "ちず", meaning: "지도" }],
    },
    {
      kanji: "谷",
      meaning: "골",
      sound: "곡",
      onyomi: [
        { reading: "コク", kr: "코쿠", word: "幽谷", wordReading: "ゆうこく", meaning: "깊은 골짜기" },
      ],
      kunyomi: [
        { reading: "たに", kr: "타니", word: "谷", wordReading: "たに", meaning: "골짜기, 계곡" },
      ],
      examples: [{ word: "谷", reading: "たに", meaning: "골짜기, 계곡" }],
    },
    {
      kanji: "自",
      meaning: "스스로",
      sound: "자",
      onyomi: [
        { reading: "ジ", kr: "지", word: "自分", wordReading: "じぶん", meaning: "자기 자신" },
        { reading: "シ", kr: "시", word: "自然", wordReading: "しぜん", meaning: "자연" },
      ],
      kunyomi: [
        { reading: "みずか", kr: "미즈카", word: "自ら", wordReading: "みずから", meaning: "스스로" },
      ],
      examples: [{ word: "自分", reading: "じぶん", meaning: "자기 자신" }],
    },
    {
      kanji: "然",
      meaning: "그러할",
      sound: "연",
      onyomi: [
        { reading: "ゼン", kr: "젠", word: "自然", wordReading: "しぜん", meaning: "자연" },
        { reading: "ネン", kr: "넨", word: "天然", wordReading: "てんねん", meaning: "천연" },
      ],
      kunyomi: [],
      examples: [{ word: "自然", reading: "しぜん", meaning: "자연" }],
    },
    {
      kanji: "草",
      meaning: "풀",
      sound: "초",
      onyomi: [
        { reading: "ソウ", kr: "소우", word: "草原", wordReading: "そうげん", meaning: "초원" },
      ],
      kunyomi: [
        { reading: "くさ", kr: "쿠사", word: "草", wordReading: "くさ", meaning: "풀" },
      ],
      examples: [{ word: "草", reading: "くさ", meaning: "풀" }],
    },
    {
      kanji: "原",
      meaning: "근원",
      sound: "원",
      onyomi: [
        { reading: "ゲン", kr: "겐", word: "原因", wordReading: "げんいん", meaning: "원인" },
      ],
      kunyomi: [
        { reading: "はら", kr: "하라", word: "野原", wordReading: "のはら", meaning: "들판" },
      ],
      examples: [{ word: "野原", reading: "のはら", meaning: "들판" }],
    },
    {
      kanji: "海",
      meaning: "바다",
      sound: "해",
      onyomi: [
        { reading: "カイ", kr: "카이", word: "海岸", wordReading: "かいがん", meaning: "해안" },
      ],
      kunyomi: [
        { reading: "うみ", kr: "우미", word: "海", wordReading: "うみ", meaning: "바다" },
      ],
      examples: [{ word: "海", reading: "うみ", meaning: "바다" }],
    },
    {
      kanji: "湖",
      meaning: "호수",
      sound: "호",
      onyomi: [
        { reading: "コ", kr: "코", word: "湖水", wordReading: "こすい", meaning: "호수" },
      ],
      kunyomi: [
        { reading: "みずうみ", kr: "미즈우미", word: "湖", wordReading: "みずうみ", meaning: "호수" },
      ],
      examples: [{ word: "湖", reading: "みずうみ", meaning: "호수" }],
    },
    {
      kanji: "池",
      meaning: "못",
      sound: "지",
      onyomi: [
        { reading: "チ", kr: "치", word: "貯水池", wordReading: "ちょすいち", meaning: "저수지" },
      ],
      kunyomi: [
        { reading: "いけ", kr: "이케", word: "池", wordReading: "いけ", meaning: "연못" },
      ],
      examples: [{ word: "池", reading: "いけ", meaning: "연못" }],
    },
    {
      kanji: "里",
      meaning: "마을",
      sound: "리",
      onyomi: [
        { reading: "リ", kr: "리", word: "一里", wordReading: "いちり", meaning: "1리(거리 단위)" },
      ],
      kunyomi: [
        { reading: "さと", kr: "사토", word: "里", wordReading: "さと", meaning: "마을, 시골" },
      ],
      examples: [{ word: "里", reading: "さと", meaning: "마을, 시골" }],
    },
    {
      kanji: "野",
      meaning: "들",
      sound: "야",
      onyomi: [
        { reading: "ヤ", kr: "야", word: "野菜", wordReading: "やさい", meaning: "채소, 야채" },
      ],
      kunyomi: [
        { reading: "の", kr: "노", word: "野原", wordReading: "のはら", meaning: "들판" },
      ],
      examples: [{ word: "野菜", reading: "やさい", meaning: "채소, 야채" }],
    },
    {
      kanji: "虫",
      meaning: "벌레",
      sound: "충",
      onyomi: [
        { reading: "チュウ", kr: "츄우", word: "害虫", wordReading: "がいちゅう", meaning: "해충" },
      ],
      kunyomi: [
        { reading: "むし", kr: "무시", word: "虫", wordReading: "むし", meaning: "벌레, 곤충" },
      ],
      examples: [{ word: "虫", reading: "むし", meaning: "벌레, 곤충" }],
    },
    {
      kanji: "羽",
      meaning: "날개",
      sound: "우",
      onyomi: [
        { reading: "ウ", kr: "우", word: "羽毛", wordReading: "うもう", meaning: "우모, 깃털" },
      ],
      kunyomi: [
        { reading: "はね", kr: "하네", word: "羽", wordReading: "はね", meaning: "날개" },
        { reading: "は", kr: "하", word: "羽", wordReading: "はね", meaning: "날개" },
      ],
      examples: [{ word: "羽", reading: "はね", meaning: "날개" }],
    },
    {
      kanji: "馬",
      meaning: "말",
      sound: "마",
      onyomi: [
        { reading: "バ", kr: "바", word: "競馬", wordReading: "けいば", meaning: "경마" },
      ],
      kunyomi: [
        { reading: "うま", kr: "우마", word: "馬", wordReading: "うま", meaning: "말(동물)" },
        { reading: "ま", kr: "마", word: "馬", wordReading: "うま", meaning: "말(동물)" },
      ],
      examples: [{ word: "馬", reading: "うま", meaning: "말(동물)" }],
    },
    {
      kanji: "鳴",
      meaning: "울",
      sound: "명",
      onyomi: [
        { reading: "メイ", kr: "메이", word: "悲鳴", wordReading: "ひめい", meaning: "비명" },
      ],
      kunyomi: [
        { reading: "な", kr: "나", word: "鳴く", wordReading: "なく", meaning: "(동물이) 울다" },
      ],
      examples: [{ word: "鳴く", reading: "なく", meaning: "(동물이) 울다" }],
    },
    {
      kanji: "毛",
      meaning: "털",
      sound: "모",
      onyomi: [
        { reading: "モウ", kr: "모우", word: "毛布", wordReading: "もうふ", meaning: "담요" },
      ],
      kunyomi: [
        { reading: "け", kr: "케", word: "毛", wordReading: "け", meaning: "털" },
      ],
      examples: [{ word: "毛", reading: "け", meaning: "털" }],
    },
    {
      kanji: "糸",
      meaning: "실",
      sound: "사",
      onyomi: [
        { reading: "シ", kr: "시", word: "製糸", wordReading: "せいし", meaning: "제사(실을 만듦)" },
      ],
      kunyomi: [
        { reading: "いと", kr: "이토", word: "糸", wordReading: "いと", meaning: "실" },
      ],
      examples: [{ word: "糸", reading: "いと", meaning: "실" }],
    },
    {
      kanji: "衣",
      meaning: "옷",
      sound: "의",
      onyomi: [
        { reading: "イ", kr: "이", word: "衣服", wordReading: "いふく", meaning: "의복" },
      ],
      kunyomi: [
        { reading: "ころも", kr: "코로모", word: "衣", wordReading: "ころも", meaning: "옷, 의복(고어)" },
      ],
      examples: [{ word: "衣服", reading: "いふく", meaning: "의복" }],
    },
    {
      kanji: "服",
      meaning: "옷",
      sound: "복",
      onyomi: [
        { reading: "フク", kr: "후쿠", word: "服", wordReading: "ふく", meaning: "옷" },
      ],
      kunyomi: [],
      examples: [{ word: "服", reading: "ふく", meaning: "옷" }],
    },
    {
      kanji: "洋",
      meaning: "큰바다",
      sound: "양",
      onyomi: [
        { reading: "ヨウ", kr: "요우", word: "洋服", wordReading: "ようふく", meaning: "양복, 서양식 옷" },
      ],
      kunyomi: [],
      examples: [{ word: "洋服", reading: "ようふく", meaning: "양복, 서양식 옷" }],
    },
    {
      kanji: "料",
      meaning: "재료",
      sound: "료",
      onyomi: [
        { reading: "リョウ", kr: "료우", word: "料理", wordReading: "りょうり", meaning: "요리" },
      ],
      kunyomi: [],
      examples: [{ word: "料理", reading: "りょうり", meaning: "요리" }],
    },
    {
      kanji: "理",
      meaning: "다스릴",
      sound: "리",
      onyomi: [
        { reading: "リ", kr: "리", word: "料理", wordReading: "りょうり", meaning: "요리" },
      ],
      kunyomi: [],
      examples: [{ word: "料理", reading: "りょうり", meaning: "요리" }],
    },
    {
      kanji: "飯",
      meaning: "밥",
      sound: "반",
      onyomi: [
        { reading: "ハン", kr: "한", word: "ご飯", wordReading: "ごはん", meaning: "밥" },
      ],
      kunyomi: [
        { reading: "めし", kr: "메시", word: "飯", wordReading: "めし", meaning: "밥(격식 없는 말)" },
      ],
      examples: [{ word: "ご飯", reading: "ごはん", meaning: "밥" }],
    },
    {
      kanji: "麦",
      meaning: "보리",
      sound: "맥",
      onyomi: [
        { reading: "バク", kr: "바쿠", word: "麦芽", wordReading: "ばくが", meaning: "맥아" },
      ],
      kunyomi: [
        { reading: "むぎ", kr: "무기", word: "麦", wordReading: "むぎ", meaning: "보리, 밀" },
      ],
      examples: [{ word: "麦", reading: "むぎ", meaning: "보리, 밀" }],
    },
    {
      kanji: "油",
      meaning: "기름",
      sound: "유",
      onyomi: [
        { reading: "ユ", kr: "유", word: "油断", wordReading: "ゆだん", meaning: "방심" },
      ],
      kunyomi: [
        { reading: "あぶら", kr: "아부라", word: "油", wordReading: "あぶら", meaning: "기름, 식용유" },
      ],
      examples: [{ word: "油", reading: "あぶら", meaning: "기름, 식용유" }],
    },
    {
      kanji: "酒",
      meaning: "술",
      sound: "주",
      onyomi: [
        { reading: "シュ", kr: "슈", word: "日本酒", wordReading: "にほんしゅ", meaning: "일본술" },
      ],
      kunyomi: [
        { reading: "さけ", kr: "사케", word: "お酒", wordReading: "おさけ", meaning: "술" },
        { reading: "さか", kr: "사카", word: "酒場", wordReading: "さかば", meaning: "술집" },
      ],
      examples: [{ word: "お酒", reading: "おさけ", meaning: "술" }],
    },
    {
      kanji: "味",
      meaning: "맛",
      sound: "미",
      onyomi: [
        { reading: "ミ", kr: "미", word: "意味", wordReading: "いみ", meaning: "의미" },
      ],
      kunyomi: [
        { reading: "あじ", kr: "아지", word: "味", wordReading: "あじ", meaning: "맛" },
      ],
      examples: [{ word: "味", reading: "あじ", meaning: "맛" }],
    },
    {
      kanji: "住",
      meaning: "살",
      sound: "주",
      onyomi: [
        { reading: "ジュウ", kr: "쥬우", word: "住宅", wordReading: "じゅうたく", meaning: "주택" },
      ],
      kunyomi: [
        { reading: "す", kr: "스", word: "住む", wordReading: "すむ", meaning: "살다, 거주하다" },
      ],
      examples: [{ word: "住む", reading: "すむ", meaning: "살다, 거주하다" }],
    },
    {
      kanji: "所",
      meaning: "곳",
      sound: "소",
      onyomi: [
        { reading: "ショ", kr: "쇼", word: "住所", wordReading: "じゅうしょ", meaning: "주소" },
      ],
      kunyomi: [
        { reading: "ところ", kr: "토코로", word: "所", wordReading: "ところ", meaning: "장소, 곳" },
      ],
      examples: [{ word: "住所", reading: "じゅうしょ", meaning: "주소" }],
    },
    {
      kanji: "都",
      meaning: "도읍",
      sound: "도",
      onyomi: [
        { reading: "ト", kr: "토", word: "都会", wordReading: "とかい", meaning: "도시" },
        { reading: "ツ", kr: "츠", word: "都度", wordReading: "つど", meaning: "그때그때, 매번" },
      ],
      kunyomi: [
        { reading: "みやこ", kr: "미야코", word: "都", wordReading: "みやこ", meaning: "수도, 서울(고어)" },
      ],
      examples: [{ word: "都会", reading: "とかい", meaning: "도시" }],
    },
    {
      kanji: "道",
      meaning: "길",
      sound: "도",
      onyomi: [
        { reading: "ドウ", kr: "도우", word: "道路", wordReading: "どうろ", meaning: "도로" },
      ],
      kunyomi: [
        { reading: "みち", kr: "미치", word: "道", wordReading: "みち", meaning: "길" },
      ],
      examples: [{ word: "道", reading: "みち", meaning: "길" }],
    },
    {
      kanji: "府",
      meaning: "마을",
      sound: "부",
      onyomi: [
        { reading: "フ", kr: "후", word: "大阪府", wordReading: "おおさかふ", meaning: "오사카부" },
      ],
      kunyomi: [],
      examples: [{ word: "大阪府", reading: "おおさかふ", meaning: "오사카부" }],
    },
    {
      kanji: "県",
      meaning: "고을",
      sound: "현",
      onyomi: [
        { reading: "ケン", kr: "켄", word: "県", wordReading: "けん", meaning: "현 (행정구역)" },
      ],
      kunyomi: [],
      examples: [{ word: "県", reading: "けん", meaning: "현 (행정구역)" }],
    },
    {
      kanji: "京",
      meaning: "서울",
      sound: "경",
      onyomi: [
        { reading: "キョウ", kr: "쿄우", word: "東京", wordReading: "とうきょう", meaning: "도쿄" },
        { reading: "ケイ", kr: "케이", word: "京阪", wordReading: "けいはん", meaning: "교토와 오사카" },
      ],
      kunyomi: [],
      examples: [{ word: "東京", reading: "とうきょう", meaning: "도쿄" }],
    },
    {
      kanji: "市",
      meaning: "시장",
      sound: "시",
      onyomi: [
        { reading: "シ", kr: "시", word: "市", wordReading: "し", meaning: "시 (행정구역)" },
      ],
      kunyomi: [
        { reading: "いち", kr: "이치", word: "市場", wordReading: "いちば", meaning: "시장" },
      ],
      examples: [{ word: "市", reading: "し", meaning: "시 (행정구역)" }],
    },
    {
      kanji: "区",
      meaning: "구역",
      sound: "구",
      onyomi: [
        { reading: "ク", kr: "쿠", word: "区", wordReading: "く", meaning: "구 (행정구역)" },
      ],
      kunyomi: [],
      examples: [{ word: "区", reading: "く", meaning: "구 (행정구역)" }],
    },
    {
      kanji: "村",
      meaning: "마을",
      sound: "촌",
      onyomi: [
        { reading: "ソン", kr: "손", word: "農村", wordReading: "のうそん", meaning: "농촌" },
      ],
      kunyomi: [
        { reading: "むら", kr: "무라", word: "村", wordReading: "むら", meaning: "마을, 촌" },
      ],
      examples: [{ word: "村", reading: "むら", meaning: "마을, 촌" }],
    },
    {
      kanji: "番",
      meaning: "차례",
      sound: "번",
      onyomi: [
        { reading: "バン", kr: "반", word: "番号", wordReading: "ばんごう", meaning: "번호" },
      ],
      kunyomi: [],
      examples: [{ word: "番号", reading: "ばんごう", meaning: "번호" }],
    },
    {
      kanji: "号",
      meaning: "부를",
      sound: "호",
      onyomi: [
        { reading: "ゴウ", kr: "고우", word: "番号", wordReading: "ばんごう", meaning: "번호" },
      ],
      kunyomi: [],
      examples: [{ word: "番号", reading: "ばんごう", meaning: "번호" }],
    },
    {
      kanji: "紙",
      meaning: "종이",
      sound: "지",
      onyomi: [
        { reading: "シ", kr: "시", word: "用紙", wordReading: "ようし", meaning: "용지" },
      ],
      kunyomi: [
        { reading: "かみ", kr: "카미", word: "紙", wordReading: "かみ", meaning: "종이" },
      ],
      examples: [{ word: "紙", reading: "かみ", meaning: "종이" }],
    },
    {
      kanji: "店",
      meaning: "가게",
      sound: "점",
      onyomi: [
        { reading: "テン", kr: "텐", word: "開店", wordReading: "かいてん", meaning: "개점" },
      ],
      kunyomi: [
        { reading: "みせ", kr: "미세", word: "店", wordReading: "みせ", meaning: "가게" },
      ],
      examples: [{ word: "店", reading: "みせ", meaning: "가게" }],
    },
    {
      kanji: "客",
      meaning: "손",
      sound: "객",
      onyomi: [
        { reading: "キャク", kr: "캬쿠", word: "お客さん", wordReading: "おきゃくさん", meaning: "손님" },
        { reading: "カク", kr: "카쿠", word: "旅客", wordReading: "りょかく", meaning: "여객" },
      ],
      kunyomi: [],
      examples: [{ word: "お客さん", reading: "おきゃくさん", meaning: "손님" }],
    },
    {
      kanji: "売",
      meaning: "팔",
      sound: "매",
      onyomi: [
        { reading: "バイ", kr: "바이", word: "売買", wordReading: "ばいばい", meaning: "매매" },
      ],
      kunyomi: [
        { reading: "う", kr: "우", word: "売る", wordReading: "うる", meaning: "팔다" },
      ],
      examples: [{ word: "売る", reading: "うる", meaning: "팔다" }],
    },
    {
      kanji: "品",
      meaning: "물건",
      sound: "품",
      onyomi: [
        { reading: "ヒン", kr: "힌", word: "商品", wordReading: "しょうひん", meaning: "상품" },
      ],
      kunyomi: [
        { reading: "しな", kr: "시나", word: "品物", wordReading: "しなもの", meaning: "물건, 상품" },
      ],
      examples: [{ word: "品物", reading: "しなもの", meaning: "물건, 상품" }],
    },
    {
      kanji: "薬",
      meaning: "약",
      sound: "약",
      onyomi: [
        { reading: "ヤク", kr: "야쿠", word: "薬局", wordReading: "やっきょく", meaning: "약국" },
      ],
      kunyomi: [
        { reading: "くすり", kr: "쿠스리", word: "薬", wordReading: "くすり", meaning: "약" },
      ],
      examples: [{ word: "薬", reading: "くすり", meaning: "약" }],
    },
    {
      kanji: "待",
      meaning: "기다릴",
      sound: "대",
      onyomi: [
        { reading: "タイ", kr: "타이", word: "期待", wordReading: "きたい", meaning: "기대" },
      ],
      kunyomi: [
        { reading: "ま", kr: "마", word: "待つ", wordReading: "まつ", meaning: "기다리다" },
      ],
      examples: [{ word: "待つ", reading: "まつ", meaning: "기다리다" }],
    },
    {
      kanji: "合",
      meaning: "합할",
      sound: "합",
      onyomi: [
        { reading: "ゴウ", kr: "고우", word: "合計", wordReading: "ごうけい", meaning: "합계" },
      ],
      kunyomi: [
        { reading: "あ", kr: "아", word: "合う", wordReading: "あう", meaning: "맞다, 어울리다" },
      ],
      examples: [{ word: "合う", reading: "あう", meaning: "맞다, 어울리다" }],
    },
    {
      kanji: "計",
      meaning: "셀",
      sound: "계",
      onyomi: [
        { reading: "ケイ", kr: "케이", word: "会計", wordReading: "かいけい", meaning: "계산, 회계" },
      ],
      kunyomi: [
        { reading: "はか", kr: "하카", word: "計る", wordReading: "はかる", meaning: "재다, 측정하다" },
      ],
      examples: [{ word: "会計", reading: "かいけい", meaning: "계산, 회계" }],
    },
    {
      kanji: "辺",
      meaning: "가",
      sound: "변",
      onyomi: [
        { reading: "ヘン", kr: "헨", word: "この辺", wordReading: "このへん", meaning: "이 근처" },
      ],
      kunyomi: [
        { reading: "あた", kr: "아타", word: "辺り", wordReading: "あたり", meaning: "근처, 주변" },
      ],
      examples: [{ word: "この辺", reading: "このへん", meaning: "이 근처" }],
    },
    {
      kanji: "交",
      meaning: "사귈",
      sound: "교",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "交通", wordReading: "こうつう", meaning: "교통" },
      ],
      kunyomi: [
        { reading: "まじ", kr: "마지", word: "交わる", wordReading: "まじわる", meaning: "교차하다, 사귀다" },
        { reading: "か", kr: "카", word: "交わす", wordReading: "かわす", meaning: "주고받다" },
      ],
      examples: [{ word: "交通", reading: "こうつう", meaning: "교통" }],
    },
    {
      kanji: "通",
      meaning: "통할",
      sound: "통",
      onyomi: [
        { reading: "ツウ", kr: "츠우", word: "交通", wordReading: "こうつう", meaning: "교통" },
        { reading: "ツ", kr: "츠", word: "交通", wordReading: "こうつう", meaning: "교통" },
      ],
      kunyomi: [
        { reading: "とお", kr: "토오", word: "通る", wordReading: "とおる", meaning: "지나가다" },
        { reading: "かよ", kr: "카요", word: "通う", wordReading: "かよう", meaning: "다니다" },
      ],
      examples: [{ word: "交通", reading: "こうつう", meaning: "교통" }],
    },
    {
      kanji: "荷",
      meaning: "짐",
      sound: "하",
      onyomi: [
        { reading: "カ", kr: "카", word: "荷重", wordReading: "かじゅう", meaning: "하중" },
      ],
      kunyomi: [
        { reading: "に", kr: "니", word: "荷物", wordReading: "にもつ", meaning: "짐, 화물" },
      ],
      examples: [{ word: "荷物", reading: "にもつ", meaning: "짐, 화물" }],
    },
    {
      kanji: "送",
      meaning: "보낼",
      sound: "송",
      onyomi: [
        { reading: "ソウ", kr: "소우", word: "送金", wordReading: "そうきん", meaning: "송금" },
      ],
      kunyomi: [
        { reading: "おく", kr: "오쿠", word: "送る", wordReading: "おくる", meaning: "보내다" },
      ],
      examples: [{ word: "送る", reading: "おくる", meaning: "보내다" }],
    },
    {
      kanji: "宅",
      meaning: "집",
      sound: "택",
      onyomi: [
        { reading: "タク", kr: "타쿠", word: "お宅", wordReading: "おたく", meaning: "댁, 귀댁" },
      ],
      kunyomi: [],
      examples: [{ word: "お宅", reading: "おたく", meaning: "댁, 귀댁" }],
    },
    {
      kanji: "止",
      meaning: "그칠",
      sound: "지",
      onyomi: [
        { reading: "シ", kr: "시", word: "禁止", wordReading: "きんし", meaning: "금지" },
      ],
      kunyomi: [
        { reading: "と", kr: "토", word: "止まる", wordReading: "とまる", meaning: "멈추다, 멈춰서다" },
      ],
      examples: [{ word: "止まる", reading: "とまる", meaning: "멈추다, 멈춰서다" }],
    },
    {
      kanji: "急",
      meaning: "급할",
      sound: "급",
      onyomi: [
        { reading: "キュウ", kr: "큐우", word: "急行", wordReading: "きゅうこう", meaning: "급행" },
      ],
      kunyomi: [
        { reading: "いそ", kr: "이소", word: "急ぐ", wordReading: "いそぐ", meaning: "서두르다" },
      ],
      examples: [{ word: "急ぐ", reading: "いそぐ", meaning: "서두르다" }],
    },
    {
      kanji: "特",
      meaning: "특별할",
      sound: "특",
      onyomi: [
        { reading: "トク", kr: "토쿠", word: "特別", wordReading: "とくべつ", meaning: "특별" },
      ],
      kunyomi: [],
      examples: [{ word: "特別", reading: "とくべつ", meaning: "특별" }],
    },
    {
      kanji: "鉄",
      meaning: "쇠",
      sound: "철",
      onyomi: [
        { reading: "テツ", kr: "테츠", word: "地下鉄", wordReading: "ちかてつ", meaning: "지하철" },
      ],
      kunyomi: [],
      examples: [{ word: "地下鉄", reading: "ちかてつ", meaning: "지하철" }],
    },
    {
      kanji: "船",
      meaning: "배",
      sound: "선",
      onyomi: [
        { reading: "セン", kr: "센", word: "船員", wordReading: "せんいん", meaning: "선원" },
      ],
      kunyomi: [
        { reading: "ふね", kr: "후네", word: "船", wordReading: "ふね", meaning: "배, 선박" },
        { reading: "ふな", kr: "후나", word: "船便", wordReading: "ふなびん", meaning: "배편" },
      ],
      examples: [{ word: "船", reading: "ふね", meaning: "배, 선박" }],
    },
    {
      kanji: "部",
      meaning: "거느릴",
      sound: "부",
      onyomi: [
        { reading: "ブ", kr: "부", word: "部分", wordReading: "ぶぶん", meaning: "부분" },
      ],
      kunyomi: [],
      examples: [{ word: "部屋", reading: "へや", meaning: "방" }],
    },
    {
      kanji: "屋",
      meaning: "집",
      sound: "옥",
      onyomi: [
        { reading: "オク", kr: "오쿠", word: "屋上", wordReading: "おくじょう", meaning: "옥상" },
      ],
      kunyomi: [
        { reading: "や", kr: "야", word: "部屋", wordReading: "へや", meaning: "방" },
      ],
      examples: [{ word: "部屋", reading: "へや", meaning: "방" }],
    },
    {
      kanji: "教",
      meaning: "가르칠",
      sound: "교",
      onyomi: [
        { reading: "キョウ", kr: "쿄우", word: "教育", wordReading: "きょういく", meaning: "교육" },
      ],
      kunyomi: [
        { reading: "おし", kr: "오시", word: "教える", wordReading: "おしえる", meaning: "가르치다" },
        { reading: "おそ", kr: "오소", word: "教わる", wordReading: "おそわる", meaning: "배우다, 가르침을 받다" },
      ],
      examples: [{ word: "教える", reading: "おしえる", meaning: "가르치다" }],
    },
    {
      kanji: "室",
      meaning: "집",
      sound: "실",
      onyomi: [
        { reading: "シツ", kr: "시츠", word: "教室", wordReading: "きょうしつ", meaning: "교실" },
      ],
      kunyomi: [
        { reading: "むろ", kr: "무로", word: "氷室", wordReading: "ひむろ", meaning: "얼음 창고" },
      ],
      examples: [{ word: "教室", reading: "きょうしつ", meaning: "교실" }],
    },
    {
      kanji: "会",
      meaning: "모일",
      sound: "회",
      onyomi: [
        { reading: "カイ", kr: "카이", word: "会社", wordReading: "かいしゃ", meaning: "회사" },
        { reading: "エ", kr: "에", word: "会釈", wordReading: "えしゃく", meaning: "가벼운 인사, 목례" },
      ],
      kunyomi: [
        { reading: "あ", kr: "아", word: "会う", wordReading: "あう", meaning: "만나다" },
      ],
      examples: [{ word: "会社", reading: "かいしゃ", meaning: "회사" }],
    },
    {
      kanji: "社",
      meaning: "모일",
      sound: "사",
      onyomi: [
        { reading: "シャ", kr: "샤", word: "会社", wordReading: "かいしゃ", meaning: "회사" },
      ],
      kunyomi: [
        { reading: "やしろ", kr: "야시로", word: "社", wordReading: "やしろ", meaning: "신사(神社의 옛말)" },
      ],
      examples: [{ word: "会社", reading: "かいしゃ", meaning: "회사" }],
    },
    {
      kanji: "駅",
      meaning: "역",
      sound: "역",
      onyomi: [
        { reading: "エキ", kr: "에키", word: "駅", wordReading: "えき", meaning: "역(기차역)" },
      ],
      kunyomi: [],
      examples: [{ word: "駅", reading: "えき", meaning: "역(기차역)" }],
    },
    {
      kanji: "工",
      meaning: "장인",
      sound: "공",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "工場", wordReading: "こうじょう", meaning: "공장" },
        { reading: "ク", kr: "쿠", word: "工夫", wordReading: "くふう", meaning: "궁리, 고안" },
      ],
      kunyomi: [],
      examples: [{ word: "工場", reading: "こうじょう", meaning: "공장" }],
    },
    {
      kanji: "場",
      meaning: "마당",
      sound: "장",
      onyomi: [
        { reading: "ジョウ", kr: "죠우", word: "工場", wordReading: "こうじょう", meaning: "공장" },
      ],
      kunyomi: [
        { reading: "ば", kr: "바", word: "場所", wordReading: "ばしょ", meaning: "장소" },
      ],
      examples: [{ word: "工場", reading: "こうじょう", meaning: "공장" }],
    },
    {
      kanji: "病",
      meaning: "병",
      sound: "병",
      onyomi: [
        { reading: "ビョウ", kr: "뵤우", word: "病院", wordReading: "びょういん", meaning: "병원" },
        { reading: "ヘイ", kr: "헤이", word: "疾病", wordReading: "しっぺい", meaning: "질병" },
      ],
      kunyomi: [
        { reading: "やまい", kr: "야마이", word: "病", wordReading: "やまい", meaning: "병" },
        { reading: "や", kr: "야", word: "病む", wordReading: "やむ", meaning: "병들다, 앓다" },
      ],
      examples: [{ word: "病院", reading: "びょういん", meaning: "병원" }],
    },
    {
      kanji: "院",
      meaning: "집",
      sound: "원",
      onyomi: [
        { reading: "イン", kr: "인", word: "病院", wordReading: "びょういん", meaning: "병원" },
      ],
      kunyomi: [],
      examples: [{ word: "病院", reading: "びょういん", meaning: "병원" }],
    },
    {
      kanji: "公",
      meaning: "공평할",
      sound: "공",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "公園", wordReading: "こうえん", meaning: "공원" },
      ],
      kunyomi: [
        { reading: "おおやけ", kr: "오오야케", word: "公", wordReading: "おおやけ", meaning: "공공, 공적임" },
      ],
      examples: [{ word: "公園", reading: "こうえん", meaning: "공원" }],
    },
    {
      kanji: "園",
      meaning: "동산",
      sound: "원",
      onyomi: [
        { reading: "エン", kr: "엔", word: "公園", wordReading: "こうえん", meaning: "공원" },
      ],
      kunyomi: [
        { reading: "その", kr: "소노", word: "花園", wordReading: "はなぞの", meaning: "화원, 꽃동산" },
      ],
      examples: [{ word: "公園", reading: "こうえん", meaning: "공원" }],
    },
    {
      kanji: "図",
      meaning: "그림",
      sound: "도",
      onyomi: [
        { reading: "ズ", kr: "즈", word: "地図", wordReading: "ちず", meaning: "지도" },
        { reading: "ト", kr: "토", word: "図書館", wordReading: "としょかん", meaning: "도서관" },
      ],
      kunyomi: [
        { reading: "はか", kr: "하카", word: "図る", wordReading: "はかる", meaning: "도모하다, 꾀하다" },
      ],
      examples: [{ word: "図書館", reading: "としょかん", meaning: "도서관" }],
    },
    {
      kanji: "館",
      meaning: "집",
      sound: "관",
      onyomi: [
        { reading: "カン", kr: "칸", word: "図書館", wordReading: "としょかん", meaning: "도서관" },
      ],
      kunyomi: [
        { reading: "やかた", kr: "야카타", word: "館", wordReading: "やかた", meaning: "저택, 관(옛말)" },
      ],
      examples: [{ word: "図書館", reading: "としょかん", meaning: "도서관" }],
    },
    {
      kanji: "映",
      meaning: "비칠",
      sound: "영",
      onyomi: [
        { reading: "エイ", kr: "에이", word: "映画", wordReading: "えいが", meaning: "영화" },
      ],
      kunyomi: [
        { reading: "うつ", kr: "우츠", word: "映る", wordReading: "うつる", meaning: "비치다" },
        { reading: "は", kr: "하", word: "映える", wordReading: "はえる", meaning: "빛나다, 돋보이다" },
      ],
      examples: [{ word: "映画", reading: "えいが", meaning: "영화" }],
    },
    {
      kanji: "画",
      meaning: "그림",
      sound: "화",
      onyomi: [
        { reading: "ガ", kr: "가", word: "映画", wordReading: "えいが", meaning: "영화" },
        { reading: "カク", kr: "카쿠", word: "計画", wordReading: "けいかく", meaning: "계획" },
      ],
      kunyomi: [],
      examples: [{ word: "映画", reading: "えいが", meaning: "영화" }],
    },
    {
      kanji: "勉",
      meaning: "힘쓸",
      sound: "면",
      onyomi: [
        { reading: "ベン", kr: "벤", word: "勉強", wordReading: "べんきょう", meaning: "공부" },
      ],
      kunyomi: [],
      examples: [{ word: "勉強", reading: "べんきょう", meaning: "공부" }],
    },
    {
      kanji: "強",
      meaning: "강할",
      sound: "강",
      onyomi: [
        { reading: "キョウ", kr: "쿄우", word: "勉強", wordReading: "べんきょう", meaning: "공부" },
        { reading: "ゴウ", kr: "고우", word: "強引", wordReading: "ごういん", meaning: "억지로, 강제로" },
      ],
      kunyomi: [
        { reading: "つよ", kr: "츠요", word: "強い", wordReading: "つよい", meaning: "강하다" },
        { reading: "し", kr: "시", word: "強いる", wordReading: "しいる", meaning: "강요하다" },
      ],
      examples: [{ word: "勉強", reading: "べんきょう", meaning: "공부" }],
    },
    {
      kanji: "宿",
      meaning: "잠잘",
      sound: "숙",
      onyomi: [
        { reading: "シュク", kr: "슈쿠", word: "宿題", wordReading: "しゅくだい", meaning: "숙제" },
      ],
      kunyomi: [
        { reading: "やど", kr: "야도", word: "宿", wordReading: "やど", meaning: "숙소" },
      ],
      examples: [{ word: "宿題", reading: "しゅくだい", meaning: "숙제" }],
    },
    {
      kanji: "題",
      meaning: "제목",
      sound: "제",
      onyomi: [
        { reading: "ダイ", kr: "다이", word: "宿題", wordReading: "しゅくだい", meaning: "숙제" },
      ],
      kunyomi: [],
      examples: [{ word: "宿題", reading: "しゅくだい", meaning: "숙제" }],
    },
    {
      kanji: "質",
      meaning: "바탕",
      sound: "질",
      onyomi: [
        { reading: "シツ", kr: "시츠", word: "質問", wordReading: "しつもん", meaning: "질문" },
        { reading: "シチ", kr: "시치", word: "質屋", wordReading: "しちや", meaning: "전당포" },
      ],
      kunyomi: [],
      examples: [{ word: "質問", reading: "しつもん", meaning: "질문" }],
    },
    {
      kanji: "問",
      meaning: "물을",
      sound: "문",
      onyomi: [
        { reading: "モン", kr: "몬", word: "質問", wordReading: "しつもん", meaning: "질문" },
      ],
      kunyomi: [
        { reading: "と", kr: "토", word: "問う", wordReading: "とう", meaning: "묻다" },
      ],
      examples: [{ word: "質問", reading: "しつもん", meaning: "질문" }],
    },
    {
      kanji: "試",
      meaning: "시험",
      sound: "시",
      onyomi: [
        { reading: "シ", kr: "시", word: "試験", wordReading: "しけん", meaning: "시험" },
      ],
      kunyomi: [
        { reading: "こころ", kr: "코코로", word: "試みる", wordReading: "こころみる", meaning: "시도하다" },
        { reading: "ため", kr: "타메", word: "試す", wordReading: "ためす", meaning: "시험해보다" },
      ],
      examples: [{ word: "試験", reading: "しけん", meaning: "시험" }],
    },
    {
      kanji: "験",
      meaning: "시험",
      sound: "험",
      onyomi: [
        { reading: "ケン", kr: "켄", word: "試験", wordReading: "しけん", meaning: "시험" },
        { reading: "ゲン", kr: "겐", word: "霊験", wordReading: "れいげん", meaning: "영험" },
      ],
      kunyomi: [],
      examples: [{ word: "試験", reading: "しけん", meaning: "시험" }],
    },
    {
      kanji: "答",
      meaning: "대답",
      sound: "답",
      onyomi: [
        { reading: "トウ", kr: "토우", word: "応答", wordReading: "おうとう", meaning: "응답" },
      ],
      kunyomi: [
        { reading: "こた", kr: "코타", word: "答え", wordReading: "こたえ", meaning: "답, 대답" },
      ],
      examples: [{ word: "答え", reading: "こたえ", meaning: "답, 대답" }],
    },
    {
      kanji: "考",
      meaning: "생각할",
      sound: "고",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "参考", wordReading: "さんこう", meaning: "참고" },
      ],
      kunyomi: [
        { reading: "かんが", kr: "칸가", word: "考える", wordReading: "かんがえる", meaning: "생각하다" },
      ],
      examples: [{ word: "考える", reading: "かんがえる", meaning: "생각하다" }],
    },
    {
      kanji: "字",
      meaning: "글자",
      sound: "자",
      onyomi: [
        { reading: "ジ", kr: "지", word: "漢字", wordReading: "かんじ", meaning: "한자" },
      ],
      kunyomi: [
        { reading: "あざ", kr: "아자", word: "字", wordReading: "あざ", meaning: "마을, 자(행정구역 단위)" },
      ],
      examples: [{ word: "漢字", reading: "かんじ", meaning: "한자" }],
    },
    {
      kanji: "文",
      meaning: "글",
      sound: "문",
      onyomi: [
        { reading: "ブン", kr: "분", word: "文化", wordReading: "ぶんか", meaning: "문화" },
        { reading: "モン", kr: "몬", word: "文句", wordReading: "もんく", meaning: "불평, 잔소리" },
      ],
      kunyomi: [
        { reading: "ふみ", kr: "후미", word: "文", wordReading: "ふみ", meaning: "편지(고어)" },
      ],
      examples: [{ word: "文化", reading: "ぶんか", meaning: "문화" }],
    },
    {
      kanji: "漢",
      meaning: "한나라",
      sound: "한",
      onyomi: [
        { reading: "カン", kr: "칸", word: "漢字", wordReading: "かんじ", meaning: "한자" },
      ],
      kunyomi: [],
      examples: [{ word: "漢字", reading: "かんじ", meaning: "한자" }],
    },
    {
      kanji: "数",
      meaning: "셀",
      sound: "수",
      onyomi: [
        { reading: "スウ", kr: "스우", word: "数学", wordReading: "すうがく", meaning: "수학" },
        { reading: "ス", kr: "스", word: "数学", wordReading: "すうがく", meaning: "수학" },
      ],
      kunyomi: [
        { reading: "かず", kr: "카즈", word: "数", wordReading: "かず", meaning: "수, 숫자" },
        { reading: "かぞ", kr: "카조", word: "数える", wordReading: "かぞえる", meaning: "세다" },
      ],
      examples: [{ word: "数学", reading: "すうがく", meaning: "수학" }],
    },
    {
      kanji: "英",
      meaning: "꽃부리",
      sound: "영",
      onyomi: [
        { reading: "エイ", kr: "에이", word: "英語", wordReading: "えいご", meaning: "영어" },
      ],
      kunyomi: [],
      examples: [{ word: "英語", reading: "えいご", meaning: "영어" }],
    },
    {
      kanji: "化",
      meaning: "될",
      sound: "화",
      onyomi: [
        { reading: "カ", kr: "카", word: "文化", wordReading: "ぶんか", meaning: "문화" },
        { reading: "ケ", kr: "케", word: "化粧", wordReading: "けしょう", meaning: "화장" },
      ],
      kunyomi: [
        { reading: "ば", kr: "바", word: "化ける", wordReading: "ばける", meaning: "둔갑하다" },
      ],
      examples: [{ word: "文化", reading: "ぶんか", meaning: "문화" }],
    },
    {
      kanji: "育",
      meaning: "기를",
      sound: "육",
      onyomi: [
        { reading: "イク", kr: "이쿠", word: "教育", wordReading: "きょういく", meaning: "교육" },
      ],
      kunyomi: [
        { reading: "そだ", kr: "소다", word: "育つ", wordReading: "そだつ", meaning: "자라다" },
      ],
      examples: [{ word: "教育", reading: "きょういく", meaning: "교육" }],
    },
    {
      kanji: "研",
      meaning: "갈",
      sound: "연",
      onyomi: [
        { reading: "ケン", kr: "켄", word: "研究", wordReading: "けんきゅう", meaning: "연구" },
      ],
      kunyomi: [
        { reading: "と", kr: "토", word: "研ぐ", wordReading: "とぐ", meaning: "갈다, 연마하다" },
      ],
      examples: [{ word: "研究", reading: "けんきゅう", meaning: "연구" }],
    },
    {
      kanji: "究",
      meaning: "궁구할",
      sound: "구",
      onyomi: [
        { reading: "キュウ", kr: "큐우", word: "研究", wordReading: "けんきゅう", meaning: "연구" },
      ],
      kunyomi: [
        { reading: "きわ", kr: "키와", word: "究める", wordReading: "きわめる", meaning: "깊이 연구하다, 규명하다" },
      ],
      examples: [{ word: "研究", reading: "けんきゅう", meaning: "연구" }],
    },
    {
      kanji: "医",
      meaning: "의원",
      sound: "의",
      onyomi: [
        { reading: "イ", kr: "이", word: "医者", wordReading: "いしゃ", meaning: "의사" },
      ],
      kunyomi: [],
      examples: [{ word: "医者", reading: "いしゃ", meaning: "의사" }],
    },
    {
      kanji: "科",
      meaning: "과목",
      sound: "과",
      onyomi: [
        { reading: "カ", kr: "카", word: "科学", wordReading: "かがく", meaning: "과학" },
      ],
      kunyomi: [],
      examples: [{ word: "科学", reading: "かがく", meaning: "과학" }],
    },
    {
      kanji: "政",
      meaning: "정사",
      sound: "정",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "政治", wordReading: "せいじ", meaning: "정치" },
        { reading: "ショウ", kr: "쇼우", word: "摂政", wordReading: "せっしょう", meaning: "섭정" },
      ],
      kunyomi: [
        { reading: "まつりごと", kr: "마츠리고토", word: "政", wordReading: "まつりごと", meaning: "정치(고어)" },
      ],
      examples: [{ word: "政治", reading: "せいじ", meaning: "정치" }],
    },
    {
      kanji: "治",
      meaning: "다스릴",
      sound: "치",
      onyomi: [
        { reading: "ジ", kr: "지", word: "政治", wordReading: "せいじ", meaning: "정치" },
        { reading: "チ", kr: "치", word: "治療", wordReading: "ちりょう", meaning: "치료" },
      ],
      kunyomi: [
        { reading: "おさ", kr: "오사", word: "治める", wordReading: "おさめる", meaning: "다스리다" },
        { reading: "なお", kr: "나오", word: "治る", wordReading: "なおる", meaning: "낫다, 치료되다" },
      ],
      examples: [{ word: "政治", reading: "せいじ", meaning: "정치" }],
    },
    {
      kanji: "経",
      meaning: "지날",
      sound: "경",
      onyomi: [
        { reading: "ケイ", kr: "케이", word: "経済", wordReading: "けいざい", meaning: "경제" },
        { reading: "キョウ", kr: "쿄우", word: "お経", wordReading: "おきょう", meaning: "불경" },
      ],
      kunyomi: [
        { reading: "へ", kr: "헤", word: "経る", wordReading: "へる", meaning: "(시간이) 지나다, 경과하다" },
      ],
      examples: [{ word: "経済", reading: "けいざい", meaning: "경제" }],
    },
    {
      kanji: "済",
      meaning: "건널",
      sound: "제",
      onyomi: [
        { reading: "サイ", kr: "사이", word: "経済", wordReading: "けいざい", meaning: "경제" },
      ],
      kunyomi: [
        { reading: "す", kr: "스", word: "済む", wordReading: "すむ", meaning: "끝나다, 해결되다" },
      ],
      examples: [{ word: "経済", reading: "けいざい", meaning: "경제" }],
    },
    {
      kanji: "歴",
      meaning: "지날",
      sound: "력",
      onyomi: [
        { reading: "レキ", kr: "레키", word: "歴史", wordReading: "れきし", meaning: "역사" },
      ],
      kunyomi: [],
      examples: [{ word: "歴史", reading: "れきし", meaning: "역사" }],
    },
    {
      kanji: "史",
      meaning: "역사",
      sound: "사",
      onyomi: [
        { reading: "シ", kr: "시", word: "歴史", wordReading: "れきし", meaning: "역사" },
      ],
      kunyomi: [],
      examples: [{ word: "歴史", reading: "れきし", meaning: "역사" }],
    },
    {
      kanji: "運",
      meaning: "옮길",
      sound: "운",
      onyomi: [
        { reading: "ウン", kr: "운", word: "運動", wordReading: "うんどう", meaning: "운동" },
      ],
      kunyomi: [
        { reading: "はこ", kr: "하코", word: "運ぶ", wordReading: "はこぶ", meaning: "옮기다, 운반하다" },
      ],
      examples: [{ word: "運動", reading: "うんどう", meaning: "운동" }],
    },
    {
      kanji: "動",
      meaning: "움직일",
      sound: "동",
      onyomi: [
        { reading: "ドウ", kr: "도우", word: "運動", wordReading: "うんどう", meaning: "운동" },
      ],
      kunyomi: [
        { reading: "うご", kr: "우고", word: "動く", wordReading: "うごく", meaning: "움직이다" },
      ],
      examples: [{ word: "運動", reading: "うんどう", meaning: "운동" }],
    },
    {
      kanji: "泳",
      meaning: "헤엄칠",
      sound: "영",
      onyomi: [
        { reading: "エイ", kr: "에이", word: "水泳", wordReading: "すいえい", meaning: "수영" },
      ],
      kunyomi: [
        { reading: "およ", kr: "오요", word: "泳ぐ", wordReading: "およぐ", meaning: "수영하다" },
      ],
      examples: [{ word: "泳ぐ", reading: "およぐ", meaning: "수영하다" }],
    },
    {
      kanji: "旅",
      meaning: "나그네",
      sound: "려",
      onyomi: [
        { reading: "リョ", kr: "료", word: "旅行", wordReading: "りょこう", meaning: "여행" },
      ],
      kunyomi: [
        { reading: "たび", kr: "타비", word: "旅", wordReading: "たび", meaning: "여행" },
      ],
      examples: [{ word: "旅行", reading: "りょこう", meaning: "여행" }],
    },
    {
      kanji: "世",
      meaning: "인간(대)",
      sound: "세",
      onyomi: [
        { reading: "セ", kr: "세", word: "世界", wordReading: "せかい", meaning: "세계" },
        { reading: "セイ", kr: "세이", word: "世紀", wordReading: "せいき", meaning: "세기" },
      ],
      kunyomi: [
        { reading: "よ", kr: "요", word: "世の中", wordReading: "よのなか", meaning: "세상" },
      ],
      examples: [{ word: "世界", reading: "せかい", meaning: "세계" }],
    },
    {
      kanji: "界",
      meaning: "지경",
      sound: "계",
      onyomi: [
        { reading: "カイ", kr: "카이", word: "世界", wordReading: "せかい", meaning: "세계" },
      ],
      kunyomi: [],
      examples: [{ word: "世界", reading: "せかい", meaning: "세계" }],
    },
    {
      kanji: "練",
      meaning: "익힐",
      sound: "련",
      onyomi: [
        { reading: "レン", kr: "렌", word: "練習", wordReading: "れんしゅう", meaning: "연습" },
      ],
      kunyomi: [
        { reading: "ね", kr: "네", word: "練る", wordReading: "ねる", meaning: "(반죽 등을) 이기다, 다듬다" },
      ],
      examples: [{ word: "練習", reading: "れんしゅう", meaning: "연습" }],
    },
    {
      kanji: "習",
      meaning: "익힐",
      sound: "습",
      onyomi: [
        { reading: "シュウ", kr: "슈우", word: "練習", wordReading: "れんしゅう", meaning: "연습" },
      ],
      kunyomi: [
        { reading: "なら", kr: "나라", word: "習う", wordReading: "ならう", meaning: "배우다" },
      ],
      examples: [{ word: "練習", reading: "れんしゅう", meaning: "연습" }],
    },
    {
      kanji: "写",
      meaning: "베낄",
      sound: "사",
      onyomi: [
        { reading: "シャ", kr: "샤", word: "写真", wordReading: "しゃしん", meaning: "사진" },
      ],
      kunyomi: [
        { reading: "うつ", kr: "우츠", word: "写す", wordReading: "うつす", meaning: "베끼다, 찍다" },
      ],
      examples: [{ word: "写真", reading: "しゃしん", meaning: "사진" }],
    },
    {
      kanji: "真",
      meaning: "참",
      sound: "진",
      onyomi: [
        { reading: "シン", kr: "신", word: "写真", wordReading: "しゃしん", meaning: "사진" },
      ],
      kunyomi: [
        { reading: "ま", kr: "마", word: "真っ赤", wordReading: "まっか", meaning: "새빨감" },
      ],
      examples: [{ word: "写真", reading: "しゃしん", meaning: "사진" }],
    },
    {
      kanji: "楽",
      meaning: "즐길(노래)",
      sound: "락(악)",
      onyomi: [
        { reading: "ガク", kr: "가쿠", word: "音楽", wordReading: "おんがく", meaning: "음악" },
        { reading: "ラク", kr: "라쿠", word: "楽", wordReading: "らく", meaning: "편안함" },
      ],
      kunyomi: [
        { reading: "たの", kr: "타노", word: "楽しい", wordReading: "たのしい", meaning: "즐겁다" },
      ],
      examples: [{ word: "音楽", reading: "おんがく", meaning: "음악" }],
    },
    {
      kanji: "声",
      meaning: "소리",
      sound: "성",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "音声", wordReading: "おんせい", meaning: "음성" },
        { reading: "ショウ", kr: "쇼우", word: "声聞", wordReading: "しょうもん", meaning: "성문(불교 용어)" },
      ],
      kunyomi: [
        { reading: "こえ", kr: "코에", word: "声", wordReading: "こえ", meaning: "목소리" },
      ],
      examples: [{ word: "声", reading: "こえ", meaning: "목소리" }],
    },
    {
      kanji: "歌",
      meaning: "노래",
      sound: "가",
      onyomi: [
        { reading: "カ", kr: "카", word: "歌手", wordReading: "かしゅ", meaning: "가수" },
      ],
      kunyomi: [
        { reading: "うた", kr: "우타", word: "歌", wordReading: "うた", meaning: "노래" },
      ],
      examples: [{ word: "歌", reading: "うた", meaning: "노래" }],
    },
    {
      kanji: "集",
      meaning: "모을",
      sound: "집",
      onyomi: [
        { reading: "シュウ", kr: "슈우", word: "集合", wordReading: "しゅうごう", meaning: "집합" },
      ],
      kunyomi: [
        { reading: "あつ", kr: "아츠", word: "集める", wordReading: "あつめる", meaning: "모으다" },
      ],
      examples: [{ word: "集める", reading: "あつめる", meaning: "모으다" }],
    },
    {
      kanji: "作",
      meaning: "지을",
      sound: "작",
      onyomi: [
        { reading: "サク", kr: "사쿠", word: "作品", wordReading: "さくひん", meaning: "작품" },
        { reading: "サ", kr: "사", word: "作法", wordReading: "さほう", meaning: "예의범절, 작법" },
      ],
      kunyomi: [
        { reading: "つく", kr: "츠쿠", word: "作る", wordReading: "つくる", meaning: "만들다" },
      ],
      examples: [{ word: "作る", reading: "つくる", meaning: "만들다" }],
    },
    {
      kanji: "使",
      meaning: "부릴",
      sound: "사",
      onyomi: [
        { reading: "シ", kr: "시", word: "使用", wordReading: "しよう", meaning: "사용" },
      ],
      kunyomi: [
        { reading: "つか", kr: "츠카", word: "使う", wordReading: "つかう", meaning: "사용하다" },
      ],
      examples: [{ word: "使う", reading: "つかう", meaning: "사용하다" }],
    },
    {
      kanji: "思",
      meaning: "생각할",
      sound: "사",
      onyomi: [
        { reading: "シ", kr: "시", word: "意思", wordReading: "いし", meaning: "의사, 생각" },
      ],
      kunyomi: [
        { reading: "おも", kr: "오모", word: "思う", wordReading: "おもう", meaning: "생각하다" },
      ],
      examples: [{ word: "思う", reading: "おもう", meaning: "생각하다" }],
    },
    {
      kanji: "持",
      meaning: "가질",
      sound: "지",
      onyomi: [
        { reading: "ジ", kr: "지", word: "支持", wordReading: "しじ", meaning: "지지" },
      ],
      kunyomi: [
        { reading: "も", kr: "모", word: "持つ", wordReading: "もつ", meaning: "가지다, 들다" },
      ],
      examples: [{ word: "持つ", reading: "もつ", meaning: "가지다, 들다" }],
    },
    {
      kanji: "当",
      meaning: "마땅할",
      sound: "당",
      onyomi: [
        { reading: "トウ", kr: "토우", word: "当然", wordReading: "とうぜん", meaning: "당연" },
      ],
      kunyomi: [
        { reading: "あ", kr: "아", word: "当たる", wordReading: "あたる", meaning: "맞다, 명중하다" },
      ],
      examples: [{ word: "当たる", reading: "あたる", meaning: "맞다, 명중하다" }],
    },
    {
      kanji: "知",
      meaning: "알",
      sound: "지",
      onyomi: [
        { reading: "チ", kr: "치", word: "知識", wordReading: "ちしき", meaning: "지식" },
      ],
      kunyomi: [
        { reading: "し", kr: "시", word: "知る", wordReading: "しる", meaning: "알다" },
      ],
      examples: [{ word: "知る", reading: "しる", meaning: "알다" }],
    },
    {
      kanji: "働",
      meaning: "일할",
      sound: "동",
      onyomi: [
        { reading: "ドウ", kr: "도우", word: "労働", wordReading: "ろうどう", meaning: "노동" },
      ],
      kunyomi: [
        { reading: "はたら", kr: "하타라", word: "働く", wordReading: "はたらく", meaning: "일하다" },
      ],
      examples: [{ word: "働く", reading: "はたらく", meaning: "일하다" }],
    },
    {
      kanji: "始",
      meaning: "비로소",
      sound: "시",
      onyomi: [
        { reading: "シ", kr: "시", word: "開始", wordReading: "かいし", meaning: "개시" },
      ],
      kunyomi: [
        { reading: "はじ", kr: "하지", word: "始まる", wordReading: "はじまる", meaning: "시작되다" },
      ],
      examples: [{ word: "始まる", reading: "はじまる", meaning: "시작되다" }],
    },
    {
      kanji: "終",
      meaning: "끝날",
      sound: "종",
      onyomi: [
        { reading: "シュウ", kr: "슈우", word: "終了", wordReading: "しゅうりょう", meaning: "종료" },
      ],
      kunyomi: [
        { reading: "お", kr: "오", word: "終わる", wordReading: "おわる", meaning: "끝나다" },
      ],
      examples: [{ word: "終わる", reading: "おわる", meaning: "끝나다" }],
    },
    {
      kanji: "乗",
      meaning: "탈",
      sound: "승",
      onyomi: [
        { reading: "ジョウ", kr: "죠우", word: "乗車", wordReading: "じょうしゃ", meaning: "승차" },
      ],
      kunyomi: [
        { reading: "の", kr: "노", word: "乗る", wordReading: "のる", meaning: "타다" },
      ],
      examples: [{ word: "乗る", reading: "のる", meaning: "타다" }],
    },
    {
      kanji: "降",
      meaning: "내릴",
      sound: "강",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "降水", wordReading: "こうすい", meaning: "강수" },
      ],
      kunyomi: [
        { reading: "お", kr: "오", word: "降りる", wordReading: "おりる", meaning: "내리다" },
        { reading: "ふ", kr: "후", word: "降る", wordReading: "ふる", meaning: "(비/눈이) 내리다" },
      ],
      examples: [{ word: "降りる", reading: "おりる", meaning: "내리다" }],
    },
    {
      kanji: "開",
      meaning: "열",
      sound: "개",
      onyomi: [
        { reading: "カイ", kr: "카이", word: "公開", wordReading: "こうかい", meaning: "공개" },
      ],
      kunyomi: [
        { reading: "あ", kr: "아", word: "開ける", wordReading: "あける", meaning: "열다" },
        { reading: "ひら", kr: "히라", word: "開く", wordReading: "ひらく", meaning: "열리다" },
      ],
      examples: [{ word: "開ける", reading: "あける", meaning: "열다" }],
    },
    {
      kanji: "閉",
      meaning: "닫을",
      sound: "폐",
      onyomi: [
        { reading: "ヘイ", kr: "헤이", word: "閉店", wordReading: "へいてん", meaning: "폐점" },
      ],
      kunyomi: [
        { reading: "し", kr: "시", word: "閉める", wordReading: "しめる", meaning: "닫다" },
        { reading: "と", kr: "토", word: "閉じる", wordReading: "とじる", meaning: "닫다" },
      ],
      examples: [{ word: "閉める", reading: "しめる", meaning: "닫다" }],
    },
    {
      kanji: "発",
      meaning: "필",
      sound: "발",
      onyomi: [
        { reading: "ハツ", kr: "하츠", word: "発見", wordReading: "はっけん", meaning: "발견" },
        { reading: "ホツ", kr: "호츠", word: "発起", wordReading: "ほっき", meaning: "발기, 시작함" },
      ],
      kunyomi: [],
      examples: [{ word: "出発", reading: "しゅっぱつ", meaning: "출발" }],
    },
    {
      kanji: "着",
      meaning: "붙을",
      sound: "착",
      onyomi: [
        { reading: "チャク", kr: "챠쿠", word: "到着", wordReading: "とうちゃく", meaning: "도착" },
        { reading: "ジャク", kr: "쟈쿠", word: "執着", wordReading: "しゅうじゃく", meaning: "집착" },
      ],
      kunyomi: [
        { reading: "き", kr: "키", word: "着る", wordReading: "きる", meaning: "입다" },
        { reading: "つ", kr: "츠", word: "着く", wordReading: "つく", meaning: "도착하다" },
      ],
      examples: [{ word: "着く", reading: "つく", meaning: "도착하다" }],
    },
    {
      kanji: "走",
      meaning: "달릴",
      sound: "주",
      onyomi: [
        { reading: "ソウ", kr: "소우", word: "競走", wordReading: "きょうそう", meaning: "경주" },
      ],
      kunyomi: [
        { reading: "はし", kr: "하시", word: "走る", wordReading: "はしる", meaning: "달리다" },
      ],
      examples: [{ word: "走る", reading: "はしる", meaning: "달리다" }],
    },
    {
      kanji: "歩",
      meaning: "걸음",
      sound: "보",
      onyomi: [
        { reading: "ホ", kr: "호", word: "歩道", wordReading: "ほどう", meaning: "보도" },
        { reading: "ブ", kr: "부", word: "歩合", wordReading: "ぶあい", meaning: "비율, 보합" },
      ],
      kunyomi: [
        { reading: "ある", kr: "아루", word: "歩く", wordReading: "あるく", meaning: "걷다" },
        { reading: "あゆ", kr: "아유", word: "歩む", wordReading: "あゆむ", meaning: "걷다, 나아가다" },
      ],
      examples: [{ word: "歩く", reading: "あるく", meaning: "걷다" }],
    },
    {
      kanji: "近",
      meaning: "가까울",
      sound: "근",
      onyomi: [
        { reading: "キン", kr: "킨", word: "近所", wordReading: "きんじょ", meaning: "근처, 이웃" },
      ],
      kunyomi: [
        { reading: "ちか", kr: "치카", word: "近い", wordReading: "ちかい", meaning: "가깝다" },
      ],
      examples: [{ word: "近い", reading: "ちかい", meaning: "가깝다" }],
    },
    {
      kanji: "遠",
      meaning: "멀",
      sound: "원",
      onyomi: [
        { reading: "エン", kr: "엔", word: "永遠", wordReading: "えいえん", meaning: "영원" },
        { reading: "オン", kr: "온", word: "久遠", wordReading: "くおん", meaning: "구원, 영원(불교 용어)" },
      ],
      kunyomi: [
        { reading: "とお", kr: "토오", word: "遠い", wordReading: "とおい", meaning: "멀다" },
      ],
      examples: [{ word: "遠い", reading: "とおい", meaning: "멀다" }],
    },
    {
      kanji: "重",
      meaning: "무거울",
      sound: "중",
      onyomi: [
        { reading: "ジュウ", kr: "쥬우", word: "重要", wordReading: "じゅうよう", meaning: "중요" },
        { reading: "チョウ", kr: "쵸우", word: "貴重", wordReading: "きちょう", meaning: "귀중" },
      ],
      kunyomi: [
        { reading: "おも", kr: "오모", word: "重い", wordReading: "おもい", meaning: "무겁다" },
        { reading: "かさ", kr: "카사", word: "重なる", wordReading: "かさなる", meaning: "겹치다" },
      ],
      examples: [{ word: "重い", reading: "おもい", meaning: "무겁다" }],
    },
    {
      kanji: "軽",
      meaning: "가벼울",
      sound: "경",
      onyomi: [
        { reading: "ケイ", kr: "케이", word: "軽率", wordReading: "けいそつ", meaning: "경솔" },
      ],
      kunyomi: [
        { reading: "かる", kr: "카루", word: "軽い", wordReading: "かるい", meaning: "가볍다" },
      ],
      examples: [{ word: "軽い", reading: "かるい", meaning: "가볍다" }],
    },
    {
      kanji: "早",
      meaning: "일찍",
      sound: "조",
      onyomi: [
        { reading: "ソウ", kr: "소우", word: "早々", wordReading: "そうそう", meaning: "서둘러, 급히" },
        { reading: "サッ", kr: "삿", word: "早速", wordReading: "さっそく", meaning: "즉시, 당장" },
      ],
      kunyomi: [
        { reading: "はや", kr: "하야", word: "早い", wordReading: "はやい", meaning: "(시간이) 이르다" },
      ],
      examples: [{ word: "早い", reading: "はやい", meaning: "(시간이) 이르다" }],
    },
    {
      kanji: "速",
      meaning: "빠를",
      sound: "속",
      onyomi: [
        { reading: "ソク", kr: "소쿠", word: "速度", wordReading: "そくど", meaning: "속도" },
      ],
      kunyomi: [
        { reading: "はや", kr: "하야", word: "速い", wordReading: "はやい", meaning: "(속도가) 빠르다" },
      ],
      examples: [{ word: "速い", reading: "はやい", meaning: "(속도가) 빠르다" }],
    },
    {
      kanji: "遅",
      meaning: "늦을",
      sound: "지",
      onyomi: [
        { reading: "チ", kr: "치", word: "遅刻", wordReading: "ちこく", meaning: "지각" },
      ],
      kunyomi: [
        { reading: "おそ", kr: "오소", word: "遅い", wordReading: "おそい", meaning: "느리다, 늦다" },
        { reading: "おく", kr: "오쿠", word: "遅れる", wordReading: "おくれる", meaning: "늦다" },
      ],
      examples: [{ word: "遅い", reading: "おそい", meaning: "느리다, 늦다" }],
    },
    {
      kanji: "広",
      meaning: "넓을",
      sound: "광",
      onyomi: [
        { reading: "コウ", kr: "코우", word: "広告", wordReading: "こうこく", meaning: "광고" },
      ],
      kunyomi: [
        { reading: "ひろ", kr: "히로", word: "広い", wordReading: "ひろい", meaning: "넓다" },
      ],
      examples: [{ word: "広い", reading: "ひろい", meaning: "넓다" }],
    },
    {
      kanji: "細",
      meaning: "가늘",
      sound: "세",
      onyomi: [
        { reading: "サイ", kr: "사이", word: "詳細", wordReading: "しょうさい", meaning: "상세" },
      ],
      kunyomi: [
        { reading: "ほそ", kr: "호소", word: "細い", wordReading: "ほそい", meaning: "가늘다" },
        { reading: "こま", kr: "코마", word: "細かい", wordReading: "こまかい", meaning: "자세하다, 잘다" },
      ],
      examples: [{ word: "細い", reading: "ほそい", meaning: "가늘다" }],
    },
    {
      kanji: "太",
      meaning: "클(굵을)",
      sound: "태",
      onyomi: [
        { reading: "タイ", kr: "타이", word: "太陽", wordReading: "たいよう", meaning: "태양" },
        { reading: "タ", kr: "타", word: "丸太", wordReading: "まるた", meaning: "통나무" },
      ],
      kunyomi: [
        { reading: "ふと", kr: "후토", word: "太い", wordReading: "ふとい", meaning: "굵다" },
      ],
      examples: [{ word: "太い", reading: "ふとい", meaning: "굵다" }],
    },
    {
      kanji: "暑",
      meaning: "더울",
      sound: "서",
      onyomi: [
        { reading: "ショ", kr: "쇼", word: "暑中", wordReading: "しょちゅう", meaning: "삼복더위 기간" },
      ],
      kunyomi: [
        { reading: "あつ", kr: "아츠", word: "暑い", wordReading: "あつい", meaning: "(날씨가) 덥다" },
      ],
      examples: [{ word: "暑い", reading: "あつい", meaning: "(날씨가) 덥다" }],
    },
    {
      kanji: "寒",
      meaning: "찰",
      sound: "한",
      onyomi: [
        { reading: "カン", kr: "칸", word: "寒気", wordReading: "かんき", meaning: "추위, 한기" },
      ],
      kunyomi: [
        { reading: "さむ", kr: "사무", word: "寒い", wordReading: "さむい", meaning: "춥다" },
      ],
      examples: [{ word: "寒い", reading: "さむい", meaning: "춥다" }],
    },
    {
      kanji: "低",
      meaning: "낮을",
      sound: "저",
      onyomi: [
        { reading: "テイ", kr: "테이", word: "低下", wordReading: "ていか", meaning: "저하" },
      ],
      kunyomi: [
        { reading: "ひく", kr: "히쿠", word: "低い", wordReading: "ひくい", meaning: "낮다" },
      ],
      examples: [{ word: "低い", reading: "ひくい", meaning: "낮다" }],
    },
    {
      kanji: "短",
      meaning: "짧을",
      sound: "단",
      onyomi: [
        { reading: "タン", kr: "탄", word: "短所", wordReading: "たんしょ", meaning: "단점" },
      ],
      kunyomi: [
        { reading: "みじか", kr: "미지카", word: "短い", wordReading: "みじかい", meaning: "짧다" },
      ],
      examples: [{ word: "短い", reading: "みじかい", meaning: "짧다" }],
    },
    {
      kanji: "弱",
      meaning: "약할",
      sound: "약",
      onyomi: [
        { reading: "ジャク", kr: "쟈쿠", word: "弱点", wordReading: "じゃくてん", meaning: "약점" },
      ],
      kunyomi: [
        { reading: "よわ", kr: "요와", word: "弱い", wordReading: "よわい", meaning: "약하다" },
      ],
      examples: [{ word: "弱い", reading: "よわい", meaning: "약하다" }],
    },
    {
      kanji: "若",
      meaning: "젊을",
      sound: "약",
      onyomi: [
        { reading: "ジャク", kr: "쟈쿠", word: "老若", wordReading: "ろうじゃく", meaning: "노소(늙은이와 젊은이)" },
        { reading: "ニャク", kr: "냐쿠", word: "老若男女", wordReading: "ろうにゃくなんにょ", meaning: "남녀노소" },
      ],
      kunyomi: [
        { reading: "わか", kr: "와카", word: "若い", wordReading: "わかい", meaning: "젊다" },
      ],
      examples: [{ word: "若い", reading: "わかい", meaning: "젊다" }],
    },
    {
      kanji: "静",
      meaning: "고요할",
      sound: "정",
      onyomi: [
        { reading: "セイ", kr: "세이", word: "静止", wordReading: "せいし", meaning: "정지" },
        { reading: "ジョウ", kr: "죠우", word: "静脈", wordReading: "じょうみゃく", meaning: "정맥" },
      ],
      kunyomi: [
        { reading: "しず", kr: "시즈", word: "静か", wordReading: "しずか", meaning: "조용함" },
      ],
      examples: [{ word: "静か", reading: "しずか", meaning: "조용함" }],
    },
    {
      kanji: "有",
      meaning: "있을",
      sound: "유",
      onyomi: [
        { reading: "ユウ", kr: "유우", word: "有名", wordReading: "ゆうめい", meaning: "유명함" },
        { reading: "ウ", kr: "우", word: "有名", wordReading: "ゆうめい", meaning: "유명함" },
      ],
      kunyomi: [
        { reading: "あ", kr: "아", word: "有る", wordReading: "ある", meaning: "있다" },
      ],
      examples: [{ word: "有名", reading: "ゆうめい", meaning: "유명함" }],
    },
    {
      kanji: "心",
      meaning: "마음",
      sound: "심",
      onyomi: [
        { reading: "シン", kr: "신", word: "中心", wordReading: "ちゅうしん", meaning: "중심" },
      ],
      kunyomi: [
        { reading: "こころ", kr: "코코로", word: "心", wordReading: "こころ", meaning: "마음" },
      ],
      examples: [{ word: "心", reading: "こころ", meaning: "마음" }],
    },
    {
      kanji: "同",
      meaning: "같을",
      sound: "동",
      onyomi: [
        { reading: "ドウ", kr: "도우", word: "同時", wordReading: "どうじ", meaning: "동시" },
      ],
      kunyomi: [
        { reading: "おな", kr: "오나", word: "同じ", wordReading: "おなじ", meaning: "같음" },
      ],
      examples: [{ word: "同じ", reading: "おなじ", meaning: "같음" }],
    },
    {
      kanji: "便",
      meaning: "편할",
      sound: "편",
      onyomi: [
        { reading: "ベン", kr: "벤", word: "便利", wordReading: "べんり", meaning: "편리함" },
        { reading: "ビン", kr: "빈", word: "郵便", wordReading: "ゆうびん", meaning: "우편" },
      ],
      kunyomi: [
        { reading: "たよ", kr: "타요", word: "便り", wordReading: "たより", meaning: "소식, 편지" },
      ],
      examples: [{ word: "便利", reading: "べんり", meaning: "편리함" }],
    },
    {
      kanji: "利",
      meaning: "이로울",
      sound: "리",
      onyomi: [
        { reading: "リ", kr: "리", word: "便利", wordReading: "べんり", meaning: "편리함" },
      ],
      kunyomi: [
        { reading: "き", kr: "키", word: "利く", wordReading: "きく", meaning: "듣다, 효과가 있다" },
      ],
      examples: [{ word: "便利", reading: "べんり", meaning: "편리함" }],
    },
    {
      kanji: "親",
      meaning: "친할",
      sound: "친",
      onyomi: [
        { reading: "シン", kr: "신", word: "親切", wordReading: "しんせつ", meaning: "친절함" },
      ],
      kunyomi: [
        { reading: "おや", kr: "오야", word: "親", wordReading: "おや", meaning: "부모" },
        { reading: "した", kr: "시타", word: "親しい", wordReading: "したしい", meaning: "친하다" },
      ],
      examples: [{ word: "親切", reading: "しんせつ", meaning: "친절함" }],
    },
    {
      kanji: "切",
      meaning: "끊을",
      sound: "절",
      onyomi: [
        { reading: "セツ", kr: "세츠", word: "親切", wordReading: "しんせつ", meaning: "친절함" },
        { reading: "サイ", kr: "사이", word: "一切", wordReading: "いっさい", meaning: "일체, 전부" },
      ],
      kunyomi: [
        { reading: "き", kr: "키", word: "切る", wordReading: "きる", meaning: "자르다" },
      ],
      examples: [{ word: "親切", reading: "しんせつ", meaning: "친절함" }],
    },
    {
      kanji: "不",
      meaning: "아닐",
      sound: "불",
      onyomi: [
        { reading: "フ", kr: "후", word: "不便", wordReading: "ふべん", meaning: "불편함" },
        { reading: "ブ", kr: "부", word: "不器用", wordReading: "ぶきよう", meaning: "서투름, 어색함" },
      ],
      kunyomi: [],
      examples: [{ word: "不便", reading: "ふべん", meaning: "불편함" }],
    },
  ],
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
      examples: [
        {
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
        {
          segments: [
            { t: "この" },
            { t: "犬", r: "いぬ" },
            { t: "は" },
            { t: "大", r: "おお" },
            { t: "きいです。" },
          ],
          pron: "코노 이누와 오-키-데스.",
          kr: "이 개는 큽니다.",
        },
        {
          segments: [
            { t: "大", r: "おお" },
            { t: "きい" },
            { t: "声", r: "こえ" },
            { t: "で" },
            { t: "話", r: "はな" },
            { t: "してください。" },
          ],
          pron: "오-키- 코에데 하나시테쿠다사이.",
          kr: "큰 소리로 이야기해 주세요.",
        },
        {
          segments: [
            { t: "象", r: "ぞう" },
            { t: "は" },
            { t: "とても" },
            { t: "大", r: "おお" },
            { t: "きい" },
            { t: "動物", r: "どうぶつ" },
            { t: "です。" },
          ],
          pron: "조-와 토테모 오-키- 도-부츠데스.",
          kr: "코끼리는 매우 큰 동물입니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "家", r: "いえ" },
            { t: "は" },
            { t: "大", r: "おお" },
            { t: "きくないです。" },
          ],
          pron: "코노 이에와 오-키쿠나이데스.",
          kr: "이 집은 크지 않습니다.",
        },
      ],
    },
    {
      word: "小さい",
      reading: "ちいさい",
      meaning: "작다",
      pron: "치-사이",
      pos: "い형용사",
      furigana: [{ t: "小", r: "ちい" }, { t: "さい" }],
      examples: [
        {
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
        {
          segments: [
            { t: "小", r: "ちい" },
            { t: "さい" },
            { t: "声", r: "こえ" },
            { t: "で" },
            { t: "話", r: "はな" },
            { t: "しました。" },
          ],
          pron: "치-사이 코에데 하나시마시타.",
          kr: "작은 소리로 이야기했습니다.",
        },
        {
          segments: [
            { t: "私", r: "わたし" },
            { t: "の" },
            { t: "部屋", r: "へや" },
            { t: "は" },
            { t: "小", r: "ちい" },
            { t: "さいです。" },
          ],
          pron: "와타시노 헤야와 치-사이데스.",
          kr: "제 방은 작습니다.",
        },
        {
          segments: [
            { t: "小", r: "ちい" },
            { t: "さい" },
            { t: "子供", r: "こども" },
            { t: "が" },
            { t: "公園", r: "こうえん" },
            { t: "で" },
            { t: "遊", r: "あそ" },
            { t: "んでいます。" },
          ],
          pron: "치-사이 코도모가 코-엔데 아손데이마스.",
          kr: "작은 아이가 공원에서 놀고 있습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "店", r: "みせ" },
            { t: "は" },
            { t: "小", r: "ちい" },
            { t: "さくて" },
            { t: "静", r: "しず" },
            { t: "かです。" },
          ],
          pron: "코노 미세와 치-사쿠테 시즈카데스.",
          kr: "이 가게는 작고 조용합니다.",
        },
      ],
    },
    {
      word: "高い",
      reading: "たかい",
      meaning: "높다, 비싸다",
      pron: "타카이",
      pos: "い형용사",
      furigana: [{ t: "高", r: "たか" }, { t: "い" }],
      examples: [
        {
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
        {
          segments: [
            { t: "あの" },
            { t: "山", r: "やま" },
            { t: "は" },
            { t: "とても" },
            { t: "高", r: "たか" },
            { t: "いです。" },
          ],
          pron: "아노 야마와 토테모 타카이데스.",
          kr: "저 산은 매우 높습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "かばんは" },
            { t: "高", r: "たか" },
            { t: "すぎます。" },
          ],
          pron: "코노 카방와 타카스기마스.",
          kr: "이 가방은 너무 비쌉니다.",
        },
        {
          segments: [
            { t: "彼", r: "かれ" },
            { t: "は" },
            { t: "背", r: "せ" },
            { t: "が" },
            { t: "高", r: "たか" },
            { t: "いです。" },
          ],
          pron: "카레와 세가 타카이데스.",
          kr: "그는 키가 큽니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "レストランは" },
            { t: "高", r: "たか" },
            { t: "いですが、おいしいです。" },
          ],
          pron: "코노 레스토랑와 타카이데스가, 오이시-데스.",
          kr: "이 식당은 비싸지만 맛있습니다.",
        },
      ],
    },
    {
      word: "安い",
      reading: "やすい",
      meaning: "싸다",
      pron: "야스이",
      pos: "い형용사",
      furigana: [{ t: "安", r: "やす" }, { t: "い" }],
      examples: [
        {
          segments: [
            { t: "この" },
            { t: "りんごは" },
            { t: "安", r: "やす" },
            { t: "いです。" },
          ],
          pron: "코노 링고와 야스이데스.",
          kr: "이 사과는 쌉니다.",
        },
        {
          segments: [
            { t: "安", r: "やす" },
            { t: "い" },
            { t: "店", r: "みせ" },
            { t: "で" },
            { t: "買", r: "か" },
            { t: "い" },
            { t: "物", r: "もの" },
            { t: "をしました。" },
          ],
          pron: "야스이 미세데 카이모노오 시마시타.",
          kr: "싼 가게에서 쇼핑을 했습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "チケットは" },
            { t: "思", r: "おも" },
            { t: "ったより" },
            { t: "安", r: "やす" },
            { t: "かったです。" },
          ],
          pron: "코노 치켓토와 오못타요리 야스캇타데스.",
          kr: "이 티켓은 생각보다 쌌습니다.",
        },
        {
          segments: [
            { t: "もっと" },
            { t: "安", r: "やす" },
            { t: "い" },
            { t: "部屋", r: "へや" },
            { t: "はありませんか。" },
          ],
          pron: "못토 야스이 헤야와 아리마셍카.",
          kr: "더 싼 방은 없나요?",
        },
        {
          segments: [
            { t: "野菜", r: "やさい" },
            { t: "は" },
            { t: "魚", r: "さかな" },
            { t: "より" },
            { t: "安", r: "やす" },
            { t: "いです。" },
          ],
          pron: "야사이와 사카나요리 야스이데스.",
          kr: "야채는 생선보다 쌉니다.",
        },
      ],
    },
    {
      word: "新しい",
      reading: "あたらしい",
      meaning: "새롭다",
      pron: "아타라시-",
      pos: "い형용사",
      furigana: [{ t: "新", r: "あたら" }, { t: "しい" }],
      examples: [
        {
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
        {
          segments: [
            { t: "新", r: "あたら" },
            { t: "しい" },
            { t: "先生", r: "せんせい" },
            { t: "が" },
            { t: "来", r: "き" },
            { t: "ました。" },
          ],
          pron: "아타라시- 센세-가 키마시타.",
          kr: "새 선생님이 오셨습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "アプリの" },
            { t: "新", r: "あたら" },
            { t: "しい" },
            { t: "バージョンが" },
            { t: "出", r: "で" },
            { t: "ました。" },
          ],
          pron: "코노 아푸리노 아타라시- 바-존가 데마시타.",
          kr: "이 앱의 새 버전이 나왔습니다.",
        },
        {
          segments: [
            { t: "新", r: "あたら" },
            { t: "しい" },
            { t: "仕事", r: "しごと" },
            { t: "は" },
            { t: "楽", r: "たの" },
            { t: "しいです。" },
          ],
          pron: "아타라시- 시고토와 타노시-데스.",
          kr: "새 일은 즐겁습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "時計", r: "とけい" },
            { t: "は" },
            { t: "新", r: "あたら" },
            { t: "しいです。" },
          ],
          pron: "코노 토케-와 아타라시-데스.",
          kr: "이 시계는 새것입니다.",
        },
      ],
    },
    {
      word: "古い",
      reading: "ふるい",
      meaning: "낡다, 오래되다",
      pron: "후루이",
      pos: "い형용사",
      furigana: [{ t: "古", r: "ふる" }, { t: "い" }],
      examples: [
        {
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
        {
          segments: [
            { t: "古", r: "ふる" },
            { t: "い" },
            { t: "写真", r: "しゃしん" },
            { t: "を" },
            { t: "見", r: "み" },
            { t: "つけました。" },
          ],
          pron: "후루이 샤신오 미츠케마시타.",
          kr: "오래된 사진을 발견했습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "本", r: "ほん" },
            { t: "は" },
            { t: "古", r: "ふる" },
            { t: "いですが、" },
            { t: "面白", r: "おもしろ" },
            { t: "いです。" },
          ],
          pron: "코노 홍와 후루이데스가, 오모시로이데스.",
          kr: "이 책은 오래됐지만 재미있습니다.",
        },
        {
          segments: [
            { t: "古", r: "ふる" },
            { t: "い" },
            { t: "橋", r: "はし" },
            { t: "を" },
            { t: "渡", r: "わた" },
            { t: "りました。" },
          ],
          pron: "후루이 하시오 와타리마시타.",
          kr: "오래된 다리를 건넜습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "車", r: "くるま" },
            { t: "は" },
            { t: "古", r: "ふる" },
            { t: "くて" },
            { t: "よく" },
            { t: "壊", r: "こわ" },
            { t: "れます。" },
          ],
          pron: "코노 쿠루마와 후루쿠테 요쿠 코와레마스.",
          kr: "이 차는 낡아서 자주 고장 납니다.",
        },
      ],
    },
    {
      word: "良い",
      reading: "いい / よい",
      meaning: "좋다",
      pron: "이-",
      pos: "い형용사",
      furigana: [{ t: "良", r: "よ" }, { t: "い" }],
      examples: [
        {
          segments: [
            { t: "天気", r: "てんき" },
            { t: "が" },
            { t: "良", r: "よ" },
            { t: "いですね。" },
          ],
          pron: "텡키가 요이데스네.",
          kr: "날씨가 좋네요.",
        },
        {
          segments: [
            { t: "この" },
            { t: "店", r: "みせ" },
            { t: "は" },
            { t: "サービスが" },
            { t: "良", r: "よ" },
            { t: "いです。" },
          ],
          pron: "코노 미세와 사-비스가 요이데스.",
          kr: "이 가게는 서비스가 좋습니다.",
        },
        {
          segments: [
            { t: "早", r: "はや" },
            { t: "く" },
            { t: "寝", r: "ね" },
            { t: "たほうが" },
            { t: "良", r: "よ" },
            { t: "いです。" },
          ],
          pron: "하야쿠 네타호-가 요이데스.",
          kr: "일찍 자는 편이 좋습니다.",
        },
        {
          segments: [
            { t: "今日", r: "きょう" },
            { t: "は" },
            { t: "気分", r: "きぶん" },
            { t: "が" },
            { t: "良", r: "よ" },
            { t: "いです。" },
          ],
          pron: "쿄-와 키붕가 요이데스.",
          kr: "오늘은 기분이 좋습니다.",
        },
        {
          segments: [
            { t: "頭", r: "あたま" },
            { t: "が" },
            { t: "良", r: "よ" },
            { t: "い" },
            { t: "学生", r: "がくせい" },
            { t: "です。" },
          ],
          pron: "아타마가 요이 각세-데스.",
          kr: "머리가 좋은 학생입니다.",
        },
      ],
    },
    {
      word: "悪い",
      reading: "わるい",
      meaning: "나쁘다",
      pron: "와루이",
      pos: "い형용사",
      furigana: [{ t: "悪", r: "わる" }, { t: "い" }],
      examples: [
        {
          segments: [
            { t: "天気", r: "てんき" },
            { t: "が" },
            { t: "悪", r: "わる" },
            { t: "いです。" },
          ],
          pron: "텡키가 와루이데스.",
          kr: "날씨가 나쁩니다.",
        },
        {
          segments: [
            { t: "気分", r: "きぶん" },
            { t: "が" },
            { t: "悪", r: "わる" },
            { t: "いです。" },
          ],
          pron: "키붕가 와루이데스.",
          kr: "속이 안 좋습니다.",
        },
        {
          segments: [
            { t: "車", r: "くるま" },
            { t: "の" },
            { t: "調子", r: "ちょうし" },
            { t: "が" },
            { t: "悪", r: "わる" },
            { t: "いです。" },
          ],
          pron: "쿠루마노 쵸-시가 와루이데스.",
          kr: "차 상태가 나쁩니다.",
        },
        {
          segments: [
            { t: "彼", r: "かれ" },
            { t: "に" },
            { t: "悪", r: "わる" },
            { t: "い" },
            { t: "ことをしました。" },
          ],
          pron: "카레니 와루이 코토오 시마시타.",
          kr: "그에게 나쁜 짓을 했습니다.",
        },
        {
          segments: [
            { t: "成績", r: "せいせき" },
            { t: "が" },
            { t: "悪", r: "わる" },
            { t: "くて" },
            { t: "心配", r: "しんぱい" },
            { t: "です。" },
          ],
          pron: "세-세키가 와루쿠테 심파이데스.",
          kr: "성적이 나빠서 걱정입니다.",
        },
      ],
    },
    {
      word: "暑い",
      reading: "あつい",
      meaning: "덥다",
      pron: "아츠이",
      pos: "い형용사",
      furigana: [{ t: "暑", r: "あつ" }, { t: "い" }],
      examples: [
        {
          segments: [
            { t: "今日", r: "きょう" },
            { t: "は" },
            { t: "暑", r: "あつ" },
            { t: "いです。" },
          ],
          pron: "쿄-와 아츠이데스.",
          kr: "오늘은 덥습니다.",
        },
        {
          segments: [
            { t: "夏", r: "なつ" },
            { t: "は" },
            { t: "とても" },
            { t: "暑", r: "あつ" },
            { t: "いです。" },
          ],
          pron: "나츠와 토테모 아츠이데스.",
          kr: "여름은 매우 덥습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "部屋", r: "へや" },
            { t: "は" },
            { t: "暑", r: "あつ" },
            { t: "すぎます。" },
          ],
          pron: "코노 헤야와 아츠스기마스.",
          kr: "이 방은 너무 덥습니다.",
        },
        {
          segments: [
            { t: "外", r: "そと" },
            { t: "は" },
            { t: "暑", r: "あつ" },
            { t: "いので" },
            { t: "水", r: "みず" },
            { t: "を" },
            { t: "たくさん" },
            { t: "飲", r: "の" },
            { t: "みます。" },
          ],
          pron: "소토와 아츠이노데 미즈오 타쿠상 노미마스.",
          kr: "밖은 더워서 물을 많이 마십니다.",
        },
        {
          segments: [
            { t: "東京", r: "とうきょう" },
            { t: "の" },
            { t: "夏", r: "なつ" },
            { t: "は" },
            { t: "暑", r: "あつ" },
            { t: "いです。" },
          ],
          pron: "토-쿄-노 나츠와 아츠이데스.",
          kr: "도쿄의 여름은 덥습니다.",
        },
      ],
    },
    {
      word: "寒い",
      reading: "さむい",
      meaning: "춥다",
      pron: "사무이",
      pos: "い형용사",
      furigana: [{ t: "寒", r: "さむ" }, { t: "い" }],
      examples: [
        {
          segments: [
            { t: "冬", r: "ふゆ" },
            { t: "は" },
            { t: "寒", r: "さむ" },
            { t: "いです。" },
          ],
          pron: "후유와 사무이데스.",
          kr: "겨울은 춥습니다.",
        },
        {
          segments: [
            { t: "今日", r: "きょう" },
            { t: "は" },
            { t: "とても" },
            { t: "寒", r: "さむ" },
            { t: "いです。" },
          ],
          pron: "쿄-와 토테모 사무이데스.",
          kr: "오늘은 매우 춥습니다.",
        },
        {
          segments: [
            { t: "北海道", r: "ほっかいどう" },
            { t: "は" },
            { t: "寒", r: "さむ" },
            { t: "い" },
            { t: "所", r: "ところ" },
            { t: "です。" },
          ],
          pron: "홋카이도-와 사무이 토코로데스.",
          kr: "홋카이도는 추운 곳입니다.",
        },
        {
          segments: [
            { t: "寒", r: "さむ" },
            { t: "くて" },
            { t: "手", r: "て" },
            { t: "が" },
            { t: "冷", r: "つめ" },
            { t: "たいです。" },
          ],
          pron: "사무쿠테 테가 츠메타이데스.",
          kr: "추워서 손이 차갑습니다.",
        },
        {
          segments: [
            { t: "夜", r: "よる" },
            { t: "は" },
            { t: "昼", r: "ひる" },
            { t: "より" },
            { t: "寒", r: "さむ" },
            { t: "いです。" },
          ],
          pron: "요루와 히루요리 사무이데스.",
          kr: "밤은 낮보다 춥습니다.",
        },
      ],
    },
    {
      word: "忙しい",
      reading: "いそがしい",
      meaning: "바쁘다",
      pron: "이소가시-",
      pos: "い형용사",
      furigana: [{ t: "忙", r: "いそが" }, { t: "しい" }],
      examples: [
        {
          segments: [
            { t: "毎日", r: "まいにち" },
            { t: "忙", r: "いそが" },
            { t: "しいです。" },
          ],
          pron: "마이니치 이소가시-데스.",
          kr: "매일 바쁩니다.",
        },
        {
          segments: [
            { t: "今週", r: "こんしゅう" },
            { t: "は" },
            { t: "とても" },
            { t: "忙", r: "いそが" },
            { t: "しいです。" },
          ],
          pron: "콘슈-와 토테모 이소가시-데스.",
          kr: "이번 주는 매우 바쁩니다.",
        },
        {
          segments: [
            { t: "忙", r: "いそが" },
            { t: "しいので" },
            { t: "旅行", r: "りょこう" },
            { t: "に" },
            { t: "行", r: "い" },
            { t: "けません。" },
          ],
          pron: "이소가시-노데 료코-니 이케마셍.",
          kr: "바빠서 여행을 갈 수 없습니다.",
        },
        {
          segments: [
            { t: "彼", r: "かれ" },
            { t: "は" },
            { t: "仕事", r: "しごと" },
            { t: "で" },
            { t: "忙", r: "いそが" },
            { t: "しいです。" },
          ],
          pron: "카레와 시고토데 이소가시-데스.",
          kr: "그는 일 때문에 바쁩니다.",
        },
        {
          segments: [
            { t: "朝", r: "あさ" },
            { t: "は" },
            { t: "忙", r: "いそが" },
            { t: "しくて" },
            { t: "朝", r: "あさ" },
            { t: "ごはんを" },
            { t: "食", r: "た" },
            { t: "べません。" },
          ],
          pron: "아사와 이소가시쿠테 아사고항오 타베마셍.",
          kr: "아침은 바빠서 아침밥을 먹지 않습니다.",
        },
      ],
    },
    {
      word: "面白い",
      reading: "おもしろい",
      meaning: "재미있다",
      pron: "오모시로이",
      pos: "い형용사",
      furigana: [{ t: "面白", r: "おもしろ" }, { t: "い" }],
      examples: [
        {
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
        {
          segments: [
            { t: "この" },
            { t: "本", r: "ほん" },
            { t: "は" },
            { t: "面白", r: "おもしろ" },
            { t: "いです。" },
          ],
          pron: "코노 홍와 오모시로이데스.",
          kr: "이 책은 재미있습니다.",
        },
        {
          segments: [
            { t: "日本語", r: "にほんご" },
            { t: "の" },
            { t: "授業", r: "じゅぎょう" },
            { t: "は" },
            { t: "面白", r: "おもしろ" },
            { t: "いです。" },
          ],
          pron: "니홍고노 쥬교-와 오모시로이데스.",
          kr: "일본어 수업은 재미있습니다.",
        },
        {
          segments: [
            { t: "彼", r: "かれ" },
            { t: "の" },
            { t: "話", r: "はなし" },
            { t: "は" },
            { t: "とても" },
            { t: "面白", r: "おもしろ" },
            { t: "かったです。" },
          ],
          pron: "카레노 하나시와 토테모 오모시로캇타데스.",
          kr: "그의 이야기는 매우 재미있었습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "ゲームは" },
            { t: "面白", r: "おもしろ" },
            { t: "くないです。" },
          ],
          pron: "코노 게-무와 오모시로쿠나이데스.",
          kr: "이 게임은 재미없습니다.",
        },
      ],
    },
    {
      word: "静か",
      reading: "しずか",
      meaning: "조용함",
      pron: "시즈카",
      pos: "な형용사",
      furigana: [{ t: "静", r: "しず" }, { t: "か" }],
      examples: [
        {
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
        {
          segments: [
            { t: "図書館", r: "としょかん" },
            { t: "は" },
            { t: "いつも" },
            { t: "静", r: "しず" },
            { t: "かです。" },
          ],
          pron: "토쇼칸와 이츠모 시즈카데스.",
          kr: "도서관은 항상 조용합니다.",
        },
        {
          segments: [{ t: "静", r: "しず" }, { t: "かにしてください。" }],
          pron: "시즈카니 시테쿠다사이.",
          kr: "조용히 해 주세요.",
        },
        {
          segments: [
            { t: "この" },
            { t: "町", r: "まち" },
            { t: "は" },
            { t: "夜", r: "よる" },
            { t: "静", r: "しず" },
            { t: "かになります。" },
          ],
          pron: "코노 마치와 요루 시즈카니 나리마스.",
          kr: "이 마을은 밤에 조용해집니다.",
        },
        {
          segments: [
            { t: "静", r: "しず" },
            { t: "かな" },
            { t: "場所", r: "ばしょ" },
            { t: "で" },
            { t: "本", r: "ほん" },
            { t: "を" },
            { t: "読", r: "よ" },
            { t: "みたいです。" },
          ],
          pron: "시즈카나 바쇼데 홍오 요미타이데스.",
          kr: "조용한 곳에서 책을 읽고 싶습니다.",
        },
      ],
    },
    {
      word: "元気",
      reading: "げんき",
      meaning: "건강함, 활기참",
      pron: "겡키",
      pos: "な형용사",
      furigana: [{ t: "元気", r: "げんき" }],
      examples: [
        {
          segments: [
            { t: "母", r: "はは" },
            { t: "は" },
            { t: "元気", r: "げんき" },
            { t: "です。" },
          ],
          pron: "하하와 겡키데스.",
          kr: "어머니는 건강합니다.",
        },
        {
          segments: [
            { t: "お" },
            { t: "元気", r: "げんき" },
            { t: "ですか。" },
          ],
          pron: "오겡키데스카.",
          kr: "잘 지내세요?",
        },
        {
          segments: [
            { t: "子供", r: "こども" },
            { t: "たちは" },
            { t: "元気", r: "げんき" },
            { t: "に" },
            { t: "遊", r: "あそ" },
            { t: "んでいます。" },
          ],
          pron: "코도모타치와 겡키니 아손데이마스.",
          kr: "아이들은 활기차게 놀고 있습니다.",
        },
        {
          segments: [
            { t: "祖父", r: "そふ" },
            { t: "は" },
            { t: "まだ" },
            { t: "元気", r: "げんき" },
            { t: "です。" },
          ],
          pron: "소후와 마다 겡키데스.",
          kr: "할아버지는 아직 건강하십니다.",
        },
        {
          segments: [
            { t: "私", r: "わたし" },
            { t: "は" },
            { t: "毎朝", r: "まいあさ" },
            { t: "元気", r: "げんき" },
            { t: "に" },
            { t: "起", r: "お" },
            { t: "きます。" },
          ],
          pron: "와타시와 마이아사 겡키니 오키마스.",
          kr: "저는 매일 아침 활기차게 일어납니다.",
        },
      ],
    },
    {
      word: "有名",
      reading: "ゆうめい",
      meaning: "유명함",
      pron: "유-메-",
      pos: "な형용사",
      furigana: [{ t: "有名", r: "ゆうめい" }],
      examples: [
        {
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
        {
          segments: [
            { t: "京都", r: "きょうと" },
            { t: "は" },
            { t: "有名", r: "ゆうめい" },
            { t: "な" },
            { t: "観光地", r: "かんこうち" },
            { t: "です。" },
          ],
          pron: "쿄-토와 유-메-나 캉코-치데스.",
          kr: "교토는 유명한 관광지입니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "店", r: "みせ" },
            { t: "は" },
            { t: "有名", r: "ゆうめい" },
            { t: "になりました。" },
          ],
          pron: "코노 미세와 유-메-니 나리마시타.",
          kr: "이 가게는 유명해졌습니다.",
        },
        {
          segments: [
            { t: "彼", r: "かれ" },
            { t: "は" },
            { t: "世界", r: "せかい" },
            { t: "で" },
            { t: "有名", r: "ゆうめい" },
            { t: "な" },
            { t: "俳優", r: "はいゆう" },
            { t: "です。" },
          ],
          pron: "카레와 세카이데 유-메-나 하이유-데스.",
          kr: "그는 세계적으로 유명한 배우입니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "料理", r: "りょうり" },
            { t: "は" },
            { t: "日本", r: "にほん" },
            { t: "で" },
            { t: "有名", r: "ゆうめい" },
            { t: "です。" },
          ],
          pron: "코노 료-리와 니혼데 유-메-데스.",
          kr: "이 요리는 일본에서 유명합니다.",
        },
      ],
    },
    {
      word: "便利",
      reading: "べんり",
      meaning: "편리함",
      pron: "벤리",
      pos: "な형용사",
      furigana: [{ t: "便利", r: "べんり" }],
      examples: [
        {
          segments: [
            { t: "この" },
            { t: "アプリは" },
            { t: "便利", r: "べんり" },
            { t: "です。" },
          ],
          pron: "코노 아푸리와 벤리데스.",
          kr: "이 앱은 편리합니다.",
        },
        {
          segments: [
            { t: "駅", r: "えき" },
            { t: "の" },
            { t: "近", r: "ちか" },
            { t: "くは" },
            { t: "とても" },
            { t: "便利", r: "べんり" },
            { t: "です。" },
          ],
          pron: "에키노 치카쿠와 토테모 벤리데스.",
          kr: "역 근처는 매우 편리합니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "道具", r: "どうぐ" },
            { t: "は" },
            { t: "便利", r: "べんり" },
            { t: "で" },
            { t: "よく" },
            { t: "使", r: "つか" },
            { t: "います。" },
          ],
          pron: "코노 도-구와 벤리데 요쿠 츠카이마스.",
          kr: "이 도구는 편리해서 자주 사용합니다.",
        },
        {
          segments: [
            { t: "電車", r: "でんしゃ" },
            { t: "は" },
            { t: "車", r: "くるま" },
            { t: "より" },
            { t: "便利", r: "べんり" },
            { t: "です。" },
          ],
          pron: "덴샤와 쿠루마요리 벤리데스.",
          kr: "전철은 차보다 편리합니다.",
        },
        {
          segments: [
            { t: "便利", r: "べんり" },
            { t: "な" },
            { t: "機能", r: "きのう" },
            { t: "が" },
            { t: "たくさん" },
            { t: "あります。" },
          ],
          pron: "벤리나 키노-가 타쿠상 아리마스.",
          kr: "편리한 기능이 많이 있습니다.",
        },
      ],
    },
    {
      word: "簡単",
      reading: "かんたん",
      meaning: "간단함",
      pron: "칸탄",
      pos: "な형용사",
      furigana: [{ t: "簡単", r: "かんたん" }],
      examples: [
        {
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
        {
          segments: [
            { t: "料理", r: "りょうり" },
            { t: "は" },
            { t: "とても" },
            { t: "簡単", r: "かんたん" },
            { t: "です。" },
          ],
          pron: "료-리와 토테모 칸탄데스.",
          kr: "요리는 매우 간단합니다.",
        },
        {
          segments: [
            { t: "簡単", r: "かんたん" },
            { t: "に" },
            { t: "説明", r: "せつめい" },
            { t: "します。" },
          ],
          pron: "칸탄니 세츠메-시마스.",
          kr: "간단히 설명하겠습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "ゲームは" },
            { t: "簡単", r: "かんたん" },
            { t: "で" },
            { t: "子供", r: "こども" },
            { t: "でもできます。" },
          ],
          pron: "코노 게-무와 칸탄데 코도모데모 데키마스.",
          kr: "이 게임은 간단해서 아이도 할 수 있습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "機械", r: "きかい" },
            { t: "の" },
            { t: "使", r: "つか" },
            { t: "い" },
            { t: "方", r: "かた" },
            { t: "は" },
            { t: "簡単", r: "かんたん" },
            { t: "です。" },
          ],
          pron: "코노 키카이노 츠카이카타와 칸탄데스.",
          kr: "이 기계의 사용법은 간단합니다.",
        },
      ],
    },
    {
      word: "親切",
      reading: "しんせつ",
      meaning: "친절함",
      pron: "신세츠",
      pos: "な형용사",
      furigana: [{ t: "親切", r: "しんせつ" }],
      examples: [
        {
          segments: [
            { t: "彼", r: "かれ" },
            { t: "は" },
            { t: "親切", r: "しんせつ" },
            { t: "です。" },
          ],
          pron: "카레와 신세츠데스.",
          kr: "그는 친절합니다.",
        },
        {
          segments: [
            { t: "あの" },
            { t: "店員", r: "てんいん" },
            { t: "は" },
            { t: "とても" },
            { t: "親切", r: "しんせつ" },
            { t: "です。" },
          ],
          pron: "아노 텡인와 토테모 신세츠데스.",
          kr: "저 점원은 매우 친절합니다.",
        },
        {
          segments: [
            { t: "先生", r: "せんせい" },
            { t: "は" },
            { t: "学生", r: "がくせい" },
            { t: "に" },
            { t: "親切", r: "しんせつ" },
            { t: "です。" },
          ],
          pron: "센세-와 각세-니 신세츠데스.",
          kr: "선생님은 학생에게 친절합니다.",
        },
        {
          segments: [
            { t: "親切", r: "しんせつ" },
            { t: "に" },
            { t: "道", r: "みち" },
            { t: "を" },
            { t: "教", r: "おし" },
            { t: "えてくれました。" },
          ],
          pron: "신세츠니 미치오 오시에테쿠레마시타.",
          kr: "친절하게 길을 알려주었습니다.",
        },
        {
          segments: [
            { t: "親切", r: "しんせつ" },
            { t: "な" },
            { t: "人", r: "ひと" },
            { t: "に" },
            { t: "会", r: "あ" },
            { t: "いました。" },
          ],
          pron: "신세츠나 히토니 아이마시타.",
          kr: "친절한 사람을 만났습니다.",
        },
      ],
    },
    {
      word: "好き",
      reading: "すき",
      meaning: "좋아함",
      pron: "스키",
      pos: "な형용사",
      furigana: [{ t: "好", r: "す" }, { t: "き" }],
      examples: [
        {
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
        {
          segments: [
            { t: "音楽", r: "おんがく" },
            { t: "が" },
            { t: "好", r: "す" },
            { t: "きです。" },
          ],
          pron: "옹가쿠가 스키데스.",
          kr: "음악을 좋아합니다.",
        },
        {
          segments: [
            { t: "彼女", r: "かのじょ" },
            { t: "は" },
            { t: "日本", r: "にほん" },
            { t: "料理", r: "りょうり" },
            { t: "が" },
            { t: "好", r: "す" },
            { t: "きです。" },
          ],
          pron: "카노죠와 니혼료-리가 스키데스.",
          kr: "그녀는 일본 요리를 좋아합니다.",
        },
        {
          segments: [
            { t: "私", r: "わたし" },
            { t: "は" },
            { t: "スポーツが" },
            { t: "好", r: "す" },
            { t: "きではありません。" },
          ],
          pron: "와타시와 스포-츠가 스키데와 아리마셍.",
          kr: "저는 스포츠를 좋아하지 않습니다.",
        },
        {
          segments: [
            { t: "一番", r: "いちばん" },
            { t: "好", r: "す" },
            { t: "きな" },
            { t: "色", r: "いろ" },
            { t: "は" },
            { t: "青", r: "あお" },
            { t: "です。" },
          ],
          pron: "이치반 스키나 이로와 아오데스.",
          kr: "가장 좋아하는 색은 파란색입니다.",
        },
      ],
    },
    {
      word: "嫌い",
      reading: "きらい",
      meaning: "싫어함",
      pron: "키라이",
      pos: "な형용사",
      furigana: [{ t: "嫌", r: "きら" }, { t: "い" }],
      examples: [
        {
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
        {
          segments: [
            { t: "兄", r: "あに" },
            { t: "は" },
            { t: "野菜", r: "やさい" },
            { t: "が" },
            { t: "嫌", r: "きら" },
            { t: "いです。" },
          ],
          pron: "아니와 야사이가 키라이데스.",
          kr: "형은 야채를 싫어합니다.",
        },
        {
          segments: [
            { t: "私", r: "わたし" },
            { t: "は" },
            { t: "雨", r: "あめ" },
            { t: "の" },
            { t: "日", r: "ひ" },
            { t: "が" },
            { t: "嫌", r: "きら" },
            { t: "いです。" },
          ],
          pron: "와타시와 아메노 히가 키라이데스.",
          kr: "저는 비 오는 날을 싫어합니다.",
        },
        {
          segments: [
            { t: "彼", r: "かれ" },
            { t: "は" },
            { t: "勉強", r: "べんきょう" },
            { t: "が" },
            { t: "嫌", r: "きら" },
            { t: "いではありません。" },
          ],
          pron: "카레와 벵쿄-가 키라이데와 아리마셍.",
          kr: "그는 공부를 싫어하지 않습니다.",
        },
        {
          segments: [
            { t: "嫌", r: "きら" },
            { t: "いな" },
            { t: "食", r: "た" },
            { t: "べ" },
            { t: "物", r: "もの" },
            { t: "はありますか。" },
          ],
          pron: "키라이나 타베모노와 아리마스카.",
          kr: "싫어하는 음식이 있나요?",
        },
      ],
    },
    {
      word: "食べる",
      reading: "たべる",
      meaning: "먹다",
      pron: "타베루",
      pos: "동사",
      furigana: [{ t: "食", r: "た" }, { t: "べる" }],
      examples: [
        {
          segments: [
            { t: "朝", r: "あさ" },
            { t: "ごはんを" },
            { t: "食", r: "た" },
            { t: "べます。" },
          ],
          pron: "아사고항오 타베마스.",
          kr: "아침밥을 먹습니다.",
        },
        {
          segments: [
            { t: "昨日", r: "きのう" },
            { t: "寿司", r: "すし" },
            { t: "を" },
            { t: "食", r: "た" },
            { t: "べました。" },
          ],
          pron: "키노- 스시오 타베마시타.",
          kr: "어제 초밥을 먹었습니다.",
        },
        {
          segments: [
            { t: "何", r: "なに" },
            { t: "を" },
            { t: "食", r: "た" },
            { t: "べたいですか。" },
          ],
          pron: "나니오 타베타이데스카.",
          kr: "무엇을 먹고 싶습니까?",
        },
        {
          segments: [
            { t: "野菜", r: "やさい" },
            { t: "を" },
            { t: "食", r: "た" },
            { t: "べなければなりません。" },
          ],
          pron: "야사이오 타베나케레바 나리마셍.",
          kr: "야채를 먹어야 합니다.",
        },
        {
          segments: [
            { t: "友達", r: "ともだち" },
            { t: "と" },
            { t: "ごはんを" },
            { t: "食", r: "た" },
            { t: "べに" },
            { t: "行", r: "い" },
            { t: "きました。" },
          ],
          pron: "토모다치토 고항오 타베니 이키마시타.",
          kr: "친구와 밥을 먹으러 갔습니다.",
        },
      ],
    },
    {
      word: "飲む",
      reading: "のむ",
      meaning: "마시다",
      pron: "노무",
      pos: "동사",
      furigana: [{ t: "飲", r: "の" }, { t: "む" }],
      examples: [
        {
          segments: [
            { t: "水", r: "みず" },
            { t: "を" },
            { t: "飲", r: "の" },
            { t: "みます。" },
          ],
          pron: "미즈오 노미마스.",
          kr: "물을 마십니다.",
        },
        {
          segments: [
            { t: "コーヒーを" },
            { t: "飲", r: "の" },
            { t: "みたいです。" },
          ],
          pron: "코-히-오 노미타이데스.",
          kr: "커피를 마시고 싶습니다.",
        },
        {
          segments: [
            { t: "薬", r: "くすり" },
            { t: "を" },
            { t: "飲", r: "の" },
            { t: "んでください。" },
          ],
          pron: "쿠스리오 논데쿠다사이.",
          kr: "약을 드세요.",
        },
        {
          segments: [
            { t: "毎朝", r: "まいあさ" },
            { t: "牛乳", r: "ぎゅうにゅう" },
            { t: "を" },
            { t: "飲", r: "の" },
            { t: "みます。" },
          ],
          pron: "마이아사 규-뉴-오 노미마스.",
          kr: "매일 아침 우유를 마십니다.",
        },
        {
          segments: [
            { t: "昨日", r: "きのう" },
            { t: "は" },
            { t: "お酒", r: "おさけ" },
            { t: "を" },
            { t: "飲", r: "の" },
            { t: "みませんでした。" },
          ],
          pron: "키노-와 오사케오 노미마센데시타.",
          kr: "어제는 술을 마시지 않았습니다.",
        },
      ],
    },
    {
      word: "行く",
      reading: "いく",
      meaning: "가다",
      pron: "이쿠",
      pos: "동사",
      furigana: [{ t: "行", r: "い" }, { t: "く" }],
      examples: [
        {
          segments: [
            { t: "学校", r: "がっこう" },
            { t: "へ" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "각코-에 이키마스.",
          kr: "학교에 갑니다.",
        },
        {
          segments: [
            { t: "明日", r: "あした" },
            { t: "病院", r: "びょういん" },
            { t: "に" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "아시타 뵤-인니 이키마스.",
          kr: "내일 병원에 갑니다.",
        },
        {
          segments: [
            { t: "一緒", r: "いっしょ" },
            { t: "に" },
            { t: "映画", r: "えいが" },
            { t: "を" },
            { t: "見", r: "み" },
            { t: "に" },
            { t: "行", r: "い" },
            { t: "きませんか。" },
          ],
          pron: "잇쇼니 에-가오 미니 이키마센카.",
          kr: "같이 영화 보러 가지 않을래요?",
        },
        {
          segments: [
            { t: "去年", r: "きょねん" },
            { t: "日本", r: "にほん" },
            { t: "へ" },
            { t: "行", r: "い" },
            { t: "きました。" },
          ],
          pron: "쿄넨 니홍에 이키마시타.",
          kr: "작년에 일본에 갔습니다.",
        },
        {
          segments: [
            { t: "電車", r: "でんしゃ" },
            { t: "で" },
            { t: "会社", r: "かいしゃ" },
            { t: "に" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "덴샤데 카이샤니 이키마스.",
          kr: "전철로 회사에 갑니다.",
        },
      ],
    },
    {
      word: "来る",
      reading: "くる",
      meaning: "오다",
      pron: "쿠루",
      pos: "동사",
      furigana: [{ t: "来", r: "く" }, { t: "る" }],
      examples: [
        {
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
        {
          segments: [
            { t: "先生", r: "せんせい" },
            { t: "は" },
            { t: "まだ" },
            { t: "来", r: "き" },
            { t: "ません。" },
          ],
          pron: "센세-와 마다 키마셍.",
          kr: "선생님은 아직 오지 않았습니다.",
        },
        {
          segments: [{ t: "バスが" }, { t: "来", r: "き" }, { t: "ました。" }],
          pron: "바스가 키마시타.",
          kr: "버스가 왔습니다.",
        },
        {
          segments: [
            { t: "春", r: "はる" },
            { t: "が" },
            { t: "来", r: "き" },
            { t: "ましたね。" },
          ],
          pron: "하루가 키마시타네.",
          kr: "봄이 왔네요.",
        },
        {
          segments: [
            { t: "また" },
            { t: "明日", r: "あした" },
            { t: "来", r: "き" },
            { t: "てください。" },
          ],
          pron: "마타 아시타 키테쿠다사이.",
          kr: "내일 또 와 주세요.",
        },
      ],
    },
    {
      word: "する",
      reading: "する",
      meaning: "하다",
      pron: "스루",
      pos: "동사",
      furigana: [{ t: "する" }],
      examples: [
        {
          segments: [
            { t: "毎日", r: "まいにち" },
            { t: "勉強", r: "べんきょう" },
            { t: "を" },
            { t: "します。" },
          ],
          pron: "마이니치 벵쿄-오 시마스.",
          kr: "매일 공부를 합니다.",
        },
        {
          segments: [
            { t: "週末", r: "しゅうまつ" },
            { t: "は" },
            { t: "何", r: "なに" },
            { t: "をしますか。" },
          ],
          pron: "슈-마츠와 나니오 시마스카.",
          kr: "주말은 무엇을 합니까?",
        },
        {
          segments: [
            { t: "昨日", r: "きのう" },
            { t: "買", r: "か" },
            { t: "い" },
            { t: "物", r: "もの" },
            { t: "をしました。" },
          ],
          pron: "키노- 카이모노오 시마시타.",
          kr: "어제 쇼핑을 했습니다.",
        },
        {
          segments: [{ t: "電話", r: "でんわ" }, { t: "をしてもいいですか。" }],
          pron: "뎅와오 시테모 이-데스카.",
          kr: "전화를 해도 될까요?",
        },
        {
          segments: [
            { t: "運動", r: "うんどう" },
            { t: "をすると" },
            { t: "元気", r: "げんき" },
            { t: "になります。" },
          ],
          pron: "운도-오 스루토 겡키니 나리마스.",
          kr: "운동을 하면 건강해집니다.",
        },
      ],
    },
    {
      word: "見る",
      reading: "みる",
      meaning: "보다",
      pron: "미루",
      pos: "동사",
      furigana: [{ t: "見", r: "み" }, { t: "る" }],
      examples: [
        {
          segments: [{ t: "テレビを" }, { t: "見", r: "み" }, { t: "ます。" }],
          pron: "테레비오 미마스.",
          kr: "텔레비전을 봅니다.",
        },
        {
          segments: [
            { t: "昨日", r: "きのう" },
            { t: "映画", r: "えいが" },
            { t: "を" },
            { t: "見", r: "み" },
            { t: "ました。" },
          ],
          pron: "키노- 에-가오 미마시타.",
          kr: "어제 영화를 봤습니다.",
        },
        {
          segments: [
            { t: "あの" },
            { t: "星", r: "ほし" },
            { t: "を" },
            { t: "見", r: "み" },
            { t: "てください。" },
          ],
          pron: "아노 호시오 미테쿠다사이.",
          kr: "저 별을 보세요.",
        },
        {
          segments: [
            { t: "写真", r: "しゃしん" },
            { t: "を" },
            { t: "見", r: "み" },
            { t: "せてもらえますか。" },
          ],
          pron: "샤신오 미세테모라에마스카.",
          kr: "사진을 보여줄 수 있나요?",
        },
        {
          segments: [
            { t: "子供", r: "こども" },
            { t: "が" },
            { t: "絵本", r: "えほん" },
            { t: "を" },
            { t: "見", r: "み" },
            { t: "ています。" },
          ],
          pron: "코도모가 에홍오 미테이마스.",
          kr: "아이가 그림책을 보고 있습니다.",
        },
      ],
    },
    {
      word: "は",
      reading: "は",
      meaning: "~은/는 (주제)",
      pron: "와",
      pos: "조사",
      furigana: [{ t: "は" }],
      examples: [
        {
          segments: [
            { t: "これ" },
            { t: "は" },
            { t: "本", r: "ほん" },
            { t: "です。" },
          ],
          pron: "코레와 혼데스.",
          kr: "이것은 책입니다.",
        },
        {
          segments: [
            { t: "私", r: "わたし" },
            { t: "は" },
            { t: "学生", r: "がくせい" },
            { t: "です。" },
          ],
          pron: "와타시와 각세-데스.",
          kr: "저는 학생입니다.",
        },
        {
          segments: [
            { t: "今日", r: "きょう" },
            { t: "は" },
            { t: "暇", r: "ひま" },
            { t: "です。" },
          ],
          pron: "쿄-와 히마데스.",
          kr: "오늘은 한가합니다.",
        },
        {
          segments: [
            { t: "犬", r: "いぬ" },
            { t: "は" },
            { t: "好", r: "す" },
            { t: "きですが、" },
            { t: "猫", r: "ねこ" },
            { t: "は" },
            { t: "嫌", r: "きら" },
            { t: "いです。" },
          ],
          pron: "이누와 스키데스가, 네코와 키라이데스.",
          kr: "개는 좋아하지만 고양이는 싫어합니다.",
        },
        {
          segments: [
            { t: "彼", r: "かれ" },
            { t: "は" },
            { t: "先生", r: "せんせい" },
            { t: "ではありません。" },
          ],
          pron: "카레와 센세-데와 아리마셍.",
          kr: "그는 선생님이 아닙니다.",
        },
      ],
    },
    {
      word: "が",
      reading: "が",
      meaning: "~이/가 (주격)",
      pron: "가",
      pos: "조사",
      furigana: [{ t: "が" }],
      examples: [
        {
          segments: [
            { t: "猫", r: "ねこ" },
            { t: "が" },
            { t: "好", r: "す" },
            { t: "きです。" },
          ],
          pron: "네코가 스키데스.",
          kr: "고양이를 좋아합니다.",
        },
        {
          segments: [
            { t: "誰", r: "だれ" },
            { t: "が" },
            { t: "来", r: "き" },
            { t: "ましたか。" },
          ],
          pron: "다레가 키마시타카.",
          kr: "누가 왔습니까?",
        },
        {
          segments: [
            { t: "頭", r: "あたま" },
            { t: "が" },
            { t: "痛", r: "いた" },
            { t: "いです。" },
          ],
          pron: "아타마가 이타이데스.",
          kr: "머리가 아픕니다.",
        },
        {
          segments: [
            { t: "雨", r: "あめ" },
            { t: "が" },
            { t: "降", r: "ふ" },
            { t: "っています。" },
          ],
          pron: "아메가 훗테이마스.",
          kr: "비가 내리고 있습니다.",
        },
        {
          segments: [
            { t: "日本語", r: "にほんご" },
            { t: "が" },
            { t: "上手", r: "じょうず" },
            { t: "ですね。" },
          ],
          pron: "니홍고가 죠-즈데스네.",
          kr: "일본어를 잘하시네요.",
        },
      ],
    },
    {
      word: "を",
      reading: "を",
      meaning: "~을/를 (목적격)",
      pron: "오",
      pos: "조사",
      furigana: [{ t: "を" }],
      examples: [
        {
          segments: [{ t: "パンを" }, { t: "食", r: "た" }, { t: "べます。" }],
          pron: "팡오 타베마스.",
          kr: "빵을 먹습니다.",
        },
        {
          segments: [
            { t: "テレビを" },
            { t: "消", r: "け" },
            { t: "してください。" },
          ],
          pron: "테레비오 케시테쿠다사이.",
          kr: "텔레비전을 꺼주세요.",
        },
        {
          segments: [
            { t: "本", r: "ほん" },
            { t: "を" },
            { t: "読", r: "よ" },
            { t: "みます。" },
          ],
          pron: "홍오 요미마스.",
          kr: "책을 읽습니다.",
        },
        {
          segments: [
            { t: "手紙", r: "てがみ" },
            { t: "を" },
            { t: "書", r: "か" },
            { t: "きました。" },
          ],
          pron: "테가미오 카키마시타.",
          kr: "편지를 썼습니다.",
        },
        {
          segments: [
            { t: "ドアを" },
            { t: "開", r: "あ" },
            { t: "けてください。" },
          ],
          pron: "도아오 아케테쿠다사이.",
          kr: "문을 열어 주세요.",
        },
      ],
    },
    {
      word: "に",
      reading: "に",
      meaning: "~에, ~에게",
      pron: "니",
      pos: "조사",
      furigana: [{ t: "に" }],
      examples: [
        {
          segments: [
            { t: "七時", r: "しちじ" },
            { t: "に" },
            { t: "起", r: "お" },
            { t: "きます。" },
          ],
          pron: "시치지니 오키마스.",
          kr: "7시에 일어납니다.",
        },
        {
          segments: [
            { t: "東京", r: "とうきょう" },
            { t: "に" },
            { t: "住", r: "す" },
            { t: "んでいます。" },
          ],
          pron: "토-쿄-니 슨데이마스.",
          kr: "도쿄에 살고 있습니다.",
        },
        {
          segments: [
            { t: "母", r: "はは" },
            { t: "に" },
            { t: "手紙", r: "てがみ" },
            { t: "を" },
            { t: "送", r: "おく" },
            { t: "りました。" },
          ],
          pron: "하하니 테가미오 오쿠리마시타.",
          kr: "어머니에게 편지를 보냈습니다.",
        },
        {
          segments: [
            { t: "机", r: "つくえ" },
            { t: "の" },
            { t: "上", r: "うえ" },
            { t: "に" },
            { t: "本", r: "ほん" },
            { t: "があります。" },
          ],
          pron: "츠쿠에노 우에니 홍가 아리마스.",
          kr: "책상 위에 책이 있습니다.",
        },
        {
          segments: [
            { t: "来週", r: "らいしゅう" },
            { t: "旅行", r: "りょこう" },
            { t: "に" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "라이슈- 료코-니 이키마스.",
          kr: "다음 주에 여행을 갑니다.",
        },
      ],
    },
    {
      word: "で",
      reading: "で",
      meaning: "~에서 (장소/수단)",
      pron: "데",
      pos: "조사",
      furigana: [{ t: "で" }],
      examples: [
        {
          segments: [
            { t: "図書館", r: "としょかん" },
            { t: "で" },
            { t: "勉強", r: "べんきょう" },
            { t: "します。" },
          ],
          pron: "토쇼칸데 벵쿄-시마스.",
          kr: "도서관에서 공부합니다.",
        },
        {
          segments: [
            { t: "バスで" },
            { t: "学校", r: "がっこう" },
            { t: "に" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "바스데 각코-니 이키마스.",
          kr: "버스로 학교에 갑니다.",
        },
        {
          segments: [
            { t: "レストランで" },
            { t: "昼", r: "ひる" },
            { t: "ごはんを" },
            { t: "食", r: "た" },
            { t: "べました。" },
          ],
          pron: "레스토란데 히루고항오 타베마시타.",
          kr: "식당에서 점심을 먹었습니다.",
        },
        {
          segments: [
            { t: "日本語", r: "にほんご" },
            { t: "で" },
            { t: "話", r: "はな" },
            { t: "してください。" },
          ],
          pron: "니홍고데 하나시테쿠다사이.",
          kr: "일본어로 이야기해 주세요.",
        },
        {
          segments: [
            { t: "台風", r: "たいふう" },
            { t: "で" },
            { t: "電車", r: "でんしゃ" },
            { t: "が" },
            { t: "止", r: "と" },
            { t: "まりました。" },
          ],
          pron: "타이후-데 덴샤가 토마리마시타.",
          kr: "태풍으로 전철이 멈췄습니다.",
        },
      ],
    },
    {
      word: "と",
      reading: "と",
      meaning: "~와/과",
      pron: "토",
      pos: "조사",
      furigana: [{ t: "と" }],
      examples: [
        {
          segments: [
            { t: "友達", r: "ともだち" },
            { t: "と" },
            { t: "話", r: "はな" },
            { t: "します。" },
          ],
          pron: "토모다치토 하나시마스.",
          kr: "친구와 이야기합니다.",
        },
        {
          segments: [
            { t: "パンと" },
            { t: "コーヒーを" },
            { t: "買", r: "か" },
            { t: "いました。" },
          ],
          pron: "팡토 코-히-오 카이마시타.",
          kr: "빵과 커피를 샀습니다.",
        },
        {
          segments: [
            { t: "家族", r: "かぞく" },
            { t: "と" },
            { t: "旅行", r: "りょこう" },
            { t: "に" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "카조쿠토 료코-니 이키마스.",
          kr: "가족과 여행을 갑니다.",
        },
        {
          segments: [
            { t: "姉", r: "あね" },
            { t: "と" },
            { t: "映画", r: "えいが" },
            { t: "を" },
            { t: "見", r: "み" },
            { t: "ました。" },
          ],
          pron: "아네토 에-가오 미마시타.",
          kr: "언니와 영화를 봤습니다.",
        },
        {
          segments: [
            { t: "犬", r: "いぬ" },
            { t: "と" },
            { t: "猫", r: "ねこ" },
            { t: "がいます。" },
          ],
          pron: "이누토 네코가 이마스.",
          kr: "개와 고양이가 있습니다.",
        },
      ],
    },
    {
      word: "も",
      reading: "も",
      meaning: "~도",
      pron: "모",
      pos: "조사",
      furigana: [{ t: "も" }],
      examples: [
        {
          segments: [
            { t: "私", r: "わたし" },
            { t: "も" },
            { t: "学生", r: "がくせい" },
            { t: "です。" },
          ],
          pron: "와타시모 각세-데스.",
          kr: "저도 학생입니다.",
        },
        {
          segments: [
            { t: "兄", r: "あに" },
            { t: "も" },
            { t: "医者", r: "いしゃ" },
            { t: "です。" },
          ],
          pron: "아니모 이샤데스.",
          kr: "형도 의사입니다.",
        },
        {
          segments: [
            { t: "明日", r: "あした" },
            { t: "も" },
            { t: "雨", r: "あめ" },
            { t: "が" },
            { t: "降", r: "ふ" },
            { t: "ります。" },
          ],
          pron: "아시타모 아메가 후리마스.",
          kr: "내일도 비가 옵니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "店", r: "みせ" },
            { t: "も" },
            { t: "安", r: "やす" },
            { t: "いです。" },
          ],
          pron: "코노 미세모 야스이데스.",
          kr: "이 가게도 쌉니다.",
        },
        {
          segments: [
            { t: "私", r: "わたし" },
            { t: "も" },
            { t: "行", r: "い" },
            { t: "きたいです。" },
          ],
          pron: "와타시모 이키타이데스.",
          kr: "저도 가고 싶습니다.",
        },
      ],
    },
    {
      word: "から",
      reading: "から",
      meaning: "~부터, ~때문에",
      pron: "카라",
      pos: "조사",
      furigana: [{ t: "から" }],
      examples: [
        {
          segments: [
            { t: "九時", r: "くじ" },
            { t: "から" },
            { t: "働", r: "はたら" },
            { t: "きます。" },
          ],
          pron: "쿠지카라 하타라키마스.",
          kr: "9시부터 일합니다.",
        },
        {
          segments: [
            { t: "学校", r: "がっこう" },
            { t: "は" },
            { t: "八時", r: "はちじ" },
            { t: "から" },
            { t: "始", r: "はじ" },
            { t: "まります。" },
          ],
          pron: "각코-와 하치지카라 하지마리마스.",
          kr: "학교는 8시부터 시작합니다.",
        },
        {
          segments: [
            { t: "暑", r: "あつ" },
            { t: "いから、" },
            { t: "窓", r: "まど" },
            { t: "を" },
            { t: "開", r: "あ" },
            { t: "けます。" },
          ],
          pron: "아츠이카라, 마도오 아케마스.",
          kr: "더우니까 창문을 엽니다.",
        },
        {
          segments: [
            { t: "これは" },
            { t: "友達", r: "ともだち" },
            { t: "から" },
            { t: "もらいました。" },
          ],
          pron: "코레와 토모다치카라 모라이마시타.",
          kr: "이것은 친구에게서 받았습니다.",
        },
        {
          segments: [
            { t: "駅", r: "えき" },
            { t: "から" },
            { t: "近", r: "ちか" },
            { t: "いです。" },
          ],
          pron: "에키카라 치카이데스.",
          kr: "역에서 가깝습니다.",
        },
      ],
    },
    {
      word: "まで",
      reading: "まで",
      meaning: "~까지",
      pron: "마데",
      pos: "조사",
      furigana: [{ t: "まで" }],
      examples: [
        {
          segments: [
            { t: "五時", r: "ごじ" },
            { t: "まで" },
            { t: "勉強", r: "べんきょう" },
            { t: "します。" },
          ],
          pron: "고지마데 벵쿄-시마스.",
          kr: "5시까지 공부합니다.",
        },
        {
          segments: [
            { t: "会社", r: "かいしゃ" },
            { t: "まで" },
            { t: "歩", r: "ある" },
            { t: "いて" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "카이샤마데 아루이테 이키마스.",
          kr: "회사까지 걸어서 갑니다.",
        },
        {
          segments: [
            { t: "東京", r: "とうきょう" },
            { t: "から" },
            { t: "大阪", r: "おおさか" },
            { t: "まで" },
            { t: "新幹線", r: "しんかんせん" },
            { t: "で" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "토-쿄-카라 오-사카마데 신칸센데 이키마스.",
          kr: "도쿄에서 오사카까지 신칸센으로 갑니다.",
        },
        {
          segments: [
            { t: "夜", r: "よる" },
            { t: "遅", r: "おそ" },
            { t: "くまで" },
            { t: "働", r: "はたら" },
            { t: "きました。" },
          ],
          pron: "요루 오소쿠마데 하타라키마시타.",
          kr: "밤늦게까지 일했습니다.",
        },
        {
          segments: [
            { t: "来月", r: "らいげつ" },
            { t: "まで" },
            { t: "待", r: "ま" },
            { t: "ってください。" },
          ],
          pron: "라이게츠마데 맛테쿠다사이.",
          kr: "다음 달까지 기다려 주세요.",
        },
      ],
    },
    {
      word: "とても",
      reading: "とても",
      meaning: "매우, 아주",
      pron: "토테모",
      pos: "부사",
      furigana: [{ t: "とても" }],
      examples: [
        {
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
        {
          segments: [
            { t: "この" },
            { t: "本", r: "ほん" },
            { t: "は" },
            { t: "とても" },
            { t: "面白", r: "おもしろ" },
            { t: "いです。" },
          ],
          pron: "코노 홍와 토테모 오모시로이데스.",
          kr: "이 책은 매우 재미있습니다.",
        },
        {
          segments: [
            { t: "彼女", r: "かのじょ" },
            { t: "は" },
            { t: "とても" },
            { t: "きれいです。" },
          ],
          pron: "카노죠와 토테모 키레-데스.",
          kr: "그녀는 매우 예쁩니다.",
        },
        {
          segments: [
            { t: "とても" },
            { t: "疲", r: "つか" },
            { t: "れました。" },
          ],
          pron: "토테모 츠카레마시타.",
          kr: "매우 피곤했습니다.",
        },
        {
          segments: [
            { t: "この" },
            { t: "ケーキは" },
            { t: "とても" },
            { t: "おいしいです。" },
          ],
          pron: "코노 케-키와 토테모 오이시-데스.",
          kr: "이 케이크는 매우 맛있습니다.",
        },
      ],
    },
    {
      word: "少し",
      reading: "すこし",
      meaning: "조금",
      pron: "스코시",
      pos: "부사",
      furigana: [{ t: "少", r: "すこ" }, { t: "し" }],
      examples: [
        {
          segments: [
            { t: "少", r: "すこ" },
            { t: "し" },
            { t: "休", r: "やす" },
            { t: "みましょう。" },
          ],
          pron: "스코시 야스미마쇼-.",
          kr: "조금 쉽시다.",
        },
        {
          segments: [
            { t: "少", r: "すこ" },
            { t: "し" },
            { t: "待", r: "ま" },
            { t: "ってください。" },
          ],
          pron: "스코시 맛테쿠다사이.",
          kr: "조금 기다려 주세요.",
        },
        {
          segments: [
            { t: "日本語", r: "にほんご" },
            { t: "が" },
            { t: "少", r: "すこ" },
            { t: "し" },
            { t: "わかります。" },
          ],
          pron: "니홍고가 스코시 와카리마스.",
          kr: "일본어를 조금 압니다.",
        },
        {
          segments: [
            { t: "少", r: "すこ" },
            { t: "し" },
            { t: "お金", r: "おかね" },
            { t: "を" },
            { t: "貸", r: "か" },
            { t: "してください。" },
          ],
          pron: "스코시 오카네오 카시테쿠다사이.",
          kr: "돈을 조금 빌려주세요.",
        },
        {
          segments: [
            { t: "この" },
            { t: "料理", r: "りょうり" },
            { t: "は" },
            { t: "少", r: "すこ" },
            { t: "し" },
            { t: "辛", r: "から" },
            { t: "いです。" },
          ],
          pron: "코노 료-리와 스코시 카라이데스.",
          kr: "이 요리는 조금 맵습니다.",
        },
      ],
    },
    {
      word: "たくさん",
      reading: "たくさん",
      meaning: "많이",
      pron: "타쿠상",
      pos: "부사",
      furigana: [{ t: "たくさん" }],
      examples: [
        {
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
        {
          segments: [
            { t: "公園", r: "こうえん" },
            { t: "に" },
            { t: "人", r: "ひと" },
            { t: "が" },
            { t: "たくさん" },
            { t: "います。" },
          ],
          pron: "코-엔니 히토가 타쿠상 이마스.",
          kr: "공원에 사람이 많이 있습니다.",
        },
        {
          segments: [
            { t: "昨日", r: "きのう" },
            { t: "は" },
            { t: "たくさん" },
            { t: "食", r: "た" },
            { t: "べました。" },
          ],
          pron: "키노-와 타쿠상 타베마시타.",
          kr: "어제는 많이 먹었습니다.",
        },
        {
          segments: [
            { t: "質問", r: "しつもん" },
            { t: "が" },
            { t: "たくさん" },
            { t: "あります。" },
          ],
          pron: "시츠몬가 타쿠상 아리마스.",
          kr: "질문이 많이 있습니다.",
        },
        {
          segments: [
            { t: "冷蔵庫", r: "れいぞうこ" },
            { t: "に" },
            { t: "食", r: "た" },
            { t: "べ" },
            { t: "物", r: "もの" },
            { t: "が" },
            { t: "たくさん" },
            { t: "あります。" },
          ],
          pron: "레-조-코니 타베모노가 타쿠상 아리마스.",
          kr: "냉장고에 음식이 많이 있습니다.",
        },
      ],
    },
    {
      word: "また",
      reading: "また",
      meaning: "또, 다시",
      pron: "마타",
      pos: "부사",
      furigana: [{ t: "また" }],
      examples: [
        {
          segments: [
            { t: "また" },
            { t: "会", r: "あ" },
            { t: "いましょう。" },
          ],
          pron: "마타 아이마쇼-.",
          kr: "또 만납시다.",
        },
        {
          segments: [
            { t: "母", r: "はは" },
            { t: "は" },
            { t: "また" },
            { t: "病気", r: "びょうき" },
            { t: "に" },
            { t: "なりました。" },
          ],
          pron: "하하와 마타 뵤-키니 나리마시타.",
          kr: "어머니가 또 병에 걸렸습니다.",
        },
        {
          segments: [
            { t: "また" },
            { t: "雨", r: "あめ" },
            { t: "が" },
            { t: "降", r: "ふ" },
            { t: "っています。" },
          ],
          pron: "마타 아메가 훗테이마스.",
          kr: "또 비가 내리고 있습니다.",
        },
        {
          segments: [
            { t: "また" },
            { t: "来", r: "き" },
            { t: "てくださいね。" },
          ],
          pron: "마타 키테쿠다사이네.",
          kr: "또 와 주세요.",
        },
        {
          segments: [
            { t: "週末", r: "しゅうまつ" },
            { t: "は" },
            { t: "また" },
            { t: "旅行", r: "りょこう" },
            { t: "に" },
            { t: "行", r: "い" },
            { t: "きます。" },
          ],
          pron: "슈-마츠와 마타 료코-니 이키마스.",
          kr: "주말에 또 여행을 갑니다.",
        },
      ],
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

// 문장 번역 문제의 오답(방해) 타일 개수
const TRANSLATE_DISTRACTOR_COUNT = 3;
// 단어 매칭 문제 한 판에 묶이는 단어 개수 / 최소 개수
const MATCH_GROUP_SIZE = 4;
const MATCH_MIN_GROUP_SIZE = 3;

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
  const [activeKanjiIndex, setActiveKanjiIndex] = useState(0);
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
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [shake, setShake] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // 문장 번역(단어 조합) 문제 상태
  const [placedTiles, setPlacedTiles] = useState([]);

  // 단어 매칭 문제 상태
  const [matchedIds, setMatchedIds] = useState([]);
  const [selectedLeftId, setSelectedLeftId] = useState(null);
  const [selectedRightId, setSelectedRightId] = useState(null);
  const [mismatchPair, setMismatchPair] = useState(null);
  const [matchHadMistake, setMatchHadMistake] = useState(false);

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

  const openKanjiDetail = (idx) => {
    scrollPosRef.current.kanjiList = window.scrollY;
    setActiveKanjiIndex(idx);
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
                  onClick={() => openKanjiDetail(idx)}
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
      const kanjiList = KANJI_DATA[activeLevel] || [];
      const activeKanji = kanjiList[activeKanjiIndex];
      if (!activeKanji) return null;

      const hasPrev = activeKanjiIndex > 0;
      const hasNext = activeKanjiIndex < kanjiList.length - 1;

      const handlePrev = () => {
        if (hasPrev) {
          setSlideDirection("prev");
          scrollPosRef.current.kanjiList = window.scrollY;
          setActiveKanjiIndex((i) => i - 1);
        }
      };
      const handleNext = () => {
        if (hasNext) {
          setSlideDirection("next");
          scrollPosRef.current.kanjiList = window.scrollY;
          setActiveKanjiIndex((i) => i + 1);
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
              {activeKanjiIndex + 1} / {kanjiList.length}
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
              key={activeKanjiIndex}
              className={`w-full flex flex-col items-center overflow-hidden ${
                slideDirection === "next" ? "slide-next" : "slide-prev"
              }`}
              style={{ borderRadius: "2rem" }}
            >
              <div className="bg-white w-full rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6 flex flex-col items-center p-8">
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
              {((activeKanji.onyomi && activeKanji.onyomi.length > 0) ||
                (activeKanji.kunyomi && activeKanji.kunyomi.length > 0)) && (
                <div className="bg-white w-full rounded-3xl shadow-sm border border-slate-200 p-8 mb-6">
                  <div className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                    <Sparkles size={16} /> 음독 · 훈독
                  </div>
                  <div className="flex flex-col gap-4">
                    {activeKanji.onyomi && activeKanji.onyomi.length > 0 && (
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 mt-0.5">
                          음독
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {activeKanji.onyomi.map((r, idx) => (
                            <div
                              key={idx}
                              className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-2 text-sm"
                            >
                              <div className="font-black text-amber-700">
                                {r.reading}
                                <span className="font-medium text-amber-500">
                                  {" "}
                                  ({r.kr})
                                </span>
                              </div>
                              <div className="text-xs text-amber-600 mt-0.5">
                                {r.word}({r.wordReading}) · {r.meaning}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {activeKanji.kunyomi && activeKanji.kunyomi.length > 0 && (
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-3 py-1 mt-0.5">
                          훈독
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {activeKanji.kunyomi.map((r, idx) => (
                            <div
                              key={idx}
                              className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-2 text-sm"
                            >
                              <div className="font-black text-teal-700">
                                {r.reading}
                                <span className="font-medium text-teal-500">
                                  {" "}
                                  ({r.kr})
                                </span>
                              </div>
                              <div className="text-xs text-teal-600 mt-0.5">
                                {r.word}({r.wordReading}) · {r.meaning}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="bg-white w-full rounded-3xl shadow-sm border border-slate-200 p-8">
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
            좌우로 스와이프하여 한자 넘기기
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

              {item.examples?.[0] && (
                <div className="bg-white w-full rounded-[2rem] shadow-sm border border-slate-200 p-8 mt-6">
                  <div className="text-sm font-bold text-slate-400 mb-5 flex items-center gap-2">
                    <PenTool size={16} /> 예시 문장
                  </div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Furigana
                      segments={item.examples[0].segments}
                      fontSize="1.4rem"
                      className="flex-1 leading-[2.6]"
                    />
                    <SpeakButton
                      text={item.examples[0].segments.map((s) => s.t).join("")}
                      iconSize={14}
                      diameter={30}
                      className="shrink-0 mt-1"
                    />
                  </div>
                  {item.examples[0].pron && (
                    <div className="text-indigo-500 font-bold text-sm mb-4">
                      {item.examples[0].pron}
                    </div>
                  )}
                  <div className="text-slate-500 font-medium border-t border-slate-100 pt-4">
                    {item.examples[0].kr}
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
    else if (testScreen === "review") setTestScreen("result");
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
          segments: [...before, { t: "", blank: true }, ...after],
          kr: ex.kr,
          speakText: ex.segments.map((s) => s.t).join(""),
        };
      }
    }
    return null;
  };

  // 선택된 단어들의 예문으로 "문장 번역" 문제 풀을 만듭니다.
  const buildTranslatePool = (selectedItems) => {
    const candidates = selectedItems
      .filter((item) => item.examples && item.examples.length > 0)
      .map((item) => {
        const ex = shuffleArray(item.examples)[0];
        const tokens = ex.kr.split(/\s+/).filter(Boolean);
        return { item, ex, tokens };
      });
    if (candidates.length === 0) return [];

    let tokenUniverse = [
      ...new Set(candidates.flatMap((c) => c.tokens)),
    ];
    // 방해 토큰 후보가 부족하면 전체 N5 단어의 예문에서 보충합니다.
    if (tokenUniverse.length < TRANSLATE_DISTRACTOR_COUNT + 1) {
      const allTokens = VOCAB_DATA["N5"].flatMap((item) =>
        (item.examples || []).flatMap((ex) =>
          ex.kr.split(/\s+/).filter(Boolean)
        )
      );
      tokenUniverse = [...new Set([...tokenUniverse, ...allTokens])];
    }

    return candidates.map(({ item, ex, tokens }) => {
      const distractorSource = tokenUniverse.filter(
        (t) => !tokens.includes(t)
      );
      const distractors = shuffleArray(distractorSource).slice(
        0,
        TRANSLATE_DISTRACTOR_COUNT
      );
      const tiles = shuffleArray([
        ...tokens.map((t, i) => ({ id: `c${i}`, text: t })),
        ...distractors.map((t, i) => ({ id: `d${i}`, text: t })),
      ]);
      return {
        char: item.word,
        reading: item.reading,
        answer: ex.kr,
        sentenceSegments: ex.segments,
        speakText: ex.segments.map((s) => s.t).join(""),
        correctTokens: tokens,
        tiles,
        type: "vocabTranslate",
      };
    });
  };

  // 선택된 단어들을 몇 개씩 묶어 "단어 매칭" 문제 풀을 만듭니다.
  const buildMatchPool = (selectedItems) => {
    const shuffled = shuffleArray(selectedItems);
    const groups = [];
    for (let i = 0; i < shuffled.length; i += MATCH_GROUP_SIZE) {
      groups.push(shuffled.slice(i, i + MATCH_GROUP_SIZE));
    }
    if (groups.length > 1 && groups[groups.length - 1].length < MATCH_MIN_GROUP_SIZE) {
      const tail = groups.pop();
      groups[groups.length - 1] = [...groups[groups.length - 1], ...tail];
    }

    return groups
      .filter((group) => group.length >= MATCH_MIN_GROUP_SIZE)
      .map((group) => ({
        type: "vocabMatch",
        pairs: group.map((item) => ({
          id: item.word,
          word: item.word,
          furigana: item.furigana,
          meaning: item.meaning,
        })),
        leftTiles: shuffleArray(
          group.map((item) => ({ id: item.word, furigana: item.furigana }))
        ),
        rightTiles: shuffleArray(
          group.map((item) => ({ id: item.word, text: item.meaning }))
        ),
      }));
  };

  // ignoreSelection=true는 사용자가 고른 범위와 상관없이 전체 데이터를 훑어서
  // 보기(선택지)가 부족할 때 채울 여분의 오답 후보를 만드는 용도로만 씁니다.
  const buildTestPool = (ignoreSelection = false) => {
    const isSelected = (val) => ignoreSelection || selectedTestItems.includes(val);
    let pool = [];
    if (testType === "hiragana") {
      KANA_DATA.forEach((row) => {
        row.kana.forEach((char, idx) => {
          if (char && isSelected(char))
            pool.push({ char, answer: row.kr[idx], type: "kana" });
        });
      });
    } else if (testType === "katakana") {
      KANA_DATA.forEach((row) => {
        row.kata.forEach((char, idx) => {
          if (char && isSelected(char))
            pool.push({ char, answer: row.kr[idx], type: "kana" });
        });
      });
    } else if (testType === "kanji") {
      KANJI_DATA["N5"].forEach((item) => {
        if (isSelected(item.kanji))
          pool.push({
            char: item.kanji,
            answer: `${item.meaning} ${item.sound}`,
            type: "kanji",
          });
      });
    } else if (testType === "vocab") {
      const selectedItems = VOCAB_DATA["N5"].filter((item) =>
        isSelected(item.word)
      );

      selectedItems.forEach((item) => {
        pool.push({
          char: item.word,
          reading: item.reading,
          answer: item.meaning,
          displaySegments: item.furigana,
          type: "vocabMeaning",
        });
        if (item.reading !== item.word) {
          pool.push({
            char: item.word,
            reading: item.reading,
            answer: item.reading,
            displaySegments: [{ t: item.word }],
            type: "vocabReading",
          });
        }
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
      });

      if (!ignoreSelection) {
        pool.push(...buildTranslatePool(selectedItems));
        pool.push(...buildMatchPool(selectedItems));
      }
    }
    return pool;
  };

  const startTest = () => {
    const fullPool = buildTestPool();
    if (fullPool.length < 4) return;

    const queue = shuffleArray([...fullPool]);
    setQuizQueue(queue);
    setScore(0);
    setWrongAnswers([]);
    setQuestionIndex(0);
    loadTestQuestion(queue, 0, fullPool);
    setTestScreen("playing");
  };

  const loadTestQuestion = (queue, index, fullPool) => {
    const correct = queue[index];

    setCurrentQuestion(correct);
    setSelectedAnswer(null);
    setIsRevealed(false);
    setIsAnswerCorrect(false);
    setPlacedTiles([]);
    setMatchedIds([]);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setMismatchPair(null);
    setMatchHadMistake(false);

    if (correct.type === "vocabTranslate" || correct.type === "vocabMatch") {
      setOptions([]);
      return;
    }

    let poolWithoutCorrect = fullPool.filter(
      (item) => item.answer !== correct.answer && item.type === correct.type
    );

    // 선택한 범위 안에서 오답 후보가 3개보다 적으면(보기가 4개가 안 되면)
    // 전체 데이터에서 부족한 만큼 채웁니다.
    if (poolWithoutCorrect.length < 3) {
      const seenAnswers = new Set(
        poolWithoutCorrect.map((item) => item.answer)
      );
      seenAnswers.add(correct.answer);
      const backupPool = buildTestPool(true).filter(
        (item) => item.type === correct.type && !seenAnswers.has(item.answer)
      );
      const needed = 3 - poolWithoutCorrect.length;
      const extras = [];
      for (const item of shuffleArray(backupPool)) {
        if (extras.length >= needed) break;
        if (seenAnswers.has(item.answer)) continue;
        seenAnswers.add(item.answer);
        extras.push(item);
      }
      poolWithoutCorrect = [...poolWithoutCorrect, ...extras];
    }

    const shuffledOthers = shuffleArray(poolWithoutCorrect).slice(0, 3);
    const finalOptions = shuffleArray([correct, ...shuffledOthers]);
    setOptions(finalOptions);
  };

  const handleTestOptionSelect = (option) => {
    if (isRevealed) return;
    setSelectedAnswer(option);
    setIsRevealed(true);

    const isCorrect = option.answer === currentQuestion.answer;
    setIsAnswerCorrect(isCorrect);
    if (isCorrect) {
      setScore((prev) => prev + 1);
      playCorrectSound();
    } else {
      playWrongSound();
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setWrongAnswers((prev) => [
        ...prev,
        { question: currentQuestion, selected: option },
      ]);
    }
  };

  // 문장 번역 문제: 타일을 탭하면 배치하고, 배치된 타일을 다시 탭하면 되돌립니다.
  const handleTileTap = (tile) => {
    if (isRevealed) return;
    const placedIdx = placedTiles.findIndex((t) => t.id === tile.id);
    if (placedIdx !== -1) {
      setPlacedTiles((prev) => prev.filter((t) => t.id !== tile.id));
    } else {
      setPlacedTiles((prev) => [...prev, tile]);
    }
  };

  const handleTranslateConfirm = () => {
    if (isRevealed) return;
    if (placedTiles.length !== currentQuestion.correctTokens.length) return;

    const userAnswer = placedTiles.map((t) => t.text).join(" ");
    const isCorrect = userAnswer === currentQuestion.answer;
    setSelectedAnswer({ answer: userAnswer });
    setIsAnswerCorrect(isCorrect);
    setIsRevealed(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
      playCorrectSound();
    } else {
      playWrongSound();
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setWrongAnswers((prev) => [
        ...prev,
        { question: currentQuestion, selected: { answer: userAnswer } },
      ]);
    }
  };

  // 단어 매칭 문제: 좌/우에서 하나씩 선택하면 일치 여부를 확인합니다.
  const handleMatchTap = (side, id) => {
    if (isRevealed || matchedIds.includes(id)) return;
    if (side === "left") {
      setSelectedLeftId((prev) => (prev === id ? null : id));
    } else {
      setSelectedRightId((prev) => (prev === id ? null : id));
    }
  };

  useEffect(() => {
    if (currentQuestion?.type !== "vocabMatch") return;
    if (selectedLeftId == null || selectedRightId == null) return;

    if (selectedLeftId === selectedRightId) {
      playCorrectSound();
      const matchedId = selectedLeftId;
      setSelectedLeftId(null);
      setSelectedRightId(null);
      setMatchedIds((prev) => {
        const next = [...prev, matchedId];
        if (next.length === currentQuestion.pairs.length) {
          const isCorrect = !matchHadMistake;
          setIsAnswerCorrect(isCorrect);
          setIsRevealed(true);
          if (isCorrect) {
            setScore((s) => s + 1);
          } else {
            setWrongAnswers((prevW) => [
              ...prevW,
              { question: currentQuestion, selected: null },
            ]);
          }
        }
        return next;
      });
    } else {
      playWrongSound();
      setMatchHadMistake(true);
      setMismatchPair({ left: selectedLeftId, right: selectedRightId });
      setTimeout(() => {
        setSelectedLeftId(null);
        setSelectedRightId(null);
        setMismatchPair(null);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeftId, selectedRightId]);

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
      const isCorrectAnswer = isRevealed && isAnswerCorrect;

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
          : currentQuestion?.type === "vocabTranslate"
          ? "다음 문장을 번역하세요!"
          : currentQuestion?.type === "vocabMatch"
          ? "의미가 일치하는 단어끼리 짝을 지으세요!"
          : testType === "hiragana"
          ? "히라가나의 발음을 고르세요!"
          : "가타카나의 발음을 고르세요!";
      const isVocabQuestion =
        currentQuestion?.type === "vocabMeaning" ||
        currentQuestion?.type === "vocabReading";

      // 문제 카드 상단에 표시할 컨텐츠 (유형별로 레이아웃이 다름)
      let questionPromptNode;
      if (currentQuestion?.type === "vocabMatch") {
        questionPromptNode = null;
      } else if (currentQuestion?.type === "vocabTranslate") {
        questionPromptNode = (
          <div className="flex flex-col items-center gap-2 w-full">
            <SpeakButton
              text={currentQuestion?.speakText}
              iconSize={14}
              diameter={30}
            />
            <Furigana
              segments={currentQuestion?.sentenceSegments}
              fontSize="clamp(1.3rem, 5.5vw, 1.75rem)"
              className="leading-[2.4] justify-center text-center w-full"
            />
          </div>
        );
      } else if (currentQuestion?.type === "vocabSentence") {
        questionPromptNode = (
          <div className="flex flex-col items-center gap-2 w-full">
            <SpeakButton
              text={currentQuestion?.speakText}
              iconSize={14}
              diameter={30}
            />
            <Furigana
              segments={currentQuestion?.sentenceSegments}
              fontSize="clamp(1.3rem, 5.5vw, 1.75rem)"
              className="leading-[2.4] justify-center text-center w-full"
            />
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
          <div
            className="grid items-center w-full"
            style={{ gridTemplateColumns: "34px 1fr 34px" }}
          >
            <div />
            <Furigana
              segments={currentQuestion?.displaySegments}
              fontSize="clamp(2.25rem, 9vw, 3.25rem)"
              className="justify-self-center"
            />
            <SpeakButton
              text={currentQuestion?.reading || currentQuestion?.char}
              iconSize={15}
              diameter={34}
              className="justify-self-start"
            />
          </div>
        );
      } else {
        questionPromptNode = (
          <div
            className="grid items-center w-full"
            style={{ gridTemplateColumns: "34px 1fr 34px" }}
          >
            <div />
            <div
              className={`text-slate-800 justify-self-center ${
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
              className="justify-self-start"
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
              {isRevealed && currentQuestion?.type !== "vocabMatch" && (
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
            {currentQuestion?.type === "vocabTranslate" ? (
              <div className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap gap-2 justify-center min-h-[3rem]">
                  {currentQuestion.correctTokens.map((correctText, i) => {
                    const tile = placedTiles[i];
                    let slotStyle =
                      "border-dashed border-slate-300 text-slate-300";
                    if (tile) {
                      slotStyle = "border-slate-300 bg-white text-slate-800";
                      if (isRevealed) {
                        slotStyle =
                          tile.text === correctText
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-red-500 bg-red-50 text-red-700";
                      }
                    }
                    return (
                      <button
                        key={i}
                        disabled={isRevealed || !tile}
                        onClick={() => tile && handleTileTap(tile)}
                        className={`min-w-[3.5rem] px-3 py-2 rounded-xl border-2 font-bold text-base transition-all ${slotStyle}`}
                      >
                        {tile?.text || ""}
                      </button>
                    );
                  })}
                </div>
                {!isRevealed && (
                  <div className="flex flex-wrap gap-2 justify-center pt-2 border-t border-dashed border-slate-200">
                    {currentQuestion.tiles
                      .filter(
                        (t) => !placedTiles.some((p) => p.id === t.id)
                      )
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTileTap(t)}
                          className="px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-slate-800 font-bold text-base hover:border-slate-300"
                        >
                          {t.text}
                        </button>
                      ))}
                  </div>
                )}
                {!isRevealed && (
                  <button
                    disabled={
                      placedTiles.length !== currentQuestion.correctTokens.length
                    }
                    onClick={handleTranslateConfirm}
                    className={`w-full py-3 rounded-xl font-black transition-colors ${
                      placedTiles.length === currentQuestion.correctTokens.length
                        ? "bg-slate-800 text-white hover:bg-slate-700"
                        : "bg-slate-100 text-slate-300"
                    }`}
                  >
                    확인
                  </button>
                )}
              </div>
            ) : currentQuestion?.type === "vocabMatch" ? (
              <div
                className="grid gap-2 p-5"
                style={{ gridTemplateColumns: "1fr 1fr" }}
              >
                {currentQuestion.leftTiles.map((t, i) => {
                  const rt = currentQuestion.rightTiles[i];
                  let leftStyle = "bg-white border-slate-200 text-slate-800";
                  if (matchedIds.includes(t.id))
                    leftStyle = "bg-green-50 border-green-500 text-green-700 opacity-60";
                  else if (mismatchPair?.left === t.id)
                    leftStyle = "bg-red-50 border-red-500 text-red-700";
                  else if (selectedLeftId === t.id)
                    leftStyle = "bg-blue-50 border-blue-500 text-blue-700";

                  let rightStyle = "bg-white border-slate-200 text-slate-800";
                  if (matchedIds.includes(rt.id))
                    rightStyle = "bg-green-50 border-green-500 text-green-700 opacity-60";
                  else if (mismatchPair?.right === rt.id)
                    rightStyle = "bg-red-50 border-red-500 text-red-700";
                  else if (selectedRightId === rt.id)
                    rightStyle = "bg-blue-50 border-blue-500 text-blue-700";

                  return (
                    <React.Fragment key={`${t.id}-${rt.id}`}>
                      <button
                        disabled={matchedIds.includes(t.id) || isRevealed}
                        onClick={() => handleMatchTap("left", t.id)}
                        className={`w-full h-full flex items-center justify-center py-2 px-2 rounded-xl border-2 font-bold text-base transition-all font-kanji ${leftStyle}`}
                      >
                        <Furigana segments={t.furigana} fontSize="1.05rem" className="justify-center" />
                      </button>
                      <button
                        disabled={matchedIds.includes(rt.id) || isRevealed}
                        onClick={() => handleMatchTap("right", rt.id)}
                        className={`w-full h-full flex items-center justify-center py-2 px-2 rounded-xl border-2 font-bold text-base transition-all ${rightStyle}`}
                      >
                        {rt.text}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
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
            )}
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
                    {currentQuestion?.type === "vocabSentence" ||
                    currentQuestion?.type === "vocabTranslate" ? (
                      <>
                        정답은{" "}
                        <span className="font-bold font-kanji">
                          {currentQuestion?.answer}
                        </span>{" "}
                        이에요.
                      </>
                    ) : currentQuestion?.type === "vocabMatch" ? (
                      <>일부 짝을 다시 확인해보세요.</>
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

          {wrongAnswers.length > 0 && (
            <button
              onClick={() => setTestScreen("review")}
              className="w-full mb-3 py-4 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 border border-red-200 transition-colors"
            >
              틀린 문제 복습하기 ({wrongAnswers.length})
            </button>
          )}

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

    if (testScreen === "review") {
      return (
        <div className="w-full max-w-md mx-auto pb-10 animate-in fade-in">
          <div className="flex items-center justify-between mb-5 pt-4">
            <button
              onClick={goBackTest}
              className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full shadow-sm"
              aria-label="뒤로 가기"
            >
              <ChevronLeft size={22} />
            </button>
            <h2 className="text-lg font-black text-slate-800">
              틀린 문제 복습 ({wrongAnswers.length})
            </h2>
            <div className="w-[38px]" />
          </div>

          <div className="flex flex-col gap-3">
            {wrongAnswers.map((entry, idx) => {
              const q = entry.question;

              if (q.type === "vocabMatch") {
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
                  >
                    <div className="text-sm font-bold text-red-500 mb-4">
                      이 판에서 짝을 잘못 맞춘 적이 있어요.
                    </div>
                    <div className="flex flex-col gap-2">
                      {q.pairs.map((pair) => (
                        <div
                          key={pair.id}
                          className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-2"
                        >
                          <Furigana
                            segments={pair.furigana}
                            fontSize="1.1rem"
                          />
                          <span className="text-slate-500 font-bold text-sm">
                            {pair.meaning}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {q.type === "vocabSentence" || q.type === "vocabTranslate" ? (
                      <Furigana
                        segments={q.sentenceSegments}
                        fontSize="1.3rem"
                        className="leading-[2]"
                      />
                    ) : q.type === "vocabMeaning" || q.type === "vocabReading" ? (
                      <Furigana segments={q.displaySegments} fontSize="1.8rem" />
                    ) : (
                      <div
                        className={`text-slate-800 font-bold ${
                          q.type === "kanji" || q.type === "vocabWord"
                            ? "font-kanji"
                            : ""
                        }`}
                        style={{ fontSize: "2rem" }}
                      >
                        {q.char}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm font-bold border-t border-dashed border-slate-200 pt-3">
                    <div className="flex items-center gap-1.5 text-red-500">
                      <XCircle size={16} />내 답: {entry.selected.answer}
                    </div>
                    <div className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle size={16} />
                      정답: {q.answer}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              setTestScreen("menu");
              setSelectedTestItems([]);
            }}
            className="w-full mt-6 py-4 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 shadow-md transition-colors"
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
