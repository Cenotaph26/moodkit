// src/routes/upload.ts
import { Router, Response } from 'express'
import multer from 'multer'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true)
    } else {
      cb(new Error('Sadece görsel ve video dosyaları yüklenebilir'))
    }
  }
})

// POST /api/upload
router.post('/', requireAuth, upload.single('file'), (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı' })
  const b64 = req.file.buffer.toString('base64')
  const url = `data:${req.file.mimetype};base64,${b64}`
  res.json({ url })
})

export default router
