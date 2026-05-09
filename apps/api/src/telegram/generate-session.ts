/**
 * Скрипт для генерації Telegram session string.
 * Запускайте з кореня api: npx ts-node src/telegram/generate-session.ts
 * Результат збережіть у .env як TELEGRAM_SESSION
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

// Завантажуємо .env з кореня монорепо
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function main() {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    console.error(
      'Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env before running this script.',
    );
    process.exit(1);
  }

  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await prompt('Enter your phone number: '),
    password: async () => await prompt('Enter your 2FA password (if any): '),
    phoneCode: async () => await prompt('Enter the code you received: '),
    onError: (err) => console.error('Error:', err),
  });

  const sessionString = client.session.save() as unknown as string;
  console.log('\n=== Your session string ===');
  console.log(sessionString);
  console.log('\nSave this as TELEGRAM_SESSION in your .env file');

  await client.disconnect();
  rl.close();
}

main().catch(console.error);
