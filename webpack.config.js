import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'final.js',
    clean: true
  },
  target: 'node',
  resolve: {
    fallback: {
      "bufferutil": false,
      "utf-8-validate": false
    },
    extensions: ['.js', '.jsx', '.json']
  }
};