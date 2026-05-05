from flask import Flask, request, jsonify
from flask_cors import CORS

# ML and numerical imports for equipment analytics
import pickle
import numpy as np
from scipy import ndimage

# Image and torch imports (for rock/crack analysis)
import io
import torch
from PIL import Image, ImageOps, ImageDraw
import base64
import os
from pathlib import Path

# Your custom utility/model imports (these must exist in your project)
from utils.preprocessing import preprocess_input, load_image_from_bytes
from utils.gradcam import generate_gradcam
from models.rock_classifier import get_classifier_model, classify_with_threshold, get_prediction_scores, class_names
from models.crack_segmenter import get_segmenter_model, segment_cracks

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000"])

# Device selection for PyTorch models
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Load deep learning models (rock/crack)
classifier = get_classifier_model().to(device)
segmenter = get_segmenter_model().to(device)

# Load RandomForest and label encoders for equipment fault prediction
with open('models/model.pkl', 'rb') as f:
    clf, le_equipment, le_location = pickle.load(f)

# Rock face descriptions
ROCK_FACES = {
    "top": "Top surface view",
    "side": "Side surface view",
    "front": "Front surface view",
    "bottom": "Bottom surface view"
}

@app.route('/', methods=['GET'])
def home():
    return "MineSafety backend is running.", 200

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    img = request.files['image']
    image_pil = load_image_from_bytes(img.read())
    input_tensor = preprocess_input(image_pil).unsqueeze(0).to(device)

    pred_class, confidence = classify_with_threshold(classifier, input_tensor)
    top_predictions = get_prediction_scores(classifier, input_tensor)
    if pred_class is None:
        return jsonify({
            'result': 'Not a rock type',
            'confidence': confidence,
            'top_predictions': top_predictions,
            'gradcam': None,
            'segmentation_mask': None,
            'weak_points': []
        })

    rock_label = class_names[pred_class]
    cam = generate_gradcam(classifier, input_tensor, pred_class).cpu().numpy()
    
    # Detect weak points from heatmap
    weak_points = detect_weak_points(cam)
    
    # Encode heatmap with axis information
    cam_base64 = encode_image_with_axes(cam, image_pil)
    
    mask = segment_cracks(segmenter, image_pil, device)
    mask_base64 = encode_mask(mask)

    return jsonify({
        'result': rock_label,
        'confidence': float(confidence),
        'top_predictions': top_predictions,
        'gradcam': cam_base64,
        'segmentation_mask': mask_base64,
        'weak_points': weak_points
    })

@app.route('/predict_life', methods=['POST'])
def predict_life():
    data = request.get_json()
    try:
        temperature = float(data['temperature'])
        pressure = float(data['pressure'])
        vibration = float(data['vibration'])
        humidity = float(data['humidity'])
        equipment = data['equipment']
        location = data['location']

        equipment_enc = le_equipment.transform([equipment])[0]
        location_enc = le_location.transform([location])[0]
        X = np.array([[temperature, pressure, vibration, humidity, equipment_enc, location_enc]])
        fault_pred = clf.predict(X)[0]
        probability = clf.predict_proba(X)[0][1]
        return jsonify({"fault_pred": int(fault_pred), "probability": float(probability)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/test-samples', methods=['GET'])
def test_samples():
    """Return sample test data with pre-analyzed rock images"""
    samples = []
    data_dir = Path('data/rock_classification_split/val')
    
    if data_dir.exists():
        # Get sample images from each rock class
        for rock_class in sorted(os.listdir(data_dir)):
            class_path = data_dir / rock_class
            if class_path.is_dir():
                images = list(class_path.glob('*.jfif')) + list(class_path.glob('*.jpg')) + list(class_path.glob('*.png'))
                if images:
                    # Analyze first image from each class
                    img_path = images[0]
                    with open(img_path, 'rb') as f:
                        result = analyze_image_bytes(f.read())
                    
                    if result and 'gradcam' in result:
                        result['face'] = 'validation_sample'
                        samples.append(result)
                    
                    if len(samples) >= 4:  # Limit to 4 samples for demo
                        break
    
    if not samples:
        # Return mock samples if no images found
        samples = generate_mock_samples()
    
    return jsonify({'samples': samples})

# Helper functions
def analyze_image_bytes(image_bytes):
    """Analyze image from bytes and return results"""
    try:
        image_pil = load_image_from_bytes(image_bytes)
        input_tensor = preprocess_input(image_pil).unsqueeze(0).to(device)
        
        pred_class, confidence = classify_with_threshold(classifier, input_tensor)
        if pred_class is None:
            return None
        
        rock_label = class_names[pred_class]
        cam = generate_gradcam(classifier, input_tensor, pred_class).cpu().numpy()
        weak_points = detect_weak_points(cam)
        cam_base64 = encode_image_with_axes(cam, image_pil)
        mask = segment_cracks(segmenter, image_pil, device)
        mask_base64 = encode_mask(mask)
        
        # Convert image to base64
        img_buffer = io.BytesIO()
        image_pil.resize((224, 224)).save(img_buffer, format="PNG")
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
        
        return {
            'image': img_base64,
            'rock_type': rock_label,
            'confidence': float(confidence),
            'gradcam': cam_base64,
            'segmentation_mask': mask_base64,
            'weak_points': weak_points,
            'face': 'validation_sample'
        }
    except Exception as e:
        print(f"Error analyzing image: {e}")
        return None

def generate_mock_samples():
    """Generate mock sample data for demo purposes"""
    return [
        {
            'image': create_placeholder_image(),
            'rock_type': 'Sedimentary_Limestone',
            'confidence': 0.92,
            'face': 'top_surface',
            'gradcam': create_placeholder_heatmap(),
            'segmentation_mask': create_placeholder_mask(),
            'weak_points': [
                {
                    'x': 112,
                    'y': 85,
                    'intensity': 78,
                    'description': 'High-intensity region detected in upper portion'
                },
                {
                    'x': 160,
                    'y': 140,
                    'intensity': 65,
                    'description': 'Minor structural variation detected'
                }
            ]
        }
    ]

def detect_weak_points(heatmap, num_points=3, threshold=0.6):
    """Detect weak points from heatmap using peak detection"""
    weak_points = []
    
    try:
        heatmap = np.squeeze(heatmap)
        if heatmap.ndim != 2:
            return weak_points

        norm_heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)
        heatmap_img = Image.fromarray((norm_heatmap * 255).astype(np.uint8), mode='L')
        resized = np.array(heatmap_img.resize((224, 224), Image.Resampling.BILINEAR)) / 255.0
        
        # Find local maxima
        from scipy.ndimage import maximum_filter
        local_max = maximum_filter(resized, size=15) == resized
        coords = np.where(local_max)
        
        # Get intensity values
        if len(coords[0]) > 0:
            intensities = resized[coords]
            # Sort by intensity (descending)
            sorted_idx = np.argsort(-intensities)
            
            for i in range(min(num_points, len(sorted_idx))):
                idx = sorted_idx[i]
                y, x = coords[0][idx], coords[1][idx]
                intensity = float(intensities[idx] * 100)
                
                if intensity >= threshold * 100:
                    weak_points.append({
                        'x': int(x),
                        'y': int(y),
                        'intensity': round(intensity, 1),
                        'description': get_weak_point_description(intensity)
                    })
    except Exception as e:
        print(f"Warning: Could not detect weak points: {e}")
    
    return weak_points

def get_weak_point_description(intensity):
    """Get description based on intensity"""
    if intensity > 85:
        return "Critical area - high importance for model decision"
    elif intensity > 70:
        return "Significant region - contributes to classification"
    elif intensity > 50:
        return "Moderate region - secondary feature detected"
    else:
        return "Minor region - supports classification"

def encode_image_with_axes(cam, pil_img, size=224):
    """Encode heatmap image with axis labels"""
    cam_normalized = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
    heatmap_array = (cam_normalized * 255).astype(np.uint8)
    
    # Resize heatmap
    heatmap_img = Image.fromarray(heatmap_array).resize((size, size)).convert('L')
    heatmap_img = ImageOps.colorize(heatmap_img, black="blue", white="red")
    
    # Blend with original image
    img_resized = pil_img.resize((size, size)).convert("RGBA")
    heatmap_img = heatmap_img.convert("RGBA")
    blended = Image.blend(img_resized, heatmap_img, alpha=0.4)
    
    # Add axis labels
    blended = add_axes_to_image(blended, size)
    
    # Encode to base64
    buffer = io.BytesIO()
    blended.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def add_axes_to_image(img, size):
    """Add axis labels and grid to image"""
    draw = ImageDraw.Draw(img)
    padding = 30
    
    # Draw axes
    draw.line([(padding, size - padding), (size - padding, size - padding)], fill='black', width=2)
    draw.line([(padding, size - padding), (padding, padding)], fill='black', width=2)
    
    # Add tick marks and labels
    for i in range(5):
        x = padding + (size - 2*padding) * i // 4
        y = padding + (size - 2*padding) * i // 4
        
        # X-axis ticks
        draw.line([(x, size - padding), (x, size - padding + 5)], fill='black', width=1)
        label_x = str(int(i/4 * 224))
        draw.text((x-5, size - padding + 10), label_x, fill='black')
        
        # Y-axis ticks
        draw.line([(padding - 5, y), (padding, y)], fill='black', width=1)
        label_y = str(int((4-i)/4 * 224))
        draw.text((padding - 20, y-5), label_y, fill='black')
    
    return img

def encode_image(cam, pil_img):
    """Legacy function - encode heatmap image"""
    return encode_image_with_axes(cam, pil_img)

def create_placeholder_image():
    """Create a placeholder image for demo"""
    img = Image.new('RGB', (224, 224), color='gray')
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def create_placeholder_heatmap():
    """Create a placeholder heatmap"""
    arr = np.random.rand(224, 224)
    img = Image.fromarray((arr * 255).astype(np.uint8), 'L')
    img = ImageOps.colorize(img, black="blue", white="red")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def create_placeholder_mask():
    """Create a placeholder segmentation mask"""
    arr = np.random.rand(224, 224)
    img = Image.fromarray((arr * 255).astype(np.uint8), 'L')
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def encode_mask(mask):
    """Encode segmentation mask to base64"""
    mask_np = (mask.squeeze() * 255).astype(np.uint8)
    mask_img = Image.fromarray(mask_np).resize((224, 224)).convert("L")
    buffer = io.BytesIO()
    mask_img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

if __name__ == "__main__":
    app.run(debug=True)
