import 'dotenv/config';
import * as joi from 'joi';

const envsSchema = joi
  .object({
    PORT: joi.number().default(3200),
    API_PREFIX: joi.string().default('/api/v1'),
    CORS_ORIGIN: joi.string().default('http://localhost:9002'),
    NODE_ENV: joi.string().default('development'),
    DB_HOST: joi.string().required(),
    DB_PORT: joi.string().required(),
    DB_USER: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_NAME: joi.string().required(),

    JWT_ACCESS_SECRET: joi.string().required(),
    JWT_REFRESH_SECRET: joi.string().required(),
    JWT_ACCESS_EXPIRATION: joi.number().default(900),
    JWT_REFRESH_EXPIRATION: joi.number().default(604800),

      AWS_REGION: joi.string().optional().allow(''),
    AWS_S3_BUCKET_IMAGES: joi.string().optional().allow(''),
    AWS_S3_BUCKET_SIGNATURES: joi.string().optional().allow(''),
    AWS_ACCESS_KEY_ID: joi.string().optional().allow(''),
    AWS_SECRET_ACCESS_KEY: joi.string().optional().allow(''),
    S3_PRESIGN_TTL_SECONDS: joi.number().min(1).optional(),
    S3_BUCKET_REGION: joi.string().optional().allow(''),
    S3_BUCKET_NAME: joi.string().optional().allow(''),
    S3_BUCKET_PREFIX: joi.string().optional().allow(''),
    S3_BUCKET_SIGNATURES_PREFIX: joi.string().optional().allow(''),
    BUCKET_SIGNATURES_PREFIX: joi.string().optional().allow(''),
    S3_BUCKET_ACCESS_KEY_ID: joi.string().optional().allow(''),
    S3_BUCKET_SECRET_KEY: joi.string().optional().allow(''),

    OPENAI_API_KEY: joi.string().optional().allow(''),
    OPENAI_MODEL: joi.string().optional().allow(''),
  })
  .unknown(true);

const { error, value } = envsSchema.validate(process.env, {
  abortEarly: false,
});
if (error) throw new Error(`Config validation error: ${error.message}`);

export const envs = {
  port: value.PORT,
  apiPrefix: value.API_PREFIX,
  corsOrigin: String(value.CORS_ORIGIN)
    .split(',')
    .map((o: string) => o.trim()),
  nodeEnv: value.NODE_ENV,
  databaseUrl: value.DATABASE_URL,
  jwtAccessSecret: value.JWT_ACCESS_SECRET,
  jwtRefreshSecret: value.JWT_REFRESH_SECRET,
  jwtAccessExpiration: value.JWT_ACCESS_EXPIRATION,
  jwtRefreshExpiration: value.JWT_REFRESH_EXPIRATION,
  openAiAPIKey: value.OPENAI_API_KEY,
  openAiModel: value.OPENAI_MODEL,
  dbHost: value.DB_HOST,
  dbPort: value.DB_PORT,
  dbUser: value.DB_USER,
  dbPassword: value.DB_PASSWORD,
  dbName: value.DB_NAME,
  bucketRegion:
    (value.S3_BUCKET_REGION as string | undefined) ||
    (value.AWS_REGION as string | undefined),
  bucketName:
    (value.S3_BUCKET_NAME as string | undefined) ||
    (value.AWS_S3_BUCKET_IMAGES as string | undefined),
  bucketPrefix: (value.S3_BUCKET_PREFIX as string | undefined) ?? '',
  bucketSignaturesPrefix:
    (value.S3_BUCKET_SIGNATURES_PREFIX as string | undefined) ??
    (value.BUCKET_SIGNATURES_PREFIX as string | undefined) ??
    'signatures',
  bucketAccessKeyID:
    (value.S3_BUCKET_ACCESS_KEY_ID as string | undefined) ||
    (value.AWS_ACCESS_KEY_ID as string | undefined),
  bucketSecretKey:
    (value.S3_BUCKET_SECRET_KEY as string | undefined) ||
    (value.AWS_SECRET_ACCESS_KEY as string | undefined),

};
