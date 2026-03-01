import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Magic bytes (file signatures) for allowed image types (OWASP A08)
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF....WEBP)
};

@Injectable()
export class CloudinaryService {
  /**
   * Validate file MIME type, size, and magic bytes (OWASP A08)
   * Prevents spoofed MIME types from bypassing file type restrictions
   */
  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Verify actual file content matches claimed MIME type via magic bytes
    if (file.buffer && file.buffer.length >= 8) {
      const isValidMagic = this.verifyMagicBytes(file.buffer, file.mimetype);
      if (!isValidMagic) {
        throw new BadRequestException(
          'File content does not match its declared type. The file may be corrupted or spoofed.',
        );
      }
    }
  }

  /**
   * Check if the file buffer starts with valid magic bytes for the given MIME type
   */
  private verifyMagicBytes(buffer: Buffer, mimetype: string): boolean {
    const signatures = MAGIC_BYTES[mimetype];
    if (!signatures) return true; // No signature check available, pass through

    return signatures.some(sig =>
      sig.every((byte, index) => buffer[index] === byte),
    );
  }

  uploadImage(file: Express.Multer.File): Promise<any> {
    this.validateFile(file);
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'metro-bacolod-posts' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Upload sensitive ID documents with restricted access (OWASP A02)
   * Uses 'authenticated' access mode so URLs require signed tokens
   */
  uploadIdDocument(file: Express.Multer.File): Promise<any> {
    this.validateFile(file);
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'metro-bacolod-ids',
          access_mode: 'authenticated',
          type: 'authenticated',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Generate a time-limited signed URL for accessing authenticated resources (OWASP A02)
   * The expiresInSeconds parameter controls URL lifetime (default: 1 hour)
   */
  getSignedUrl(publicId: string, expiresInSeconds = 3600): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    return cloudinary.url(publicId, {
      sign_url: true,
      type: 'authenticated',
      secure: true,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      expires_at: expiresAt,
    });
  }

  // Delete an image by its public ID
  async deleteImage(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }

  // Extract public ID from a Cloudinary URL
  // e.g. https://res.cloudinary.com/.../metro-bacolod-posts/abc123.jpg → metro-bacolod-posts/abc123
  extractPublicId(url: string): string | null {
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      // Remove version prefix (v1234567890/) and file extension
      const afterUpload = parts[1].replace(/^v\d+\//, '');
      return afterUpload.replace(/\.[^.]+$/, '');
    } catch {
      return null;
    }
  }

  // Delete multiple images by URLs
  async deleteImagesByUrls(urls: string[]): Promise<void> {
    const deletePromises = urls
      .map((url) => this.extractPublicId(url))
      .filter((id): id is string => id !== null)
      .map((publicId) => this.deleteImage(publicId).catch(() => null));

    await Promise.all(deletePromises);
  }
}