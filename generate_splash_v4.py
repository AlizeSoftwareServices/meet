import os
from PIL import Image, ImageDraw, ImageFont

def create_icons():
    # 1. Update alize_branding_v4.png (Make Logo Much Larger)
    # Android branding image is constrained to 200dp x 80dp (2.5 : 1 ratio)
    b_canvas_w = 800
    b_canvas_h = 320
    branding = Image.new("RGBA", (b_canvas_w, b_canvas_h), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(branding)
    
    try:
        font_small = ImageFont.truetype("arial.ttf", 36) # Increased font size
    except:
        font_small = ImageFont.load_default()
        
    b_text1 = "Powered by"
    bbox1 = b_draw.textbbox((0, 0), b_text1, font=font_small)
    w1 = bbox1[2] - bbox1[0]
    h1 = bbox1[3] - bbox1[1]
    x1 = (b_canvas_w - w1) // 2
    y1 = 10
    b_draw.text((x1, y1), b_text1, fill=(100, 100, 100, 255), font=font_small)
    
    # Add User Logo
    user_logo_path = 'frontend/public/alize_logo.png'
    if os.path.exists(user_logo_path):
        user_logo = Image.open(user_logo_path).convert("RGBA")
        # Resize logo to be MUCH larger
        max_logo_w = 700
        max_logo_h = 240
        user_logo.thumbnail((max_logo_w, max_logo_h), Image.Resampling.LANCZOS)
        
        logo_x = (b_canvas_w - user_logo.width) // 2
        logo_y = y1 + h1 + 20
        branding.paste(user_logo, (logo_x, logo_y), user_logo)
    
    branding_path = 'frontend/android/app/src/main/res/drawable/alize_branding_v4.png'
    branding.save(branding_path)
    print("Created alize_branding_v4.png")

    # 3. Create capacitor splash.png (Fallback)
    # Re-use the existing meet_splash_icon_v3 for the main icon
    splash_icon_path = 'frontend/android/app/src/main/res/drawable/meet_splash_icon_v3.png'
    if os.path.exists(splash_icon_path):
        splash_icon = Image.open(splash_icon_path)
        
        capacitor_splash = Image.new("RGBA", (1080, 1920), (255, 255, 255, 255))
        
        # Paste splash_icon in exact center
        cs_icon_x = (1080 - splash_icon.width) // 2
        cs_icon_y = (1920 - splash_icon.height) // 2
        capacitor_splash.paste(splash_icon, (cs_icon_x, cs_icon_y), splash_icon)
        
        # Paste new branding at bottom (scaled down a bit for the fallback splash)
        fallback_brand = branding.copy()
        fallback_brand.thumbnail((600, 240), Image.Resampling.LANCZOS)
        cs_brand_x = (1080 - fallback_brand.width) // 2
        cs_brand_y = 1920 - fallback_brand.height - 120
        capacitor_splash.paste(fallback_brand, (cs_brand_x, cs_brand_y), fallback_brand)
        
        cs_path = 'frontend/android/app/src/main/res/drawable/splash.png'
        capacitor_splash.save(cs_path)
        print("Created splash.png for Capacitor fallback")

if __name__ == "__main__":
    create_icons()
