import os
from PIL import Image, ImageDraw, ImageFont

def create_icons():
    # 1. Update meet_splash_icon_v2.png (Icon + "Meet" text)
    original_icon_path = 'frontend/public/icon.png'
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
    
    splash_icon_path = 'frontend/android/app/src/main/res/drawable/meet_splash_icon_v2.png'
    splash_icon.save(splash_icon_path)
    print("Created meet_splash_icon_v2.png")

    # 2. Update alize_branding_v2.png (Pure Text to avoid screenshot look)
    b_canvas_w = 600
    b_canvas_h = 100
    branding = Image.new("RGBA", (b_canvas_w, b_canvas_h), (0, 0, 0, 0))
    b_draw = ImageDraw.Draw(branding)
    
    try:
        font_small = ImageFont.truetype("arial.ttf", 20)
        font_bold = ImageFont.truetype("arialbd.ttf", 24)
    except:
        font_small = ImageFont.load_default()
        font_bold = ImageFont.load_default()
        
    b_text1 = "Powered by"
    b_text2 = "Alize Software Services"
    
    bbox1 = b_draw.textbbox((0, 0), b_text1, font=font_small)
    bbox2 = b_draw.textbbox((0, 0), b_text2, font=font_bold)
    
    w1 = bbox1[2] - bbox1[0]
    w2 = bbox2[2] - bbox2[0]
    
    x1 = (b_canvas_w - w1) // 2
    x2 = (b_canvas_w - w2) // 2
    
    y1 = 20
    y2 = y1 + (bbox1[3] - bbox1[1]) + 8
    
    b_draw.text((x1, y1), b_text1, fill=(100, 100, 100, 255), font=font_small)
    b_draw.text((x2, y2), b_text2, fill=(37, 99, 235, 255), font=font_bold) # brand blue color
    
    branding_path = 'frontend/android/app/src/main/res/drawable/alize_branding_v2.png'
    branding.save(branding_path)
    print("Created alize_branding_v2.png")

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
