import os
from PIL import Image, ImageDraw, ImageFont

def pad_icon():
    icon_path = 'frontend/android/app/src/main/res/drawable/meet_splash_icon.png'
    print(f"Padding {icon_path}")
    if not os.path.exists(icon_path):
        print("Icon not found.")
        return
    img = Image.open(icon_path).convert("RGBA")
    
    # Calculate new size (70% of original to add padding)
    scale = 0.70
    new_w = int(img.width * scale)
    new_h = int(img.height * scale)
    
    resized_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Create new transparent image of original size
    new_img = Image.new("RGBA", (img.width, img.height), (0, 0, 0, 0))
    
    # Paste resized image in center
    offset_x = (img.width - new_w) // 2
    offset_y = (img.height - new_h) // 2
    new_img.paste(resized_img, (offset_x, offset_y), resized_img)
    
    # Overwrite the original
    new_img.save(icon_path)
    print("Icon padded and saved.")

def create_branding():
    logo_path = 'frontend/public/alize_logo.png'
    branding_path = 'frontend/android/app/src/main/res/drawable/alize_branding.png'
    
    print(f"Creating branding at {branding_path}")
    if not os.path.exists(logo_path):
        print("Logo not found.")
        return
        
    logo = Image.open(logo_path).convert("RGBA")
    
    # Resize logo if too big, max width 200, max height 100
    logo.thumbnail((200, 100), Image.Resampling.LANCZOS)
    
    # Create canvas for branding: text + logo
    # Height = text height + padding + logo height
    canvas_w = 400
    canvas_h = 160
    
    branding = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(branding)
    
    # We don't have custom fonts easily, so we use default or generic
    try:
        # Try a standard windows font
        font = ImageFont.truetype("arial.ttf", 22)
    except:
        font = ImageFont.load_default()
        
    text = "Powered by Alize Software Services"
    # Get text size
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    # Draw text centered
    text_x = (canvas_w - text_w) // 2
    text_y = 10
    # Text color: dark grey/black
    draw.text((text_x, text_y), text, fill=(50, 50, 50, 255), font=font)
    
    # Paste logo centered below text
    logo_x = (canvas_w - logo.width) // 2
    logo_y = text_y + text_h + 15
    branding.paste(logo, (logo_x, logo_y), logo)
    
    branding.save(branding_path)
    print("Branding image created and saved.")

if __name__ == "__main__":
    pad_icon()
    create_branding()
