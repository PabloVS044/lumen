"""Arranque del motor escuchando en IPv4 e IPv6 a la vez. Owner: R1.

En Fly el proxy público llega por IPv4 y la red privada (`*.internal`) por IPv6.
`--host ::` no basta (en la máquina rechazaba IPv4) y `--host 0.0.0.0` deja fuera `.internal`:
se abren dos sockets explícitos y uvicorn los sirve juntos.
Uso: `python -m lumen_engine.serve` (puerto en PORT, 8000 por defecto).
"""

import os
import socket

import uvicorn


def _listen(family: socket.AddressFamily, host: str, port: int) -> socket.socket:
    sock = socket.socket(family, socket.SOCK_STREAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if family == socket.AF_INET6:
        sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)  # IPv4 va por su propio socket
    sock.bind((host, port))
    sock.set_inheritable(True)
    return sock


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    sockets = [_listen(socket.AF_INET, "0.0.0.0", port), _listen(socket.AF_INET6, "::", port)]
    config = uvicorn.Config("lumen_engine.main:app", port=port)
    uvicorn.Server(config).run(sockets=sockets)


if __name__ == "__main__":
    main()
