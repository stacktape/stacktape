import { type SecureContext, createSecureContext } from 'node:tls';
import { execFile as execFileCb, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { X509Certificate } from 'node:crypto';
import { homedir } from 'node:os';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  chownSync,
  mkdirpSync,
  readFile,
  writeFile,
  chmod,
  unlink
} from 'fs-extra';

const CA_VALIDITY_DAYS = 3650;
const SERVER_VALIDITY_DAYS = 365;
const EXPIRY_BUFFER_MS = 7 * 24 * 60 * 60 * 1000;
const CA_COMMON_NAME = 'stacktape Dev Local CA';
const OPENSSL_TIMEOUT_MS = 15000;

const CA_KEY_FILE = 'ca-key.pem';
const CA_CERT_FILE = 'ca.pem';
const SERVER_KEY_FILE = 'server-key.pem';
const SERVER_CERT_FILE = 'server.pem';
const HOST_CERTS_DIR = 'host-certs';

const execFileAsync = promisify(execFileCb);

const fixOwnership = (...paths: string[]): void => {
  const uid = process.env.SUDO_UID;
  const gid = process.env.SUDO_GID;
  if (!uid || process.getuid?.() !== 0) return;
  for (const p of paths) {
    try {
      chownSync(p, parseInt(uid, 10), parseInt(gid || uid, 10));
    } catch {}
  }
};

const openssl = (args: string[], options?: { input?: string }): string => {
  try {
    return execFileSync('openssl', args, {
      encoding: 'utf-8',
      timeout: OPENSSL_TIMEOUT_MS,
      input: options?.input,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`openssl failed: ${message}. Install openssl to use HTTPS dev proxy.`);
  }
};

const opensslAsync = async (args: string[]): Promise<string> => {
  try {
    const { stdout } = await execFileAsync('openssl', args, {
      encoding: 'utf-8',
      timeout: OPENSSL_TIMEOUT_MS
    });
    return stdout;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`openssl failed: ${message}. Install openssl to use HTTPS dev proxy.`);
  }
};

const isCertValid = (certPath: string): boolean => {
  try {
    const cert = new X509Certificate(readFileSync(certPath, 'utf-8'));
    const expiry = new Date(cert.validTo).getTime();
    return Date.now() + EXPIRY_BUFFER_MS < expiry;
  } catch {
    return false;
  }
};

const generateCA = (stateDir: string): { certPath: string; keyPath: string } => {
  const keyPath = join(stateDir, CA_KEY_FILE);
  const certPath = join(stateDir, CA_CERT_FILE);

  openssl(['ecparam', '-genkey', '-name', 'prime256v1', '-noout', '-out', keyPath]);
  openssl([
    'req',
    '-new',
    '-x509',
    '-key',
    keyPath,
    '-out',
    certPath,
    '-days',
    CA_VALIDITY_DAYS.toString(),
    '-subj',
    `/CN=${CA_COMMON_NAME}`,
    '-addext',
    'basicConstraints=critical,CA:TRUE',
    '-addext',
    'keyUsage=critical,keyCertSign,cRLSign'
  ]);

  chmodSync(keyPath, 0o600);
  chmodSync(certPath, 0o644);
  fixOwnership(keyPath, certPath);
  return { certPath, keyPath };
};

const generateServerCert = (stateDir: string): { certPath: string; keyPath: string } => {
  const caKeyPath = join(stateDir, CA_KEY_FILE);
  const caCertPath = join(stateDir, CA_CERT_FILE);
  const serverKeyPath = join(stateDir, SERVER_KEY_FILE);
  const serverCertPath = join(stateDir, SERVER_CERT_FILE);
  const csrPath = join(stateDir, 'server.csr');
  const extPath = join(stateDir, 'server-ext.cnf');

  openssl(['ecparam', '-genkey', '-name', 'prime256v1', '-noout', '-out', serverKeyPath]);
  openssl(['req', '-new', '-key', serverKeyPath, '-out', csrPath, '-subj', '/CN=localhost']);

  writeFileSync(
    extPath,
    `${[
      'authorityKeyIdentifier=keyid,issuer',
      'basicConstraints=CA:FALSE',
      'keyUsage=digitalSignature,keyEncipherment',
      'extendedKeyUsage=serverAuth',
      'subjectAltName=DNS:localhost,DNS:*.localhost'
    ].join('\n')}\n`
  );

  openssl([
    'x509',
    '-req',
    '-in',
    csrPath,
    '-CA',
    caCertPath,
    '-CAkey',
    caKeyPath,
    '-CAcreateserial',
    '-out',
    serverCertPath,
    '-days',
    SERVER_VALIDITY_DAYS.toString(),
    '-extfile',
    extPath
  ]);

  try {
    unlinkSync(csrPath);
  } catch {}
  try {
    unlinkSync(extPath);
  } catch {}

  chmodSync(serverKeyPath, 0o600);
  chmodSync(serverCertPath, 0o644);
  fixOwnership(serverKeyPath, serverCertPath);
  return { certPath: serverCertPath, keyPath: serverKeyPath };
};

export const ensureCerts = (
  stateDir: string
): { certPath: string; keyPath: string; caPath: string; caGenerated: boolean } => {
  const caCertPath = join(stateDir, CA_CERT_FILE);
  const caKeyPath = join(stateDir, CA_KEY_FILE);
  const serverCertPath = join(stateDir, SERVER_CERT_FILE);

  let caGenerated = false;
  if (!existsSync(caCertPath) || !existsSync(caKeyPath) || !isCertValid(caCertPath)) {
    generateCA(stateDir);
    caGenerated = true;
  }

  if (caGenerated || !existsSync(serverCertPath) || !isCertValid(serverCertPath)) {
    generateServerCert(stateDir);
  }

  return {
    certPath: serverCertPath,
    keyPath: join(stateDir, SERVER_KEY_FILE),
    caPath: caCertPath,
    caGenerated
  };
};

const getCaThumbprint = (caPath: string): string | null => {
  try {
    const cert = new X509Certificate(readFileSync(caPath, 'utf-8'));
    return cert.fingerprint.replace(/:/g, '').toUpperCase();
  } catch {
    return null;
  }
};

const isCATrustedMacOS = (caPath: string): boolean => {
  const thumbprint = getCaThumbprint(caPath);
  if (!thumbprint) return false;

  try {
    const output = execFileSync('security', ['find-certificate', '-a', '-Z'], {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return output.toUpperCase().includes(thumbprint);
  } catch {
    return false;
  }
};

const getMacLoginKeychainPath = (): string => {
  try {
    const result = execFileSync('security', ['default-keychain'], { encoding: 'utf-8', timeout: 5000 }).trim();
    const match = result.match(/"(.+)"/);
    if (match?.[1]) return match[1];
  } catch {}
  return join(homedir(), 'Library', 'Keychains', 'login.keychain-db');
};

const isCATrustedLinux = (stateDir: string): boolean => {
  const systemCertPath = '/usr/local/share/ca-certificates/stacktape-dev-ca.crt';
  if (!existsSync(systemCertPath)) return false;

  try {
    const ours = readFileSync(join(stateDir, CA_CERT_FILE), 'utf-8').trim();
    const installed = readFileSync(systemCertPath, 'utf-8').trim();
    return ours === installed;
  } catch {
    return false;
  }
};

const isCATrustedWindows = (caPath: string): boolean => {
  const thumbprint = getCaThumbprint(caPath);
  if (!thumbprint) return false;

  const script = [
    `$thumb='${thumbprint}'`,
    '$found=Get-ChildItem -Path Cert:\\CurrentUser\\Root | Where-Object { $_.Thumbprint -eq $thumb }',
    'if ($found) { exit 0 } else { exit 1 }'
  ].join('; ');

  try {
    execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
      stdio: 'pipe',
      timeout: 10000
    });
    return true;
  } catch {
    return false;
  }
};

export const isCATrusted = (stateDir: string): boolean => {
  const caPath = join(stateDir, CA_CERT_FILE);
  if (!existsSync(caPath)) return false;

  if (process.platform === 'darwin') return isCATrustedMacOS(caPath);
  if (process.platform === 'linux') return isCATrustedLinux(stateDir);
  if (process.platform === 'win32') return isCATrustedWindows(caPath);
  return false;
};

export const trustCA = (stateDir: string): { trusted: boolean; error?: string } => {
  const caPath = join(stateDir, CA_CERT_FILE);
  if (!existsSync(caPath)) {
    return { trusted: false, error: 'CA certificate not found. Start dev proxy with HTTPS first.' };
  }

  try {
    if (process.platform === 'darwin') {
      const keychainPath = getMacLoginKeychainPath();
      execFileSync('security', ['add-trusted-cert', '-r', 'trustRoot', '-k', keychainPath, caPath], {
        stdio: 'pipe',
        timeout: 30000
      });
      return { trusted: true };
    }

    if (process.platform === 'linux') {
      const dest = '/usr/local/share/ca-certificates/stacktape-dev-ca.crt';
      copyFileSync(caPath, dest);
      execFileSync('update-ca-certificates', [], { stdio: 'pipe', timeout: 30000 });
      return { trusted: true };
    }

    if (process.platform === 'win32') {
      const script = `Import-Certificate -FilePath '${caPath.replace(/'/g, "''")}' -CertStoreLocation Cert:\\CurrentUser\\Root | Out-Null`;
      execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
        stdio: 'pipe',
        timeout: 30000
      });
      return { trusted: true };
    }

    return { trusted: false, error: `Unsupported platform: ${process.platform}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { trusted: false, error: message };
  }
};

const sanitizeHostForFilename = (hostname: string): string => hostname.replace(/\./g, '_').replace(/[^a-z0-9_-]/gi, '');

const isSimpleLocalhostSubdomain = (hostname: string): boolean => {
  const parts = hostname.split('.');
  return parts.length === 2 && parts[1] === 'localhost';
};

const generateHostCertAsync = async (
  stateDir: string,
  hostname: string
): Promise<{ certPath: string; keyPath: string }> => {
  const caKeyPath = join(stateDir, CA_KEY_FILE);
  const caCertPath = join(stateDir, CA_CERT_FILE);
  const hostDir = join(stateDir, HOST_CERTS_DIR);
  mkdirpSync(hostDir);
  fixOwnership(hostDir);

  const safeName = sanitizeHostForFilename(hostname);
  const keyPath = join(hostDir, `${safeName}-key.pem`);
  const certPath = join(hostDir, `${safeName}.pem`);
  const csrPath = join(hostDir, `${safeName}.csr`);
  const extPath = join(hostDir, `${safeName}-ext.cnf`);

  await opensslAsync(['ecparam', '-genkey', '-name', 'prime256v1', '-noout', '-out', keyPath]);
  await opensslAsync(['req', '-new', '-key', keyPath, '-out', csrPath, '-subj', `/CN=${hostname}`]);

  const sans = [`DNS:${hostname}`];
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    sans.push(`DNS:*.${parts.slice(1).join('.')}`);
  }

  await writeFile(
    extPath,
    `${[
      'authorityKeyIdentifier=keyid,issuer',
      'basicConstraints=CA:FALSE',
      'keyUsage=digitalSignature,keyEncipherment',
      'extendedKeyUsage=serverAuth',
      `subjectAltName=${sans.join(',')}`
    ].join('\n')}\n`
  );

  await opensslAsync([
    'x509',
    '-req',
    '-in',
    csrPath,
    '-CA',
    caCertPath,
    '-CAkey',
    caKeyPath,
    '-CAcreateserial',
    '-out',
    certPath,
    '-days',
    SERVER_VALIDITY_DAYS.toString(),
    '-extfile',
    extPath
  ]);

  try {
    await unlink(csrPath);
  } catch {}
  try {
    await unlink(extPath);
  } catch {}

  await chmod(keyPath, 0o600);
  await chmod(certPath, 0o644);
  fixOwnership(keyPath, certPath);
  return { certPath, keyPath };
};

export const createSNICallback = (
  stateDir: string,
  defaultCert: Buffer,
  defaultKey: Buffer
): ((servername: string, cb: (err: Error | null, ctx?: SecureContext) => void) => void) => {
  const cache = new Map<string, SecureContext>();
  const pending = new Map<string, Promise<SecureContext>>();
  const defaultCtx = createSecureContext({ cert: defaultCert, key: defaultKey });

  return (servername, cb) => {
    if (servername === 'localhost' || isSimpleLocalhostSubdomain(servername)) {
      cb(null, defaultCtx);
      return;
    }

    const cached = cache.get(servername);
    if (cached) {
      cb(null, cached);
      return;
    }

    const safeName = sanitizeHostForFilename(servername);
    const hostDir = join(stateDir, HOST_CERTS_DIR);
    const certPath = join(hostDir, `${safeName}.pem`);
    const keyPath = join(hostDir, `${safeName}-key.pem`);

    if (existsSync(certPath) && existsSync(keyPath) && isCertValid(certPath)) {
      try {
        const ctx = createSecureContext({ cert: readFileSync(certPath), key: readFileSync(keyPath) });
        cache.set(servername, ctx);
        cb(null, ctx);
        return;
      } catch {}
    }

    const existing = pending.get(servername);
    if (existing) {
      existing.then((ctx) => cb(null, ctx)).catch((err) => cb(err instanceof Error ? err : new Error(String(err))));
      return;
    }

    const promise = generateHostCertAsync(stateDir, servername).then(async (generated) => {
      const [cert, key] = await Promise.all([readFile(generated.certPath), readFile(generated.keyPath)]);
      return createSecureContext({ cert, key });
    });

    pending.set(servername, promise);
    promise
      .then((ctx) => {
        cache.set(servername, ctx);
        pending.delete(servername);
        cb(null, ctx);
      })
      .catch((err) => {
        pending.delete(servername);
        cb(err instanceof Error ? err : new Error(String(err)));
      });
  };
};
