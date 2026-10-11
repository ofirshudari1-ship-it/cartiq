# CartIQ — Privacy Policy / מדיניות פרטיות

_Last updated: 2026-09-21 (v0.2.3)_

## Single purpose
CartIQ exists for one purpose only: helping you review your own AliExpress
shopping — your cart, open product tabs, price comparisons, and seller
trust signals. It does not collect data for any other purpose, and does
not operate on any site other than AliExpress and, for the AI features,
Anthropic's API.

## What data CartIQ reads
- **Cart page** (`aliexpress.com/p/shoppingcart`, on your click): product titles,
  prices, quantities, store names, and product/store URLs visible in your
  own cart.
- **Product pages** (`*.aliexpress.com/item/*.html`, on your click, or
  when you open the "Compare tabs" view): title, price, store name, store
  feedback %, rating, and review count only. An earlier version also
  sampled nearby page text for the seller-trust check; that was removed
  after testing showed it wasn't actually capturing review content.
- **A temporary, background search tab CartIQ opens itself** when you
  click "Find cheaper alternatives": CartIQ builds a search query from the
  product title, opens `aliexpress.com/wholesale?SearchText=...` in a
  background tab (never brought to the front), reads the visible result
  titles/prices/links, and closes that tab immediately after. You never
  see or interact with this tab yourself.

CartIQ never reads your AliExpress login credentials, payment
information, order history, address book, or browsing history outside of
tabs matching the above.

## What data leaves your device
- **Only when you have added a Claude API key in Settings**, and only
  when you click a scan/analysis action: the relevant summary (cart
  items, or a single product's signals and text sample — no images, no
  personal identifiers) is sent to `api.anthropic.com` using your key.
  This is subject to Anthropic's own data-handling terms for API usage.
- Nothing is sent anywhere else. CartIQ has no backend server of its own.
  The background search tab (above) only talks to `aliexpress.com`.

## Notifications (opt-in, off by default)
If you turn on "Price-drop watch" in Settings, CartIQ periodically checks
**cart tabs you already have open** in your browser for price changes
(it cannot check your cart while no such tab is open — there is no
background API for this) and shows a local Chrome notification. This
check runs entirely on your device; the comparison data (previous vs.
current prices) is stored only in `chrome.storage.local` and is not sent
anywhere, even to the AI, for this specific feature.

## What is stored, and where
- Your Claude API key, language, theme, and feature settings (duplicate
  sensitivity, watch interval) are stored only in `chrome.storage.local` —
  on your device, never synced or transmitted except as described above.
- If price-drop watch is enabled, a small snapshot of your last-seen cart
  prices per open tab is kept locally to detect changes; it is
  overwritten on each check and never sent anywhere.
- Scan/compare results are not persisted beyond the popup/compare view
  session.

## Data changes
If a future version changes what data is collected or how it's used, this
policy will be updated and the change will be called out in CHANGELOG.md
before release, per Chrome Web Store policy.

## Contact
Questions about this policy: see CHANGELOG.md for the maintainer's current
contact details, or open an issue in the project's repository.

---

# מדיניות פרטיות (עברית)

**מטרה יחידה:** CartIQ קיים למטרה אחת — לעזור לכם לבדוק את הקנייה שלכם
ב-AliExpress: עגלה, לשוניות מוצר פתוחות, השוואת מחירים, ואמינות מוכרים.
הוא לא פועל בשום אתר מלבד AliExpress ו-(לצורך ה-AI) Anthropic.

**אילו נתונים נקראים:**
- **עמוד עגלה** (בלחיצתכם): כותרות, מחירים, כמויות, שמות חנויות, קישורים.
- **עמודי מוצר** (בלחיצתכם, או כשפותחים "השוואת לשוניות"): כותרת, מחיר,
  שם חנות, אחוז feedback, דירוג, ומספר ביקורות בלבד. בגרסה קודמת נדגם גם
  טקסט חופשי מהעמוד לבדיקת אמינות המוכר — הוסר אחרי שבדיקה בפועל הראתה
  שהוא לא תפס תוכן ביקורות אמיתי.
- **לשונית חיפוש זמנית שהתוסף פותח בעצמו ברקע** בלחיצה על "מצא
  אלטרנטיבות זולות יותר" — נסגרת מיד אחרי הקריאה, אתם לא רואים אותה.

CartIQ לעולם לא קורא פרטי התחברות, פרטי תשלום, היסטוריית הזמנות, פנקס
כתובות, או היסטוריית גלישה מחוץ ללשוניות שתוארו למעלה.

**מה יוצא מהמכשיר:** רק אם הוספתם מפתח Claude API, ורק בלחיצה על
פעולת ניתוח — הסיכום הרלוונטי נשלח ל-`api.anthropic.com`. שום דבר אחר לא
יוצא לשום מקום אחר.

**התראות (opt-in, כבוי כברירת מחדל):** אם מפעילים "מעקב ירידות מחיר",
CartIQ בודק **לשוניות עגלה שכבר פתוחות** בפער זמן קבוע ומציג התראת
Chrome מקומית. הבדיקה הזו כולה על המכשיר שלכם — לא נשלחת לשום מקום, גם
לא ל-AI.

**איפה נשמר מידע:** מפתח ה-API, שפה, ערכת נושא, והגדרות התוסף נשמרים רק
ב-`chrome.storage.local`. אם מעקב המחירים מופעל, נשמר מקומית תמונת מצב
קטנה של מחירים אחרונים לכל לשונית פתוחה, נדרסת בכל בדיקה.
