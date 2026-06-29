import cv2
import numpy as np

def embed_watermark(img_np: np.ndarray, data_str: str) -> np.ndarray:
    # Header to recognize watermark and footer to end reading
    full_data = "SG_WM:" + data_str + ":SG_END"
    bits = []
    for char in full_data:
        b = bin(ord(char))[2:].zfill(8)
        bits.extend([int(x) for x in b])
    
    h, w, c = img_np.shape
    total_elements = h * w * c
    if len(bits) > total_elements:
        raise ValueError("Image too small to hold watermark")
        
    flat = img_np.flatten()
    for i, bit in enumerate(bits):
        flat[i] = (flat[i] & ~1) | bit
        
    return flat.reshape((h, w, c))

def extract_watermark(img_np: np.ndarray) -> str:
    flat = img_np.flatten()
    bits = []
    # Read maximum 8000 bits (1000 characters)
    max_bits = min(8000, len(flat))
    for i in range(max_bits):
        bits.append(flat[i] & 1)
        
    chars = []
    for i in range(0, len(bits), 8):
        byte = bits[i:i+8]
        if len(byte) < 8:
            break
        char_val = int("".join(map(str, byte)), 2)
        chars.append(chr(char_val))
        
    decoded = "".join(chars)
    if "SG_WM:" in decoded and ":SG_END" in decoded:
        return decoded.split("SG_WM:")[1].split(":SG_END")[0]
    return ""
