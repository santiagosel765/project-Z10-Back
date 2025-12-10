import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { envs } from 'src/config/envs';
import { Readable } from 'stream';

type UploadOptions = {
  keyPrefix?: string;
  contentType?: string;
  customKey?: string;
};

@Injectable()
export class AwsService {
  private readonly logger: Logger = new Logger(AwsService.name);

  private readonly s3Client: S3Client = new S3Client({
    region: envs.bucketRegion!,
    credentials: {
      accessKeyId: envs.bucketAccessKeyID!,
      secretAccessKey: envs.bucketSecretKey!,
    },
  });

  private resolveFileKey(fileNameOrKey: string, fileExtension = 'jpg'): string {
    if (!fileNameOrKey) {
      throw new Error('fileNameOrKey es requerido para resolver el S3 key');
    }

    if (fileNameOrKey.includes('/')) {
      return fileNameOrKey;
    }

    const normalizedBase = fileNameOrKey.replace(/\.pdf$/i, '');
    return `${envs.bucketPrefix}/${normalizedBase}.${fileExtension}`;
  }

  private async bodyToReadable(body: any): Promise<Readable> {
    if (body instanceof Readable) {
      return body;
    }

    if (!body) {
      throw new Error('No se pudo procesar el stream del archivo S3');
    }

    if (Buffer.isBuffer(body)) {
      return Readable.from(body);
    }

    if (body instanceof Uint8Array) {
      return Readable.from(body);
    }

    if (typeof body?.transformToByteArray === 'function') {
      const byteArray = await body.transformToByteArray();
      return Readable.from(Buffer.from(byteArray));
    }

    if (typeof body?.stream === 'function') {
      const webStream = body.stream();
      if (webStream) {
        if (typeof (Readable as any).fromWeb === 'function') {
          return (Readable as any).fromWeb(webStream);
        }
        return Readable.from(webStream as any);
      }
    }

    if (typeof body?.[Symbol.asyncIterator] === 'function') {
      return Readable.from(body as AsyncIterable<Uint8Array>);
    }

    throw new Error('No se pudo procesar el stream del archivo S3');
  }

  /**
   * Sube un archivo al bucket S3 configurado.
   *
   * Este método:
   * 1. Usa el cliente S3 para subir el archivo recibido como buffer al bucket y prefijo definidos en las variables de entorno.
   * 2. El nombre del archivo en S3 será `${bucketPrefix}/${fileName}.${fileExtension}`.
   * 3. Registra en logs el resultado de la operación.
   *
   * @param fileBuffer - Archivo a subir como Buffer, Uint8Array o Readable stream.
   * @param fileName - Nombre base con el que se guardará el archivo en S3 (sin extensión).
   * @param fileExtension - Extensión del archivo (por defecto "pdf").
   * @returns Un objeto con la clave del archivo (`fileKey`) si la subida fue exitosa, o un objeto con estado `error` y mensaje descriptivo si falla.
   */

  async uploadFile(
    fileBuffer: Buffer | Uint8Array | Readable,
    fileName: string,
    fileExtension = 'jpg',
    opts: UploadOptions = {},
    traceId?: string,
  ) {
    if (!fileBuffer) {
      throw new Error('uploadFile: file es null/undefined');
    }

    let body: Buffer | Uint8Array | Readable = fileBuffer;
    let sizeDescription: string | number = 'stream';
    let typeDescription = 'Readable';

    if (Buffer.isBuffer(fileBuffer)) {
      if (fileBuffer.length === 0) {
        throw new Error('uploadFile: buffer vacío');
      }
      sizeDescription = fileBuffer.length;
      body = fileBuffer;
      typeDescription = 'Buffer';
    } else if (fileBuffer instanceof Uint8Array) {
      if (fileBuffer.length === 0) {
        throw new Error('uploadFile: buffer vacío');
      }
      sizeDescription = fileBuffer.length;
      body = Buffer.from(fileBuffer);
      typeDescription = 'Uint8Array';
    } else if (fileBuffer instanceof Readable) {
      const readableLength = (fileBuffer as any).readableLength;
      if (typeof readableLength === 'number' && readableLength === 0) {
        throw new Error('uploadFile: readable vacío');
      }
      sizeDescription =
        typeof readableLength === 'number' ? readableLength : 'stream';
      body = fileBuffer;
      typeDescription = 'Readable';
    } else {
      throw new Error('uploadFile: tipo de archivo no soportado');
    }

    const key =
      opts.customKey ??
      `${opts.keyPrefix ?? envs.bucketPrefix}/${fileName}.${fileExtension}`;

    const traceLabel = traceId ?? 'signTrace-unknown';

    this.logger.log(
      `[${traceLabel}] aws.upload | key=${key} | type=${typeDescription} | length=${sizeDescription}`,
    );

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: envs.bucketName,
          Key: key,
          Body: body,
          ContentType: opts.contentType,
        }),
      );
    } catch (error) {
      this.logger.error(
        `[${traceLabel}] aws.upload.error | key=${key} | msg=${
          (error as Error)?.message ?? error
        }`,
        (error as Error)?.stack,
      );
      throw error;
    }

    this.logger.log(`[${traceLabel}] aws.upload.success | key=${key}`);

    return { fileKey: key };
  }
  /**
   * Genera una URL prefirmada (presigned URL) para acceder temporalmente a un archivo en S3.
   *
   * Este método:
   * 1. Construye la clave del archivo (`fileKey`) usando el prefijo, nombre y extensión.
   * 2. Crea un comando `GetObjectCommand` para el archivo especificado.
   * 3. Genera una URL prefirmada con tiempo de expiración (por defecto 3000 segundos).
   * 4. Si ocurre un error, lo registra en logs y retorna un mensaje de error.
   *
   * @param fileName - Nombre base del archivo en S3 (sin extensión).
   * @param fileExtension - Extensión del archivo (por defecto "pdf").
   * @param expireTime - Tiempo de expiración de la URL en segundos (por defecto 3600 = 1 hora).
   * @returns Un objeto con el estado (`success` o `error`) y la URL prefirmada o el mensaje de error.
   */
  async getPresignedURL(
    fileName: string,
    fileExtension: string = 'pdf',
    expireTime?: number,
  ) {
    const requestedTtl = Number.isFinite(expireTime)
      ? Number(expireTime)
      : undefined;
    const ttlSeconds = requestedTtl
      ? Math.max(600, Math.min(1800, Math.round(requestedTtl)))
      : Math.max(600, 30 * 60);

    const fileKey = this.resolveFileKey(fileName, fileExtension);
    const normalizedFileName = `${fileName.replace(/\.pdf$/i, '')}.pdf`;

    const command = new GetObjectCommand({
      Bucket: envs.bucketName,
      Key: fileKey,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `inline; filename="${normalizedFileName}"`,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: ttlSeconds,
      });

      return {
        status: 'success',
        data: url,
      };
    } catch (error) {
      const errMsg = `Problemas al obtener url del archivo "${fileKey}" al bucket. Error: ${error}`;
      this.logger.error(errMsg);
      return {
        status: 'success',
        data: errMsg,
      };
    }
  }

  async getPresignedURLByKey(
    fileKey: string,
    responseContentType = 'application/octet-stream',
    expireTime = 3600,
  ) {
    const command = new GetObjectCommand({
      Bucket: envs.bucketName,
      Key: fileKey,
      ResponseContentType: responseContentType,
    });
    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: expireTime,
    });
    return { status: 'success', data: url };
  }

  async getPresignedGetUrl(
    fileKey: string,
    expireTime = 3600,
  ): Promise<string | null> {
    const command = new GetObjectCommand({
      Bucket: envs.bucketName,
      Key: fileKey,
    });
    try {
      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expireTime,
      });
    } catch (error) {
      this.logger.error(
        `No fue posible generar URL prefirmada para ${fileKey}: ${error}`,
      );
      return null;
    }
  }

  async getPublicOrPresignedUrl(raw?: string | null): Promise<string | null> {
    if (!raw || !raw.trim()) return null;
    const value = raw.trim();

    if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        const url = new URL(value);
        const hasSignedParams = Array.from(url.searchParams.keys()).some((k) =>
          k.toLowerCase().startsWith('x-amz-'),
        );

        if (hasSignedParams) {
          return `${url.origin}${url.pathname}`;
        }

        return value;
      } catch {
        return value;
      }
    }

    return (await this.getPresignedGetUrl(value)) ?? null;
  }
  /**
   * Verifica si un archivo existe en el bucket S3 configurado.
   *
   * Este método:
   * 1. Envía un comando `HeadObject` a S3 para comprobar la existencia del archivo especificado por `fileName` (incluyendo el prefijo).
   * 2. Si el archivo existe, retorna `true`.
   * 3. Si el archivo no existe o ocurre un error, registra el error en logs y retorna `false`.
   *
   * @param fileName - Nombre del archivo en S3 (debe de contener extensión (ej: .pdf, .png)).
   * @returns `true` si el archivo existe en el bucket, `false` en caso contrario.
   */
  async checkFileAvailabilityInBucket(fileKey: string) {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: envs.bucketName,
          Key: fileKey,
        }),
      );

      return true;
    } catch (error) {
      this.logger.error(
        `No fue posible encontrar el archivo ${fileKey} en el bucket.`,
      );
      return false;
    }
  }

  async getFileBuffer(
    fileNameOrKey: string,
    fileExtension: string = 'pdf',
  ): Promise<Buffer> {
    const fileKey = this.resolveFileKey(fileNameOrKey, fileExtension);
    this.logger.log(`Recurso "${fileKey}" encontrado`);
    return this.getFileBufferByKey(fileKey);
  }

  async getFileBufferByKey(fileKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: envs.bucketName,
      Key: fileKey,
    });
    const response = await this.s3Client.send(command);

    if (response.Body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } else if (Buffer.isBuffer(response.Body)) {
      return response.Body;
    } else if (typeof response.Body?.transformToByteArray === 'function') {
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } else {
      throw new Error('No se pudo procesar el stream del archivo S3');
    }
  }

  async getFileStream(
    fileNameOrKey: string,
    options: { range?: string; fileExtension?: string } = {},
  ): Promise<{
    stream: Readable;
    contentType?: string;
    contentLength?: number;
    contentRange?: string;
    acceptRanges?: string;
    lastModified?: Date;
    isPartial: boolean;
  }> {
    const { range, fileExtension = 'pdf' } = options;
    const fileKey = this.resolveFileKey(fileNameOrKey, fileExtension);

    const command = new GetObjectCommand({
      Bucket: envs.bucketName,
      Key: fileKey,
      ...(range ? { Range: range } : {}),
    });

    const response = await this.s3Client.send(command);
    const stream = await this.bodyToReadable(response.Body);

    return {
      stream,
      contentType: response.ContentType ?? undefined,
      contentLength:
        typeof response.ContentLength === 'number'
          ? response.ContentLength
          : undefined,
      contentRange: response.ContentRange,
      acceptRanges: response.AcceptRanges ?? undefined,
      lastModified: response.LastModified,
      isPartial:
        response.$metadata.httpStatusCode === HttpStatus.PARTIAL_CONTENT,
    };
  }
}
