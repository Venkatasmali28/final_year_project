import React from "react";

function HeatmapVisualization({ gradcam }) {
  return (
    <div className="visual-block heatmap-block">
      <div className="block-title">Grad-CAM Heatmap</div>
      <img
        src={`data:image/png;base64,${gradcam}`}
        alt="Grad-CAM heatmap showing model focus areas"
        className="analysis-image heatmap-image"
      />
      <div className="heatmap-legend" aria-label="Heatmap legend">
        <span className="legend-cool">Low focus</span>
        <span className="legend-bar" />
        <span className="legend-hot">High focus</span>
      </div>
    </div>
  );
}

export default HeatmapVisualization;
