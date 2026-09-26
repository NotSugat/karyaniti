import assert from "node:assert/strict";
import { mapRomanizedKeys, setRomanizedNepaliEnabled } from "../public/nepali-keyboard.mjs";

assert.equal(mapRomanizedKeys("k/z"), "क्ष");
assert.equal(mapRomanizedKeys("A0"), "आ०");
assert.equal(mapRomanizedKeys("🙂!"), "🙂!");

class Input extends EventTarget {
  value = "abc";
  selectionStart = 1;
  selectionEnd = 2;

  setRangeText(value, start, end) {
    this.value = this.value.slice(0, start) + value + this.value.slice(end);
    this.selectionStart = this.selectionEnd = start + value.length;
  }
}

const input = new Input();
let inputEvents = 0;
input.addEventListener("input", () => inputEvents++);
setRomanizedNepaliEnabled(input, true);
const key = Object.assign(new Event("keydown", { cancelable: true }), { key: "k" });
input.dispatchEvent(key);
assert.equal(input.value, "aकc");
assert.equal(input.selectionStart, 2);
assert.equal(key.defaultPrevented, true);
assert.equal(inputEvents, 1);
