const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'HaifaLionsAreTheBest!123'; // סיסמת הניהול שלך

// חיבור ל-MongoDB Atlas (הדביקי כאן למטה את המחרוזת שהעתקת ממונגובי)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://michalostrov_db_user:w5Pm89ejbRWNnv#@cluster0.e6fwqze.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => console.log('התחברנו בהצלחה למסד הנתונים בענן!'))
    .catch(err => console.error('שגיאה בחיבור למונגו:', err));

// הגדרת מבנה הנתונים למאמרים במונגו
const ArticleSchema = new mongoose.Schema({
    id: Number,
    title: String,
    content: String,
    date: String
});
const Article = mongoose.model('Article', ArticleSchema);

// הגדרת מבנה הנתונים למדיה במונגו
const MediaSchema = new mongoose.Schema({
    id: Number,
    type: String,
    url: String,
    title: String
});
const Media = mongoose.model('Media', MediaSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// וידוא תיקיית העלאות קבצים
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

// קבלת כל המאמרים מהענן
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await Article.find();
        res.json(articles);
    } catch (err) {
        res.status(500).json({ error: 'שגיאה בטעינת מאמרים' });
    }
});

// הוספת מאמר חדש לענן
app.post('/api/articles', async (req, res) => {
    const { title, content, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    if (!title || !content) return res.status(400).json({ error: 'חסרים נתונים' });
    
    try {
        const newArticle = new Article({
            id: Date.now(),
            title,
            content,
            date: new Date().toISOString().split('T')[0]
        });
        await newArticle.save();
        res.status(201).json(newArticle);
    } catch (err) {
        res.status(500).json({ error: 'שגיאה בשמירת המאמר' });
    }
});

// מחיקת מאמר מהענן
app.delete('/api/articles/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    
    try {
        await Article.findOneAndDelete({ id: Number(req.params.id) });
        res.json({ message: 'נמחק בהצלחה' });
    } catch (err) {
        res.status(500).json({ error: 'שגיאה במחיקה' });
    }
});

// קבלת כל המדיה מהענן
app.get('/api/media', async (req, res) => {
    try {
        const mediaItems = await Media.find();
        res.json(mediaItems);
    } catch (err) {
        res.status(500).json({ error: 'שגיאה בטעינת מדיה' });
    }
});

// העלאת קובץ ושמירתו בענן
app.post('/api/media', upload.single('mediaFile'), async (req, res) => {
    const { title, password, type } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    if (!req.file) return res.status(400).json({ error: 'לא נבחר קובץ' });

    try {
        const fileUrl = `/uploads/${req.file.filename}`;
        const newItem = new Media({
            id: Date.now(),
            type: type || 'image',
            url: fileUrl,
            title: title || 'ללא כותרת'
        });
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: 'שגיאה בשמירת המדיה' });
    }
});

// מחיקת מדיה
app.delete('/api/media/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    
    try {
        const item = await Media.findOne({ id: Number(req.params.id) });
        if (item && item.url.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, 'public', item.url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Media.findOneAndDelete({ id: Number(req.params.id) });
        res.json({ message: 'נמחק בהצלחה' });
    } catch (err) {
        res.status(500).json({ error: 'שגיאה במחיקה' });
    }
});

app.listen(PORT, () => {
    console.log(`השרת רץ בפורט ${PORT}`);
});
