import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get() // This maps to http://localhost:3000/
  getHello(): string {
    return 'Metro Bacolod Connect Backend is Working!';
  }
}