import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // This loads the .env file so process.env works
    ConfigModule.forRoot({
      isGlobal: true, // Makes .env available everywhere
    }),
    UsersModule,
    
    // Your other modules will go here later
    // AuthModule, 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}