const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = 'HaifaLionsAreTheBest!123';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://michalostrov_db_user:w5Pm89ejbRWNnv%23@cluster0.e6fwqze.mongodb.net/?appName=Cluster0';

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

// הגדרת אחסון וסינון דרך Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'haifa_lions_media',
        resource_type: 'auto', // מאפשר העלאת תמונות, סרטונים ו-PDF בצורה אוטומטית
        allowed_formats: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'pdf']
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

app.get('/api/articles', async (req, res) => {
    try { res.json(await Article.find()); } 
    catch (err) { res.status(500).json({ error: 'שגיאה בטעינת מאמרים' }); }
});

app.post('/api/articles', async (req, res) => {
    const { title, content, password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    if (!title || !content) return res.status(400).json({ error: 'חסרים נתונים' });
    
    try {
        const newArticle = new Article({ id: Date.now(), title, content, date: new Date().toISOString().split('T')[0] });
        await newArticle.save();
        res.status(201).json(newArticle);
    } catch (err) { res.status(500).json({ error: 'שגיאה בשמירת המאמר' }); }
});

app.delete('/api/articles/:id', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'סיסמה שגויה' });
    
    try {
        await Article.findOneAndDelete({ id: Number(req.params.id) });
        res.json({ message: 'נמחק בהצלחה' });
    } catch (err) { res.status(500).json({ error: 'שגיאה במחיקה' }); }
});

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
            // Cloudinary מחזיר לנו ישירות את הקישור המאובטח בענן בתוך req.file.path
            fileUrl = req.file.path; 
            if (req.file.mimetype === 'application/pdf') mediaType = 'pdf';
            else if (req.file.mimetype && req.file.mimetype.startsWith('video/')) mediaType = 'video';
            else mediaType = 'image';
        } else if (externalUrl) {
            fileUrl = externalUrl;
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
