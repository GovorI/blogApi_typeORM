const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const migrationName = process.argv[2];
if (!migrationName) {
  console.log('Please provide a migration name');
  process.exit(1);
}

// Ensure migrations directory exists
const migrationsDir = path.join('src', 'db', 'migrations');
fs.mkdirSync(migrationsDir, { recursive: true });

// Build POSIX-like path for TypeORM positional arg
const rawPath = path.join('src', 'db', 'migrations', migrationName);
const migrationPath = rawPath.replace(/\\/g, '/');

// Resolve local TypeORM CLI binary
const isWin = process.platform === 'win32';
const cliPath = isWin
  ? path.join(process.cwd(), 'node_modules', '.bin', 'typeorm-ts-node-commonjs.cmd')
  : path.join(process.cwd(), 'node_modules', '.bin', 'typeorm-ts-node-commonjs');

// Fallback to 'typeorm' if direct binary not found
const cmd = fs.existsSync(cliPath) ? cliPath : (isWin ? 'typeorm-ts-node-commonjs.cmd' : 'typeorm-ts-node-commonjs');

const args = ['-d', 'src/db/data-source.ts', 'migration:generate', migrationPath];

console.log(`[add-migration] Running: ${cmd} ${args.join(' ')}`);

const result = spawnSync(cmd, args, { stdio: 'inherit', shell: isWin });

process.exit(result.status ?? 1);
