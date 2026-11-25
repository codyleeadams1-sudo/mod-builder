import express from "express";
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { createWriteStream } from "node:fs";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const BUILD_ROOT = path.join(__dirname, "builds");
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:7b";
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const categories = ["tool", "item", "weapon", "armor", "block", "food", "mob", "world generation", "magic", "movement", "utility", "other"];
const safeName = s => String(s || "GeneratedMod").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "GeneratedMod";
const javaForMc = mc => {
  const [major, minor] = mc.split(".").map(Number);
  if (major > 1 || minor >= 20) return minor >= 20 ? 21 : 17;
  return 17;
};
function run(command, args, cwd, timeout=240000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: process.platform === "win32", env: process.env });
    let out = "", err = "";
    child.stdout.on("data", d => out += d.toString());
    child.stderr.on("data", d => err += d.toString());
    const timer = setTimeout(() => { child.kill(); reject(new Error("Build timed out. Check that Java and Gradle are installed.")); }, timeout);
    child.on("error", e => { clearTimeout(timer); reject(e); });
    child.on("close", code => { clearTimeout(timer); code === 0 ? resolve(out + "\n" + err) : reject(new Error((out + "\n" + err).slice(-7000) || `Process exited ${code}`)); });
  });
}
function extractJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt, category, modName, minecraftVersion="1.20.1", javaVersion="17", loader="Fabric", makeTextures=true } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: "Describe the mod you want to create." });
    if (!categories.includes(category)) return res.status(400).json({ error: "Choose a valid mod category." });
    if (loader !== "Fabric") return res.status(400).json({ error: "This starter currently supports Fabric. Forge/NeoForge support can be added next." });
    const instructions = `You are an expert Minecraft Fabric mod developer. Return ONLY valid JSON with this schema:
{"modId":"lowercase_id","displayName":"Name","description":"Short description","files":[{"path":"relative/path","content":"complete file contents"}],"textures":[{"path":"src/main/resources/assets/MODID/textures/item/name.png","prompt":"visual description for a 16x16 pixel-art Minecraft texture"}],"notes":["short build notes"]}
Create a complete, compilable Fabric Loom Gradle project for Minecraft ${minecraftVersion}, Java ${javaVersion}, Fabric. Include settings.gradle, build.gradle, gradle.properties, src/main/resources/fabric.mod.json, and all Java source/resources needed. Use package dev.modforge.generated. Mod category: ${category}. Requested mod name: ${modName || "My Mod"}. User specification: ${prompt}
Use APIs compatible with Minecraft ${minecraftVersion}; do not invent unavailable APIs. Ensure the mod entrypoint and metadata agree. For textures, include texture references and list needed textures with prompts. ${makeTextures ? "Include texture prompts for every custom texture." : "Avoid custom textures unless absolutely essential; if needed list them."}
Do not include binary files. Use Java ${javaVersion}.`;
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, system: instructions, prompt: "Generate the complete mod project now.", stream: false, format: "json", options: { temperature: 0.2, num_ctx: 16384 } })
    });
    if (!response.ok) throw new Error(`Could not reach local Ollama (${response.status}). Start Ollama and download the selected model first.`);
    const result = await response.json();
    const project = extractJson(result.response || "");
    if (!Array.isArray(project.files) || !project.files.length) throw new Error("AI returned an incomplete project. Try a more specific prompt.");
    const id = crypto.randomUUID();
    const dir = path.join(BUILD_ROOT, id);
    await fs.mkdir(dir, { recursive: true });
    for (const file of project.files) {
      const modId = safeName(project.modId || "generated_mod").toLowerCase();
      const rel = path.normalize(String(file.path).replaceAll("MODID", modId));
      if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error("AI returned an unsafe file path.");
      const dest = path.join(dir, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, String(file.content).replaceAll("MODID", modId), "utf8");
    }
    await fs.writeFile(path.join(dir, "modforge-manifest.json"), JSON.stringify({
      ...project, textures: (project.textures || []).map(t => ({ ...t, path: String(t.path || "").replaceAll("MODID", safeName(project.modId || "generated_mod").toLowerCase()) })), category, minecraftVersion, javaVersion, loader, makeTextures
    }, null, 2));
    res.json({ id, project: { ...project, files: project.files.map(f => ({ path:f.path, content:f.content })) } });
  } catch (e) {
    res.status(500).json({ error: e.message || "Generation failed." });
  }
});
app.post("/api/build/:id", async (req, res) => {
  try {
    const dir = path.join(BUILD_ROOT, safeName(req.params.id));
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "modforge-manifest.json"), "utf8"));
    const java = Number(manifest.javaVersion);
    const version = Number((await run("java", ["-version"], dir)).match(/version "(\d+)/)?.[1] || 0);
    if (version && version < java) return res.status(400).json({ error: `Java ${java} is required, but the installed Java is ${version}. Install the selected JDK and try again.` });
    // Turn AI-written texture prompts into real PNG assets before compiling.
    if (manifest.makeTextures && Array.isArray(manifest.textures) && manifest.textures.length) {
      for (const texture of manifest.textures.slice(0, 6)) {
        const rel = path.normalize(texture.path || "");
        if (!rel || rel.startsWith("..") || path.isAbsolute(rel) || !rel.toLowerCase().endsWith(".png")) {
          throw new Error("AI returned an unsafe texture path.");
        }
        const target = path.join(dir, rel);
        try { await fs.access(target); continue; } catch {}
        // Ask the local text model for a compact pixel palette, then rasterize it as PNG.
        const texResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, format: "json", prompt: `Return JSON only: {"pixels":[["#RRGGBB",...]]}. Create a 16 by 16 pixel-art Minecraft texture. Description: ${texture.prompt}. Exactly 16 rows, exactly 16 hex colors per row. No markdown.` })
        });
        if (!texResponse.ok) throw new Error("Local AI texture generation failed. Check that Ollama is running.");
        const texData = await texResponse.json();
        const pixels = extractJson(texData.response || "").pixels;
        if (!Array.isArray(pixels) || pixels.length !== 16 || pixels.some(row => !Array.isArray(row) || row.length !== 16)) throw new Error("Local AI returned an invalid 16x16 texture. Try compiling again.");
        const { PNG } = await import("pngjs");
        const png = new PNG({ width: 16, height: 16 });
        pixels.flat().forEach((hex, i) => {
          const color = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "808080";
          png.data[i * 4] = parseInt(color.slice(0,2),16);
          png.data[i * 4 + 1] = parseInt(color.slice(2,4),16);
          png.data[i * 4 + 2] = parseInt(color.slice(4,6),16);
          png.data[i * 4 + 3] = 255;
        });
        await fs.mkdir(path.dirname(target), { recursive: true });
        await new Promise((resolve,reject) => png.pack().pipe(createWriteStream(target)).on("finish", resolve).on("error", reject));
      }
    }
    const gradle = process.platform === "win32" ? "gradle.bat" : "gradle";
    await run(gradle, ["build"], dir);
    const libs = path.join(dir, "build", "libs");
    const jars = (await fs.readdir(libs)).filter(x => x.endsWith(".jar") && !x.includes("-sources") && !x.includes("-dev"));
    if (!jars.length) throw new Error("Gradle finished but no mod JAR was found.");
    res.json({ success: true, jar: `/api/download/${req.params.id}/${encodeURIComponent(jars[0])}`, filename: jars[0] });
  } catch (e) {
    res.status(500).json({ error: e.message || "Compilation failed." });
  }
});
app.get("/api/download/:id/:file", async (req, res) => {
  try {
    const file = path.basename(decodeURIComponent(req.params.file));
    const full = path.join(BUILD_ROOT, safeName(req.params.id), "build", "libs", file);
    await fs.access(full);
    res.download(full);
  } catch { res.status(404).json({ error: "JAR not found." }); }
});
app.listen(PORT, () => console.log(`ModForge AI running at http://localhost:${PORT}`));
