// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchTranscripts, normalise, levenshtein } from "./phoneticsMatch.ts";
import { PHONETICS_WORDS } from "./phoneticsWords.ts";

const word = (id: string) => PHONETICS_WORDS.find((w) => w.id === id)!;
const isMatch = (heard: string[], id: string) => matchTranscripts(heard, word(id)).matched;

test("normalise ignores nukta, anusvara, vowel length and punctuation", () => {
  assert.equal(normalise("माकड़"), normalise("माकड"));
  assert.equal(normalise("मांजर"), normalise("माजर"));
  assert.equal(normalise("खारूताई"), normalise("खारुताइ"));
  assert.equal(normalise(" वाघ! "), normalise("वाघ"));
  assert.equal(normalise("Vāgh"), "vagh");
});

test("levenshtein", () => {
  assert.equal(levenshtein("vagh", "vagh"), 0);
  assert.equal(levenshtein("vagh", "bagh"), 1);
  assert.equal(levenshtein("", "abc"), 3);
});

test("exact and variant answers are correct", () => {
  assert.ok(isMatch(["वाघ"], "tiger"));
  assert.ok(isMatch(["हत्तीं"], "elephant"));
  assert.ok(isMatch(["मांजरी"], "cat"));
  assert.ok(isMatch(["खार"], "squirrel"));
  assert.ok(isMatch(["kharutai"], "squirrel"));
  assert.ok(isMatch(["Makad"], "monkey"));
});

test("close answers are forgiven", () => {
  assert.ok(isMatch(["बाघ"], "tiger"), "one letter off on a short word");
  assert.ok(isMatch(["हाती"], "elephant"));
  assert.ok(isMatch(["खारुताय"], "squirrel"), "one letter off on a long word");
  assert.ok(isMatch(["खरुतई"], "squirrel"), "two vowel signs off on a long word");
  assert.ok(isMatch(["हा वाघ आहे"], "tiger"), "word inside a sentence");
});

test("any alternative can match, not just the first", () => {
  assert.ok(isMatch(["बाग़ में", "वाघ"], "tiger"));
});

test("wrong answers are not accepted", () => {
  assert.ok(!isMatch(["मांजर"], "monkey"));
  assert.ok(!isMatch(["माकड"], "cat"));
  assert.ok(!isMatch(["कुत्रा"], "tiger")); // dog
  assert.ok(!isMatch(["पाणी"], "elephant")); // water
  assert.ok(!isMatch(["dog"], "cat"));
  assert.ok(!isMatch(["कबूतर"], "squirrel")); // pigeon
  assert.ok(!isMatch([""], "tiger"));
});
