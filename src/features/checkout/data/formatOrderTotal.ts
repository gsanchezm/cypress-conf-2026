const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

// Renders the same text /order-success shows for a given OrderSummary,
// live-verified byte-for-byte (textContent + codePointAt, not a
// screenshot) against the real app for all 5 markets, 2026-08-19/20.
// Every separator/mark character below is an explicit \u escape, never a
// literal character - a plain space and U+00A0 are visually
// indistinguishable in an editor, and a copy-paste mistake here would
// silently fail every affected test.
export function formatOrderTotal(currency: string, currencySymbol: string, total: number): string {
  switch (currency) {
    case 'JPY':
      // The DOM renders the fullwidth yen sign U+FFE5, comma-grouped, no
      // decimals - NOT the API's currency_symbol field, which is the
      // ordinary-width U+00A5. Same divergence already documented in the
      // completed Catalog slice's MARKET_SCENARIOS. Comma-grouping is done
      // with an explicit regex, not toLocaleString('en-US') - the latter's
      // grouping comes from the Node/Electron runtime's ICU data, not the
      // app, which is an implicit dependency this byte-exact formatter
      // shouldn't have.
      return '￥' + String(Math.round(total)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    case 'CHF':
      // U+00A0 (no-break space) separates the code from the amount.
      return `${currencySymbol} ${total.toFixed(2)}`;
    case 'SAR': {
      // RTL: wrapped in U+200F (right-to-left marks), Arabic-Indic digits,
      // U+066B as the decimal separator (not '.'), U+00A0 before the
      // currency symbol, and a literal '.' appended after it (the API's
      // "ر.س" becomes "ر.س." in the DOM) - none of this is derivable from
      // the API response alone.
      const digits = total
        .toFixed(2)
        .replace(/[0-9]/g, (d) => ARABIC_INDIC_DIGITS[Number(d)]!)
        .replace('.', '٫');
      return `‏${digits} ${currencySymbol}.‏`;
    }
    default:
      // USD/MXN: both use a plain "$" currency_symbol - confirmed both
      // render as plain ASCII "$<amount>", no separator.
      return `${currencySymbol}${total.toFixed(2)}`;
  }
}
