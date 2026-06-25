Add-Type -AssemblyName System.Drawing

$iconsPath = "c:\Users\jwood\Documents\Programs\Claude_Connect\Landed Cost\landed-cost-modern\src-tauri\icons"

function Create-Icon {
    param([int]$size, [string]$filename)

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Blue gradient-like color
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(59, 130, 246))
    $g.FillRectangle($brush, 0, 0, $size, $size)

    # Add a simple dollar sign
    $fontSize = [Math]::Max(8, [int]($size * 0.5))
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString("$", $font, $whiteBrush, $rect, $sf)

    $g.Dispose()
    $bmp.Save("$iconsPath\$filename", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Created $filename"
}

# Create PNG icons
Create-Icon -size 32 -filename "32x32.png"
Create-Icon -size 128 -filename "128x128.png"
Create-Icon -size 256 -filename "128x128@2x.png"

# Create proper ICO file
$icoPath = "$iconsPath\icon.ico"

# Create multiple size bitmaps for the ICO
$sizes = @(16, 32, 48, 64, 128, 256)
$bitmaps = @()

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(59, 130, 246))
    $g.FillRectangle($brush, 0, 0, $size, $size)

    $fontSize = [Math]::Max(8, [int]($size * 0.5))
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString("$", $font, $whiteBrush, $rect, $sf)
    $g.Dispose()

    $bitmaps += $bmp
}

# Write ICO file manually
$ms = New-Object System.IO.MemoryStream

# ICO Header
$writer = New-Object System.IO.BinaryWriter($ms)
$writer.Write([UInt16]0)  # Reserved
$writer.Write([UInt16]1)  # Type (1 = ICO)
$writer.Write([UInt16]$bitmaps.Count)  # Number of images

# Calculate offsets
$headerSize = 6 + (16 * $bitmaps.Count)
$offset = $headerSize
$imageData = @()

foreach ($bmp in $bitmaps) {
    $pngStream = New-Object System.IO.MemoryStream
    $bmp.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $pngStream.ToArray()
    $pngStream.Dispose()
    $imageData += ,@($pngBytes)

    $width = if ($bmp.Width -eq 256) { 0 } else { $bmp.Width }
    $height = if ($bmp.Height -eq 256) { 0 } else { $bmp.Height }

    $writer.Write([byte]$width)
    $writer.Write([byte]$height)
    $writer.Write([byte]0)  # Color palette
    $writer.Write([byte]0)  # Reserved
    $writer.Write([UInt16]1)  # Color planes
    $writer.Write([UInt16]32)  # Bits per pixel
    $writer.Write([UInt32]$pngBytes.Length)  # Size of image data
    $writer.Write([UInt32]$offset)  # Offset to image data

    $offset += $pngBytes.Length
}

foreach ($data in $imageData) {
    $writer.Write($data)
}

$writer.Flush()
[System.IO.File]::WriteAllBytes($icoPath, $ms.ToArray())

$writer.Dispose()
$ms.Dispose()

foreach ($bmp in $bitmaps) {
    $bmp.Dispose()
}

Write-Host "Created icon.ico (proper format)"

# Create a placeholder for icns (macOS) - just copy the png
Copy-Item "$iconsPath\128x128.png" "$iconsPath\icon.icns"
Write-Host "Created icon.icns placeholder"

Write-Host "All icons created!"
