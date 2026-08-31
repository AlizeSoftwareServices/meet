import os
from PIL import Image, ImageDraw, ImageFont

def create_icons():
    # 1. Update meet_splash_icon_v3.png
    original_icon_path = 'frontend/public/icon.png'
    if not os.path.exists(original_icon_path):
        print(f"Error: {original_icon_path} not found")
        return
        
    icon = Image.open(original_icon_path).convert("RGBA")
    # Make icon smaller so it + text fits inside 192x192 circular safe zone!
    icon.thumbnail((110, 110), Image.Resampling.LANCZOS)
    
    # Create a transparent canvas for the new splash icon (288x288 is required by Android 12)
    canvas_w = 288
    canvas_h = 288
    splash_icon = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    
    # Paste icon higher up
    icon_x = (canvas_w - icon.width) // 2
    icon_y = (canvas_h - icon.height) // 2 - 25
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
    text_y = icon_y + icon.height + 10
    draw.text((text_x, text_y), text, fill=(20, 20, 20, 255), font=font)
    
    splash_icon_path = 'frontend/android/app/src/main/res/drawable/meet_splash_icon_v3.png'
    splash_icon.save(splash_icon_path)
    print("Created meet_splash_icon_v3.png")

    # 2. Update alize_branding_v3.png (Powered by + User Logo)
    b_canvas_w = 600
    b_canvas_h = 160
    branding = Image.new("RGBA", (b_canvas_w, b_canvas_h), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(branding)
    
    try:
        font_small = ImageFont.truetype("arial.ttf", 20)
    except:
        font_small = ImageFont.load_default()
        
    b_text1 = "Powered by"
    bbox1 = b_draw.textbbox((0, 0), b_text1, font=font_small)
    w1 = bbox1[2] - bbox1[0]
    x1 = (b_canvas_w - w1) // 2
    y1 = 10
    b_draw.text((x1, y1), b_text1, fill=(100, 100, 100, 255), font=font_small)
    
    # Add User Logo
    user_logo_path = 'frontend/public/alize_logo.png'
    if os.path.exists(user_logo_path):
        user_logo = Image.open(user_logo_path).convert("RGBA")
        # Resize logo to fit
        max_logo_w = 300
        max_logo_h = 90
        user_logo.thumbnail((max_logo_w, max_logo_h), Image.Resampling.LANCZOS)
        
        logo_x = (b_canvas_w - user_logo.width) // 2
        logo_y = y1 + (bbox1[3] - bbox1[1]) + 10
        branding.paste(user_logo, (logo_x, logo_y), user_logo)
    
    branding_path = 'frontend/android/app/src/main/res/drawable/alize_branding_v3.png'
    branding.save(branding_path)
    print("Created alize_branding_v3.png")

    # 3. Create capacitor splash.png (Fallback)
    capacitor_splash = Image.new("RGBA", (1080, 1920), (255, 255, 255, 255))
    
    # Paste splash_icon in exact center
    cs_icon_x = (1080 - splash_icon.width) // 2
    cs_icon_y = (1920 - splash_icon.height) // 2
    capacitor_splash.paste(splash_icon, (cs_icon_x, cs_icon_y), splash_icon)
    
    # Paste branding at bottom
    cs_brand_x = (1080 - branding.width) // 2
    cs_brand_y = 1920 - branding.height - 120 # 120px from bottom margin
    capacitor_splash.paste(branding, (cs_brand_x, cs_brand_y), branding)
    
    cs_path = 'frontend/android/app/src/main/res/drawable/splash.png'
    capacitor_splash.save(cs_path)
    print("Created splash.png for Capacitor fallback")

if __name__ == "__main__":
    create_icons()
