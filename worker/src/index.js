# Zoom Profile Picture Uploader — React + Cloudflare Worker Starter

## `worker/src/index.js`

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (url.pathname === "/api/upload-pictures" && request.method === "POST") {
      try {
        const form = await request.formData();
        const csvFile = form.get("csv");

        if (!csvFile || !(csvFile instanceof File)) {
          return json({ error: "Missing CSV file in form field 'csv'." }, 400);
        }

        const csvText = await csvFile.text();
        const rows = parseCsv(csvText);

        if (!rows.length) {
          return json({ error: "CSV is empty." }, 400);
        }

        const imageMap = new Map();
        for (const [key, value] of form.entries()) {
          if (key === "images" && value instanceof File) {
            imageMap.set(value.name, value);
          }
        }

        if (imageMap.size === 0) {
          return json({ error: "No image files uploaded. Use form field 'images'." }, 400);
        }

        const accessToken = await getZoomAccessToken(env);
        const results = [];

        for (const row of rows) {
          const email = (row.email || "").trim();
          const filename = (row.filename || row.photo_path || "").trim();

          if (!email || !filename) {
            results.push({
              email,
              filename,
              success: false,
              status: 0,
              message: "Missing email or filename in CSV row",
            });
            continue;
          }

          const file = imageMap.get(filename);
          if (!file) {
            results.push({
              email,
              filename,
              success: false,
              status: 0,
              message: `No uploaded file matched '${filename}'`,
            });
            continue;
          }

          const uploadResult = await uploadZoomProfilePicture(accessToken, email, file);
          results.push({ email, filename, ...uploadResult });
        }

        return json(
          {
            total: results.length,
            succeeded: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            results,
          },
          200
        );
      } catch (err) {
        return json(
          {
            error: "Unexpected Worker error",
            details: err instanceof Error ? err.message : String(err),
          },
          500
        );
      }
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response("Zoom profile picture uploader worker is running.", {
        status: 200,
        headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders(),
    });
  },
};

async function getZoomAccessToken(env) {
  const credentials = `${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`;
  const basicAuth = btoa(credentials);

  const body = new URLSearchParams({
    grant_type: "account_credentials",
    account_id: env.ZOOM_ACCOUNT_ID,
  });

  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`Zoom token request failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function uploadZoomProfilePicture(accessToken, userEmail, file) {
  const form = new FormData();
  form.append("file", file, file.name);

  const response = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userEmail)}/picture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = { raw: await response.text() };
  }

  return {
    success: response.ok,
    status: response.status,
    message: data?.message || (response.ok ? "Success" : "Zoom returned an error"),
    zoomResponse: data,
  };
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });

    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
    }),
  });
}
```

## `worker/wrangler.toml`

```toml
name = "zoom-profile-picture-worker"
main = "src/index.js"
compatibility_date = "2026-03-10"
```

## `frontend/package.json`

```json
{
  "name": "zoom-profile-picture-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "vite": "^7.0.0"
  }
}
```

## `frontend/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zoom Profile Picture Uploader</title>
    <script type="module" src="/src/main.jsx"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

## `frontend/src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## `frontend/src/App.jsx`

```jsx
import { useMemo, useState } from "react";

const WORKER_BASE_URL = "https://adarahomehealth.itcontact-521.workers.dev";

export default function App() {
  const [csvFile, setCsvFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [workerUrl, setWorkerUrl] = useState(WORKER_BASE_URL);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const imageNames = useMemo(() => imageFiles.map((file) => file.name), [imageFiles]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!csvFile) {
      setError("Please choose a CSV file.");
      return;
    }

    if (!imageFiles.length) {
      setError("Please choose one or more image files.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("csv", csvFile);
      imageFiles.forEach((file) => formData.append("images", file, file.name));

      const response = await fetch(`${workerUrl.replace(/\/$/, "")}/api/upload-pictures`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || data?.details || "Upload failed.");
      }

      setResult(data);
    } catch (submitError) {
      setError(submitError.message || "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function downloadResults() {
    if (!result) return;

    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "zoom-profile-picture-results.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">React + Cloudflare Worker</p>
          <h1>Zoom Profile Picture Uploader</h1>
          <p className="hero-copy">
            Upload a CSV with <strong>email,filename</strong> and a matching set of image files.
            The browser sends everything to your Worker, and the Worker updates Zoom using your
            server-to-server OAuth app.
          </p>
        </div>
      </header>

      <main className="layout-grid">
        <section className="panel">
          <h2>Upload batch</h2>
          <form onSubmit={handleSubmit} className="form-stack">
            <label className="field">
              <span>Worker base URL</span>
              <input
                type="url"
                value={workerUrl}
                onChange={(event) => setWorkerUrl(event.target.value)}
                placeholder="https://your-worker.workers.dev"
                required
              />
            </label>

            <label className="field">
              <span>CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => setCsvFile(event.target.files?.[0] || null)}
                required
              />
            </label>

            <label className="field">
              <span>Image files</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                multiple
                onChange={(event) => setImageFiles(Array.from(event.target.files || []))}
                required
              />
            </label>

            <div className="helper-box">
              <div><strong>Expected CSV columns</strong></div>
              <code>email,filename</code>
            </div>

            <button type="submit" disabled={isSubmitting} className="primary-button">
              {isSubmitting ? "Uploading..." : "Start Zoom upload"}
            </button>
          </form>

          {error ? <div className="error-banner">{error}</div> : null}
        </section>

        <section className="panel">
          <h2>Files in current batch</h2>
          <div className="meta-grid">
            <div className="stat-card">
              <span className="stat-label">CSV selected</span>
              <strong>{csvFile?.name || "None"}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Images selected</span>
              <strong>{imageFiles.length}</strong>
            </div>
          </div>

          <div className="file-list-wrap">
            {imageNames.length ? (
              <ul className="file-list">
                {imageNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              <p className="muted">No images selected yet.</p>
            )}
          </div>
        </section>
      </main>

      <section className="panel results-panel">
        <div className="results-header">
          <div>
            <h2>Results</h2>
            <p className="muted">Per-user response details from the Worker and Zoom API.</p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={downloadResults}
            disabled={!result}
          >
            Download JSON
          </button>
        </div>

        {!result ? (
          <div className="empty-state">No upload has been run yet.</div>
        ) : (
          <>
            <div className="meta-grid summary-grid">
              <div className="stat-card success">
                <span className="stat-label">Succeeded</span>
                <strong>{result.succeeded}</strong>
              </div>
              <div className="stat-card failure">
                <span className="stat-label">Failed</span>
                <strong>{result.failed}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Total</span>
                <strong>{result.total}</strong>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Email</th>
                    <th>Filename</th>
                    <th>HTTP</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((row, index) => (
                    <tr key={`${row.email}-${row.filename}-${index}`}>
                      <td>
                        <span className={row.success ? "pill success" : "pill failure"}>
                          {row.success ? "Success" : "Failed"}
                        </span>
                      </td>
                      <td>{row.email || "—"}</td>
                      <td>{row.filename || "—"}</td>
                      <td>{row.status || "—"}</td>
                      <td className="message-cell">{row.message || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
```

## `frontend/src/styles.css`

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #0f172a;
  background: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

button,
input {
  font: inherit;
}

.page-shell {
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 20px 56px;
}

.hero-card,
.panel {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.hero-card {
  padding: 32px;
  margin-bottom: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #2563eb;
}

h1,
h2 {
  margin: 0;
}

h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.05;
  margin-bottom: 12px;
}

h2 {
  font-size: 1.2rem;
  margin-bottom: 16px;
}

.hero-copy,
.muted {
  color: #475569;
}

.layout-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 24px;
  margin-bottom: 24px;
}

.panel {
  padding: 24px;
}

.form-stack {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span {
  font-weight: 600;
}

.field input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid #cbd5e1;
  background: #fff;
}

.helper-box {
  padding: 14px 16px;
  border-radius: 16px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
}

.primary-button,
.secondary-button {
  border: 0;
  border-radius: 16px;
  padding: 12px 16px;
  font-weight: 700;
}

.primary-button {
  background: #2563eb;
  color: white;
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.secondary-button {
  background: #e2e8f0;
  color: #0f172a;
}

.error-banner {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 18px;
}

.stat-card {
  padding: 16px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.stat-card.success {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.stat-card.failure {
  background: #fef2f2;
  border-color: #fecaca;
}

.stat-label {
  display: block;
  font-size: 0.82rem;
  color: #64748b;
  margin-bottom: 6px;
}

.file-list-wrap {
  margin-top: 18px;
  max-height: 320px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: white;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.file-list li {
  padding: 12px 14px;
  border-bottom: 1px solid #eef2f7;
}

.file-list li:last-child {
  border-bottom: 0;
}

.results-panel {
  overflow: hidden;
}

.results-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 18px;
  background: #fff;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #fff;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8fafc;
}

th,
td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}

tbody tr:hover {
  background: #f8fafc;
}

.pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
}

.pill.success {
  background: #dcfce7;
  color: #166534;
}

.pill.failure {
  background: #fee2e2;
  color: #991b1b;
}

.message-cell {
  min-width: 300px;
}

@media (max-width: 900px) {
  .layout-grid,
  .meta-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .results-header {
    align-items: stretch;
    flex-direction: column;
  }
}
```

## Example CSV

```csv
email,filename
alice@example.com,alice.jpg
bob@example.com,bob.png
carol@example.com,carol.jpeg
```

## Notes

* Worker URL is prefilled as `https://adarahomehealth.itcontact-521.workers.dev`.
* Set your Worker secrets with:

  * `wrangler secret put ZOOM_ACCOUNT_ID`
  * `wrangler secret put ZOOM_CLIENT_ID`
  * `wrangler secret put ZOOM_CLIENT_SECRET`
* Keep the frontend and worker deployed separately, or serve the frontend from Cloudflare Pages.
* If you want stricter security later, lock down CORS to the exact frontend origin instead of `*`.
