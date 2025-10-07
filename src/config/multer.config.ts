import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/avatars',
    filename: (req, file, callback) => {
      // Генерируем уникальное имя файла на латинице
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = extname(file.originalname);
      const filename = `avatar-${uniqueSuffix}${ext}`;
      callback(null, filename);
    }
  }),
  fileFilter: (req, file, callback) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return callback(new Error('Only image files are allowed!'), false);
    }
    callback(null, true);
  },
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   }
};