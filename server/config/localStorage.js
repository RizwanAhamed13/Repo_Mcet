const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');

// Configure local storage
const uploadsDir = path.join(__dirname, '..', 'uploads');
const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

// Ensure uploads directory exists
const ensureUploadsDir = async () => {
  try {
    await fs.access(uploadsDir);
  } catch (error) {
    await fs.mkdir(uploadsDir, { recursive: true });
    logger.info('Created uploads directory');
  }
};

// Initialize storage
const initializeStorage = async () => {
  await ensureUploadsDir();
  logger.info('Local storage initialized');
};

// Upload file to local storage
const uploadFile = async (fileBuffer, fileName, contentType) => {
  try {
    await ensureUploadsDir();
    
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${timestamp}-${sanitizedFileName}`;
    const filePath = path.join(uploadsDir, `${timestamp}-${sanitizedFileName}`);
    
    await fs.writeFile(filePath, fileBuffer);
    
    logger.info(`File uploaded to local storage: ${key}`);
    
    return {
      key: key,
      url: `${baseUrl}/api/files/${key}`,
      etag: `"${timestamp}"`,
      localPath: filePath
    };
  } catch (error) {
    logger.error('Error uploading file to local storage:', error);
    throw new Error('Failed to upload file to local storage');
  }
};

// Generate URL for file access
const getFileUrl = async (key) => {
  try {
    const filePath = path.join(uploadsDir, path.basename(key));
    await fs.access(filePath);
    return `${baseUrl}/api/files/${key}`;
  } catch (error) {
    logger.error('Error generating file URL:', error);
    throw new Error('File not found');
  }
};

// Delete file from local storage
const deleteFile = async (key) => {
  try {
    const filePath = path.join(uploadsDir, path.basename(key));
    await fs.unlink(filePath);
    logger.info(`File deleted from local storage: ${key}`);
    return true;
  } catch (error) {
    logger.error('Error deleting file from local storage:', error);
    return false;
  }
};

// List files in storage
const listFiles = async (prefix = 'uploads/') => {
  try {
    const files = await fs.readdir(uploadsDir);
    return files
      .filter(file => file.startsWith(prefix.replace('uploads/', '')))
      .map(file => ({
        Key: `uploads/${file}`,
        LastModified: new Date(),
        Size: 0 // Would need to get actual file size
      }));
  } catch (error) {
    logger.error('Error listing files from local storage:', error);
    return [];
  }
};

// Check if file exists
const fileExists = async (key) => {
  try {
    const filePath = path.join(uploadsDir, path.basename(key));
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

// Get file metadata
const getFileMetadata = async (key) => {
  try {
    const filePath = path.join(uploadsDir, path.basename(key));
    const stats = await fs.stat(filePath);
    return {
      contentType: 'application/octet-stream',
      contentLength: stats.size,
      lastModified: stats.mtime,
      metadata: {}
    };
  } catch (error) {
    logger.error('Error getting file metadata:', error);
    return null;
  }
};

// Cleanup expired files (older than 24 hours instead of 1 hour)
const cleanupExpiredFiles = async () => {
  try {
    const files = await fs.readdir(uploadsDir);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < twentyFourHoursAgo) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }

    logger.info(`Cleaned up ${deletedCount} expired files from local storage`);
    return deletedCount;
  } catch (error) {
    logger.error('Error during local storage cleanup:', error);
    return 0;
  }
};

// List current files in uploads directory
const listCurrentFiles = async () => {
  try {
    const files = await fs.readdir(uploadsDir);
    const fileList = [];
    
    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);
      fileList.push({
        name: file,
        size: stats.size,
        modified: stats.mtime,
        path: filePath
      });
    }
    
    return fileList;
  } catch (error) {
    logger.error('Error listing current files:', error);
    return [];
  }
};

// Serve file directly
const serveFile = async (key) => {
  try {
    const filePath = path.join(uploadsDir, path.basename(key));
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);
    
    return {
      buffer: fileBuffer,
      size: stats.size,
      mtime: stats.mtime
    };
  } catch (error) {
    logger.error('Error serving file:', error);
    throw new Error('File not found');
  }
};

module.exports = {
  initializeStorage,
  uploadFile,
  getFileUrl,
  deleteFile,
  listFiles,
  fileExists,
  getFileMetadata,
  cleanupExpiredFiles,
  listCurrentFiles,
  serveFile
}; 