/**
 * Simple HTTP Server for EZUI Testing
 */

import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ezu': 'text/plain'
};

const server = createServer(async (req, res) => {
  try {
    console.log(`${req.method} ${req.url}`);
    
    let filePath = join(process.cwd(), req.url === '/' ? 'test.html' : req.url);
    
    // Check if file exists
    await stat(filePath);
    
    // Read and serve file
    const content = await readFile(filePath);
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);

  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - File Not Found</h1>');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>500 - Server Error</h1>');
      console.error('Server error:', error);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Serving from:', process.cwd());
});

process.on('SIGINT', () => {
  console.log('\nServer shutting down...');
  server.close(() => process.exit(0));
});