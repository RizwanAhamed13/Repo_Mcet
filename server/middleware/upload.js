const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ClamScan = require('clamscan');
const { logger } = require('../utils/logger');

// Configure ClamAV scanner (optional)
let clamScanner = null;
// Skip ClamAV initialization for development
console.warn('ClamAV scanning disabled for development');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES.split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE), // 25MB
    files: 1 // Only one file at a time
  }
});

// Virus scanning middleware
const scanFile = async (filePath) => {
  try {
    if (!clamScanner) {
      logger.warn('ClamAV not available, skipping virus scan');
      return true;
    }
    
    const {isInfected, viruses} = await clamScanner.isInfected(filePath);
    
    if (isInfected) {
      logger.warn(`Virus detected in file: ${filePath}`, viruses);
      // Delete infected file
      fs.unlinkSync(filePath);
      throw new Error('File contains malware and has been rejected');
    }
    
    logger.info(`File scanned successfully: ${filePath}`);
    return true;
  } catch (error) {
    if (error.message.includes('malware')) {
      throw error;
    }
    logger.error('Error scanning file:', error);
    // If ClamAV is not available, log warning but continue
    logger.warn('ClamAV scanning failed, proceeding without virus scan');
    return true;
  }
};

// File upload middleware with scanning
const uploadWithScan = async (req, res, next) => {
  try {
    // Use multer to handle file upload
    upload.single('file')(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
              error: 'File too large. Maximum size is 25MB.' 
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
              error: 'Too many files. Only one file allowed.' 
            });
          }
        }
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      try {
        // Scan file for viruses
        await scanFile(req.file.path);
        
        // Add file info to request
        req.fileInfo = {
          originalName: req.file.originalname,
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        };
        
        next();
      } catch (scanError) {
        // Clean up file if scanning failed
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: scanError.message });
      }
    });
  } catch (error) {
    logger.error('Upload middleware error:', error);
    res.status(500).json({ error: 'File upload failed.' });
  }
};

// Clean up uploaded files after processing
const cleanupUploadedFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up uploaded file: ${filePath}`);
    }
  } catch (error) {
    logger.error('Error cleaning up uploaded file:', error);
  }
};

// Validate file size
const validateFileSize = (fileSize) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE);
  return fileSize <= maxSize;
};

// Get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase().substring(1);
};

// Check if file type is allowed
const isAllowedFileType = (filename) => {
  const allowedTypes = process.env.ALLOWED_FILE_TYPES.split(',');
  const extension = getFileExtension(filename);
  return allowedTypes.includes(extension);
};

module.exports = {
  upload,
  uploadWithScan,
  scanFile,
  cleanupUploadedFile,
  validateFileSize,
  isAllowedFileType,
  getFileExtension
}; 