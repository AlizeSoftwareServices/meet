import os
from PIL import Image, ImageDraw

source_image_path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\3efcb1f3-e704-46af-a686-45f06a859ba3\.user_uploaded\media_1787916442408.png"
base_dir = r"d:\PROJECT\Platforms\Calendly-main"

img = Image.open(source_image_path).convert("RGBA")

def create_round_image(image, size):
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    round_img.paste(resized, (0, 0), mask=mask)
    return round_img

# Android Mipmap densities
densities = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432)
}

res_dir = os.path.join(base_dir, "frontend", "android", "app", "src", "main", "res")

for folder, (icon_size, fg_size) in densities.items():
    folder_path = os.path.join(res_dir, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # 1. Standard ic_launcher.png
    launcher = img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    launcher.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
    
    # 2. Round ic_launcher_round.png
    round_launcher = create_round_image(img, icon_size)
    round_launcher.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
    
    # 3. Adaptive Foreground ic_launcher_foreground.png (centered with padding)
    fg = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
    inner_size = int(fg_size * 0.72)
    inner_img = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
    offset = (fg_size - inner_size) // 2
    fg.paste(inner_img, (offset, offset), mask=inner_img)
    fg.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")
    print(f"Generated Android icons for {folder}")

# iOS 1024x1024 Icon
ios_icon_path = os.path.join(base_dir, "frontend", "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset", "AppIcon-512@2x.png")
os.makedirs(os.path.dirname(ios_icon_path), exist_ok=True)
ios_img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
ios_img.save(ios_icon_path, "PNG")
print("Generated iOS AppIcon (1024x1024)")

# Web Icons / Favicons
web_icon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
web_icon_512.save(os.path.join(base_dir, "frontend", "public", "icon.png"), "PNG")
web_icon_512.save(os.path.join(base_dir, "frontend", "src", "app", "icon.png"), "PNG")

web_icon_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
web_icon_180.save(os.path.join(base_dir, "frontend", "src", "app", "apple-icon.png"), "PNG")

# Favicon.ico
favicon = img.resize((64, 64), Image.Resampling.LANCZOS)
favicon.save(os.path.join(base_dir, "frontend", "src", "app", "favicon.ico"), "ICO", sizes=[(32, 32), (64, 64)])
favicon.save(os.path.join(base_dir, "frontend", "public", "favicon.ico"), "ICO", sizes=[(32, 32), (64, 64)])
print("Generated Web Favicons & Apple Touch Icons")

print("All Icons Generated Successfully!")
