import { Inject, Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { APP_CONFIGURATION } from '../configuration/configuration.constants.js';
import { AppConfigurationSchema } from '../../configuration/schema.js';
import { z } from 'zod';

export interface UploadedFileInput {
  originalname: string;
  buffer?: Buffer;
  stream?: NodeJS.ReadableStream;
  size?: number;
}

@Injectable()
export class FileStorageService {
  constructor(
    @Inject(APP_CONFIGURATION) private readonly configuration: z.infer<typeof AppConfigurationSchema>,
  ) {}

  async storeUploadedFile(
    storedFileId: string,
    extension: string,
    file: UploadedFileInput,
  ): Promise<{ sizeBytes: string }> {
    const normalizedExtension = extension.replace(/^\./, '').toLowerCase();
    const destinationPath = path.join(
      this.configuration.fs.path,
      `${storedFileId}.${normalizedExtension}`,
    );

    const fileStream = this.getReadableStream(file);

    return new Promise<{ sizeBytes: string }>((resolve, reject) => {
      let sizeBytes = 0n;
      const writeStream = fs.createWriteStream(destinationPath, { flags: 'wx' });

      fileStream.on('data', (chunk: Buffer) => {
        sizeBytes += BigInt(chunk.length);
      });

      fileStream.on('error', (err) => {
        writeStream.destroy(err);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

      writeStream.on('finish', () => {
        resolve({ sizeBytes: sizeBytes.toString() });
      });

      fileStream.pipe(writeStream);
    });
  }

  private getReadableStream(file: UploadedFileInput): NodeJS.ReadableStream {
    const streamCandidate = file.stream;
    if (streamCandidate) {
      return streamCandidate;
    }

    if (file.buffer) {
      return Readable.from(file.buffer);
    }

    throw new Error('Uploaded file stream is unavailable');
  }
}
