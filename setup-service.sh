#!/usr/bin/env bash
set -euo pipefail

# Setup script for ql800-qrlabel-maker
# Creates a Python venv, installs dependencies, and installs a systemd service

SERVICE_NAME="qrlabel-maker"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"
VENV_DIR="$SCRIPT_DIR/.venv"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SERVICE_PORT="${PORT:-5000}"
RUN_USER="$(whoami)"

echo "=== QL-800 QR Label Maker - Service Setup ==="
echo "Project dir: $SCRIPT_DIR"
echo "Server dir:  $SERVER_DIR"
echo "Venv dir:    $VENV_DIR"
echo "Service:     $SERVICE_NAME"
echo "Port:        $SERVICE_PORT"
echo "User:        $RUN_USER"
echo ""

# --- Python venv and dependencies ---

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
else
    echo "Virtual environment already exists."
fi

echo "Installing Python dependencies..."
"$VENV_DIR/bin/pip" install --quiet --upgrade pip
"$VENV_DIR/bin/pip" install --quiet -r "$SERVER_DIR/requirements.txt"

echo "Dependencies installed."

# --- systemd service ---

echo "Creating systemd service file..."

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=QL-800 QR Label Maker Web Server
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$SERVER_DIR
ExecStart=$VENV_DIR/bin/python server.py
Restart=on-failure
RestartSec=5
Environment=FLASK_ENV=production
Environment=PORT=$SERVICE_PORT

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

echo "Enabling service to start on boot..."
sudo systemctl enable "$SERVICE_NAME"

echo "Starting service..."
sudo systemctl restart "$SERVICE_NAME"

# Brief pause then check status
sleep 1
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo ""
    echo "=== Service is running ==="
    echo "Access the UI at: http://localhost:${SERVICE_PORT}"
    echo ""
    echo "Useful commands:"
    echo "  sudo systemctl status $SERVICE_NAME   # check status"
    echo "  sudo systemctl restart $SERVICE_NAME   # restart"
    echo "  sudo systemctl stop $SERVICE_NAME      # stop"
    echo "  sudo journalctl -u $SERVICE_NAME -f    # view logs"
else
    echo ""
    echo "WARNING: Service failed to start. Check logs with:"
    echo "  sudo journalctl -u $SERVICE_NAME -e"
fi
