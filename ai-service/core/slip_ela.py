import cv2
import numpy as np
from PIL import Image, ImageChops
import io
import base64

def compute_ela(img_np: np.ndarray, quality: int = 95) -> tuple:
    """
    Computes Error Level Analysis (ELA) on the input image.
    Returns:
        - diff_b64: base64 encoded JPEG of the scaled difference image.
        - max_difference: the maximum difference value found.
        - average_difference: the average error level score (higher score = likely edited).
    """
    # Convert BGR to RGB for PIL processing
    img_rgb = cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)
    
    # Compress the image in memory at the given quality level
    temp_buf = io.BytesIO()
    pil_img.save(temp_buf, format='JPEG', quality=quality)
    temp_buf.seek(0)
    resaved_img = Image.open(temp_buf)
    
    # Compute absolute difference
    diff = ImageChops.difference(pil_img, resaved_img)
    
    # Find extrema to scale the contrast of the difference map
    extrema = diff.getextrema()
    max_diff = max([ex[1] for ex in extrema]) if isinstance(extrema[0], tuple) else extrema[1]
    if max_diff == 0:
        max_diff = 1
    
    # Scale difference map to span full 0-255 brightness range (for visualization)
    scale = 255.0 / max_diff
    diff_scaled = ImageChops.multiply(diff, Image.new('RGB', diff.size, (int(scale), int(scale), int(scale))))
    
    # Convert scaled difference map to base64 string for frontend visualization
    output_buf = io.BytesIO()
    diff_scaled.save(output_buf, format='JPEG')
    diff_bytes = output_buf.getvalue()
    diff_b64 = base64.b64encode(diff_bytes).decode('utf-8')
    
    # Calculate simple stats
    diff_array = np.array(diff)
    average_diff = float(np.mean(diff_array))
    
    # Tampering score is derived from localized high-energy difference pixels
    # Edited areas yield a higher local standard deviation of error levels
    tamper_score = float(np.std(diff_array))
    
    return diff_b64, average_diff, tamper_score
