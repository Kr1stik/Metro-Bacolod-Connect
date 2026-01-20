import { Controller, Get, Post, Body, UploadedFiles, UseInterceptors, Put, Param, Delete, Query } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express'; // Note: FilesInterceptor (Plural)
import { PostsService } from './posts.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { HttpException, HttpStatus } from '@nestjs/common';

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
  @UseInterceptors(FilesInterceptor('images', 10))
  async create(@UploadedFiles() files: Array<Express.Multer.File>, @Body() body: any) {
    try {
      const imageUrls: string[] = [];

      // DEBUG LOGGING
      console.log('1. Received Create Request');
      console.log('2. Body:', body);
      console.log('3. Files found:', files?.length || 0);

      if (files && files.length > 0) {
        // Upload each file
        const uploadPromises = files.map(file => {
          if (!file.buffer) {
            throw new Error('File buffer is missing. Multer configuration error.');
          }
          return this.cloudinaryService.uploadImage(file);
        });

        const results = await Promise.all(uploadPromises);
        results.forEach(result => imageUrls.push(result.secure_url));
      }

      // Save to DB
      console.log('4. Saving to Database...');
      const newPost = await this.postsService.create({
        ...body,
        images: imageUrls,
      });
      
      console.log('5. Success!');
      return newPost;

    } catch (error) {
      // THIS LOGS THE REAL ERROR TO YOUR SERVER CONSOLE
      console.error('❌ FATAL ERROR IN CREATE POST:', error);
      
      // Return the actual error message to the frontend so you can see it
      throw new HttpException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Upload Failed: ' + error.message,
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
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