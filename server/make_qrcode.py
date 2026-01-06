import qrcode
from PIL import Image, ImageDraw, ImageFont

# Generate QR code
qr = qrcode.QRCode(
    version=1,  # controls the size of the QR Code
    error_correction=qrcode.constants.ERROR_CORRECT_H,  # About 30% or less errors can be corrected.
    box_size=10,  # size of each box in pixels
    border=4  # border thickness in boxes
)
qr.add_data('https://euglink.org/ZnmcSq')
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white").convert('RGB')

# Save the result
img.save('qr_code_image.png')

# Show the image
img.show()
