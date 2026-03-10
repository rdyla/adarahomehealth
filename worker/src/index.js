# Zoom Profile Picture Uploader — React + Cloudflare Worker Starter

## `worker/src/index.js`

```javascript
const APP_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zoom Profile Picture Uploader</title>
    <style>
      :root {
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #0f172a;
        background: #f8fafc;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 28%),
          linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      }

      button, input { font: inherit; }

      .page-shell {
        max-width: 1280px;
        margin: 0 auto;
        padding: 32px 20px 56px;
      }

      .hero-card, .panel {
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 24px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        backdrop-filter: blur(10px);
      }

      .hero-card { padding: 32px; margin-bottom: 24px; }
      .panel { padding: 24px; }
      .eyebrow {
        margin: 0 0 8px;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #2563eb;
      }

      h1, h2 { margin: 0; }
      h1 {
        font-size: clamp(2rem, 4vw, 3rem);
        line-height: 1.05;
        margin-bottom: 12px;
      }
      h2 { font-size: 1.2rem; margin-bottom: 16px; }
      .hero-copy, .muted { color: #475569; }

      .layout-grid {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 24px;
        margin-bottom: 24px;
      }

      .form-stack, .field {
        display: grid;
        gap: 16px;
      }

      .field span { font-weight: 600; }
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

      .primary-button, .secondary-button {
        border: 0;
        border-radius: 16px;
        padding: 12px 16px;
        font-weight: 700;
        cursor: pointer;
      }

      .primary-button { background: #2563eb; color: white; }
      .secondary-button { background: #e2e8f0; color: #0f172a; }
      .primary-button:disabled, .secondary-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
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

      .stat-card.success { background: #f0fdf4; border-color: #bbf7d0; }
      .stat-card.failure { background: #fef2f2; border-color: #fecaca; }
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
      .file-list li:last-child { border-bottom: 0; }

      .results-panel { overflow: hidden; }
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

      table { width: 100%; border-collapse: collapse; }
      thead { background: #f8fafc; }
      th, td {
        padding: 14px 16px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
      }

      tbody tr:hover { background: #f8fafc; }

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

      .pill.success { background: #dcfce7; color: #166534; }
      .pill.failure { background: #fee2e2; color: #991b1b; }
      .message-cell { min-width: 300px; }
      code {
        background: #eff6ff;
        padding: 2px 6px;
        border-radius: 8px;
      }

      @media (max-width: 900px) {
        .layout-grid, .meta-grid, .summary-grid { grid-template-columns: 1fr; }
        .results-header {
          align-items: stretch;
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      const state = {
        csvFile: null,
        imageFiles: [],
        isSubmitting: false,
        error: "",
        result: null,
      };

      function escapeHtml(value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function render() {
        const imageNames = state.imageFiles.map((file) => file.name);
        const resultRows = state.result?.results || [];

        document.getElementById("app").innerHTML = 
          '<div class="page-shell">' +
            '<header class="hero-card">' +
              '<div>' +
                '<p class="eyebrow">Single Cloudflare Worker App</p>' +
                '<h1>Zoom Profile Picture Uploader</h1>' +
                '<p class="hero-copy">Upload a CSV with <strong>email,filename</strong> and matching image files. This page and the API both run from the same Worker.</p>' +
              '</div>' +
            '</header>' +
            '<main class="layout-grid">' +
              '<section class="panel">' +
                '<h2>Upload batch</h2>' +
                '<form id="uploadForm" class="form-stack">' +
                  '<label class="field">' +
                    '<span>CSV file</span>' +
                    '<input id="csvInput" type="file" accept=".csv,text/csv" required />' +
                  '</label>' +
                  '<label class="field">' +
                    '<span>Image files</span>' +
                    '<input id="imagesInput" type="file" accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif" multiple required />' +
                  '</label>' +
                  '<div class="helper-box">' +
                    '<div><strong>Expected CSV columns</strong></div>' +
                    '<code>email,filename</code>' +
                  '</div>' +
                  '<button type="submit" class="primary-button" ' + (state.isSubmitting ? 'disabled' : '') + '>' +
                    (state.isSubmitting ? 'Uploading...' : 'Start Zoom upload') +
                  '</button>' +
                '</form>' +
                (state.error ? '<div class="error-banner">' + escapeHtml(state.error) + '</div>' : '') +
              '</section>' +
              '<section class="panel">' +
                '<h2>Files in current batch</h2>' +
                '<div class="meta-grid">' +
                  '<div class="stat-card"><span class="stat-label">CSV selected</span><strong>' + escapeHtml(state.csvFile?.name || 'None') + '</strong></div>' +
                  '<div class="stat-card"><span class="stat-label">Images selected</span><strong>' + imageNames.length + '</strong></div>' +
                '</div>' +
                '<div class="file-list-wrap">' +
                  (imageNames.length
                    ? '<ul class="file-list">' + imageNames.map((name) => '<li>' + escapeHtml(name) + '</li>').join('') + '</ul>'
                    : '<p class="muted" style="padding:14px;">No images selected yet.</p>') +
                '</div>' +
              '</section>' +
            '</main>' +
            '<section class="panel results-panel">' +
              '<div class="results-header">' +
                '<div><h2>Results</h2><p class="muted">Per-user response details from the Worker and Zoom API.</p></div>' +
                '<button id="downloadResultsBtn" type="button" class="secondary-button" ' + (!state.result ? 'disabled' : '') + '>Download JSON</button>' +
              '</div>' +
              (!state.result
                ? '<div class="empty-state">No upload has been run yet.</div>'
                : '<div class="meta-grid summary-grid">' +
                    '<div class="stat-card success"><span class="stat-label">Succeeded</span><strong>' + escapeHtml(state.result.succeeded) + '</strong></div>' +
                    '<div class="stat-card failure"><span class="stat-label">Failed</span><strong>' + escapeHtml(state.result.failed) + '</strong></div>' +
                    '<div class="stat-card"><span class="stat-label">Total</span><strong>' + escapeHtml(state.result.total) + '</strong></div>' +
                  '</div>' +
                  '<div class="table-wrap">' +
                    '<table>' +
                      '<thead><tr><th>Status</th><th>Email</th><th>Filename</th><th>HTTP</th><th>Message</th></tr></thead>' +
                      '<tbody>' + resultRows.map((row, index) => 
                        '<tr key="' + index + '">' +
                          '<td><span class="pill ' + (row.success ? 'success' : 'failure') + '">' + (row.success ? 'Success' : 'Failed') + '</span></td>' +
                          '<td>' + escapeHtml(row.email || '—') + '</td>' +
                          '<td>' + escapeHtml(row.filename || '—') + '</td>' +
                          '<td>' + escapeHtml(row.status || '—') + '</td>' +
                          '<td class="message-cell">' + escapeHtml(row.message || '—') + '</td>' +
                        '</tr>'
                      ).join('') + '</tbody>' +
                    '</table>' +
                  '</div>') +
            '</section>' +
          '</div>';

        const csvInput = document.getElementById('csvInput');
        const imagesInput = document.getElementById('imagesInput');
        const uploadForm = document.getElementById('uploadForm');
        const downloadResultsBtn = document.getElementById('downloadResultsBtn');

        if (csvInput) {
          csvInput.addEventListener('change', (event) => {
            state.csvFile = event.target.files?.[0] || null;
            render();
          });
        }

        if (imagesInput) {
          imagesInput.addEventListener('change', (event) => {
            state.imageFiles = Array.from(event.target.files || []);
            render();
          });
        }

        if (uploadForm) {
          uploadForm.addEventListener('submit', handleSubmit);
        }

        if (downloadResultsBtn) {
          downloadResultsBtn.addEventListener('click', downloadResults);
        }
      }

      async function handleSubmit(event) {
        event.preventDefault();
        state.error = '';
        state.result = null;

        if (!state.csvFile) {
          state.error = 'Please choose a CSV file.';
          render();
          return;
        }

        if (!state.imageFiles.length) {
          state.error = 'Please choose one or more image files.';
          render();
          return;
        }

        state.isSubmitting = true;
        render();

        try {
          const formData = new FormData();
          formData.append('csv', state.csvFile);
          state.imageFiles.forEach((file) => formData.append('images', file, file.name));

          const response = await fetch('/api/upload-pictures', {
            method: 'POST',
            body: formData,
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error || data?.details || 'Upload failed.');
          }

          state.result = data;
        } catch (error) {
          state.error = error?.message || 'Upload failed.';
        } finally {
          state.isSubmitting = false;
          render();
        }
      }

      function downloadResults() {
        if (!state.result) return;
        const blob = new Blob([JSON.stringify(state.result, null, 2)], {
          type: 'application/json;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'zoom-profile-picture-results.json';
        anchor.click();
        URL.revokeObjectURL(url);
      }

      render();
    </script>
  </body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    if (url.pathname === "/api/upload-pictures" && request.method === "POST") {
      try {
        const form = await request.formData();
        const csvFile = form.get("csv");

        if (!csvFile || !(csvFile instanceof File)) {
          return json({ error: "Missing CSV file in form field 'csv'." }, 400, request);
        }

        const csvText = await csvFile.text();
        const rows = parseCsv(csvText);

        if (!rows.length) {
          return json({ error: "CSV is empty." }, 400, request);
        }

        const imageMap = new Map();
        for (const [key, value] of form.entries()) {
          if (key === "images" && value instanceof File) {
            imageMap.set(value.name, value);
          }
        }

        if (imageMap.size === 0) {
          return json({ error: "No image files uploaded. Use form field 'images'." }, 400, request);
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

        return json({
          total: results.length,
          succeeded: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          results,
        }, 200, request);
      } catch (err) {
        return json({
          error: "Unexpected Worker error",
          details: err instanceof Error ? err.message : String(err),
        }, 500, request);
      }
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(APP_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: corsHeaders(request),
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
    .split(/
?
/)
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

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
