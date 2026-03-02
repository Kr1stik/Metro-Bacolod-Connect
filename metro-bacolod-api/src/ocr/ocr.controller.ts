import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OcrService } from './ocr.service';
import { FirebaseAuthGuard } from '../guards/firebase-auth.guard';
import { OcrExtractDto } from './dto/ocr.dto';

@Controller('ocr')
@UseGuards(FirebaseAuthGuard)
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  /**
   * POST /ocr/extract
   * Proxy OCR API call through backend to keep API key server-side.
   * Rate-limited to prevent abuse.
   */
  @Post('extract')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async extractText(@Body() body: OcrExtractDto) {
    const text = await this.ocrService.extractText(body.imageUrl);
    return { text };
  }
}
