"""Servidor HTTP mínimo con soporte de Range, para probar el DEM remoto (/vsicurl/).

Corre en OTRO proceso: rasterio mantiene el GIL mientras GDAL espera la respuesta, así que un
servidor en un hilo del mismo proceso se bloquea (deadlock). Uso:
`python range_server.py <raíz> <log.jsonl>`; imprime el puerto en la primera línea.
"""

import json
import sys
import threading
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

_LOCK = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    def __init__(self, *args: object, root: Path, log: Path, **kwargs: object) -> None:
        self.root = root
        self.log = log
        super().__init__(*args, **kwargs)  # type: ignore[arg-type]

    def log_message(self, format: str, *args: object) -> None:
        pass

    def _file(self) -> Path | None:
        path = (self.root / self.path.lstrip("/").split("?")[0]).resolve()
        if self.root.resolve() in path.parents and path.is_file():
            return path
        return None

    def do_HEAD(self) -> None:
        path = self._file()
        if path is None:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Length", str(path.stat().st_size))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()

    def do_GET(self) -> None:
        path = self._file()
        if path is None:
            self.send_error(404)
            return
        size = path.stat().st_size
        header = self.headers.get("Range")
        start, end, is_range = 0, size - 1, False
        if header and header.startswith("bytes="):
            a, _, b = header.removeprefix("bytes=").partition("-")
            start = int(a) if a else max(size - int(b), 0)
            end = min(int(b), size - 1) if a and b else size - 1
            is_range = True
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        length = end - start + 1
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        with path.open("rb") as f:
            f.seek(start)
            data = f.read(length)
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            return
        with _LOCK, self.log.open("a", encoding="utf-8") as out:
            out.write(json.dumps({"file": path.name, "range": is_range, "bytes": len(data)}) + "\n")


if __name__ == "__main__":
    root, log = Path(sys.argv[1]), Path(sys.argv[2])
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, root=root, log=log))
    print(server.server_port, flush=True)
    server.serve_forever()
