import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { v4 as uuidv4 } from 'uuid';

const RELEASE_LOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
`;

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Attempt to acquire a distributed lock on a resource.
   * @param key Lock resource key (e.g. `seat-lock:show123:seat456`)
   * @param ttlMs Time-to-live for the lock in milliseconds (default 5000ms)
   * @returns lock identifier token if acquired, null if already locked
   */
  async acquireLock(key: string, ttlMs = 5000): Promise<string | null> {
    const client = this.redisService.getClient();
    const token = uuidv4();

    try {
      const result = await client.set(key, token, 'PX', ttlMs, 'NX');
      if (result === 'OK') {
        return token;
      }
      return null;
    } catch (err) {
      this.logger.warn(`Failed to acquire Redis lock for key ${key}: ${err.message}`);
      return null;
    }
  }

  /**
   * Safely release a distributed lock only if the token matches.
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const client = this.redisService.getClient();

    try {
      const result = await client.eval(RELEASE_LOCK_LUA, 1, key, token);
      return result === 1;
    } catch (err) {
      this.logger.warn(`Failed to release Redis lock for key ${key}: ${err.message}`);
      return false;
    }
  }

  /**
   * Atomically acquire locks for multiple seats (e.g. multi-seat hold).
   * If any seat fails to lock, rollback and release all previously acquired locks.
   */
  async acquireMultipleLocks(keys: string[], ttlMs = 5000): Promise<{ [key: string]: string } | null> {
    const acquired: { [key: string]: string } = {};

    for (const key of keys) {
      const token = await this.acquireLock(key, ttlMs);
      if (!token) {
        // Rollback all acquired locks so far
        await this.releaseMultipleLocks(acquired);
        return null;
      }
      acquired[key] = token;
    }

    return acquired;
  }

  /**
   * Release multiple locks given a dictionary of key -> token
   */
  async releaseMultipleLocks(acquiredLocks: { [key: string]: string }): Promise<void> {
    for (const [key, token] of Object.entries(acquiredLocks)) {
      await this.releaseLock(key, token);
    }
  }
}
