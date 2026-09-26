/*
ISC License
Copyright (c) 2020, Suvash Thapaliya

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
const keyboard = {
  a: "ा", b: "ब", c: "छ", d: "द", e: "े", f: "उ", g: "ग", h: "ह", i: "ि", j: "ज",
  k: "क", l: "ल", m: "म", n: "न", o: "ो", p: "प", q: "ट", r: "र", s: "स", t: "त",
  u: "ु", v: "व", w: "ौ", x: "ड", y: "य", z: "ष",
  A: "आ", B: "भ", C: "च", D: "ध", E: "ै", F: "ऊ", G: "घ", H: "अ", I: "ी", J: "झ",
  K: "ख", L: "ळ", M: "ं", N: "ण", O: "ओ", P: "फ", Q: "ठ", R: "ृ", S: "श", T: "थ",
  U: "ू", V: "ँ", W: "औ", X: "ढ", Y: "ञ", Z: "ऋ",
  0: "०", 1: "१", 2: "२", 3: "३", 4: "४", 5: "५", 6: "६", 7: "७", 8: "८", 9: "९",
  "^": "^", "`": "ऽ", "~": "़", _: "॒", "+": "‌", "=": "‍",
  "[": "इ", "{": "ई", "]": "ए", "}": "ऐ", "\\": "ॐ", "|": "ः", "<": "ङ",
  ".": "।", ">": "॥", "/": "्", "?": "?",
};

export function mapRomanizedKeys(value) {
  return Array.from(value, (key) => keyboard[key] ?? key).join("");
}

function insertNepaliKey(event) {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
  const value = mapRomanizedKeys(event.key);
  if (value === event.key) return;

  event.preventDefault();
  const input = event.currentTarget;
  input.setRangeText(value, input.selectionStart, input.selectionEnd, "end");
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

// ponytail: paste stays literal; map clipboard text if users need conversion.
export function setRomanizedNepaliEnabled(input, enabled) {
  if (enabled) input.addEventListener("keydown", insertNepaliKey);
  else input.removeEventListener("keydown", insertNepaliKey);
}
