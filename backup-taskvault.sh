#!/usr/bin/env bash
set -euo pipefail

# Rutas
SRC_DIR=
DATA_DIR="$SRC_DIR/data"
ENV_FILE="$SRC_DIR/.env"

DEST_ROOT=
DATE="$(date +%F_%H-%M-%S)"
DEST_DIR="$DEST_ROOT/$DATE"

# Crear destino
mkdir -p "$DEST_DIR"

# Copiar .env (si existe)
if [[ -f "$ENV_FILE" ]]; then
  install -m 600 "$ENV_FILE" "$DEST_DIR/.env"
fi

# Copiar carpeta data (si existe)
if [[ -d "$DATA_DIR" ]]; then
  rsync -a "$DATA_DIR/" "$DEST_DIR/data/"
fi

# Log
echo "$(date -Is) Backup OK -> $DEST_DIR" >> /var/log/backup-taskvault.log
