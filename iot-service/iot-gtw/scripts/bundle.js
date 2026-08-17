/* eslint-disable */
/**
 * Bundle the compiled NestJS gateway (dist/, emitted by `nest build` so that
 * decorator metadata is preserved) into ONE self-contained minified JS file.
 *
 * Output is used for on-prem client installs (release repo): the client server
 * only needs `node`, no node_modules / npm install / source code.
 *
 * Usage: node scripts/bundle.js [outDir]   (default: bundle/)
 */
const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const outDir = path.resolve(process.argv[2] || 'bundle');
fs.mkdirSync(outDir, { recursive: true });

// Optional peer deps that Nest / TypeORM / mqtt / pg `require()` lazily but we
// never install or use. Marking them external leaves the require() call in place;
// it only fires (and would fail) if that feature is actually used.
const externals = [
  '@nestjs/microservices',
  '@nestjs/microservices/microservices-module',
  '@nestjs/websockets',
  '@nestjs/websockets/socket-module',
  '@nestjs/platform-socket.io',
  '@nestjs/platform-fastify',
  '@fastify/static',
  '@fastify/view',
  'class-transformer/storage',
  'cache-manager',
  // pg optional native binding
  'pg-native',
  // ws optional native accelerators
  'bufferutil',
  'utf-8-validate',
  // typeorm optional drivers (loaded dynamically; only postgres is used)
  'mysql', 'mysql2', 'oracledb', 'mssql', 'sqlite3', 'better-sqlite3', 'sql.js',
  'mongodb', 'redis', 'ioredis', 'hdb-pool', '@sap/hana-client', '@sap/hana-client/extension/Stream',
  'react-native-sqlite-storage', 'typeorm-aurora-data-api-driver', '@google-cloud/spanner',
  'pg-query-stream',
];

const entries = {
  main: 'dist/main.js',
  'broadcast-main': 'dist/broadcast-main.js',
};

(async () => {
  for (const [name, entry] of Object.entries(entries)) {
    if (!fs.existsSync(entry)) {
      console.warn(`skip ${name}: ${entry} not found (run \`npm run build\` first)`);
      continue;
    }
    const outfile = path.join(outDir, `${name}.js`);
    await esbuild.build({
      entryPoints: [entry],
      bundle: true,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      minify: true,
      keepNames: true, // Nest Logger contexts use class names
      sourcemap: false,
      legalComments: 'none',
      external: externals,
      outfile,
      logLevel: 'warning',
      logOverride: {
        // TypeORM/Nest use `require(variable)` for optional packages — expected.
        'require-resolve-not-external': 'silent',
        'unsupported-require-call': 'silent',
      },
    });
    const kb = Math.round(fs.statSync(outfile).size / 1024);
    console.log(`bundled ${entry} -> ${outfile} (${kb} KB)`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
