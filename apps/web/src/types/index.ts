export interface User {
  id: string;
  email: string;
  ttsEnabled: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface Route {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  locations: RouteLocation[];
}

export interface RouteLocation {
  id: string;
  routeId: string;
  name: string;
  nameNorm: string;
  type: LocationType;
  orderIndex: number;
}

export type LocationType =
  | 'STREET'
  | 'LANDMARK'
  | 'INTERSECTION'
  | 'HIGHWAY'
  | 'DISTRICT';

export type IssueType =
  | 'TRAFFIC_JAM'
  | 'ACCIDENT'
  | 'ROAD_WORK'
  | 'POLICE_CHECKPOINT'
  | 'ROAD_CLOSURE'
  | 'OTHER';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TelegramChannel {
  id: string;
  channelUsername: string;
  name: string;
  isActive: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  text: string;
  locations: string[];
  issueType: IssueType | null;
  severity: Severity;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  routeId: string;
  messageId: string;
  locationMatch: string;
  issueType: IssueType | null;
  severity: Severity;
  isRead: boolean;
  createdAt: string;
  message?: Message;
  route?: Route;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRouteDto {
  name: string;
  locations: {
    name: string;
    type: LocationType;
    orderIndex: number;
  }[];
}
