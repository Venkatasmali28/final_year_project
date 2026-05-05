import React, { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import HeatmapVisualization from "./components/HeatmapVisualization";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:5000";

const equipmentList = ["Pump", "Compressor", "Turbine"];
const locationList = [
  "Delhi",
  "Mumbai",
  "Chennai",
  "Hyderabad",
  "Bangalore",
  "Kolkata",
  "Jaipur",
  "Ahmedabad",
  "Pune",
  "Goa",
];

const starterReadings = {
  temperature: "",
  pressure: "",
  vibration: "",
  humidity: "",
  equipment: "",
  location: "",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 2) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

const EQUIPMENT_LIMITS = {
  Pump: {
    temperature: { warn: 80, critical: 95 },
    pressure: { warn: 6.5, critical: 8.5 },
    vibration: { warn: 3.8, critical: 6.0 },
    humidity: { warn: 70, critical: 85 },
  },
  Compressor: {
    temperature: { warn: 90, critical: 105 },
    pressure: { warn: 8.0, critical: 10.5 },
    vibration: { warn: 4.2, critical: 6.5 },
    humidity: { warn: 70, critical: 85 },
  },
  Turbine: {
    temperature: { warn: 120, critical: 145 },
    pressure: { warn: 10.0, critical: 13.5 },
    vibration: { warn: 3.2, critical: 5.4 },
    humidity: { warn: 75, critical: 88 },
  },
};

function computeHealthAnalytics(rawInputs) {
  const equipment = rawInputs.equipment || "Pump";
  const limits = EQUIPMENT_LIMITS[equipment] ?? EQUIPMENT_LIMITS.Pump;

  const temperature = toNumber(rawInputs.temperature);
  const pressure = toNumber(rawInputs.pressure);
  const vibration = toNumber(rawInputs.vibration);
  const humidity = toNumber(rawInputs.humidity);

  const signals = [
    { key: "temperature", label: "Temperature", unit: "°C", value: temperature, weight: 0.32 },
    { key: "pressure", label: "Pressure", unit: "bar", value: pressure, weight: 0.22 },
    { key: "vibration", label: "Vibration", unit: "mm/s", value: vibration, weight: 0.34 },
    { key: "humidity", label: "Humidity", unit: "%", value: humidity, weight: 0.12 },
  ];

  const contributions = signals.map((signal) => {
    const { warn, critical } = limits[signal.key];
    const safe = warn * 0.75;
    const range = Math.max(critical - safe, 1e-6);
    const ratio = clamp((signal.value - safe) / range, 0, 1);
    const severity = round(ratio * 100, 1);
    return {
      ...signal,
      warn,
      critical,
      safe: round(safe, 2),
      ratio,
      severity,
      contribution: ratio * signal.weight,
    };
  });

  const weighted = contributions.reduce((sum, c) => sum + c.contribution, 0);
  const stressIndex = clamp(weighted / contributions.reduce((sum, c) => sum + c.weight, 0), 0, 1);

  const riskScore = round(stressIndex * 100, 1);
  const faultProbabilityLocal = clamp(sigmoid((stressIndex - 0.55) * 7), 0, 1);

  const status =
    riskScore >= 75 ? "Failing Condition" : riskScore >= 45 ? "At-Risk Condition" : "Healthy Condition";

  const alerts = contributions
    .filter((c) => c.value >= c.warn)
    .sort((a, b) => b.ratio - a.ratio)
    .map((c) => `${c.label} above warning threshold (${c.value}${c.unit} ≥ ${c.warn}${c.unit}).`);

  return {
    equipment,
    riskScore,
    stressIndex: round(stressIndex, 3),
    faultProbabilityLocal,
    status,
    alerts,
    contributions,
    limits,
  };
}

function App() {
  const [activeTool, setActiveTool] = useState("rock");

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MineSafety Operations</p>
          <h1>Inspection Console</h1>
        </div>
        <nav className="tool-switch" aria-label="Inspection tools">
          <button
            className={activeTool === "rock" ? "active" : ""}
            onClick={() => setActiveTool("rock")}
            type="button"
          >
            Rock Analysis
          </button>
          <button
            className={activeTool === "machine" ? "active" : ""}
            onClick={() => setActiveTool("machine")}
            type="button"
          >
            Equipment Health
          </button>
        </nav>
      </header>

      <main className="console-frame">
        <section
          className="workspace-slider"
          style={{ transform: activeTool === "rock" ? "translateX(0)" : "translateX(-50%)" }}
        >
          <div className="workspace-panel">
            <RockAnalyzer />
          </div>
          <div className="workspace-panel">
            <MachineLife />
          </div>
        </section>
      </main>
    </div>
  );
}

function RockAnalyzer() {
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);

  const hasResults = results.length > 0;

  const handleFiles = (files) => {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!selected.length) return;
    setImages((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...selected.map((file) => URL.createObjectURL(file))]);
    setResults([]);
    setStatus("");
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setResults([]);
  };

  const analyzeImages = async () => {
    if (!images.length) return;
    setLoading(true);
    setStatus("Analyzing rock texture, fracture regions, and model focus areas.");
    setResults([]);

    const nextResults = await Promise.all(
      images.map(async (image) => {
        const formData = new FormData();
        formData.append("image", image);

        try {
          const response = await fetch(`${API_BASE_URL}/predict`, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || `Server responded with ${response.status}`);
          return data;
        } catch (error) {
          return { error: error.message || "Server error or backend is not running." };
        }
      })
    );

    setResults(nextResults);
    setStatus("");
    setLoading(false);
  };

  return (
    <div className="tool-layout">
      <aside className="control-panel">
        <div className="panel-heading">
          <p className="eyebrow">Visual Inspection</p>
          <h2>Rock Heatmap</h2>
          <p>Upload one or more rock faces and inspect classification, Grad-CAM focus, crack mask, and weak point coordinates.</p>
        </div>

        <div
          className="drop-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFiles(event.dataTransfer.files);
          }}
          role="button"
          tabIndex={0}
        >
          <span className="drop-icon">+</span>
          <strong>Add Rock Images</strong>
          <small>JPG, PNG, JPEG, or JFIF</small>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(event) => handleFiles(event.target.files)}
          className="sr-only"
        />

        <div className="action-row single-action">
          <button className="primary-action" onClick={analyzeImages} disabled={!images.length || loading} type="button">
            {loading ? "Working..." : "Analyze Images"}
          </button>
        </div>

        {status && <p className="status-line">{status}</p>}

        {previews.length > 0 && (
          <div className="preview-grid">
            {previews.map((preview, index) => (
              <figure key={preview} className="preview-tile">
                <img src={preview} alt={`Rock preview ${index + 1}`} />
                {images[index] && (
                  <button onClick={() => removeImage(index)} type="button" aria-label={`Remove image ${index + 1}`}>
                    Remove
                  </button>
                )}
              </figure>
            ))}
          </div>
        )}
      </aside>

      <section className="results-panel">
        {!hasResults && (
          <div className="empty-state">
            <h3>No analysis yet</h3>
            <p>Select rock images to show the heatmap, segmentation mask, and safety signals here.</p>
          </div>
        )}

        {hasResults && (
          <div className="result-list">
            {results.map((result, index) => (
              <RockResultCard key={`${result.result || "result"}-${index}`} result={result} preview={previews[index]} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RockResultCard({ result, preview, index }) {
  const confidence = Number(result.confidence || 0);
  const confidenceLabel = `${(confidence * 100).toFixed(1)}%`;

  if (result.error) {
    return (
      <article className="result-card error-card">
        <h3>Image {index + 1}</h3>
        <p>{result.error}</p>
      </article>
    );
  }

  return (
    <article className="result-card">
      <div className="result-header">
        <div>
          <p className="eyebrow">Image {index + 1}</p>
          <h3>{result.result || "Unknown rock"}</h3>
          {result.face && <span className="subtle-pill">{result.face}</span>}
        </div>
        <div className="confidence-meter" aria-label={`Confidence ${confidenceLabel}`}>
          <strong>{confidenceLabel}</strong>
          <span>confidence</span>
        </div>
      </div>

      <div className="visual-grid">
        {preview && (
          <div className="visual-block">
            <div className="block-title">Source Image</div>
            <img src={preview} alt={`Source rock ${index + 1}`} className="analysis-image" />
          </div>
        )}
        {result.gradcam && <HeatmapVisualization gradcam={result.gradcam} />}
        {result.segmentation_mask && (
          <div className="visual-block">
            <div className="block-title">Crack Segmentation</div>
            <img
              src={`data:image/png;base64,${result.segmentation_mask}`}
              alt="Crack segmentation mask"
              className="analysis-image mask-image"
            />
          </div>
        )}
      </div>

      <div className="insight-grid">
        <div>
          <h4>Model Reading</h4>
          <p>
            {confidence >= 0.85
              ? "High confidence result. The sample is suitable for rapid review."
              : confidence >= 0.65
                ? "Moderate confidence result. Confirm with manual inspection."
                : "Low confidence result. Treat this as a flag for closer inspection."}
          </p>
        </div>
        <div>
          <h4>Top Predictions</h4>
          {result.top_predictions?.length ? (
            <ul className="prediction-list">
              {result.top_predictions.map((prediction) => (
                <li key={prediction.class_name}>
                  <span>{prediction.class_name}</span>
                  <strong>{(Number(prediction.confidence) * 100).toFixed(1)}%</strong>
                  <i style={{ width: `${Math.max(Number(prediction.confidence) * 100, 2)}%` }} />
                </li>
              ))}
            </ul>
          ) : (
            <p>The backend did not return class probability details for this image.</p>
          )}
        </div>
        <div>
          <h4>Weak Points</h4>
          {result.weak_points?.length ? (
            <ul className="weak-point-list">
              {result.weak_points.map((point, pointIndex) => (
                <li key={`${point.x}-${point.y}-${pointIndex}`}>
                  <strong>X {point.x}, Y {point.y}</strong>
                  <span>{point.intensity}% intensity</span>
                  <small>{point.description}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No high-intensity weak point returned for this sample.</p>
          )}
        </div>
      </div>
    </article>
  );
}

function MachineLife() {
  const [inputs, setInputs] = useState(starterReadings);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [history, setHistory] = useState([]);

  const analytics = useMemo(() => computeHealthAnalytics(inputs), [inputs]);

  const riskLabel = useMemo(() => {
    if (!result || result.error) return null;
    return result.fault_pred === 1 ? "Fault Risk Detected" : "Machine Healthy";
  }, [result]);

  const finalProbability = useMemo(() => {
    if (result && !result.error && Number.isFinite(Number(result.probability))) return Number(result.probability);
    return analytics.faultProbabilityLocal;
  }, [analytics.faultProbabilityLocal, result]);

  const finalFaultPred = useMemo(() => {
    if (result && !result.error && typeof result.fault_pred !== "undefined") return result.fault_pred;
    return finalProbability >= 0.5 ? 1 : 0;
  }, [finalProbability, result]);

  const finalStatus = useMemo(() => {
    if (finalFaultPred === 1) return "Failing Condition";
    if (analytics.riskScore >= 45) return "At-Risk Condition";
    return "Healthy Condition";
  }, [analytics.riskScore, finalFaultPred]);

  const handleChange = (event) => {
    setInputs((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setValidationErrors((prev) => {
      if (!prev[event.target.name]) return prev;
      const next = { ...prev };
      delete next[event.target.name];
      return next;
    });
  };

  const validateMachineInputs = (values) => {
    const nextErrors = {};
    const numericRules = {
      temperature: { min: -20, max: 250, label: "Temperature" },
      pressure: { min: 0, max: 30, label: "Pressure" },
      vibration: { min: 0, max: 25, label: "Vibration" },
      humidity: { min: 0, max: 100, label: "Humidity" },
    };

    Object.entries(numericRules).forEach(([field, rule]) => {
      const raw = values[field];
      if (raw === "" || raw === null || typeof raw === "undefined") {
        nextErrors[field] = `${rule.label} is required.`;
        return;
      }
      const numberValue = Number(raw);
      if (!Number.isFinite(numberValue)) {
        nextErrors[field] = `${rule.label} must be a valid number.`;
        return;
      }
      if (numberValue < rule.min || numberValue > rule.max) {
        nextErrors[field] = `${rule.label} must be between ${rule.min} and ${rule.max}.`;
      }
    });

    if (!values.equipment) nextErrors.equipment = "Equipment type is required.";
    if (!values.location) nextErrors.location = "Location is required.";

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateMachineInputs(inputs);
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setError("Please correct validation errors before checking equipment.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/predict_life`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Prediction failed.");
      setResult(data);
    } catch (requestError) {
      setError(requestError.message || "Backend is not responding. Showing local risk calculation.");
    } finally {
      const now = new Date();
      const stamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setHistory((prev) => {
        const next = [
          ...prev,
          {
            time: stamp,
            riskScore: analytics.riskScore,
            probability: round(finalProbability * 100, 2),
            temperature: toNumber(inputs.temperature),
            pressure: toNumber(inputs.pressure),
            vibration: toNumber(inputs.vibration),
            humidity: toNumber(inputs.humidity),
          },
        ];
        return next.slice(-12);
      });
      setLoading(false);
    }
  };

  const gaugeData = useMemo(
    () => [
      {
        name: "Risk",
        value: analytics.riskScore,
        fill: analytics.riskScore >= 75 ? "#c2410c" : analytics.riskScore >= 45 ? "#b45309" : "#2c6b58",
      },
    ],
    [analytics.riskScore]
  );

  const contributionData = useMemo(() => {
    const palette = {
      temperature: "#2456a5",
      pressure: "#4a7c59",
      vibration: "#b9812b",
      humidity: "#7c3aed",
    };
    return analytics.contributions.map((c) => ({
      name: c.label,
      key: c.key,
      severity: c.severity,
      contribution: round(c.contribution * 100, 1),
      fill: palette[c.key] ?? "#2c6b58",
    }));
  }, [analytics.contributions]);

  const recommendation = useMemo(() => {
    if (finalFaultPred === 1) {
      return "Stop the unit if safe, inspect lubrication and bearings, and schedule immediate maintenance.";
    }
    if (analytics.riskScore >= 45) {
      return "Plan inspection during the next shift window. Re-check readings after load changes.";
    }
    return "Operating within expected range. Continue normal monitoring and log readings.";
  }, [analytics.riskScore, finalFaultPred]);

  return (
    <div className="tool-layout machine-layout">
      <aside className="control-panel">
        <div className="panel-heading">
          <p className="eyebrow">Predictive Maintenance</p>
          <h2>Equipment Health</h2>
          <p>Enter live operating readings to detect healthy vs failing condition, with graphs and key calculations.</p>
        </div>

        <form className="machine-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <NumberInput
              label="Temperature"
              name="temperature"
              value={inputs.temperature}
              onChange={handleChange}
              unit="C"
              error={validationErrors.temperature}
            />
            <NumberInput
              label="Pressure"
              name="pressure"
              value={inputs.pressure}
              onChange={handleChange}
              unit="bar"
              error={validationErrors.pressure}
            />
            <NumberInput
              label="Vibration"
              name="vibration"
              value={inputs.vibration}
              onChange={handleChange}
              unit="mm/s"
              error={validationErrors.vibration}
            />
            <NumberInput
              label="Humidity"
              name="humidity"
              value={inputs.humidity}
              onChange={handleChange}
              unit="%"
              error={validationErrors.humidity}
            />
          </div>

          <label className="field-label">
            Equipment Type
            <select name="equipment" value={inputs.equipment} onChange={handleChange}>
              <option value="">Select equipment</option>
              {equipmentList.map((equipment) => (
                <option key={equipment} value={equipment}>
                  {equipment}
                </option>
              ))}
            </select>
            {validationErrors.equipment && <small className="field-error">{validationErrors.equipment}</small>}
          </label>

          <label className="field-label">
            Location
            <select name="location" value={inputs.location} onChange={handleChange}>
              <option value="">Select location</option>
              {locationList.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            {validationErrors.location && <small className="field-error">{validationErrors.location}</small>}
          </label>

          <button className="primary-action" disabled={loading} type="submit">
            {loading ? "Checking..." : "Check Equipment"}
          </button>
        </form>
      </aside>

      <section className="results-panel">
        {!result && !error && (
          <div className="empty-state">
            <h3>Live preview ready</h3>
            <p>As you adjust readings, the calculations update. Press “Check Equipment” to fetch backend probability and log a trend point.</p>
          </div>
        )}

        {error && (
          <article className="result-card error-card">
            <h3>Prediction failed</h3>
            <p>{error}</p>
          </article>
        )}

        <article className={`result-card machine-result ${finalFaultPred === 1 ? "danger" : "healthy"}`}>
            <div className="result-header">
              <div>
                <p className="eyebrow">Maintenance Signal</p>
                <h3>{result && !result.error ? riskLabel : finalStatus}</h3>
                <span className={`status-badge ${finalFaultPred === 1 ? "danger" : analytics.riskScore >= 45 ? "warn" : "healthy"}`}>
                  {finalFaultPred === 1 ? "Failing" : analytics.riskScore >= 45 ? "At-Risk" : "Healthy"} ·{" "}
                  {analytics.equipment}
                </span>
              </div>
              <div className="confidence-meter">
                <strong>{round(finalProbability * 100, 2)}%</strong>
                <span>fault probability</span>
              </div>
            </div>

            <div className="calc-grid">
              <div className="calc-card">
                <p className="calc-label">Risk score</p>
                <p className="calc-value">{analytics.riskScore}</p>
                <p className="calc-sub">0–100 (weighted from thresholds)</p>
              </div>
              <div className="calc-card">
                <p className="calc-label">Stress index</p>
                <p className="calc-value">{analytics.stressIndex}</p>
                <p className="calc-sub">0–1 normalized operating stress</p>
              </div>
              <div className="calc-card">
                <p className="calc-label">Decision</p>
                <p className="calc-value">{finalStatus}</p>
                <p className="calc-sub">Based on probability + risk</p>
              </div>
            </div>

            <div className="chart-grid">
              <div className="chart-card">
                <div className="chart-head">
                  <strong>Risk gauge</strong>
                  <span>{analytics.riskScore >= 75 ? "Critical" : analytics.riskScore >= 45 ? "Warning" : "Normal"}</span>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadialBarChart
                      cx="50%"
                      cy="56%"
                      innerRadius="70%"
                      outerRadius="100%"
                      barSize={14}
                      data={gaugeData}
                      startAngle={210}
                      endAngle={-30}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={10} />
                      <Tooltip formatter={(v) => [`${v}/100`, "Risk score"]} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="gauge-footer">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <div className="chart-head">
                  <strong>Signal contributions</strong>
                  <span>What drives risk</span>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={contributionData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,54,49,0.12)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip
                        formatter={(value, name, props) => {
                          if (props?.dataKey === "severity") return [`${value}%`, "Severity vs thresholds"];
                          if (props?.dataKey === "contribution") return [`${value}%`, "Weighted contribution"];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="severity" name="Severity %" radius={[6, 6, 0, 0]}>
                        {contributionData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} opacity={0.75} />
                        ))}
                      </Bar>
                      <Bar dataKey="contribution" name="Contribution %" fill="#20362f" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-card span-2">
                <div className="chart-head">
                  <strong>Recent trend</strong>
                  <span>Last {Math.max(history.length, 1)} checks</span>
                </div>
                <div className="chart-body">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(36,54,49,0.12)" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="riskScore" name="Risk score" stroke="#2c6b58" strokeWidth={2} dot={false} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="probability"
                        name="Fault probability %"
                        stroke="#b9812b"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {analytics.alerts.length > 0 && (
              <div className="alert-box">
                <strong>Alerts</strong>
                <ul>
                  {analytics.alerts.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="reading-strip">
              {Object.entries(inputs).map(([key, value]) => (
                <div key={key}>
                  <span>{key.replace("_", " ")}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="recommendation">
              <strong>Recommendation</strong>
              <p>{recommendation}</p>
            </div>
        </article>
      </section>
    </div>
  );
}

function NumberInput({ label, name, value, onChange, unit, error }) {
  return (
    <label className="field-label">
      {label}
      <div className="input-with-unit">
        <input type="number" name={name} step="any" value={value} onChange={onChange} />
        <span>{unit}</span>
      </div>
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default App;
