import torch
from torchvision import transforms
from PIL import Image
import numpy as np
from pathlib import Path
from .unet import UNet

DEFAULT_WEIGHTS_PATH = Path(__file__).resolve().parent / 'saved_models' / 'crack_segmenter.pth'

def get_segmenter_model(weights_path=DEFAULT_WEIGHTS_PATH):
    model = UNet()
    model.load_state_dict(torch.load(weights_path, map_location=torch.device('cpu')))
    model.eval()
    return model

def segment_cracks(model, pil_img, device):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor()
    ])
    img = transform(pil_img).unsqueeze(0).to(device)
    with torch.no_grad():
        out = model(img)
    seg_mask = torch.sigmoid(out).cpu().numpy()
    seg_mask = (seg_mask > 0.5).astype(np.uint8)
    return seg_mask[0,0]
