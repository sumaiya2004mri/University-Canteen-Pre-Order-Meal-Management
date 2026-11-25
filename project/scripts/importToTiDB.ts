import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Look for .env in current directory, parent directory, and project subdirectory
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'project', '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', 'project', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', 'project', '.env'),
];

let loadedEnv = false;
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Loaded environment from: ${envPath}`);
    loadedEnv = true;
    break;
  }
}
if (!loadedEnv) {
  dotenv.config();
}

const host = process.env.MYSQL_HOST;
const port = Number(process.env.MYSQL_PORT || 4000);
const user = process.env.MYSQL_USER;
const password = process.env.MYSQL_PASSWORD;
const database = process.env.MYSQL_DATABASE || 'campusbites';

console.log('--- TiDB Cloud Migration Configuration ---');
console.log(`Host:     ${host || '(not set)'}`);
console.log(`Port:     ${port}`);
console.log(`User:     ${user || '(not set)'}`);
console.log(`Database: ${database}`);
console.log(`SSL:      enabled (TLSv1.2, rejectUnauthorized: true)`);
console.log('-------------------------------------------\n');

if (!host || !user) {
  console.error('Error: MYSQL_HOST and MYSQL_USER must be set in your .env file.');
  console.error('Please configure your TiDB Cloud credentials in .env and run this script again.');
  process.exit(1);
}

// Locate database/ folder
const dbCandidates = [
  path.resolve(process.cwd(), 'database'),
  path.resolve(__dirname, '..', 'database'),
  path.resolve(__dirname, '..', '..', 'database'),
];

let databaseDir: string | null = null;
for (const dir of dbCandidates) {
  if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    databaseDir = dir;
    break;
  }
}

if (!databaseDir) {
  console.error('Error: Could not locate database/ directory containing .sql migrations.');
  process.exit(1);
}

console.log(`Using migrations directory: ${databaseDir}\n`);

// Transform PostgreSQL constructs to standard MySQL / TiDB compatible syntax
function transformPostgresToMySQL(sql: string): string {
  let transformed = sql;

  // Identity columns
  transformed = transformed.replace(/BIGINT\s+GENERATED\s+BY\s+DEFAULT\s+AS\s+IDENTITY\s+PRIMARY\s+KEY/gi, 'BIGINT AUTO_INCREMENT PRIMARY KEY');
  transformed = transformed.replace(/INT\s+GENERATED\s+BY\s+DEFAULT\s+AS\s+IDENTITY\s+PRIMARY\s+KEY/gi, 'INT AUTO_INCREMENT PRIMARY KEY');
  transformed = transformed.replace(/BIGINT\s+GENERATED\s+BY\s+DEFAULT\s+AS\s+IDENTITY/gi, 'BIGINT AUTO_INCREMENT');
  transformed = transformed.replace(/INT\s+GENERATED\s+BY\s+DEFAULT\s+AS\s+IDENTITY/gi, 'INT AUTO_INCREMENT');
  transformed = transformed.replace(/GENERATED\s+BY\s+DEFAULT\s+AS\s+IDENTITY/gi, 'AUTO_INCREMENT');

  // Timestamps and JSON
  transformed = transformed.replace(/\bTIMESTAMPTZ\b/gi, 'TIMESTAMP');
  transformed = transformed.replace(/\bJSONB\b/gi, 'JSON');

  // Table alter syntax
  transformed = transformed.replace(/ALTER\s+TABLE\s+IF\s+EXISTS/gi, 'ALTER TABLE');

  // Interval syntax (e.g. INTERVAL '5 hour' -> INTERVAL 5 HOUR)
  transformed = transformed.replace(/INTERVAL\s+'(\d+)\s*hour'/gi, 'INTERVAL $1 HOUR');

  // Remove Postgres typecasts like ::jsonb, ::text, ::TEXT
  transformed = transformed.replace(/::(?:jsonb|json|text|TEXT)/gi, '');

  // ON CONFLICT ... DO NOTHING -> MySQL INSERT IGNORE
  if (/ON\s+CONFLICT/i.test(transformed)) {
    transformed = transformed.replace(/INSERT\s+INTO/gi, 'INSERT IGNORE INTO');
    transformed = transformed.replace(/ON\s+CONFLICT\s*(\([^)]*\))?\s*DO\s+NOTHING/gi, '');
  }

  return transformed;
}

// Split multi-statement SQL script into individual executable statements
function splitStatements(content: string): string[] {
  const statements: string[] = [];
  const lines = content.split(/\r?\n/);
  let current = '';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('--') || trimmed.length === 0) {
      continue;
    }

    current += rawLine + '\n';
    if (trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

async function run() {
  let connection: mysql.Connection | null = null;
  try {
    console.log('Connecting to TiDB Cloud with SSL...');
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true,
      },
      multipleStatements: true,
    });
    console.log('Connected successfully!\n');

    console.log(`Ensuring database '${database}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.query(`USE \`${database}\`;`);
    console.log(`Using database '${database}'.\n`);

    const files = fs
      .readdirSync(databaseDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`Found ${files.length} SQL migration files:`);
    files.forEach((f) => console.log(`  - ${f}`));
    console.log('\n--- Executing migrations ---');

    for (const file of files) {
      console.log(`\nProcessing: ${file}`);
      const filePath = path.join(databaseDir, file);
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const transformedContent = transformPostgresToMySQL(rawContent);
      const stmts = splitStatements(transformedContent);

      for (let i = 0; i < stmts.length; i++) {
        const stmt = stmts[i].replace(/;$/, '').trim();
        if (!stmt) continue;

        // Skip Postgres PL/pgSQL routines or Postgres RLS policies not supported by MySQL/TiDB
        if (
          stmt.toUpperCase().includes('ENABLE ROW LEVEL SECURITY') ||
          stmt.toUpperCase().includes('CREATE POLICY') ||
          stmt.toUpperCase().includes('LANGUAGE PLPGSQL') ||
          stmt.toUpperCase().includes('AUTH.UID()') ||
          stmt.toUpperCase().includes('PLACE_ORDER(') ||
          stmt.toUpperCase().includes('CANCEL_ORDER(')
        ) {
          console.log(`  [SKIP Postgres-only] ${stmt.slice(0, 60).replace(/\n/g, ' ')}...`);
          continue;
        }

        try {
          await connection.query(stmt);
          const preview = stmt.slice(0, 70).replace(/\s+/g, ' ');
          console.log(`  [OK] ${preview}...`);
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          // Common non-fatal warnings (e.g. duplicate key/column or table already exists)
          if (
            errMsg.includes('already exists') ||
            errMsg.includes('Duplicate column') ||
            errMsg.includes('Duplicate key') ||
            errMsg.includes('Duplicate entry')
          ) {
            console.log(`  [NOTE] ${errMsg}`);
          } else {
            console.warn(`  [WARN] ${errMsg} in: ${stmt.slice(0, 60).replace(/\n/g, ' ')}`);
          }
        }
      }
    }

    console.log('\n--- Migration Finished Successfully! ---');

    // List all tables created in the database
    const [rows] = await connection.query('SHOW TABLES;');
    console.log(`Tables in ${database}:`);
    console.table(rows);
  } catch (error: any) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

run();
