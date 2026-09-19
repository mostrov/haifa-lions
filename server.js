const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'HaifaLionsAreTheBest!123'; // סיסמת הניהול

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// וידוא שתיקיית ההעלאות קיימת
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// הגדרת אחסון הקבצים בעזרת Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// הגשת קבצי האתר והקבצים שהועלו
app.use(express.static(path.join(__dirname, 'public')));

let articles = [
    { 
        id: 1, 
        title: 'ברוכים הבאים לאריות חיפה', 
        content: 'ספורט סירות הדרקון משלב עבודת צוות מופלאה, עוצמה פיזית וחיבור מדהים לים בחיפה.', 
        date: '2026-09-19' 
    }
];

let media = [];

// קבלת מאמרים ומדיה
app.get('/api/articles', (req, res) => res.json(articles));
app.get('/api/media', (req, res) => res.json(media));

// הוספת מאמר (עם סיסמה)
app.post('/api/articles', (req, res) => {
    const { title, content, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    if (!title || !content) return res.status(400).json({ error: 'חסרים נתונים' });
    
    const newArticle = {
        id: Date.now(),
        title,
        content,
        date: new Date().toISOString().split('T')[0]
    };
    articles.push(newArticle);
    res.status(201).json(newArticle);
});

// מחיקת מאמר
app.delete('/api/articles/:id', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    articles = articles.filter(a => a.id !== Number(req.params.id));
    res.json({ message: 'נמחק בהצלחה' });
});

// העלאת קובץ מדיה אמיתי (תמונה או סרטון) עם סיסמה
app.post('/api/media', upload.single('mediaFile'), (req, res) => {
    const { title, password, type } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ' });

    const fileUrl = `/uploads/${req.file.filename}`;
    const newItem = {
        id: Date.now(),
        type: type || 'image', // image או video
        url: fileUrl,
        title: title || 'ללא כותרת'
    };
    media.push(newItem);
    res.status(201).json(newItem);
});

// מחיקת מדיה
app.delete('/api/media/:id', (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    
    const item = media.find(m => m.id === Number(req.params.id));
    if (item && item.url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, 'public', item.url);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    
    media = media.filter(m => m.id !== Number(req.params.id));
    res.json({ message: 'נמחק בהצלחה' });
});

app.listen(PORT, () => {
    console.log(`השרת רץ בפורט ${PORT}`);
});
