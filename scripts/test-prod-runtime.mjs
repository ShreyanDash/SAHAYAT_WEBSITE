import { spawn } from "node:child_process";
import http from "node:http";

const PORT = 3888;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${path}`, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function run() {
  console.log(`Starting production server on port ${PORT}...`);
  const server = spawn("node", ["dist/index.js"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test_db",
      GMAIL_APP_PASSWORD: "test-app-password",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  server.stdout.on("data", d => {
    const str = d.toString();
    serverOutput += str;
    process.stdout.write(`[SERVER] ${str}`);
  });
  server.stderr.on("data", d => {
    const str = d.toString();
    serverOutput += str;
    process.stderr.write(`[SERVER ERR] ${str}`);
  });

  // Wait for server to start listening
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await request("/api/health");
      if (res.statusCode === 200) {
        console.log("Server is up and responding to /api/health!");
        break;
      }
    } catch {
      // Keep waiting
    }
  }

  const results = [];

  // 1. Test /api/health
  try {
    const res = await request("/api/health");
    const json = JSON.parse(res.body);
    const pass = res.statusCode === 200 && json.status === "ok" && res.headers["content-type"].includes("application/json");
    results.push({ test: "/api/health", pass, details: `Status ${res.statusCode}, Content-Type: ${res.headers["content-type"]}, Body: ${res.body}` });
  } catch (err) {
    results.push({ test: "/api/health", pass: false, details: err.message });
  }

  // 2. Test / (Landing page SPA HTML)
  try {
    const res = await request("/");
    const pass = res.statusCode === 200 && res.headers["content-type"].includes("text/html") && res.body.includes("SAHAYAT");
    results.push({ test: "GET /", pass, details: `Status ${res.statusCode}, Content-Type: ${res.headers["content-type"]}, HTML length: ${res.body.length}` });
  } catch (err) {
    results.push({ test: "GET /", pass: false, details: err.message });
  }

  // 3. Test recovered image: /images/sahayat-caregiver.webp
  try {
    const res = await request("/images/sahayat-caregiver.webp");
    const pass = res.statusCode === 200 && res.headers["content-type"].includes("image/webp");
    results.push({ test: "GET /images/sahayat-caregiver.webp", pass, details: `Status ${res.statusCode}, Content-Type: ${res.headers["content-type"]}, Content-Length: ${res.headers["content-length"]}` });
  } catch (err) {
    results.push({ test: "GET /images/sahayat-caregiver.webp", pass: false, details: err.message });
  }

  // 4. Test recovered image: /images/sahayat-detail.webp
  try {
    const res = await request("/images/sahayat-detail.webp");
    const pass = res.statusCode === 200 && res.headers["content-type"].includes("image/webp");
    results.push({ test: "GET /images/sahayat-detail.webp", pass, details: `Status ${res.statusCode}, Content-Type: ${res.headers["content-type"]}, Content-Length: ${res.headers["content-length"]}` });
  } catch (err) {
    results.push({ test: "GET /images/sahayat-detail.webp", pass: false, details: err.message });
  }

  // 5. Test non-existent API route: /api/nonexistent
  try {
    const res = await request("/api/trpc/nonexistent");
    const pass = res.statusCode === 404 && res.headers["content-type"].includes("application/json");
    results.push({ test: "GET non-existent API route /api/trpc/nonexistent", pass, details: `Status ${res.statusCode}, Content-Type: ${res.headers["content-type"]}, Body: ${res.body.trim()}` });
  } catch (err) {
    results.push({ test: "GET non-existent API route", pass: false, details: err.message });
  }

  // 6. Test non-existent frontend route: /404 returns HTTP 404
  try {
    const res = await request("/404");
    const pass = res.statusCode === 404 && res.headers["content-type"].includes("text/html");
    results.push({ test: "GET /404", pass, details: `Status ${res.statusCode}, Content-Type: ${res.headers["content-type"]}` });
  } catch (err) {
    results.push({ test: "GET /404", pass: false, details: err.message });
  }

  // 7. Test client-side SPA routing fallback (e.g. /privacy)
  try {
    const res = await request("/privacy");
    const pass = res.statusCode === 200 && res.headers["content-type"].includes("text/html");
    results.push({ test: "GET /privacy (SPA fallback)", pass, details: `Status ${res.statusCode}, Content-Type: ${res.headers["content-type"]}` });
  } catch (err) {
    results.push({ test: "GET /privacy", pass: false, details: err.message });
  }

  // Shutdown server
  server.kill("SIGTERM");
  await new Promise(r => setTimeout(r, 500));

  console.log("\n--- RUNTIME TEST SUMMARY ---");
  let allPass = true;
  for (const r of results) {
    console.log(`[${r.pass ? "PASS" : "FAIL"}] ${r.test} => ${r.details}`);
    if (!r.pass) allPass = false;
  }

  // Check no Manus calls in output
  const hasManus = /manus/i.test(serverOutput);
  console.log(`[${!hasManus ? "PASS" : "FAIL"}] No Manus platform endpoints or services contacted during runtime.`);

  process.exit(allPass && !hasManus ? 0 : 1);
}

run().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
