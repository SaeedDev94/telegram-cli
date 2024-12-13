#!/usr/bin/env node

import { createWriteStream } from 'fs';
import { createInterface } from 'readline';
import { TelegramClient } from 'telegram';
import { StoreSession } from 'telegram/sessions';
import { TelegramClientParams } from 'telegram/client/telegramBaseClient';
import { apiHash, apiId, phoneNumber } from './env';

class Client {

  async main(args: string[]): Promise<void> {
    console.log('Starting Telegram client...');
    await client.start({
      phoneNumber: async () => phoneNumber,
      phoneCode: async () => await input('Enter OTP:'),
      password: async () => await input('Enter 2AF:'),
      onError: (err: Error) => console.error(err),
    });
    client.session.save();
    console.log('Connected to Telegram!');
    const me = await client.getMe();
    console.log({
      id: me.id,
      username: me.username,
    });
    switch (args[0]) {
      case 'media':
        await this.media(new URL(args[1]));
        break;
    }
  }

  private async media(link: URL) {
    const parts = link.pathname.split('/').slice(1);
    const entity = await client.getEntity(parts[0]);
    const messages = await client.getMessages(entity, {
      ids: Number(parts[1]),
    });
    if (!messages.length) throw new Error(`No messages found for ${link.toString()}`);
    for (const message of messages) {
      if (!message.media) {
        console.warn(`Message #${message.id} has no media!`);
        return;
      }
      console.log(`Downloading #${message.id} media:`);
      const path = mediaPath(message.id);
      await client.downloadMedia(message.media, {
        outputFile: createWriteStream(path),
        progressCallback: (downloaded, total) => {
          const progress = downloaded.multiply(100).divide(total);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(`${progress}%`);
        },
      });
      process.stdout.write('\n');
      console.log(`#${message.id} downloaded successfully: ${path}`);
    }
  }

}

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
};

const session: StoreSession = new StoreSession('auth');
const params: TelegramClientParams = {
  connectionRetries: 5,
};
const client: TelegramClient = new TelegramClient(session, apiId, apiHash, params);
const disconnect = async () => {
  await client.disconnect();
  console.log('Client disconnected.');
};
const mediaPath = (name: any) => `${__dirname}/media/${name}`;

new Client()
  .main(process.argv.slice(2))
  .then(async () => {
    await disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await disconnect();
  });
