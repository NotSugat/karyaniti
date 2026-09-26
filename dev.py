from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from api.index import ROOT, handler as APIHandler


class LocalHandler(SimpleHTTPRequestHandler, APIHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "public"), **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return APIHandler.do_GET(self)
        return super().do_GET()


if __name__ == "__main__":
    print("Serving at http://localhost:8000")
    ThreadingHTTPServer(("127.0.0.1", 8000), LocalHandler).serve_forever()
