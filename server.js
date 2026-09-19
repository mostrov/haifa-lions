const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// הגשת קבצי האתר מתיקיית public
app.use(express.static(path.join(__dirname, 'public')));

// בסיס נתונים זמני בזיכרון השרת
let articles = [
    { 
        id: 1, 
        title: 'ברוכים הבאים לאריות חיפה', 
        content: 'ספורט סירות הדרקון משלב עבודת צוות מופלאה, עוצמה פיזית וחיבור מדהים לים בחיפה.', 
        date: '2026-09-19' 
    }
];

let media = [
    { id: 1, type: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', title: 'אימון לדוגמה בים' }
];

// קבלת כל המאמרים
app.get('/api/articles', (req, res) => {
    res.json(articles);
});

// הוספת מאמר חדש (מדף המנהל)
app.post('/api/articles', (req, res) => {
    const { title, content } = req.body;
    if (!title || !content) {
        return res.status(400).json({ error: 'יש לספק כותרת ותוכן למאמר' });
    }
    const newArticle = {
        id: Date.now(),
        title,
        content,
        date: new Date().toISOString().split('T')[0]
    };
    articles.push(newArticle);
    res.status(201).json({ message: 'המאמר נוסף בהצלחה', article: newArticle });
});

// קבלת כל המדיה (תמונות/סרטונים)
app.get('/api/media', (req, res) => {
    res.json(media);
});

// הוספת מדיה חדשה (מדף המנהל)
app.post('/api/media', (req, res) => {
    const { type, url, title } = req.body; // type: 'image' או 'video'
    if (!url) {
        return res.status(400).json({ error: 'יש לספק כתובת URL למדיה' });
    }
    const newItem = { id: Date.now(), type, url, title: title || 'ללא כותרת' };
    media.push(newItem);
    res.status(201).json({ message: 'המדיה נוספה בהצלחה', item: newItem });
});

app.listen(PORT, () => {
    console.log(`השרת רץ בהצלחה בפורט ${PORT}`);
});
