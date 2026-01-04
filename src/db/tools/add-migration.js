const path = require('path');
const { spawnSync } = require('child_process');

const migrationName = process.argv[2];
if (!migrationName) {
  console.log('Please provide a migration name');
  process.exit(1);
}

// TypeORM 0.3.x ожидает позиционный аргумент <path>.
// Timestamp добавится автоматически: <timestamp>-<migrationName>.ts
const migrationPath = path.join('src', 'db', 'migrations', migrationName);

const yarnCmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

const result = spawnSync(
  yarnCmd,
  ['typeorm', 'migration:generate', migrationPath],
  {
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
