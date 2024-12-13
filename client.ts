#!/usr/bin/env node

import { Api, TelegramClient } from 'telegram';
import { StoreSession } from 'telegram/sessions';
import { TelegramClientParams } from 'telegram/client/telegramBaseClient';
import { createInterface } from 'readline';
import { apiHash, apiId, phoneNumber } from './env';
import User = Api.User;

const input = (question: string, options?: string[]): Promise<string> => {
  return new Promise((resolve) => {
    let label: string = `${question}\n`;
    options?.forEach((option: string, index: number) => label += `${index}) ${option}\n`);
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    readline.question(label, (answer: string) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

class Client {
  async main(): Promise<void> {
    const session: StoreSession = new StoreSession('auth');
    const params: TelegramClientParams = {
      connectionRetries: 5,
    };
    console.log('Starting Telegram client...');
    const client: TelegramClient = new TelegramClient(session, apiId, apiHash, params);
    await client.start({
      phoneNumber: async () => phoneNumber,
      phoneCode: async () => await input('Enter OTP:'),
      password: async () => await input('Enter 2AF:'),
      onError: (err: Error) => console.error(err),
    });
    client.session.save();
    console.log('Connected to Telegram!');
    const me: User = await client.getMe();
    console.log({
      id: me.id,
      username: me.username,
    });
    await client.disconnect();
    console.log('Client disconnected.');
  }
}

new Client()
  .main()
  .catch((err: Error) => console.error(err));
