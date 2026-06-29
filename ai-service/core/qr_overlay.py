import cv2
import numpy as np

def detect_qr_overlay(img_np: np.ndarray) -> dict:
    """
    Detects if there is a sticker overlay on top of a QR code by finding
    nearly identical overlapping square borders (double border signature).
    """
    gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    
    contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    overlay_detected = False
    details = []
    
    if hierarchy is not None:
        hierarchy = hierarchy[0]
        for i, contour in enumerate(contours):
            area = cv2.contourArea(contour)
            # Focus on reasonably large outlines (like QR outer frames)
            if area < 3000:
                continue
                
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = float(w)/h
            
            # QR outer boundaries are approximately square
            if 0.85 <= aspect_ratio <= 1.15:
                # Search for another contour that matches almost the same bounding box,
                # indicating a double border or sticker edge
                for j, other_contour in enumerate(contours):
                    if i == j:
                        continue
                    other_area = cv2.contourArea(other_contour)
                    if other_area < 3000:
                        continue
                    ox, oy, ow, oh = cv2.boundingRect(other_contour)
                    
                    # If center and size are almost identical, but not exactly the same
                    if abs(x - ox) < 20 and abs(y - oy) < 20 and abs(w - ow) < 20 and abs(h - oh) < 20:
                        # Check area ratio (sticker overlap will have one border slightly larger/smaller)
                        ratio = other_area / area if area > 0 else 0
                        if 0.85 <= ratio <= 0.98:
                            overlay_detected = True
                            details.append({
                                "outer_border": [x, y, w, h],
                                "inner_border": [ox, oy, ow, oh],
                                "overlap_ratio": round(ratio, 2),
                                "reason": "ตรวจพบแนวขอบป้ายสติกเกอร์ซ้อนทับกันที่พิกัดใกล้เคียงกัน"
                            })
                            break
                if overlay_detected:
                    break
                            
    return {
        "overlay_detected": overlay_detected,
        "details": details
    }
