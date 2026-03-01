import { Controller, Get, Post, Body, UploadedFiles, UseInterceptors, Put, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Get()
  @UseGuards(FirebaseAuthGuard)
  findAll(@Query('userLocation') userLocation: string) {
    return this.postsService.findAll(userLocation);
  }

  @Post('create')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10, { limits: { fileSize: 10 * 1024 * 1024 } })) 
  async create(@UploadedFiles() files: Array<Express.Multer.File>, @Body() body: CreatePostDto, @Req() req: any) {
    const imageUrls: string[] = [];

    // 1. Upload all files to Cloudinary in parallel
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => this.cloudinaryService.uploadImage(file));
      const results = await Promise.all(uploadPromises);
      results.forEach(result => imageUrls.push(result.secure_url));
    }

    // 2. Save to DB with authenticated user's UID
    return this.postsService.create({
      ...body,
      userId: req.user.uid,
      images: imageUrls,
    });
  }

  @Put(':id/like')
  @UseGuards(FirebaseAuthGuard)
  toggleLike(@Param('id') id: string, @Req() req: any) {
    return this.postsService.toggleLike(id, req.user.uid);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.postsService.delete(id, req.user.uid);
  }

  @Put(':id')
  @UseGuards(FirebaseAuthGuard)
  update(@Param('id') id: string, @Body() body: UpdatePostDto, @Req() req: any) {
    return this.postsService.update(id, req.user.uid, body);
  }

  @Put(':id/save')
  @UseGuards(FirebaseAuthGuard)
  toggleSave(@Param('id') id: string, @Req() req: any) {
    return this.postsService.toggleSave(id, req.user.uid);
  }

  @Put(':id/restore')
  @UseGuards(FirebaseAuthGuard)
  restore(@Param('id') id: string, @Req() req: any) {
    return this.postsService.restore(id, req.user.uid);
  }
}