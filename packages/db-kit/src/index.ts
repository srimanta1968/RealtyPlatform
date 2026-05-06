import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface CreateDataServiceOptions {
  databaseUrl: string;
  poolMin?: number;
  poolMax?: number;
  ssl?: boolean;
}

export interface DataService<TSchema extends Record<string, unknown> = Record<string, never>> {
  /** Drizzle-typed handle. Use this for application code. */
  readonly db: NodePgDatabase<TSchema>;
  /** Underlying pg pool — escape hatch for raw SQL or migrations. */
  readonly pool: Pool;
  /** Run a parameterized SQL query against the shared pool. */
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  /** Quick liveness probe — `SELECT 1`. */
  ping(): Promise<void>;
  /** Close the connection pool (used during shutdown / tests). */
  close(): Promise<void>;
}

/**
 * Create a DataService bound to a single PostgreSQL database. Each microservice
 * owns its DB and instantiates exactly one DataService at boot.
 */
export function createDataService<TSchema extends Record<string, unknown> = Record<string, never>>(
  options: CreateDataServiceOptions,
  schema?: TSchema,
): DataService<TSchema> {
  const poolConfig: PoolConfig = {
    connectionString: options.databaseUrl,
    min: options.poolMin ?? 2,
    max: options.poolMax ?? 10,
    ssl: options.ssl ? { rejectUnauthorized: false } : undefined,
  };

  const pool = new Pool(poolConfig);
  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });

  const db = drizzle(pool, { schema: schema ?? ({} as TSchema) });

  return {
    db,
    pool,
    async query<T extends QueryResultRow = QueryResultRow>(
      text: string,
      params?: unknown[],
    ): Promise<QueryResult<T>> {
      return pool.query<T>(text, params as unknown[]);
    },
    async ping(): Promise<void> {
      await pool.query('SELECT 1');
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

export type { NodePgDatabase } from 'drizzle-orm/node-postgres';
