export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Basic CORS handling for a browser-based admin UI
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
          return json(
            { error: "Missing CSV file in form field 'csv'." },
            400
          );
        }

        const csvText = await csvFile.text();
        const rows = parseCsv(csvText);

        if (!rows.length) {
          return json({ error: "CSV is empty." }, 400);
        }

        // Build a filename -> File map from uploaded images
        const imageMap = new Map();
        for (const [key, value] of form.entries()) {
          if (key === "images" && value instanceof File) {
            imageMap.set(value.name, value);
          }
        }

        if (imageMap.size === 0) {
          return json(
            { error: "No image files uploaded. Use form field 'images'." },
            400
          );
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

          const uploadResult = await uploadZoomProfilePicture(
            accessToken,
            email,
            file
          );

          results.push({
            email,
            filename,
            ...uploadResult,
          });
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
    throw new Error(
      `Zoom token request failed: ${response.status} ${JSON.stringify(data)}`
    );
  }

  return data.access_token;
}

async function uploadZoomProfilePicture(accessToken, userEmail, file) {
  const form = new FormData();
  form.append("file", file, file.name);

  const response = await fetch(
    `https://api.zoom.us/v2/users/${encodeURIComponent(userEmail)}/picture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

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
    message:
      data?.message ||
      (response.ok ? "Success" : "Zoom returned an error"),
    zoomResponse: data,
  };
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return rows;
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
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
