import torch
import torch.nn as nn
from torchvision import models
from pathlib import Path

class_names = [
    'Igneous_Basalt', 'Igneous_Granite',
    'Metamorphic_Marble', 'Metamorphic_Quartzite',
    'Sedimentary_Coal', 'Sedimentary_Limestone', 'Sedimentary_Sandstone'
]

# Threshold for classification confidence below which classify as 'Not a rock type'
CONFIDENCE_THRESHOLD = 0.6

DEFAULT_WEIGHTS_PATH = Path(__file__).resolve().parent / 'saved_models' / 'rock_classifier.pth'

def get_classifier_model(weights_path=DEFAULT_WEIGHTS_PATH):
    model = models.resnet18(weights=None)
    model.fc = nn.Linear(model.fc.in_features, len(class_names))
    model.load_state_dict(torch.load(weights_path, map_location=torch.device('cpu')))
    model.eval()
    return model

def classify_with_threshold(model, input_tensor):
    with torch.no_grad():
        out = model(input_tensor)
        probs = torch.softmax(out, dim=1)
        conf, pred = torch.max(probs, 1)
        pred_class, confidence = pred.item(), conf.item()
        if confidence < CONFIDENCE_THRESHOLD:
            return None, confidence  # Not confident, treat as 'Not a rock type'
        return pred_class, confidence

def get_prediction_scores(model, input_tensor, top_k=3):
    with torch.no_grad():
        out = model(input_tensor)
        probs = torch.softmax(out, dim=1).squeeze(0)
        scores = [
            {
                'class_name': class_names[index],
                'confidence': float(probs[index].item())
            }
            for index in range(len(class_names))
        ]
    return sorted(scores, key=lambda item: item['confidence'], reverse=True)[:top_k]
