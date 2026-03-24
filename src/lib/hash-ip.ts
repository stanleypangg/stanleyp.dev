import { createHash } from 'node:crypto';

export function hashIp(ip: string): string {
  const salt = import.meta.env.IP_SALT;
  if (!salt) throw new Error('IP_SALT environment variable is required');
  return createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .slice(0, 16);
}
