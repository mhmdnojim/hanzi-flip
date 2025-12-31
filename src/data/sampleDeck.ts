import { VocabularyWord } from "@/types/vocabulary";

export const sampleWords: VocabularyWord[] = [
  { id: "1", chinese: "你好", pinyin: "nǐ hǎo", english: "Hello" },
  { id: "2", chinese: "谢谢", pinyin: "xiè xie", english: "Thank you" },
  { id: "3", chinese: "再见", pinyin: "zài jiàn", english: "Goodbye" },
  { id: "4", chinese: "早上好", pinyin: "zǎo shang hǎo", english: "Good morning" },
  { id: "5", chinese: "晚安", pinyin: "wǎn ān", english: "Good night" },
  { id: "6", chinese: "对不起", pinyin: "duì bu qǐ", english: "Sorry" },
  { id: "7", chinese: "没关系", pinyin: "méi guān xi", english: "It's okay" },
  { id: "8", chinese: "我", pinyin: "wǒ", english: "I / Me" },
  { id: "9", chinese: "你", pinyin: "nǐ", english: "You" },
  { id: "10", chinese: "他", pinyin: "tā", english: "He / Him" },
  { id: "11", chinese: "她", pinyin: "tā", english: "She / Her" },
  { id: "12", chinese: "是", pinyin: "shì", english: "Is / Am / Are" },
  { id: "13", chinese: "不", pinyin: "bù", english: "No / Not" },
  { id: "14", chinese: "好", pinyin: "hǎo", english: "Good" },
  { id: "15", chinese: "爱", pinyin: "ài", english: "Love" },
  { id: "16", chinese: "朋友", pinyin: "péng you", english: "Friend" },
  { id: "17", chinese: "家", pinyin: "jiā", english: "Home / Family" },
  { id: "18", chinese: "吃", pinyin: "chī", english: "Eat" },
  { id: "19", chinese: "喝", pinyin: "hē", english: "Drink" },
  { id: "20", chinese: "水", pinyin: "shuǐ", english: "Water" },
];

export const sampleDeck = {
  id: "sample",
  name: "Basic Greetings & Common Words",
  words: sampleWords,
  createdAt: new Date(),
};
