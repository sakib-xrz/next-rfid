from flask import Flask, jsonify
from flask_cors import CORS
import serial
import threading
import time

app = Flask(__name__)
# FIXED: This opens up the communication path so your index.html can read the data perfectly
CORS(app)

PORT = "COM9"
BAUDRATE = 57600

scanned_history = []
last_seen = {}
raw_serial_accumulator = ""

def parse_rfid_buffer():
    global raw_serial_accumulator
    extracted_epcs = []
    
    while True:
        start_idx = raw_serial_accumulator.find("CC")
        if start_idx == -1:
            break
            
        if start_idx > 0:
            raw_serial_accumulator = raw_serial_accumulator[start_idx:]
            continue
            
        pc_idx = raw_serial_accumulator.find("3000")
        
        if pc_idx != -1 and len(raw_serial_accumulator) >= (pc_idx + 28):
            epc_start = pc_idx + 4
            epc_end = epc_start + 24
            epc = raw_serial_accumulator[epc_start:epc_end]
            
            if all(c in "0123456789ABCDEF" for c in epc):
                extracted_epcs.append(epc)
            
            raw_serial_accumulator = raw_serial_accumulator[epc_end:]
        else:
            if pc_idx == -1 and len(raw_serial_accumulator) > 60:
                raw_serial_accumulator = raw_serial_accumulator[2:]
            else:
                break

    if len(raw_serial_accumulator) > 2000:
        raw_serial_accumulator = ""
        
    return extracted_epcs

def rfid_reader_worker():
    global scanned_history, raw_serial_accumulator
    
    print(f"Connecting to RFID Reader on {PORT}...")
    try:
        ser = serial.Serial(
            port=PORT, 
            baudrate=BAUDRATE, 
            timeout=0.02,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE
        )
        ser.reset_input_buffer()
        print("Serial port connected successfully!")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    scan_trigger_command = bytes.fromhex("7C 00 02 00 01 02")

    while True:
        try:
            ser.write(scan_trigger_command)
            time.sleep(0.03)

            if ser.in_waiting > 0:
                new_bytes = ser.read(ser.in_waiting)
                raw_serial_accumulator += new_bytes.hex().upper()
                
                clean_epcs = parse_rfid_buffer()
                
                current_time = time.time()
                for clean_epc in clean_epcs:
                    if clean_epc not in last_seen or current_time - last_seen[clean_epc] > 10:
                        scanned_history.append(clean_epc)
                        print(f"[SUCCESS - CLEAN EPC]: {clean_epc}")
                        last_seen[clean_epc] = current_time
                        
            time.sleep(0.05)
        except Exception as e:
            print(f"Error: {e}")
            break
            
    ser.close()

@app.route('/')
def home():
    return "<h1>RFID API Server Active</h1>"

@app.route('/api/tags', methods=['GET'])
def get_tags():
    return jsonify(scanned_history)

if __name__ == '__main__':
    rfid_thread = threading.Thread(target=rfid_reader_worker, daemon=True)
    rfid_thread.start()
    app.run(host='0.0.0.0', port=5000, debug=False)