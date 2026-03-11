import http.server
import socketserver
import os
import sys

# Default to 8081, or take from command line arg
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
DIRECTORY = "dist"

# Change into the directory to serve it as root
try:
    os.chdir(os.path.join(os.getcwd(), DIRECTORY))
except Exception as e:
    print(f"Error changing directory to {DIRECTORY}: {e}")
    sys.exit(1)

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"Request: {self.path}")
        
        # Translate path to understand if it exists locally
        local_path = self.translate_path(self.path)
        
        # If the file doesn't exist, we fallback to /index.html for SPA routing
        if not os.path.exists(local_path) and not self.path.startswith('/api/'):
            print(f"Path not found: {local_path}, routing to /index.html")
            self.path = '/index.html'

        return super().do_GET()

# Ensure we can reuse the address
socketserver.TCPServer.allow_reuse_address = True

print(f"Serving SPA on port {PORT} from {os.getcwd()}...")
try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        httpd.serve_forever()
except Exception as e:
    print(f"Failed to start server: {e}")
    sys.exit(1)
