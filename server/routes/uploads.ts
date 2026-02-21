import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadImage, isR2Configured } from '../services/fileUpload';

const router = Router();

const ALLOWED_FOLDERS = ['profiles', 'progress', 'exercises'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// Multer error handler
function handleMulterError(err: any, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err?.message === 'Only images are allowed') {
    return res.status(400).json({ error: 'Only images are allowed' });
  }
  next(err);
}

// POST /api/uploads/image?folder=profiles|progress|exercises
router.post(
  '/image',
  (req: Request, res: Response, next: NextFunction) => {
    if (!isR2Configured()) {
      return res.status(503).json({
        error: 'File uploads not configured. Set CLOUDFLARE_R2_* environment variables.',
      });
    }
    next();
  },
  upload.single('file'),
  handleMulterError,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const folder = ALLOWED_FOLDERS.includes(req.query.folder as string)
      ? (req.query.folder as string)
      : 'profiles';

    try {
      const url = await uploadImage(req.file.buffer, folder as any, req.file.mimetype);
      res.json({ url });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

export default router;
