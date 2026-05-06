import { z } from 'zod';

export const ServiceConfigSchema = z.object({
  service: z.string().min(1),
  port: z.coerce.number().int().positive().default(3000),
  host: z.string().default('0.0.0.0'),
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  jwtSecret: z.string().min(16),
  jwtExpiresIn: z.string().default('7d'),
  databaseUrl: z.string().min(1),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000']),
});

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export interface LoadServiceConfigOptions {
  service: string;
  defaultPort: number;
}

/** Read configuration from process.env and validate it via Zod. */
export function loadServiceConfig(options: LoadServiceConfigOptions): ServiceConfig {
  const corsRaw = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  return ServiceConfigSchema.parse({
    service: options.service,
    port: process.env.PORT ?? options.defaultPort,
    host: process.env.HOST ?? '0.0.0.0',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    logLevel: process.env.LOG_LEVEL ?? 'info',
    jwtSecret: process.env.JWT_SECRET ?? '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    databaseUrl: process.env.DATABASE_URL ?? buildPgUrlFromParts(),
    corsOrigins: corsRaw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  });
}

function buildPgUrlFromParts(): string {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = process.env.DB_PORT ?? '5432';
  const user = process.env.DB_USER ?? 'postgres';
  const pass = process.env.DB_PASSWORD ?? 'postgres';
  const name = process.env.DB_NAME ?? 'kiana_realty_growth_platform_db';
  const ssl = process.env.DB_SSL === 'true' ? '?sslmode=require' : '';
  return `postgresql://${user}:${pass}@${host}:${port}/${name}${ssl}`;
}
