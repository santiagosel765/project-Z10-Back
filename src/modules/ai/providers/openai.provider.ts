import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import OpenAI from 'openai';
import { envs } from 'src/config/envs';
import { AIProvider } from './ai-provider.interface';

export interface ChatSession {
  id: string;
  userId: number;
  cuadroFirmaId: number;
  pdfContent: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  lastActivity: Date;
}

export interface CreateChatSessionOptions {
  sessionId?: string;
  userId: number;
  cuadroFirmaId: number;
  pdfContent: string;
}

@Injectable()
export class OpenAiProvider implements AIProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly client = new OpenAI({ apiKey: envs.openAiAPIKey });

  constructor() {
    if (!envs.openAiAPIKey) {
      this.logger.error('OpenAI API key is not configured');
    }
  }

  async generateText(prompt: string): Promise<string> {
    if (!envs.openAiAPIKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const response = await this.client.responses.create({
      model: envs.openAiModel,
      input: [
        {
          role: 'system',
          content: `
                Eres un asistente conversacional que redacta correos, informes, artículos, resúmenes o mensajes.
                Mantén un tono profesional, cercano y colaborativo. Adáptate al contexto e indicaciones del usuario.
          `.trim(),
        },
        { role: 'user', content: prompt },
      ],
    });

    return response.output_text;
  }
}
