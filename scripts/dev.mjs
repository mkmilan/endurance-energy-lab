import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Sites passes Vite-style host and port flags to every development server.
const args = process.argv.slice(2).filter(arg => arg !== '--strictPort')
  .map(arg => arg === '--host' ? '--hostname' : arg);
const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--webpack', ...args], {stdio:'inherit'});
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>server.kill(signal));
server.on('exit', code=>process.exit(code ?? 0));
