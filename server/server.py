from flask import Flask, request, jsonify, render_template, render_template_string, send_from_directory
import subprocess
import tempfile
import os
import qrcode
import hashlib
from io import BytesIO
import usb.core
import usb.util

app = Flask(__name__, static_url_path='')

# Directory to store QR code images
server_dir = os.path.dirname(os.path.abspath(__file__));
QR_CODE_DIR = os.path.join(server_dir, 'qr_codes')

os.makedirs(QR_CODE_DIR, exist_ok=True)  # Ensure the directory exists

def get_brother_ql_printers():
    # Find USB devices
    devices = usb.core.find(find_all=True)
    printers_info = []
    for device in devices:
        # Filter devices (you might need the vendor ID for Brother, typically 0x04f9)
        print(f"get_brother_ql_printers: idVendor {device.idVendor}, is brother printer: {device.idVendor == 0x04f9}")
        if device.idVendor == 0x04f9:  # Brother Industries, Ltd
            try:
                product = usb.util.get_string(device, device.iProduct)
                manufacturer = usb.util.get_string(device, device.iManufacturer)
                serial_number = usb.util.get_string(device, device.iSerialNumber)
                description = f"Product: {product}, Manufacturer: {manufacturer}, Serial: {serial_number}"
                printers_info.append({
                    "name": product,
                    "manufacturer": manufacturer,
                    "serial": serial_number,
                    "description": description,
                    "endpoint": "/print",
                })
            except Exception as e:
                print(f"Error accessing device details: {e}")
    return printers_info

def get_device_list():
    return get_brother_ql_printers()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/url2qrcode')
def url2qrcode():
    # Retrieve the URL parameter from the query string
    url = request.args.get('url', None)
    border_width = request.args.get('border', 4)
    box_size = request.args.get('box', 10)
    print(f"url2qrcode, got url {url}")
    # Check if the URL parameter is provided
    if not url:
        return "No URL provided", 400

    # Create a unique filename based on the URL
    filename = hashlib.md5(f"{url},border={border_width},box={box_size}".encode()).hexdigest() + '.png'
    filepath = os.path.join(QR_CODE_DIR, filename)

    # Check if the QR code already exists
    if not os.path.exists(filepath):
        # Generate the QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=box_size,
            border=border_width,
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        # Save the image to the filesystem
        print(f"saving new qrcode image: {filepath}")
        img.save(filepath)

    print(f"Current Working Directory: {os.getcwd()}")
    print(f"responding with file: {QR_CODE_DIR}/{filename}")
   # Serve the QR code image as a static resource
    return send_from_directory(QR_CODE_DIR, filename, mimetype='image/png')

@app.route('/devices', methods=['GET'])
def devices():
    devices = get_device_list()
    return jsonify({'success': True, 'result': devices }), 200

@app.route('/print/<labelsize>', methods=['POST'])
def process_image(labelsize):
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image provided'}), 400

    width_str, height_str = labelsize.split('x')
    width = int(width_str)
    height = int(height_str)

    image_file = request.files['image']
    
    # Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False) as temp_image:
        image_file.save(temp_image.name)
        try:
            # Execute the shell command with the path to the temporary file
            command = [
                "brother_ql", 
                "--backend", "pyusb", 
                "--model", "QL-800", 
                "--printer", "usb://0x04f9:0x209b",
                "print", 
                "-l", f"{width}x{height}",
                temp_image.name
            ]
            # just echo out the command if we got the dryrun form param
            if "dryrun" in request.form:
                command.insert(0, "echo")

            result = subprocess.run(command, check=True, text=True, capture_output=True)

            # Handle success
            return jsonify({'success': True, 'output': result.stdout}), 200
        except subprocess.CalledProcessError as e:
            os.unlink(temp_image.name)
            return jsonify({'success': False, 'error': e.stderr}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')