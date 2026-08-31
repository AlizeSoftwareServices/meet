import os
from PIL import Image, ImageDraw, ImageFont

source_image_path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\3efcb1f3-e704-46af-a686-45f06a859ba3\.user_uploaded\media_1787916442408.png"
base_dir = r"d:\PROJECT\Platforms\Calendly-main"

# Load source icon logo
logo = Image.open(source_image_path).convert("RGBA")

# Splash screen size map (width, height) for Android
android_splash_resolutions = {
    r"drawable\splash.png": (480, 320),
    r"drawable-land-hdpi\splash.png": (800, 480),
    r"drawable-land-mdpi\splash.png": (480, 320),
    r"drawable-land-xhdpi\splash.png": (1280, 720),
    r"drawable-land-xxhdpi\splash.png": (1600, 960),
    r"drawable-land-xxxhdpi\splash.png": (1920, 1280),
    r"drawable-port-hdpi\splash.png": (480, 800),
    r"drawable-port-mdpi\splash.png": (320, 480),
    r"drawable-port-xhdpi\splash.png": (720, 1280),
    r"drawable-port-xxhdpi\splash.png": (960, 1600),
    r"drawable-port-xxxhdpi\splash.png": (1280, 1920)
}

# iOS Splash Screens (all 2732x2732)
ios_splash_files = [
    "splash-2732x2732.png",
    "splash-2732x2732-1.png",
    "splash-2732x2732-2.png"
]

res_dir = os.path.join(base_dir, "frontend", "android", "app", "src", "main", "res")
ios_splash_dir = os.path.join(base_dir, "frontend", "ios", "App", "App", "Assets.xcassets", "Splash.imageset")

# Gradient color stops based on Logo logic
gradient_colors = [
    (0, 130, 246),    # Blue
    (138, 29, 252),   # Purple
    (255, 98, 0)      # Orange/Red
]

def get_gradient_color(t, colors):
    n = len(colors)
    if n == 1:
        return colors[0]
    segment = 1.0 / (n - 1)
    idx = int(t / segment)
    if idx >= n - 1:
        return colors[-1]
    t_local = (t - idx * segment) / segment
    c1 = colors[idx]
    c2 = colors[idx + 1]
    r = int(c1[0] + (c2[0] - c1[0]) * t_local)
    g = int(c1[1] + (c2[1] - c1[1]) * t_local)
    b = int(c1[2] + (c2[2] - c1[2]) * t_local)
    return (r, g, b)

def create_splash_screen(W, H):
    # 1. Create white background
    splash = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    
    # Determine sizing based on screen dimensions
    is_portrait = H >= W
    smaller_dim = min(W, H)
    
    # Scale icon: 30% of smaller dimension for standard, capped nicely
    icon_size = int(smaller_dim * 0.30)
    if icon_size < 80:
        icon_size = 80
    elif icon_size > 400:
        icon_size = 400
        
    # 2. Paste logo centered
    logo_resized = logo.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    
    if is_portrait:
        icon_x = (W - icon_size) // 2
        icon_y = int(H * 0.40) - (icon_size // 2)
    else:
        icon_x = (W - icon_size) // 2
        icon_y = int(H * 0.38) - (icon_size // 2)
        
    splash.paste(logo_resized, (icon_x, icon_y), mask=logo_resized)
    
    # 3. Draw text "MEET" below the logo
    draw = ImageDraw.Draw(splash)
    
    # Dynamic text font sizes
    text_font_size = int(icon_size * 0.28)
    if text_font_size < 20:
        text_font_size = 20
        
    try:
        font_meet = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", text_font_size)
    except IOError:
        font_meet = ImageFont.load_default()
        
    text_str = "MEET"
    
    # Get text dimensions
    bbox = draw.textbbox((0, 0), text_str, font=font_meet)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    text_x = (W - tw) // 2
    text_y = icon_y + icon_size + int(icon_size * 0.18)
    
    # Draw gradient text using mask
    mask = Image.new("L", (tw + 20, th + 20), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.text((10, 10), text_str, font=font_meet, fill=255)
    
    gradient = Image.new("RGBA", (tw + 20, th + 20))
    for x in range(tw + 20):
        t = x / max(1, (tw + 20))
        r, g, b = get_gradient_color(t, gradient_colors)
        for y in range(th + 20):
            gradient.putpixel((x, y), (r, g, b, 255))
            
    splash.paste(gradient, (text_x - 10, text_y - 10), mask=mask)
    
    # 4. Draw footer text "powered by Alize Software Services"
    footer_font_size = int(smaller_dim * 0.035)
    if footer_font_size < 12:
        footer_font_size = 12
    elif footer_font_size > 22:
        footer_font_size = 22
        
    try:
        font_footer = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", footer_font_size)
    except IOError:
        font_footer = ImageFont.load_default()
        
    footer_str = "powered by Alize Software Services"
    
    f_bbox = draw.textbbox((0, 0), footer_str, font=font_footer)
    fw = f_bbox[2] - f_bbox[0]
    fh = f_bbox[3] - f_bbox[1]
    
    footer_x = (W - fw) // 2
    footer_y = H - int(H * 0.08) - fh
    
    # Draw footer in modern grey/slate
    draw.text((footer_x, footer_y), footer_str, font=font_footer, fill=(71, 85, 105, 255))
    
    return splash

# Generate Android Splashes
for rel_path, (W, H) in android_splash_resolutions.items():
    dest_path = os.path.join(res_dir, rel_path)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    splash_img = create_splash_screen(W, H)
    splash_img.save(dest_path, "PNG")
    print(f"Generated Android splash screen for {rel_path} ({W}x{H})")

# Generate iOS Splashes
if os.path.exists(ios_splash_dir):
    for filename in ios_splash_files:
        dest_path = os.path.join(ios_splash_dir, filename)
        splash_img = create_splash_screen(2732, 2732)
        splash_img.save(dest_path, "PNG")
        print(f"Generated iOS splash screen: {filename} (2732x2732)")

print("All Android and iOS Splash Screen Drawables successfully generated!")
