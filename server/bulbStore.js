import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BULB_FILE = path.join(__dirname, '..', 'bulb-directory.json');

class BulbStore {
  constructor() {
    this.bulbs = new Map();
    this.loaded = false;
  }

  async load() {
    try {
      const data = await fs.readFile(BULB_FILE, 'utf-8');
      const bulbArray = JSON.parse(data);

      for (const bulb of bulbArray) {
        this.bulbs.set(bulb.id, {
          id: bulb.id,
          name: bulb.name || bulb.id,
          lastSeen: bulb.lastSeen || null,
          lastIp: bulb.lastIp || null,
          online: false
        });
      }
      this.loaded = true;
      console.log(`Loaded ${this.bulbs.size} bulbs from ${BULB_FILE}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('bulb-directory.json not found, starting with empty store');
        this.loaded = true;
      } else {
        console.error('Error loading bulb directory:', error.message);
        throw error;
      }
    }
  }

  async save() {
    const bulbArray = Array.from(this.bulbs.values()).map(bulb => ({
      id: bulb.id,
      name: bulb.name,
      lastSeen: bulb.lastSeen,
      lastIp: bulb.lastIp
    }));

    await fs.writeFile(BULB_FILE, JSON.stringify(bulbArray, null, 2));
    console.log(`Saved ${bulbArray.length} bulbs to ${BULB_FILE}`);
  }

  updateBulb(id, ip) {
    const existing = this.bulbs.get(id);
    const now = new Date().toISOString();

    if (existing) {
      existing.lastSeen = now;
      existing.lastIp = ip;
      existing.online = true;
    } else {
      this.bulbs.set(id, {
        id,
        name: id,
        lastSeen: now,
        lastIp: ip,
        online: true
      });
    }
  }

  markAllOffline() {
    for (const bulb of this.bulbs.values()) {
      bulb.online = false;
    }
  }

  updateName(id, name) {
    const bulb = this.bulbs.get(id);
    if (bulb) {
      bulb.name = name;
      return true;
    }
    return false;
  }

  getBulb(id) {
    return this.bulbs.get(id);
  }

  getAllBulbs() {
    return Array.from(this.bulbs.values());
  }

  getOnlineBulbs() {
    return this.getAllBulbs().filter(bulb => bulb.online);
  }
}

export const bulbStore = new BulbStore();
