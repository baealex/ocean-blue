import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const CONFIG_DIR_MODE = 0o700;
const CONFIG_FILE_MODE = 0o600;

interface ConfigData {
  apiKey?: string;
  deviceId: string;
  lastUsed?: string;
}

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private config: ConfigData;

  constructor() {
    this.configDir = path.join(os.homedir(), '.ocean-blue');
    this.configPath = path.join(this.configDir, 'config.json');
    this.migrateFromLegacy();
    this.config = this.loadConfig();
  }

  private ensureSecureDirectory(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true, mode: CONFIG_DIR_MODE });
    }

    this.applyPermissions(this.configDir, CONFIG_DIR_MODE);
  }

  private applyPermissions(targetPath: string, mode: number): void {
    if (process.platform === 'win32') {
      return;
    }

    try {
      fs.chmodSync(targetPath, mode);
    } catch {
      // Best-effort permission hardening
    }
  }

  /**
   * Migrate config from previous package names if it exists
   */
  private migrateFromLegacy(): void {
    const legacyDirs = [
      path.join(os.homedir(), '.ocean-tunnel'),
      path.join(os.homedir(), '.ocean-hole'),
      path.join(os.homedir(), '.porthole'),
      path.join(os.homedir(), '.binu-tunnel'),
    ];

    for (const legacyDir of legacyDirs) {
      const legacyConfig = path.join(legacyDir, 'config.json');

      if (fs.existsSync(legacyConfig) && !fs.existsSync(this.configPath)) {
        try {
          this.ensureSecureDirectory();
          fs.copyFileSync(legacyConfig, this.configPath);
          this.applyPermissions(this.configPath, CONFIG_FILE_MODE);
          break;
        } catch {
          // Migration is best-effort
        }
      }
    }
  }

  private loadConfig(): ConfigData {
    try {
      this.ensureSecureDirectory();

      // Load config if it exists
      if (fs.existsSync(this.configPath)) {
        this.applyPermissions(this.configPath, CONFIG_FILE_MODE);
        const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return {
          ...configData,
          // Ensure deviceId exists even if the config file doesn't have it
          deviceId: configData.deviceId || uuidv4()
        };
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }

    // Return default config if loading fails or file doesn't exist
    return {
      deviceId: uuidv4()
    };
  }

  public saveConfig(): void {
    try {
      this.ensureSecureDirectory();

      // Update last used timestamp
      this.config.lastUsed = new Date().toISOString();

      // Save config to file
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        { encoding: 'utf-8', mode: CONFIG_FILE_MODE }
      );
      this.applyPermissions(this.configPath, CONFIG_FILE_MODE);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  public getApiKey(): string | undefined {
    return this.config.apiKey;
  }

  public setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.saveConfig();
  }

  public getDeviceId(): string {
    return this.config.deviceId;
  }
}

export default new ConfigManager();
