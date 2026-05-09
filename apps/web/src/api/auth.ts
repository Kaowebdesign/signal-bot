import client from './client';
import type { AuthResponse, User } from '../types';

export async function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/api/auth/register', {
    email,
    password,
  });
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/api/auth/login', {
    email,
    password,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await client.get<User>('/api/auth/me');
  return data;
}
