#!/bin/bash

# Create a simple 1024x1024 PNG placeholder using base64 encoded data
# This is a minimal valid PNG file (indigo/purple colored square for brand consistency)

create_png() {
    local filename=$1
    local size=$2
    
    # Create a simple colored square using ImageMagick if available, otherwise use a minimal PNG
    if command -v convert &> /dev/null; then
        convert -size ${size}x${size} xc:'#6366F1' "$filename"
    else
        # Minimal valid 1x1 PNG (blue pixel) - we'll use this as fallback
        echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > "$filename"
    fi
}

# Create required assets
create_png "icon.png" "1024"
create_png "adaptive-icon.png" "1024"
create_png "splash.png" "1284"
create_png "favicon.png" "48"
create_png "notification-icon.png" "96"

echo "✅ Placeholder assets created"
