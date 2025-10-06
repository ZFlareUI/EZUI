/**
 * EZUI Development Server
 * Serves files and provides hot reload for .ezu components
 */

import { createServer } from 'http';
import { readFile, readdir, stat, watch } from 'fs/promises';
import { join, extname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;
const ROOT_DIR = process.cwd();

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ezu': 'text/plain'
};

// WebSocket connections for hot reload
const wsConnections = new Set();

class EZUIDevServer {
  constructor(options = {}) {
    this.port = options.port || PORT;
    this.root = options.root || ROOT_DIR;
    this.hotReload = options.hotReload !== false;
    this.watchedFiles = new Map();
    
    this.server = createServer((req, res) => {
      this.handleRequest(req, res);
    });
  }

  async start() {
    try {
      // Start HTTP server
    this.app.listen(this.port, () => {
      console.log(`EZUI dev server running on http://localhost:${this.port}`);
      console.log(`Serving from: ${path.resolve(this.projectRoot)}`);
    });      // Setup file watching for hot reload
      if (this.hotReload) {
        this.setupFileWatcher();
        this.setupWebSocket();
      }

      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\nShutting down EZUI dev server...');
        this.server.close(() => {
          process.exit(0);
        });
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async handleRequest(req, res) {
    try {
      const url = new URL(req.url, `http://localhost:${this.port}`);
      let filePath = join(this.root, url.pathname);

      // Default to index.html for directory requests
      if (url.pathname === '/' || url.pathname.endsWith('/')) {
        filePath = join(filePath, 'index.html');
      }

      // Check if file exists
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) {
        filePath = join(filePath, 'index.html');
      }

      // Read file content
      const content = await readFile(filePath);
      const ext = extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // Inject hot reload script for HTML files
      if (ext === '.html' && this.hotReload) {
        const modifiedContent = this.injectHotReload(content.toString());
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(modifiedContent);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }

      console.log(`${req.method} ${url.pathname} - ${stats.size} bytes`);

    } catch (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(this.get404Page());
        console.log(`${req.method} ${req.url} - 404 Not Found`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(this.get500Page(error));
        console.error(`${req.method} ${req.url} - 500 Error:`, error);
      }
    }
  }

  injectHotReload(html) {
    const hotReloadScript = `
    <script>
      // EZUI Hot Reload Client
      const ws = new WebSocket('ws://localhost:${this.port + 1}');
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'reload') {
          console.log('Hot reloading:', data.file);
          
          if (data.file.endsWith('.ezu')) {
            // Reload specific component
            if (window.ezui) {
              window.ezui.loadComponent(data.file);
            }
          } else {
            // Full page reload for other files
            window.location.reload();
          }
        }
      };
      
      ws.onopen = () => {
        console.log('Hot reload connected');
      };
      
      ws.onclose = () => {
        console.log('Hot reload disconnected');
        // Try to reconnect after 1 second
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      };
    </script>
    `;

    return html.replace('</body>', `${hotReloadScript}</body>`);
  }

  setupWebSocket() {
    import('ws').then(({ WebSocketServer }) => {
      const wss = new WebSocketServer({ port: this.port + 1 });
      
      wss.on('connection', (ws) => {
        wsConnections.add(ws);
        
        ws.on('close', () => {
          wsConnections.delete(ws);
        });
      });
      
      console.log(`WebSocket server running on port ${this.port + 1}`);
    }).catch(() => {
      console.log('WebSocket not available - install ws: npm install ws');
    });
  }

  async setupFileWatcher() {
    try {
      // Watch for changes in .ezu files, JS, CSS, HTML
      const watchPaths = [
        join(this.root, 'src'),
        join(this.root, 'examples'),
        join(this.root, '*.html'),
        join(this.root, '*.ezu')
      ];

      for (const watchPath of watchPaths) {
        try {
          const watcher = watch(watchPath, { recursive: true });
          
          for await (const event of watcher) {
            if (event.eventType === 'change') {
              const ext = extname(event.filename);
              
              if (['.ezu', '.js', '.css', '.html'].includes(ext)) {
                console.log(`Changed: ${event.filename}`);
                this.notifyClients(event.filename);
              }
            }
          }
        } catch (error) {
          // Path doesn't exist, skip
        }
      }
    } catch (error) {
      console.log('File watching not available on this system');
    }
  }

  notifyClients(filename) {
    const message = JSON.stringify({
      type: 'reload',
      file: filename,
      timestamp: Date.now()
    });

    wsConnections.forEach(ws => {
      try {
        ws.send(message);
      } catch (error) {
        wsConnections.delete(ws);
      }
    });
  }

  get404Page() {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>404 - Page Not Found</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; font-size: 4em; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="error">404</div>
        <h1>Page Not Found</h1>
        <p>The requested file could not be found.</p>
        <a href="/">← Back to Home</a>
    </body>
    </html>
    `;
  }

  get500Page(error) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>500 - Server Error</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; font-size: 4em; margin-bottom: 20px; }
            .details { text-align: left; background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="error">500</div>
        <h1>Server Error</h1>
        <p>An error occurred while processing your request.</p>
        <div class="details">
            <strong>Error:</strong><br>
            <code>${error.message}</code>
        </div>
        <a href="/">← Back to Home</a>
    </body>
    </html>
    `;
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new EZUIDevServer();
  server.start();
}

export { EZUIDevServer };