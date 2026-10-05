import { spawn } from 'node:child_process';
import os from 'node:os';
import qrcode from 'qrcode-terminal';

const PORT = 5173;

function lanAddress(): string | undefined {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return undefined;
}

const ip = lanAddress();
if (ip) {
  const url = `http://${ip}:${PORT}/`;
  console.log(`\nOpen on the iPad (same Wi-Fi): ${url}\n`);
  qrcode.generate(url, { small: true });
} else {
  console.log('No LAN address found; use the URL vite prints.');
}

const child = spawn('npx', ['vite', '--host', '--port', String(PORT), '--strictPort'], { stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 0));
