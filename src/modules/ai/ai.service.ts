import { Injectable } from '@nestjs/common';
import { OpenAiProvider } from './providers/openai.provider';


@Injectable()
export class AiService {
  constructor(private readonly openai: OpenAiProvider) {}

  generateText(prompt: string) {
    return this.openai.generateText(prompt);
  }
}