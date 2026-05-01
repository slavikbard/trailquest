/**
 * Generates location-based adventure quests via Gemini API.
 * Calls the API directly from the browser (suitable for static hosting).
 *
 * @param {string} trail - Trail / location name entered by the user
 * @param {string} age   - Age group: '4-6', '7-10', or '11-14'
 * @returns {Promise<Array|null>} Array of quest objects, or null if unavailable
 */

const GEMINI_API_KEY = 'AIzaSyABqmz1LtSZw2qNNk33cqkJMF7pISKKQ2Q';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const AGE_DESCRIPTIONS = {
  '4-6':   'גיל 4-6 — פשוט מאוד, משפטים קצרים, פעולות גופניות וחושיות כיפיות',
  '7-10':  'גיל 7-10 — בינוני, כולל תצפית, חשיבה וגילוי',
  '11-14': 'גיל 11-14 — מאתגר, כולל מדע, ניתוח וחשיבה ביקורתית',
};

export async function generateQuests(trail, age) {
  const ageDesc = AGE_DESCRIPTIONS[age] || AGE_DESCRIPTIONS['7-10'];

  const prompt = `אתה מנחה טיולים מנוסה שיוצר משימות הרפתקה לילדים בעברית תקינה ובשפה פשוטה.
מיקום הטיול: "${trail}" בישראל.
קבוצת גיל: ${ageDesc}

צור בדיוק 10 משימות הרפתקה כיפיות ומגוונות, מותאמות ספציפית למקום "${trail}".
כל משימה חייבת להתייחס בפירוש למקום הזה — חיות, צמחים, גאוגרפיה, נוף, היסטוריה, או פעילות ייחודית לאזור.

סוגי משימות — השתמש בכולם:
- "find": מצאו דבר ספציפי שאפשר למצוא באזור הזה
- "challenge": עשו פעולה פיזית, יצירתית, או חברתית מתאימה למקום
- "observe": שימו לב לפרט, תופעת טבע, או היבט ייחודי של המקום

חשוב:
- כתוב עברית תקינה ובהירה
- כל משימה צריכה להרגיש ייחודית ל"${trail}"
- הוסף emoji רלוונטי לכל משימה
- הרמז צריך לעזור לילדים למצוא או לבצע את המשימה

החזר JSON בלבד, ללא כל טקסט נוסף, בפורמט הזה:
[
  {
    "type": "find",
    "emoji": "🌿",
    "title": "שם קצר (עד 4 מילים)",
    "mission": "תאור המשימה (עד 15 מילים)",
    "hint": "רמז קצר ומועיל",
    "points": 10
  }
]

points: 10 לקל, 15 לבינוני, 20 לקשה`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.85 },
      }),
    });

    if (!res.ok) return null;

    const data  = await res.json();
    const text  = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;

    const quests = JSON.parse(match[0]);
    if (!Array.isArray(quests) || quests.length < 5) return null;

    return quests;
  } catch {
    return null;
  }
}
