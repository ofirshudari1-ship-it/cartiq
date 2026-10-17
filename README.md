# CartIQ

**עברית** | [English](#english)

תוסף Chrome שסורק את עגלת הקניות שלך ב-AliExpress, מזהה פריטים כפולים,
ונותן ניתוח AI קצר על מה כדאי לשמור בעגלה ומה כדאי לשקול להוריד.

## למי זה
לכל מי שקונה הרבה ב-AliExpress ומצטברת לו עגלה גדולה ומבולגנת.

## התקנה
CartIQ לא נמצא בחנות של Chrome, ולכן ההתקנה ידנית ו-Chrome לא יעדכן אותו לבד.

1. הורידו את קובץ ה-ZIP האחרון מ-[דף ההורדות](https://github.com/ofirshudari1-ship-it/cartiq/releases/latest).
2. חלצו אותו לתיקייה שתישאר אצלכם במחשב (אל תמחקו אותה אחר כך - Chrome טוען ממנה את הקבצים בכל פתיחה).
3. פתחו `chrome://extensions` והפעילו "מצב מפתח" (Developer mode).
4. לחצו "טען תוסף שלא נארז" (Load unpacked) ובחרו את התיקייה שחולצה.
5. לחצו על אייקון CartIQ, ואז על הגדרות, והזינו מפתח Claude API אישי (נדרש לניתוח ה-AI; בלי מפתח סריקת הכפילויות עדיין עובדת).

לעדכון גרסה: הורידו ZIP חדש, חלצו מעל אותה תיקייה ולחצו על כפתור הטעינה מחדש בכרטיס של CartIQ ב-`chrome://extensions`.

## שימוש
### עגלה + כפילויות
1. פתחו את עגלת הקניות שלכם ב-`aliexpress.com/p/shoppingcart`.
2. לחצו על אייקון CartIQ בסרגל הכלים → "סרוק את העגלה שלי".
3. תראו כמות פריטים, כפילויות שזוהו, וסיכום/המלצות AI קצרים.

### השוואת לשוניות פתוחות
1. פתחו כמה עמודי מוצר של AliExpress בלשוניות שונות.
2. לחצו על אייקון CartIQ → ⇄ ("השוואת לשוניות פתוחות").
3. תקבלו טבלה אחת ממוינת לפי מחיר, עם קישור מהיר לכל לשונית.

### אלטרנטיבה זולה יותר + אמינות מוכר
1. פתחו עמוד מוצר בודד ולחצו על אייקון CartIQ.
2. "מצא אלטרנטיבות זולות יותר" מחפש בתוך AliExpress בלבד (לשונית רקע
   שנסגרת אוטומטית) ומציג עד 5 תוצאות זולות יותר.
3. "בדוק אמינות מוכר" משלב נתונים שכבר בעמוד עם ניתוח AI קצר של טקסט
   מהעמוד, ומחזיר ירוק/צהוב/אדום.

### היסטוריית מחירים ויעד מחיר
1. בכל סריקת עגלה או פתיחת עמוד מוצר CartIQ שומר מקומית את המחיר.
2. בעמוד מוצר תראו גרף, ופסיקה אם המחיר נמוך, גבוה או בטווח הרגיל מבין מה שנרשם. ההיסטוריה נבנית רק מהביקורים שלכם.
3. אפשר להגדיר מחיר יעד; עם מעקב מחירים מופעל והעגלה/המוצר פתוחים בלשונית תקבלו התראה.
4. בעגלה: סכום כולל (לפני משלוח), פירוט לפי מוכר והעתקה כ-CSV.

## דרישות
- Google Chrome (או דפדפן מבוסס Chromium) עם תמיכה ב-Manifest V3.
- מפתח Claude API אישי (מ-[console.anthropic.com](https://console.anthropic.com))
  לשימוש בניתוח ה-AI. בלי מפתח, זיהוי הכפילויות (שלא דורש AI) עדיין עובד.

## פתרון תקלות
- **"לא נמצאו פריטים" בסריקה:** ודאו שאתם בעמוד `aliexpress.com/p/shoppingcart`
  עצמו (לא בעמוד מוצר בודד) ושהעגלה נטענה במלואה לפני הלחיצה על סריקה.
- **הודעת "הוסיפו מפתח API":** פתחו הגדרות והזינו מפתח תקין שמתחיל ב-`sk-ant-`.
- ראו SPEC.md למגבלות ידועות ותכנית ה-Roadmap.

## פרטיות
ראו PRIVACY.md. בקצרה: המפתח שלכם ונתוני העגלה נשארים במכשיר שלכם ונשלחים
רק ל-`api.anthropic.com` לצורך הניתוח — לשום שרת אחר.

---

## English

CartIQ is a Chrome extension that scans your AliExpress cart, flags likely
duplicate items, and gives a short AI-powered summary of what to keep and
what to reconsider.

### Install
CartIQ is not on the Chrome Web Store, so installation is manual and Chrome will not update it by itself.

1. Download the latest ZIP from the [Releases page](https://github.com/ofirshudari1-ship-it/cartiq/releases/latest).
2. Extract it to a folder you will keep (do not delete it afterwards - Chrome loads the extension's files from there).
3. Open `chrome://extensions` and turn on **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.
5. Click the CartIQ icon, then Settings, and enter your own Claude API key (needed for the AI summary; duplicate detection works without it).

To update: download the new ZIP, extract over the same folder, and click the reload icon on CartIQ's card at `chrome://extensions`.

### Usage
**Cart + duplicates:** open `aliexpress.com/p/shoppingcart`, click the CartIQ icon →
"Scan my cart" to see item/duplicate counts and a short AI summary.

**Compare open tabs:** open several AliExpress product pages in different
tabs, click the CartIQ icon → ⇄ ("Compare open tabs") for a single table
sorted by price with a quick link to each tab.

**Cheaper alternatives + seller trust:** on a single product page, click
the CartIQ icon. "Find cheaper alternatives" searches within AliExpress
only (a background tab that closes itself) for up to 5 cheaper matches.
"Check seller trust" combines on-page signals with a short AI read of
page text into a green/yellow/red verdict.

### Price history and target price
Every cart scan or product page visit stores the price locally. On a
product page you get a chart and a verdict (low / high / usual range) based
only on what CartIQ has recorded from your own visits. Set a target price
and, with the price watch on and the product or cart open in a tab, you get
a notification. The cart view adds a total (before shipping), a per-seller
breakdown and "Copy cart as CSV".

### Requirements
- Chrome (or a Chromium-based browser) with Manifest V3 support.
- A personal Claude API key from [console.anthropic.com](https://console.anthropic.com)
  for the AI analysis step. Without one, duplicate detection (no AI needed)
  still works.

### Troubleshooting
- **"No items found" when scanning:** make sure you're on the
  `aliexpress.com/p/shoppingcart` page itself and that the cart has fully loaded.
- **"Add your API key" message:** open Settings and paste a valid key
  starting with `sk-ant-`.
- See SPEC.md for known limitations and the roadmap.

### Privacy
See PRIVACY.md. In short: your key and cart data stay on your device and
are only sent to `api.anthropic.com` for analysis — nowhere else.
