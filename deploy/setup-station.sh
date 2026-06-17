#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-/opt/gateflow/station.env}"

echo "GateFlow station setup"
echo "======================"
echo
echo "1. Copy env file:"
echo "   cp ${ROOT_DIR}/deploy/station.env.example ${ENV_FILE}"
echo "2. Edit ${ENV_FILE} with station DATABASE_URL, AUTH_SECRET, and GATE_CONTROL_STATION_ID."
echo "3. Install udev rules (Linux):"
echo "   sudo cp ${ROOT_DIR}/deploy/udev/99-gateflow.rules /etc/udev/rules.d/"
echo "   sudo udevadm control --reload-rules && sudo udevadm trigger"
echo "4. Add gateflow user to dialout:"
echo "   sudo usermod -aG dialout gateflow"
echo "5. Install systemd service:"
echo "   sudo cp ${ROOT_DIR}/deploy/systemd/gateflow.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable --now gateflow"
echo
echo "Admin device mapping per station (example: boys-hostel-gate):"
echo "  - Boys RFID IN:  serial_number=COM1,  gate_relay_port=COM11, station_id=boys-hostel-gate"
echo "  - Boys RFID OUT: serial_number=COM2,  gate_relay_port=COM22, station_id=boys-hostel-gate"
echo
echo "Each station PC .env must set:"
echo "  GATE_CONTROL_STATION_ID=boys-hostel-gate"
echo
echo "Production test checklist:"
echo "  [ ] ACTIVE user IN scan opens only COM11 relay"
echo "  [ ] ACTIVE user OUT scan opens only COM22 relay"
echo "  [ ] Other station devices are ignored on this PC"
echo "  [ ] Unknown RFID does not open gate"
echo "  [ ] gate_enabled=false skips relay but keeps attendance"
echo "  [ ] Relay unplugged logs GateEvent FAILED, scan still succeeds"
echo "  [ ] Admin manual open works and is audited"
echo "  [ ] Reboot restores service and USB mappings"
