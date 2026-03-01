import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class CloudinaryService {
  private validateFile(file: Express.Multer.File): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
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