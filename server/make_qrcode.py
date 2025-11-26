import qrcode
from PIL import Image, ImageDraw, ImageFont

# Generate QR code
qr = qrcode.QRCode(
    version=1,  # controls the size of the QR Code
    error_correction=qrcode.constants.ERROR_CORRECT_H,  # About 30% or less errors can be corrected.
    box_size=10,  # size of each box in pixels
    border=4  # border thickness in boxes
)
qr.add_data('https://example.com')
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
width, height = img.size

# get a font
fnt = ImageFont.truetype("Pillow/Tests/fonts/FreeMono.ttf", 40)

# make a blank image for the text, initialized to transparent text color
# txt = Image.new("RGBA", img.size, (255, 255, 255, 255))

# get a drawing context
draw = ImageDraw.Draw(img)

# draw text, half opacity
label_text = "Hello World"
textwidth, textheight = draw.textsize(label_text, font=fnt)

print(f'width {width}', width)
x = (width - textwidth) / 2
y = (height - textheight) / 2

backfill = ImageDraw.Draw(img)
backfill.rectangle([(x,y), (x+textwidth, y+textheight)], fill="magenta", outline=None, width=1)

# Add text on top
draw.text((x, y), label_text, font=fnt, fill="black")


# Save the result
img.save('qr_with_text.png')

# Show the image
img.show()
