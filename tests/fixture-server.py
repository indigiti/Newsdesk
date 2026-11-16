import functools
import http.server
import ssl
import sys

root, cert, key = sys.argv[1:]
server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 9443),
    functools.partial(http.server.SimpleHTTPRequestHandler, directory=root),
)
tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
tls.load_cert_chain(cert, key)
server.socket = tls.wrap_socket(server.socket, server_side=True)
server.serve_forever()
