import { accessSync, constants } from "node:fs";
import { resolve } from "node:path";

const requiredFiles = [
  "index.html",
  "dashboard.html",
  "analytics.html",
  "member.html",
  "payment.html",
  "attandance.html",
  "script.js",
  "styles.css",
  "js/firebase-config.js",
  "js/analytics-data.js",
  "js/dashboard.js",
  "js/analytics.js",
  "edata.png",
];

const missing = requiredFiles.filter((file) => {
  try {
    accessSync(resolve(file), constants.R_OK);
    return false;
  } catch {
    return true;
  }
});

if (missing.length > 0) {
  console.error("Missing required assets:", missing.join(", "));
  process.exit(1);
}

console.log(`All ${requiredFiles.length} required assets are present.`);
