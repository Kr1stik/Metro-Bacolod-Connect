import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module'; // Important for image upload

@Module({
  imports: [CloudinaryModule], // 1. Import Cloudinary so the Controller can use it
  controllers: [PostsController], // 2. Register the Controller
  providers: [PostsService],      // 3. Register the Service
})
export class PostsModule {}