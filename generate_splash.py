import os
from PIL import Image, ImageDraw, ImageFont

def create_icons():
    # 1. Update meet_splash_icon.png (Icon + "Meet" text)
    original_icon_path = 'frontend/public/icon.png' # The original unpadded calendar icon
    if not os.path.exists(original_icon_path):
        print(f"Error: {original_icon_path} not found")
        return
        
    icon = Image.open(original_icon_path).convert("RGBA")
    icon.thumbnail((180, 180), Image.Resampling.LANCZOS)
    
    # Create a transparent canvas for the new splash icon
    canvas_w = 288
    canvas_h = 288
    splash_icon = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    
    # Paste icon
    icon_x = (canvas_w - icon.width) // 2
    icon_y = (canvas_h - icon.height) // 2 - 20 # Shift up slightly for text
    splash_icon.paste(icon, (icon_x, icon_y), icon)
    
    draw = ImageDraw.Draw(splash_icon)
    try:
        font = ImageFont.truetype("arialbd.ttf", 36) # Arial Bold
    except:
        font = ImageFont.load_default()
        
    text = "Meet"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    
    text_x = (canvas_w - text_w) // 2
    text_y = icon_y + icon.height + 15
    draw.text((text_x, text_y), text, fill=(20, 20, 20, 255), font=font)
    
    splash_icon_path = 'frontend/android/app/src/main/res/drawable/meet_splash_icon.png'
    splash_icon.save(splash_icon_path)
    print("Created meet_splash_icon.png")

    # 2. Update alize_branding.png
    logo_path = 'frontend/public/alize_logo.png'
    branding_path = 'frontend/android/app/src/main/res/drawable/alize_branding.png'
    
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        logo.thumbnail((250, 100), Image.Resampling.LANCZOS) # Make logo a bit larger
    else:
        logo = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
        
    b_canvas_w = 500
    b_canvas_h = 180
    branding = Image.new("RGBA", (b_canvas_w, b_canvas_h), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(branding)
    
    try:
        font_small = ImageFont.truetype("arial.ttf", 20)
    except:
        font_small = ImageFont.load_default()
        
    b_text = "Powered by"
    bbox2 = b_draw.textbbox((0, 0), b_text, font=font_small)
    b_text_w = bbox2[2] - bbox2[0]
    b_text_h = bbox2[3] - bbox2[1]
    
    b_text_x = (b_canvas_w - b_text_w) // 2
    b_text_y = 10
    b_draw.text((b_text_x, b_text_y), b_text, fill=(80, 80, 80, 255), font=font_small)
    
    logo_x = (b_canvas_w - logo.width) // 2
    logo_y = b_text_y + b_text_h + 10
    branding.paste(logo, (logo_x, logo_y), logo)
    
    branding.save(branding_path)
    print("Created alize_branding.png")

    # 3. Create capacitor splash.png (Fallback)
    capacitor_splash = Image.new("RGBA", (1080, 1920), (255, 255, 255, 255))
    
    # Paste splash_icon in exact center
    cs_icon_x = (1080 - splash_icon.width) // 2
    cs_icon_y = (1920 - splash_icon.height) // 2
    capacitor_splash.paste(splash_icon, (cs_icon_x, cs_icon_y), splash_icon)
    
    # Paste branding at bottom
    cs_brand_x = (1080 - branding.width) // 2
    cs_brand_y = 1920 - branding.height - 100 # 100px from bottom margin
    capacitor_splash.paste(branding, (cs_brand_x, cs_brand_y), branding)
    
    cs_path = 'frontend/android/app/src/main/res/drawable/splash.png'
    capacitor_splash.save(cs_path)
    print("Created splash.png for Capacitor fallback")

if __name__ == "__main__":
    create_icons()
