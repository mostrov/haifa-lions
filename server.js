const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'HaifaLionsAreTheBest!123';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://michalostrov_db_user:w5Pm89ejbRWNnv%23@cluster0.e6fwqze.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(() => console.log('התחברנו בהצלחה למסד הנתונים בענן!'))
    .catch(err => console.error('שגיאה בחיבור למונגו:', err));

const ArticleSchema = new mongoose.Schema({
    id: Number,
    title: String,
    content: String,
    date: String
});
const Article = mongoose.model('Article', ArticleSchema);

const MediaSchema = new mongoose.Schema({
    id: Number,
    type: String, // image, video, pdf, youtube
    url: String,
    title: String
});
const Media = mongoose.model('Media', MediaSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// הגדרת אחסון וסינון קבצים בטוח
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const fileFilter = (req, file, cb) => {
    // הוספנו תמיכה ב-jfif וב-pdf
    const allowedTypes = /jpeg|jpg|jfif|png|webp|mp4|mov|avi|mkv|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // בדיקת סוג התוכן שמועבר (MIME type)
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        // שגיאה מסודרת שלא מקריסה את השרת
        cb(new Error('סוג קובץ אינו נתמך! ניתן להעלות תמונות (כולל JFIF), סרטונים או PDF בלבד.'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // הגבלה ל-50MB
    fileFilter: fileFilter 
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/articles', async (req, res) => {
    try {
        const articles = await Article.find();
        res.json(articles);
    } catch (err) {
        res.status(500).json({ error: 'שגיאה בטעינת מאמרים' });
    }
});

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

app.get('/api/media', async (req, res) => {
    try {
        const mediaItems = await Media.find();
        res.json(mediaItems);
    } catch (err) {
        res.status(500).json({ error: 'שגיאה בטעינת מדיה' });
    }
});

// העלאת מדיה - מטפל בשגיאות Multer ומאפשר קישורי יוטיוב
app.post('/api/media', (req, res) => {
    upload.single('mediaFile')(req, res, async function (err) {
        // תפיסת שגיאות העלאה (כמו סוג קובץ לא תקין) והחזרת הודעה נקייה למשתמש
        if (err instanceof multer.MulterError || err) {
            return res.status(400).json({ error: err.message || 'שגיאה בהעלאת הקובץ' });
        }

        const { title, password, type, externalUrl } = req.body;
        if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });

        let fileUrl = '';
        let mediaType = type || 'image';

        if (req.file) {
            fileUrl = `/uploads/${req.file.filename}`;
            if (req.file.mimetype === 'application/pdf') {
                mediaType = 'pdf';
            } else if (req.file.mimetype.startsWith('video/')) {
                mediaType = 'video';
            } else {
                mediaType = 'image';
            }
        } else if (externalUrl) {
            // טיפול בקישור חיצוני ליוטיוב
            fileUrl = externalUrl;
            mediaType = 'youtube';
        } else {
            return res.status(400).json({ error: 'יש לבחור קובץ להעלאה או להזין קישור חיצוני' });
        }

        try {
            const newItem = new Media({
                id: Date.now(),
                type: mediaType,
                url: fileUrl,
                title: title || 'ללא כותרת'
            });
            await newItem.save();
            res.status(201).json(newItem);
        } catch (dbErr) {
            res.status(500).json({ error: 'שגיאה בשמירת נתוני המדיה' });
        }
    });
});

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
