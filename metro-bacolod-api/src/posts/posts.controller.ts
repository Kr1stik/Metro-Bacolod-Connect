import { Controller, Get, Post, Body, UploadedFiles, UseInterceptors, Put, Param, Delete, Query } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express'; // Note: FilesInterceptor (Plural)
import { PostsService } from './posts.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Get()
  findAll(@Query('userLocation') userLocation: string) {
    return this.postsService.findAll(userLocation);
  }

  // UPDATED: Handle Multiple Files (Max 10)
  @Post('create')
  @UseInterceptors(FilesInterceptor('images', 10)) // Field name is 'images'
  async create(@UploadedFiles() files: Array<Express.Multer.File>, @Body() body: any) {
    const imageUrls: string[] = [];

    // 1. Upload all files to Cloudinary in parallel
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => this.cloudinaryService.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      results.forEach(result => imageUrls.push(result.secure_url));
    }

    // 2. Save to DB (Store array of URLs)
    return this.postsService.create({
      ...body,
      images: imageUrls, // Now an array
    });
  }

  // ... (Keep toggleLike, delete, update, restore, toggleSave exactly as they were) ...
  @Put(':id/like')
  toggleLike(@Param('id') id: string, @Body('userId') userId: string) {
    return this.postsService.toggleLike(id, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Body('userId') userId: string) {
    return this.postsService.delete(id, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { userId: string; content: string }) {
    return this.postsService.update(id, body.userId, body.content);
  }

  @Put(':id/save')
  toggleSave(@Param('id') id: string, @Body('userId') userId: string) {
    return this.postsService.toggleSave(id, userId);
  }

  @Put(':id/restore')
  restore(@Param('id') id: string, @Body('userId') userId: string) {
    return this.postsService.restore(id, userId);
  }
}