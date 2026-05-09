import { IssueType } from '@prisma/client';

export interface IssueTypeEntry {
  type: IssueType;
  keywords: string[];
}

export const ISSUE_TYPE_DICTIONARY: IssueTypeEntry[] = [
  {
    type: IssueType.TRAFFIC_JAM,
    keywords: [
      'затор',
      'пробка',
      'стоїть',
      'стоїмо',
      'не їде',
      'тягнучка',
      'корок',
      'пробки',
      'затори',
      'стоїм',
    ],
  },
  {
    type: IssueType.ACCIDENT,
    keywords: [
      'дтп',
      'аварія',
      'зіткнення',
      'побились',
      'аварии',
      'зіткнулись',
    ],
  },
  {
    type: IssueType.ROAD_WORK,
    keywords: [
      'ремонт',
      'розкопали',
      'перекрили',
      'перекриття',
      'дорожні роботи',
      'розкопки',
      'ремонтні роботи',
    ],
  },
  {
    type: IssueType.POLICE_CHECKPOINT,
    keywords: [
      'поліція',
      'патруль',
      'блокпост',
      'перевірка',
      'патрульні',
      'копи',
    ],
  },
  {
    type: IssueType.ROAD_CLOSURE,
    keywords: [
      'перекрито',
      'закрито',
      "об'їзд",
      'обїзд',
      'закрита',
      'перекритий',
    ],
  },
];

export function classifyIssueType(normalizedText: string): IssueType {
  for (const entry of ISSUE_TYPE_DICTIONARY) {
    for (const keyword of entry.keywords) {
      if (normalizedText.includes(keyword)) {
        return entry.type;
      }
    }
  }
  return IssueType.OTHER;
}
