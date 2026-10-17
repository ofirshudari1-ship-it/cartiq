# Chrome Web Store Listing — CartIQ (טיוטה, לא הוגש)

## Title
CartIQ — Smart Cart Assistant for AliExpress

## Short description (עד 132 תווים)
EN: Scan your AliExpress cart, spot duplicates, and get AI buy/skip advice.
HE: סורק את עגלת ה-AliExpress שלך, מאתר כפילויות, ונותן המלצת AI מה לקנות.

## Detailed description
### English
CartIQ is an independent, unofficial helper for your AliExpress cart. Click
"Scan my cart" while on aliexpress.com/p/shoppingcart and CartIQ will:
- Detect items you likely added twice (same product, or a near-identical
  title/variant).
- Give you a short AI-generated summary of your cart with practical advice
  on what to keep and what to reconsider.
- Compare every open AliExpress product tab in one sorted table.
- Search AliExpress itself for a cheaper match of the product you're
  viewing.
- Rate seller trustworthiness from on-page signals plus a quick AI read.

CartIQ uses your own Claude API key (from console.anthropic.com) — you're
never asked to pay CartIQ itself, and your key never leaves your device
except to talk directly to Anthropic's API.

Not affiliated with AliExpress or Alibaba Group.

### עברית
CartIQ הוא עוזר עצמאי ולא-רשמי לעגלת ה-AliExpress שלכם. לחצו "סרוק את
העגלה שלי" בעמוד aliexpress.com/p/shoppingcart ו-CartIQ יעשה:
- זיהוי פריטים שכנראה הוספתם פעמיים (אותו מוצר, או כותרת/וריאציה כמעט זהה).
- סיכום AI קצר של העגלה עם עצה מעשית מה כדאי לשמור ומה כדאי לשקול להוריד.
- השוואת כל לשוניות המוצר הפתוחות בטבלה אחת ממוינת.
- חיפוש בתוך AliExpress עצמו אחר אלטרנטיבה זולה יותר למוצר שאתם צופים בו.
- דירוג אמינות מוכר משילוב נתוני העמוד וקריאת AI קצרה.

CartIQ משתמש במפתח Claude API אישי שלכם (מ-console.anthropic.com) — לא
משלמים ל-CartIQ עצמו, והמפתח שלכם לא יוצא מהמכשיר מלבד תקשורת ישירה מול
ה-API של Anthropic.

לא קשור ל-AliExpress או קבוצת Alibaba.

## Category
Shopping

## Permissions justification (for the review form)
- `storage`: save API key/language/theme/feature settings locally.
- `activeTab`: check what kind of AliExpress page the current tab is, to
  show the right popup view.
- `scripting`: inject a self-contained results scraper into the temporary,
  background search tab used by "Find cheaper alternatives" only.
- `tabs`: list/open/close AliExpress tabs for the tab-comparison view and
  the background search-and-close flow.
- `alarms`: run the opt-in, user-enabled price-drop check on a timer.
- `notifications`: show a local notification when that price-drop check
  finds a lower price, or a user-set target price is reached, on an already-open cart or product tab.
- `host_permissions` (`*.aliexpress.com`): read cart/product/search page
  contents on the user's request (or via the opt-in price watch).
- `host_permissions` (`api.anthropic.com`): send a cart/product summary for
  AI analysis, using the user's own API key.

## Screenshots (TODO — עדיין לא צולמו, דורש התקנה על עגלה אמיתית)
1. Popup עם כפילויות מזוהות.
2. Popup עם סיכום AI.
3. עמוד הגדרות.

## Promo tile 440×280 (TODO)
לייצר מ-`assets/logo/logo-full.svg` על רקע `--cartiq-surface` בהיר, עם
משפט "Smarter AliExpress cart" / "עגלת AliExpress חכמה יותר".
