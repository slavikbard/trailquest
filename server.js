require('dotenv').config();
const express = require('express');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const AGE_DESCRIPTIONS = {
  '4-6':   'גיל 4-6 — פשוט מאוד, משפטים קצרים, פעולות גופניות וחושיות כיפיות',
  '7-10':  'גיל 7-10 — בינוני, כולל תצפית, חשיבה וגילוי',
  '11-14': 'גיל 11-14 — מאתגר, כולל מדע, ניתוח וחשיבה ביקורתית',
};

app.post('/api/generate-quests', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  const { trail, age } = req.body;
  if (!trail || !age) {
    return res.status(400).json({ error: 'Missing trail or age' });
  }

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
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.85 },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Gemini API error:', response.status, errBody);
      return res.status(502).json({ error: 'Gemini API error' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: 'Empty Gemini response' });
    }

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(502).json({ error: 'Could not parse JSON from Gemini response' });
    }

    const quests = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(quests) || quests.length < 5) {
      return res.status(502).json({ error: 'Invalid quests format' });
    }

    res.json(quests.slice(0, 10));
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TrailQuest running at http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('  GEMINI_API_KEY is not set -- fallback quests will be served');
  }
});
