const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// סיסמת הניהול (ניתן לשנות לכל סיסמה שתבחרי)
const ADMIN_PASSWORD = 'HaifaLionsAreTheBest!123'; 

app.use(cors());
app.use(express.json());
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

// קבלת כל המאמרים (פתוח לכולם)
app.get('/api/articles', (req, res) => {
    res.json(articles);
});

// קבלת כל המדיה (פתוח לכולם)
app.get('/api/media', (req, res) => {
    res.json(media);
});

// הוספת מאמר חדש (דורש סיסמה)
app.post('/api/articles', (req, res) => {
    const { title, content, password } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'סיסמה שגויה!' });
    }
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

// מחיקת מאמר (דורש סיסמה)
app.delete('/api/articles/:id', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'סיסמה שגויה!' });
    }
    const articleId = Number(req.params.id);
    articles = articles.filter(a => a.id !== articleId);
    res.json({ message: 'המאמר נמחק בהצלחה' });
});

// הוספת מדיה חדשה (דורש סיסמה)
app.post('/api/media', (req, res) => {
    const { type, url, title, password } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'סיסמה שגויה!' });
    }
    if (!url) {
        return res.status(400).json({ error: 'יש לספק כתובת URL למדיה' });
    }
    const newItem = { id: Date.now(), type, url, title: title || 'ללא כותרת' };
    media.push(newItem);
    res.status(201).json({ message: 'המדיה נוספה בהצלחה', item: newItem });
});

// מחיקת מדיה (דורש סיסמה)
app.delete('/api/media/:id', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'סיסמה שגויה!' });
    }
    const mediaId = Number(req.params.id);
    media = media.filter(m => m.id !== mediaId);
    res.json({ message: 'המדיה נמחקה בהצלחה' });
});

app.listen(PORT, () => {
    console.log(`השרת רץ בהצלחה בפורט ${PORT}`);
});
