import cv2
import numpy as np

def detect_screen_glare(img_np: np.ndarray) -> dict:
    """
    Detects screen glare patterns by analyzing high-intensity specular highlights
    with strong contrast relative to neighboring pixels.
    """
    gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
    
    # Specular highlights from phone/tablet screens are usually near-white (threshold > 235)
    _, thresh = cv2.threshold(gray, 235, 255, cv2.THRESH_BINARY)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    glare_detected = False
    details = []
    
    for contour in contours:
        area = cv2.contourArea(contour)
        # Exclude tiny noise and overly large areas
        if 80 <= area <= 6000:
            x, y, w, h = cv2.boundingRect(contour)
            
            # Check background neighborhood contrast
            pad = 12
            y1 = max(0, y - pad)
            y2 = min(img_np.shape[0], y + h + pad)
            x1 = max(0, x - pad)
            x2 = min(img_np.shape[1], x + w + pad)
            
            neighborhood = gray[y1:y2, x1:x2]
            avg_neighborhood = np.mean(neighborhood)
            
            spot = gray[y:y+h, x:x+w]
            avg_spot = np.mean(spot)
            
            # High-intensity point contrasting with surrounding is typical of reflections
            if avg_spot - avg_neighborhood > 35:
                glare_detected = True
                details.append({
                    "coordinate": [x, y, w, h],
                    "area": float(area),
                    "contrast_ratio": round(float(avg_spot / (avg_neighborhood + 1)), 2),
                    "reason": "ตรวจพบแสงสะท้อนจ้า (Specular Reflection) ผิดปกติบนพื้นผิว QR"
                })
                
    return {
        "glare_detected": glare_detected,
        "details": details
    }
