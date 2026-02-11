import http.server
import socketserver
import os

import sys

# Default to 8081, or take from command line arg
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
DIRECTORY = "dist"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Serve the file if it exists, otherwise serve index.html
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path) and not os.path.exists(os.path.join(path, "index.html")):
            self.path = "/"
        super().do_GET()

print(f"Serving SPA on port {PORT} from {DIRECTORY}...")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
