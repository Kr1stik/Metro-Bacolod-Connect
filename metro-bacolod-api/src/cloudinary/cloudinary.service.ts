import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  uploadImage(file: Express.Multer.File): Promise<any> {
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