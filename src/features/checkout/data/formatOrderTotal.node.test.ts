import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatOrderTotal } from './formatOrderTotal';

// Expected strings are built with String.fromCharCode/fromCodePoint, not
// literal characters in this file's source - a literal U+00A0 or U+200F
// is visually indistinguishable from a plain space/nothing in an editor,
// so typing one directly here would silently defeat the test it's meant
// to protect. Every value was live-verified against the real DOM
// (textContent + codePointAt) on 2026-08-19/20, not assumed.

test('USD: plain ASCII, no separator', () => {
  assert.equal(formatOrderTotal('USD', '$', 16.03), '$16.03');
});

test('MXN: same plain-$ format as USD', () => {
  assert.equal(formatOrderTotal('MXN', '$', 299.55), '$299.55');
});

test('CHF: U+00A0 no-break space between the code and the amount', () => {
  const expected = String.fromCharCode(0x43, 0x48, 0x46, 0xa0, 0x31, 0x32, 0x2e, 0x35, 0x34); // "CHF<nbsp>12.54"
  assert.equal(formatOrderTotal('CHF', 'CHF', 12.54), expected);
});

test('JPY: fullwidth yen (not the API\'s ordinary-width symbol), comma-grouped, zero decimals', () => {
  const expected = String.fromCodePoint(0xffe5) + '2,572'; // "￥2,572"
  assert.equal(formatOrderTotal('JPY', '¥', 2572), expected);
});

test('SAR: RTL marks, Arabic-Indic digits, U+066B decimal separator, trailing "."', () => {
  const expected =
    String.fromCodePoint(0x200f) + // RLM
    '٦٣٫٥٢' + // Arabic-Indic "63.52" with U+066B as the decimal point
    String.fromCharCode(0xa0) + // no-break space
    'ر.س' +
    '.' +
    String.fromCodePoint(0x200f); // RLM
  assert.equal(formatOrderTotal('SAR', 'ر.س', 63.52), expected);
});
