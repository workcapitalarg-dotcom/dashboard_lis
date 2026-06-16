import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const result: Record<string, string> = {};

  content.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      val = val.replace(/\\n/g, '\n');
      result[key] = val;
    }
  });

  return result;
}

export function getGoogleCredentials() {
  // 1. Try reading from process.env (Vercel production environment)
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  // 2. Local fallback: read manually from .env.local to avoid Next.js key corruption
  const envLocal = loadEnvLocal();
  if (envLocal['GOOGLE_SERVICE_ACCOUNT_EMAIL']) {
    email = envLocal['GOOGLE_SERVICE_ACCOUNT_EMAIL'];
  }
  if (envLocal['GOOGLE_PRIVATE_KEY']) {
    privateKey = envLocal['GOOGLE_PRIVATE_KEY'];
  }

  if (privateKey) {
    // Standardize escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return { email, privateKey };
}
