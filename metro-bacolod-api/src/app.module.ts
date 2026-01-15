import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <--- Import this
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // This loads the .env file so process.env works
    ConfigModule.forRoot({
      isGlobal: true, // Makes .env available everywhere
    }),
    
    // Your other modules will go here later
    // AuthModule, 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}