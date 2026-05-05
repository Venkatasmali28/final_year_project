import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import HeatmapVisualization from "../components/HeatmapVisualization";

const API_URL = "http://127.0.0.1:5000/predict";
const TEST_SAMPLES_URL = "http://127.0.0.1:5000/test-samples";

function RockAnalyzer() {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
    setResults([]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeImages = async () => {
    if (images.length === 0) return;

    setLoading(true);
    setResults([]);

    try {
      const analysisResults = await Promise.all(
        images.map((image) => analyzeImage(image))
      );
      setResults(analysisResults);
    } catch (err) {
      setResults([
        { error: err.message || "Server error or cannot connect." },
      ]);
    }
    setLoading(false);
  };

  const analyzeImage = async (imageFile) => {
    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      return { error: err.message || "Server error" };
    }
  };

  const loadTestSamples = async () => {
    setLoading(true);
    try {
      const response = await fetch(TEST_SAMPLES_URL);
      if (!response.ok) throw new Error("Failed to load test samples");

      const data = await response.json();
      setImages([]); // Clear current images
      setPreviews(data.samples.map((sample) => `data:image/png;base64,${sample.image}`));
      setResults(data.samples.map((sample) => ({
        result: sample.rock_type,
        confidence: sample.confidence,
        gradcam: sample.gradcam,
        segmentation_mask: sample.segmentation_mask,
        face: sample.face,
        weak_points: sample.weak_points,
      })));
    } catch (err) {
      alert(`Error loading test samples: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🪨 Advanced Rock Analyzer
          </h1>
          <p className="text-gray-600">
            Identify rock types, detect weak points, and analyze structural integrity using AI
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-8 py-2 rounded-lg font-semibold transition ${
              activeTab === "upload"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400"
            }`}
          >
            📤 Upload Images
          </button>
          <button
            onClick={() => {
              setActiveTab("samples");
              loadTestSamples();
            }}
            className={`px-8 py-2 rounded-lg font-semibold transition ${
              activeTab === "samples"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-400"
            }`}
          >
            📚 Test Samples
          </button>
        </div>

        {/* Upload Section */}
        {activeTab === "upload" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl shadow-lg p-8 mb-8"
          >
            <div className="flex flex-col items-center gap-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-3 border-dashed border-blue-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition"
              >
                <p className="text-4xl mb-2">📸</p>
                <p className="text-lg font-semibold text-gray-700">
                  Click or drag images here
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Upload multiple rock faces for comprehensive analysis
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              {previews.length > 0 && (
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Selected Images ({previews.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {previews.map((preview, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.05 }}
                        className="relative"
                      >
                        <img
                          src={preview}
                          alt={`preview-${idx}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-blue-200"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={analyzeImages}
                disabled={images.length === 0 || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg px-8 py-3 font-bold text-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? "🔍 Analyzing..." : "🚀 Analyze Rock Images"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              📊 Analysis Results
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {results.map((result, idx) => (
                <RockAnalysisCard key={idx} result={result} imageIdx={idx} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function RockAnalysisCard({ result, imageIdx }) {
  const [expanded, setExpanded] = useState(false);

  if (result.error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-red-50 border-2 border-red-300 rounded-xl p-6"
      >
        <p className="text-red-700 font-semibold">❌ Error: {result.error}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold mb-1">
              Rock {imageIdx + 1}: {result.result}
            </h3>
            {result.face && (
              <p className="text-blue-100 text-sm">Face: {result.face}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              {(result.confidence * 100).toFixed(1)}%
            </p>
            <p className="text-blue-100 text-xs">Confidence</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Heatmap with Axes */}
        {result.gradcam && (
          <div className="space-y-2">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              🔥 Grad-CAM Heatmap Analysis
            </h4>
            <HeatmapVisualization gradcam={result.gradcam} title="AI Importance Map" />
            <p className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
              <strong>How to read:</strong> Red regions indicate areas the model found most important for classification. These may represent structural features or potential weak points.
            </p>
          </div>
        )}

        {/* Weak Points */}
        {result.weak_points && result.weak_points.length > 0 && (
          <div className="space-y-2 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              ⚠️ Detected Weak Points
            </h4>
            <div className="space-y-2">
              {result.weak_points.map((point, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="text-lg">📍</span>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-800">
                      Position: X={point.x}px, Y={point.y}px
                    </p>
                    <p className="text-gray-600">Intensity: {point.intensity}%</p>
                    <p className="text-gray-700 mt-1">{point.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Segmentation Mask */}
        {result.segmentation_mask && (
          <div className="space-y-2">
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              🔍 Crack Segmentation
            </h4>
            <img
              src={`data:image/png;base64,${result.segmentation_mask}`}
              alt="Segmentation"
              className="w-full h-auto rounded-lg border-2 border-gray-300"
            />
          </div>
        )}

        {/* Expandable Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 mt-4"
        >
          {expanded ? "▼" : "▶"} {expanded ? "Hide" : "Show"} Details
        </button>

        {expanded && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-700">
            <p>
              <strong>Detection Method:</strong> ResNet-18 with Grad-CAM visualization
            </p>
            <p>
              <strong>Model Confidence:</strong> {(result.confidence * 100).toFixed(2)}%
            </p>
            <p>
              <strong>Recommendation:</strong>{" "}
              {result.confidence > 0.9
                ? "High confidence classification - ready for use"
                : result.confidence > 0.7
                ? "Moderate confidence - recommend visual verification"
                : "Low confidence - manual inspection recommended"}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default RockAnalyzer;
