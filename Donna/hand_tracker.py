#!/usr/bin/env python3
"""
hand_tracker.py — MediaPipe hand tracking WebSocket server for Donna

Detects thumb (landmark 4) and index finger (landmark 8) tips.
When they are within the pinch threshold, sends pinching=True with (x, y).
Broadcasts JSON frames to all WebSocket clients on ws://localhost:8765.

Run:  python hand_tracker.py
Stop: Ctrl+C  (or press 'q' in the OpenCV preview window)
"""

import asyncio
import json
import math
import cv2
import base64
import mediapipe as mp
import websockets

# ─── Config ───────────────────────────────────────────────────────────────────
HOST            = 'localhost'
PORT            = 8799
CAMERA_INDEX    = 0           # Change if you have multiple cameras
PINCH_THRESHOLD = 40          # Pixels — tune if needed (lower = tighter pinch)
FRAME_WIDTH     = 1280
FRAME_HEIGHT    = 720

# ─── MediaPipe Tasks API ─────────────────────────────────────────────────────
BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# ─── WebSocket Client Registry ───────────────────────────────────────────────
connected_clients: set = set()

async def ws_handler(websocket):
    """Register new client, keep connection alive."""
    connected_clients.add(websocket)
    print(f"[WS] Client connected. Total: {len(connected_clients)}")
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.discard(websocket)
        print(f"[WS] Client disconnected. Total: {len(connected_clients)}")

async def broadcast(data: dict):
    """Send JSON data to all connected clients."""
    if not connected_clients:
        return
    message = json.dumps(data)
    # Use asyncio.gather for concurrent send
    await asyncio.gather(
        *[client.send(message) for client in list(connected_clients)],
        return_exceptions=True
    )

# ─── Camera + Tracking Loop ──────────────────────────────────────────────────
async def tracking_loop():
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print("[ERROR] Cannot open camera. Check CAMERA_INDEX in hand_tracker.py")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    options = HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path='C:/xampp/htdocs/Donna/hand_landmarker.task'),
        running_mode=VisionRunningMode.IMAGE,
        num_hands=1,
        min_hand_detection_confidence=0.7,
        min_hand_presence_confidence=0.6,
        min_tracking_confidence=0.6)

    with HandLandmarker.create_from_options(options) as landmarker:

        print(f"[INFO] Hand tracker started. WebSocket on ws://{HOST}:{PORT}")
        print("[INFO] Press 'q' in the preview window to quit.\n")

        while True:
            success, frame = cap.read()
            if not success:
                print("[WARN] Failed to read frame from camera.")
                await asyncio.sleep(0.01)
                continue

            # Flip for mirror effect
            frame = cv2.flip(frame, 1)
            rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            results = landmarker.detect(mp_image)
            
            bgr     = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

            pinching  = False
            finger_x  = 0
            finger_y  = 0
            h, w, _   = bgr.shape

            if results.hand_landmarks:
                hand_lms = results.hand_landmarks[0]

                # Manual Drawing of nodes (lite version)
                for lm in hand_lms:
                    cx, cy = int(lm.x * w), int(lm.y * h)
                    cv2.circle(bgr, (cx, cy), 2, (0, 255, 0), -1)

                thumb_tip = hand_lms[4]  
                index_tip = hand_lms[8]

                tx, ty = int(thumb_tip.x * w), int(thumb_tip.y * h)
                ix, iy = int(index_tip.x * w), int(index_tip.y * h)

                dist = math.hypot(ix - tx, iy - ty)

                # Midpoint of the two tips = drawing cursor
                finger_x = (tx + ix) // 2
                finger_y = (ty + iy) // 2
                pinching  = dist < PINCH_THRESHOLD

                # Visual feedback in preview
                color = (0, 0, 220) if pinching else (200, 200, 200)
                cv2.circle(bgr, (tx, ty), 10, color, -1)
                cv2.circle(bgr, (ix, iy), 10, color, -1)
                cv2.line(bgr, (tx, ty), (ix, iy), color, 2)
                cv2.circle(bgr, (finger_x, finger_y), 8, (0, 0, 255) if pinching else (255,255,255), -1)

                label = f"PINCHING ({int(dist)}px)" if pinching else f"Open ({int(dist)}px)"
                cv2.putText(bgr, label, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)

            # Broadcast frame to browser
            prev_thumb = cv2.resize(bgr, (320, 180))
            _, buffer = cv2.imencode('.jpg', prev_thumb, [cv2.IMWRITE_JPEG_QUALITY, 50])
            b64_img = base64.b64encode(buffer).decode('utf-8')

            await broadcast({
                "x":           finger_x,
                "y":           finger_y,
                "pinching":    bool(pinching),
                "frameWidth":  w,
                "frameHeight": h,
                "image":       b64_img
            })

            # Yield control to asyncio event loop
            await asyncio.sleep(0.01)

    cap.release()
    cv2.destroyAllWindows()

# ─── Entry Point ─────────────────────────────────────────────────────────────
async def main():
    ws_server = await websockets.serve(ws_handler, HOST, PORT)
    print(f"[WS] WebSocket server listening on ws://{HOST}:{PORT}")
    await asyncio.gather(
        ws_server.wait_closed(),
        tracking_loop()
    )

if __name__ == '__main__':
    asyncio.run(main())
