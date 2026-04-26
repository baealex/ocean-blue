import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const moduleAlias = require('module-alias');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

moduleAlias.addAliases({ '~': path.join(__dirname) });
