// Offline readiness report. Does not load secrets, install tools, or make requests.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { binaries } from './media.mjs';

const fixture = JSON.parse(readFileSync(new URL('./scene.json', import.meta.url), 'utf8'));
if (fixture.visualKind !== 'ai-generated-footage' || fixture.paidCallsAllowed !== false || fixture.incrementalSpendCapINR !== 0) {
  throw new Error('Prototype must require actual footage and prohibit paid calls.');
}
const checks = [['node', ['--version']], ['python3', ['--version']], [binaries.ffmpeg, ['-version']], [binaries.ffprobe, ['-version']]];
let missing = false;
for (const [command, args] of checks) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 5000 });
  const available = !result.error && result.status === 0;
  if (!available) missing = true;
  const version = available ? (result.stdout || result.stderr).trim().split('\n')[0] : 'not available on PATH';
  console.log(`${command.includes('ffprobe') ? 'ffprobe' : command.includes('ffmpeg') ? 'ffmpeg' : command}: ${version}`);
}
console.log('Secrets: not read or printed. Configure locally before an authorized API test.');
console.log('Video provider: not configured or validated.');
console.log('Voice availability/commercial rights: not validated.');
console.log('Generation: BLOCKED until provider access and required tools are validated.');
console.log('Paid requests: DISABLED; incremental service-spend ceiling ₹0.');
process.exitCode = missing ? 2 : 0;
