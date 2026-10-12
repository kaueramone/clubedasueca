const { cpSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'public/ensaios/blinkid/sdk');
mkdirSync(destination, { recursive: true });
cpSync(path.join(root, 'node_modules/@microblink/blinkid-core/dist'), destination, { recursive: true });
