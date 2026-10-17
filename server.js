const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const MONGO_URI = process.env.MONGO_URI;

if (!ADMIN_PASSWORD || !MONGO_URI) {
    console.error('שגיאה: חסרים משתני סביבה חיוניים (ADMIN_PASSWORD או MONGO_URI)');
}

mongoose.connect(MONGO_URI)
    .then(() => console.log('התחברנו בהצלחה למסד הנתונים בענן!'))
    .catch(err => console.error('שגיאה בחיבור למונגו:', err));

const ArticleSchema = new mongoose.Schema({ id: Number, title: String, content: String, date: String });
const Article = mongoose.model('Article', ArticleSchema);

const MediaSchema = new mongoose.Schema({ id: Number, type: String, url: String, title: String });
const Media = mongoose.model('Media', MediaSchema);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// הגדרת חיבור ל-Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'haifa_lions_media',
        resource_type: 'auto'
        // הסרנו את allowed_formats כדי שקלאודינרי לא יחסום קבצי Word חדשים
    }
});

// הגדרה אחת ויחידה של upload לכל השרת
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// --- ניהול מאמרים ומסמכי Word ---
app.get('/api/articles', async (req, res) => {
    try { res.json(await Article.find()); } 
    catch (err) { res.status(500).json({ error: 'שגיאה בטעינת מאמרים' }); }
});

app.post('/api/articles', (req, res) => {
    upload.single('docFile')(req, res, async function (err) {
        if (err) {
            console.error('Multer Upload Error:', err);
            return res.status(400).json({ error: 'שגיאה בהעלאת קובץ ה-Word.' });
        }

        const { title, content, password } = req.body;
        if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });

        try {
            let finalContent = content || '';
            let docUrl = req.file ? req.file.path : '';

            if (!title && !req.file) return res.status(400).json({ error: 'יש להזין כותרת או להעלות קובץ Word' });

            const newArticle = new Article({ 
                id: Date.now(), 
                title: title || (req.file ? req.file.originalname : 'ללא כותרת'), 
                content: JSON.stringify({ text: finalContent, docUrl: docUrl }),
                date: new Date().toISOString().split('T')[0] 
            });

            await newArticle.save();
            res.status(201).json(newArticle);
        } catch (dbErr) { 
            console.error('DB Save Error:', dbErr);
            res.status(500).json({ error: 'שגיאה בשמירת המאמר' }); 
        }
    });
});

app.delete('/api/articles/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });

    try {
        await Article.findOneAndDelete({ id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'שגיאה במחיקת המאמר' });
    }
});

// --- ניהול מדיה (תמונות, סרטונים ויוטיוב) ---
app.get('/api/media', async (req, res) => {
    try { res.json(await Media.find()); } 
    catch (err) { res.status(500).json({ error: 'שגיאה בטעינת מדיה' }); }
});

app.post('/api/media', (req, res) => {
    upload.single('mediaFile')(req, res, async function (err) {
        if (err) return res.status(400).json({ error: 'שגיאה בהעלאת הקובץ. ודא שהסוג נתמך והגודל תקין.' });

        const { title, password, type, externalUrl } = req.body;
        if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });

        let fileUrl = '';
        let mediaType = type || 'image';

        if (req.file) {
            fileUrl = req.file.path; 
            if (req.file.mimetype && req.file.mimetype.startsWith('video/')) mediaType = 'video';
            else mediaType = 'image';
        } else if (externalUrl) {
            let finalUrl = externalUrl;
            if (externalUrl.includes('watch?v=')) {
                const videoId = externalUrl.split('watch?v=')[1].split('&')[0];
                finalUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (externalUrl.includes('youtu.be/')) {
                const videoId = externalUrl.split('youtu.be/')[1].split('?')[0];
                finalUrl = `https://www.youtube.com/embed/${videoId}`;
            }
            fileUrl = finalUrl;
            mediaType = 'youtube';
        } else {
            return res.status(400).json({ error: 'יש לבחור קובץ להעלאה או להזין קישור חיצוני' });
        }

        try {
            const newItem = new Media({ id: Date.now(), type: mediaType, url: fileUrl, title: title || 'ללא כותרת' });
            await newItem.save();
            res.status(201).json(newItem);
        } catch (dbErr) { res.status(500).json({ error: 'שגיאה בשמירת נתוני המדיה' }); }
    });
});

app.delete('/api/media/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    
    try {
        await Media.findOneAndDelete({ id: Number(req.params.id) });
        res.json({ message: 'נמחק בהצלחה' });
    } catch (err) { res.status(500).json({ error: 'שגיאה במחיקה' }); }
});

app.listen(PORT, () => console.log(`השרת רץ בפורט ${PORT}`));
