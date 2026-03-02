import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OcrService {
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OCR_SPACE_API_KEY') || '';
  }

  /**
   * Extract text from an image URL using OCR.space API.
   * The API key is kept server-side — never exposed to the client.
   */
  async extractText(imageUrl: string): Promise<string> {
    if (!this.apiKey) {
      throw new BadRequestException('OCR service is not configured');
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new BadRequestException('A valid image URL is required');
    }

    // Basic URL validation
    try {
      new URL(imageUrl);
    } catch {
      throw new BadRequestException('Invalid image URL');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('url', imageUrl);
      formData.append('apikey', this.apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API returned status ${response.status}`);
      }

      const data = await response.json();
      return data.ParsedResults?.[0]?.ParsedText || '';
    } catch (error) {
      console.warn('OCR extraction failed:', error);
      return '';
    }
  }
}
