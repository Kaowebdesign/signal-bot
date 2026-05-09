import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IssueType, Severity } from '@prisma/client';
import { classifyIssueType } from './dictionaries/issue-types';

export interface AnalyzedMessage {
  id: string;
  channelId: string;
  telegramMessageId: bigint;
  text: string;
  issueType: IssueType;
  severity: Severity;
  analyzedAt: Date;
}

const HIGH_SEVERITY_KEYWORDS = [
  'жесть',
  'капець',
  'повний',
  'жорстко',
  'кошмар',
  'величезний',
  'намертво',
  'годинами',
  'колапс',
];

const LOW_SEVERITY_KEYWORDS = [
  'трохи',
  'невеликий',
  'незначний',
  'маленький',
  'потроху',
  'невелика',
];

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private determineSeverity(normalizedText: string): Severity {
    for (const keyword of HIGH_SEVERITY_KEYWORDS) {
      if (normalizedText.includes(keyword)) {
        return Severity.HIGH;
      }
    }

    for (const keyword of LOW_SEVERITY_KEYWORDS) {
      if (normalizedText.includes(keyword)) {
        return Severity.LOW;
      }
    }

    return Severity.MEDIUM;
  }

  async analyzeMessage(
    text: string,
    channelId: string,
    telegramMsgId: bigint,
  ): Promise<AnalyzedMessage> {
    const normalizedText = this.normalizeText(text);

    const issueType = classifyIssueType(normalizedText);
    const severity = this.determineSeverity(normalizedText);
    const analyzedAt = new Date();

    this.logger.log(
      `Analyzed message ${telegramMsgId}: type=${issueType}, severity=${severity}`,
    );

    const message = await this.prisma.message.upsert({
      where: {
        channelId_telegramMessageId: {
          channelId,
          telegramMessageId: telegramMsgId,
        },
      },
      create: {
        channelId,
        telegramMessageId: telegramMsgId,
        text,
        locations: [],
        issueType,
        severity,
        analyzedAt,
      },
      update: {
        text,
        locations: [],
        issueType,
        severity,
        analyzedAt,
      },
    });

    const result: AnalyzedMessage = {
      id: message.id,
      channelId: message.channelId,
      telegramMessageId: message.telegramMessageId,
      text: message.text,
      issueType: issueType,
      severity: severity,
      analyzedAt,
    };

    this.eventEmitter.emit('message.analyzed', result);

    return result;
  }
}
