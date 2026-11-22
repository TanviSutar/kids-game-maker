#!/bin/sh
# Start the dev server over HTTPS on the local network so phones can use the
# microphone (browsers only allow the mic on localhost or HTTPS).
# Creates a self-signed certificate once; phones will show a warning the first time.
set -e
cd "$(dirname "$0")/.."
mkdir -p certificates
if [ ! -f certificates/dev-cert.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
    -keyout certificates/dev-key.pem -out certificates/dev-cert.pem \
    -subj "/CN=kids-game-maker-dev" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" 2>/dev/null
fi
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "<your-mac-ip>")
echo ""
echo "  📱 On your phone (same Wi-Fi), open:  https://$IP:3000/phonetics"
echo "     Tap 'Advanced' → 'Proceed' on the certificate warning, then allow the microphone."
echo ""
exec npx next dev -H 0.0.0.0 --experimental-https \
  --experimental-https-key certificates/dev-key.pem \
  --experimental-https-cert certificates/dev-cert.pem
