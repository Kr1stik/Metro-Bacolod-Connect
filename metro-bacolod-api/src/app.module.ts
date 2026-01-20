import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { FirebaseModule } from './firebase/firebase.module'; // IMPORT THIS
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [
    // 1. Load .env first
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // 2. Initialize Firebase
    FirebaseModule, 
    // 3. Load your Users feature
    UsersModule, 
    CloudinaryModule,
    PostsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}