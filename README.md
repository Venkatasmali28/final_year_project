# MineSafety - Mine Safety Analysis Platform

A comprehensive machine learning-based platform for mine safety analysis, combining rock classification, crack detection, and equipment anomaly prediction. Built with Flask backend and React frontend.

## Project Overview

MineSafety is an intelligent system designed to enhance safety in mining operations through:
- **Rock Classification**: Automatically classify rock types from images (7 categories across 3 geological categories)
- **Crack Segmentation**: Detect and segment cracks in mining structures
- **Equipment Anomaly Detection**: Predict equipment faults and maintenance needs
- **Machine Life Prediction**: Estimate remaining useful life of mining equipment

## Features

### 🎯 Enhanced Rock Classification (v2.0)
- **Advanced Visualization**: Grad-CAM heatmaps with X and Y axis labels (0-224 pixels)
- **Weak Point Detection**: Automatic detection of critical regions with intensity scores
- **Multi-Image Analysis**: Upload and analyze multiple rock images batch
- **Multi-Face Support**: Analyze rocks from different angles (top, side, front, bottom)
- **Interactive Heatmaps**: Hover over heatmaps to see exact pixel coordinates
- **Test Samples**: Pre-loaded sample rocks for learning and demonstration

### Rock Classification (Original Features)
- Classifies rocks into 7 categories:
  - Igneous: Basalt, Granite
  - Metamorphic: Marble, Quartzite
  - Sedimentary: Coal, Limestone, Sandstone
- Uses ResNet18 deep learning model
- Confidence threshold-based predictions (>60% confidence required)
- Visual explanations using Grad-CAM

### Crack Segmentation
- Detects and segments cracks in mining structures
- U-Net based semantic segmentation
- Real-time crack analysis
- Mask visualization output

### Equipment Anomaly Detection
- Machine learning-based fault prediction
- Random Forest classifier for equipment failures
- Location-based fault analysis
- Predictive maintenance recommendations

## Project Structure

```
MineSafety/
├── backend/                          # Flask API server
│   ├── app.py                        # Main Flask application
│   ├── requirements.txt              # Python dependencies
│   ├── split_classification_dataset.py
│   ├── split_segmentation_dataset.py
│   ├── data/                         # Dataset directories
│   │   ├── rock_classification/     # Original rock classification data
│   │   ├── rock_classification_split/ # Split train/val data
│   │   ├── crack_segmentation/      # Original crack segmentation data
│   │   └── crack_segmentation_split/ # Split train/val data
│   ├── models/                       # ML models and training scripts
│   │   ├── rock_classifier.py       # Rock classification model
│   │   ├── crack_segmenter.py       # Crack segmentation model
│   │   ├── train_classifier.py      # Rock classifier training
│   │   ├── train_crack_segmentation.py
│   │   ├── train_machinelife.py     # Equipment life prediction training
│   │   ├── unet.py                  # U-Net architecture
│   │   ├── equipment_anomaly_data_india_balanced.csv
│   │   └── saved_models/            # Pre-trained model weights
│   │       ├── rock_classifier.pth
│   │       └── crack_segmenter.pth
│   └── utils/                        # Utility functions
│       ├── preprocessing.py          # Image preprocessing
│       └── gradcam.py               # Grad-CAM visualization
│
└── frontend/                         # React + Vite application
    ├── src/
    │   ├── App.jsx                  # Main application component
    │   ├── main.jsx                 # Entry point
    │   ├── pages/
    │   │   ├── Home.jsx            # Home page
    │   │   ├── RockAnalyser.jsx    # Rock classification interface
    │   │   └── MachineLife.jsx     # Equipment prediction interface
    │   ├── components/
    │   │   └── Footer.jsx          # Footer component
    │   └── assets/
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Tech Stack

### Backend
- **Framework**: Flask
- **Deep Learning**: PyTorch, TorchVision
- **Image Processing**: PIL, OpenCV
- **Machine Learning**: Scikit-learn
- **Database**: Python pickle (model serialization)

### Frontend
- **Framework**: React 19.1.1
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4.1.17
- **Animation**: Framer Motion 12.23.24
- **Routing**: React Router DOM 7.9.5

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Ensure pre-trained models are in `models/saved_models/`:
   - `rock_classifier.pth`
   - `crack_segmenter.pth`

4. Run the Flask server:
```bash
python app.py
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Rock Classification (Enhanced v2.0)
- **POST** `/predict`
  - Uploads an image for rock classification
  - Returns:
    - `result`: Rock type classification
    - `confidence`: Confidence score (0-1)
    - `gradcam`: Base64 encoded heatmap with axis labels (0-224 pixels)
    - `segmentation_mask`: Crack detection mask
    - `weak_points`: List of detected weak points with coordinates and intensity

### Test Samples
- **GET** `/test-samples`
  - Returns pre-analyzed rock samples
  - Useful for learning and demonstration
  - Each sample includes full analysis results

### Crack Segmentation
- **POST** `/segment`
  - Uploads an image for crack detection
  - Returns: segmentation mask and confidence metrics

### Equipment Anomaly
- **POST** `/predict_life`
  - Predicts equipment faults
  - Input: temperature, pressure, vibration, humidity, equipment type, location
  - Returns: fault prediction and probability

### Health Check
- **GET** `/`
  - Returns server status

## Dataset Information

### Rock Classification Dataset
- 7 rock type categories across 3 geological classes
- Organized by type and subtype in `data/rock_classification/`
- Split into train/validation sets in `data/rock_classification_split/`

### Crack Segmentation Dataset
- Images with corresponding mask annotations
- Located in `data/crack_segmentation/`
- Train/test/validation splits available
- Masks in `masks/` directories

## Model Details

### Rock Classifier
- **Architecture**: ResNet18
- **Output Classes**: 7 rock types
- **Confidence Threshold**: 60%
- **Input Size**: Standard ImageNet preprocessing
- **Weights**: `rock_classifier.pth`

### Crack Segmenter
- **Architecture**: U-Net
- **Input Size**: 224x224
- **Output**: Binary segmentation mask
- **Threshold**: 0.5 probability
- **Weights**: `crack_segmenter.pth`

### Equipment Fault Predictor
- **Algorithm**: Random Forest Classifier
- **Input Features**: Equipment specifications, location, usage patterns
- **Model File**: `model.pkl`

## Usage Examples

### Via Frontend
1. Open the application at `http://localhost:5173`
2. Navigate to Rock Analyser for rock classification
3. Navigate to Machine Life for equipment prediction
4. Upload images or input equipment data for predictions

### Via API
```bash
# Rock Classification
curl -X POST http://localhost:5000/predict \
  -F "image=@rock_image.jpg"

# Equipment Fault Prediction
curl -X POST http://localhost:5000/equipment-fault \
  -H "Content-Type: application/json" \
  -d '{"equipment":"pump","location":"entrance","hours_used":5000}'
```

## Configuration

### Backend
- CORS enabled for localhost:5173 and localhost:3000
- PyTorch device auto-detection (CUDA/CPU)
- Model weights paths defined in respective model files

### Frontend
- Vite configuration in `vite.config.js`
- ESLint configuration in `eslint.config.js`
- Tailwind CSS configuration via @tailwindcss/vite

## Generating Test Rock Samples

To create synthetic test rock images with different faces:

```bash
cd backend
python generate_test_rocks.py
```

This will generate:
- Granite samples (crystalline appearance)
- Basalt samples (dark, fine-grained)
- Limestone samples (light, sedimentary)
- Marble samples (metamorphic with veins)
- Multi-face composites (top, side, front, bottom views)

Generated images are saved in `backend/data/test_rocks/`

## Understanding the Heatmap with Axes

The enhanced Grad-CAM visualization includes:
- **X-axis (horizontal)**: Position from 0 to 224 pixels
- **Y-axis (vertical)**: Position from 0 to 224 pixels
- **Color gradient**: Blue (low importance) to Red (high importance)
- **Interactive tooltips**: Hover to see exact coordinates
- **Grid lines**: Subtle background grid for reference

### Reading Coordinates:
```
A red region at (112, 85) means:
- 112 pixels from the left (X)
- 85 pixels from the top (Y)
- High importance for the classification decision
```

## Weak Points Detection

The system automatically detects and reports weak/critical points:
- **Position**: Pixel coordinates (X, Y)
- **Intensity**: Percentage value showing importance (0-100%)
- **Description**: Contextual meaning based on intensity level

Example:
```
⚠️ Weak Point Detected
Position: X=112px, Y=85px
Intensity: 78%
Description: High-intensity region - important for classification
```

## Data Preprocessing

Image preprocessing pipeline includes:
- Normalization to ImageNet statistics
- Resizing to model input dimensions
- Tensor conversion for PyTorch

See `utils/preprocessing.py` for implementation details.

## Visualization

### Grad-CAM
- Visual explanations for rock classification predictions
- Highlights important image regions
- Implementation in `utils/gradcam.py`

## Training Models

### Train Rock Classifier
```bash
cd backend
python models/train_classifier.py
```

### Train Crack Segmenter
```bash
cd backend
python models/train_crack_segmentation.py
```

### Train Equipment Predictor
```bash
cd backend
python models/train_machinelife.py
```

## Dataset Splitting

### Split Rock Classification Data
```bash
python split_classification_dataset.py
```

### Split Crack Segmentation Data
```bash
python split_segmentation_dataset.py
```

## Development

### Running Tests
```bash
cd frontend
npm run lint
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

## Performance Considerations

- Models run on GPU if available (auto-detected)
- Fallback to CPU for systems without CUDA
- Image resizing to fixed dimensions for efficiency
- Batch processing support for multiple predictions

## Security

- CORS configured for specific origins
- Input validation on file uploads
- Model weights protected in saved_models directory

## Troubleshooting

### Model Loading Issues
- Verify model files exist in `models/saved_models/`
- Check PyTorch device compatibility
- Ensure correct file paths in model Python files

### Image Upload Problems
- Verify image format (JPG, PNG supported)
- Check image size isn't exceeding limits
- Ensure proper CORS configuration

### Frontend Not Connecting
- Verify Flask backend is running on correct port
- Check CORS origin configuration in app.py
- Clear browser cache and refresh

## Future Enhancements

- Real-time video stream processing
- Multi-model ensemble predictions
- Advanced anomaly detection algorithms
- Mobile app integration
- Cloud deployment
- Database integration for historical data
- Advanced analytics dashboard

## Version History & Improvements

### Version 2.0 - Enhanced Rock Analyzer (Latest)

**Major Features:**
- ✨ **Clean, Modern UI**: Professional gradient-based design with Tailwind CSS
- 🔥 **Advanced Heatmap Visualization**: Grad-CAM with X/Y axis labels (0-224 pixels)
- 📍 **Weak Point Detection**: Automatic identification of critical regions with intensity scores
- 📸 **Multi-Image Support**: Batch analyze multiple rock images simultaneously
- 📐 **Multi-Face Analysis**: Support for analyzing rocks from different angles
- 🎓 **Test Samples**: Pre-loaded samples for learning and demonstration
- 🖱️ **Interactive Features**: Hover tooltips showing exact pixel coordinates

**Technical Improvements:**
- Enhanced backend endpoints with `/test-samples` endpoint
- New `HeatmapVisualization.jsx` component
- Improved image processing with axis label generation
- Weak point detection algorithm using NumPy
- Better error handling and fallback mechanisms
- Canvas-based interactive visualization

**Files Updated:**
- `frontend/src/pages/RockAnalyser.jsx` - Complete redesign
- `frontend/src/components/HeatmapVisualization.jsx` - New component
- `backend/app.py` - Enhanced with new endpoints and functions
- `backend/generate_test_rocks.py` - New script for generating test data

**Documentation:**
- `IMPROVEMENTS.md` - Comprehensive improvement guide
- `README.md` - Updated with new features and usage

For complete details on improvements, see [IMPROVEMENTS.md](./IMPROVEMENTS.md)

### Version 1.0 - Initial Release

- Basic rock classification
- Crack segmentation
- Equipment fault prediction
- Simple Grad-CAM visualization

## License

This project is part of the MineSafety initiative for mine safety analysis.

## Support

For issues, questions, or contributions, please refer to the project repository or contact the development team.

---

**Repository**: Rock_classification_Analysis  
**Owner**: Venkatasmali28  
**Last Updated**: December 2025
