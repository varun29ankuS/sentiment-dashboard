import path from "path";

// On Render, persistent disk is at /opt/render/project/src/data
// Locally, use the project directory
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");
const SAMPLE_DIR = path.join(process.cwd(), "..", "sample");

export { DATA_DIR, UPLOADS_DIR, SAMPLE_DIR };
