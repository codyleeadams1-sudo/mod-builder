# ModForge AI 2.0 — Local AI desktop + browser companion

ModForge AI is a local-first Minecraft Fabric mod creator. It uses Ollama to run a coding model on your own computer. No OpenAI key, paid AI API, subscription, or per-generation fee is needed. You do need a computer capable of running the model and enough disk space to download it.

## What is included

- Existing dark ModForge web interface with mod categories, prompts, Minecraft/Java selectors, source project generation, Gradle compilation, and JAR download.
- Local AI generation through Ollama (`qwen2.5-coder:7b` by default).
- Local texture creation: the AI creates a 16x16 pixel palette which is rasterized into PNG assets before Gradle builds the mod. This is pixel-art texture generation, not a diffusion image model.
- Electron desktop wrapper, plus a Windows installer/portable EXE build configuration.
- Chrome/Edge Manifest V3 extension: popup sends an idea into ModForge; right-click selected webpage text and choose “Send selection to ModForge AI”.

## First-time setup on Windows

1. Install Node.js 20 or newer: https://nodejs.org/
2. Install Ollama: https://ollama.com/
3. Open PowerShell and download the free local coding model:

   ```powershell
   ollama pull qwen2.5-coder:7b
   ```

   Keep Ollama running in the background. The model download is several GB; generation speed depends on your RAM/GPU.
4. Extract this project folder.
5. Double-click `START-DESKTOP.bat` to run the desktop app, or run `npm install` then `npm run desktop` in a terminal.

The app connects to Ollama at `http://127.0.0.1:11434`. Change `OLLAMA_MODEL` in `.env` if you downloaded a different model. Copy `.env.example` to `.env` to customize settings.

## Build the Windows EXE

On a Windows PC, double-click `BUILD-WINDOWS.bat`. It installs the Node dependencies and builds both a Windows installer and portable executable into `release/`:

- `ModForge-AI-2.0.0-x64.exe` (portable)
- `ModForge-AI-Setup-2.0.0.exe` (installer; exact names may vary by electron-builder version)

This build step must run on Windows (or a configured Windows cross-build machine). This source package is not itself a compiled Windows executable. It is configured to produce the EXE locally.

## Install the browser extension (Chrome / Edge)

1. Install and launch the ModForge AI Windows app once. The installer registers the `modforge://` link handler.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select this project's `browser-extension` folder.
5. Use the extension popup to send an idea, or select text on a webpage, right-click, and choose **Send selection to ModForge AI**.

The extension opens a `modforge://` link, which launches the installed desktop app and transfers the idea into its prompt. It does not read pages in the background. If Windows asks which app should open the link, choose ModForge AI.

## Building Minecraft mods

To compile generated mod projects into JARs, install the matching Java JDK and Gradle. The selected Java version must be available on the computer. This starter currently supports Fabric; Forge and NeoForge are not yet implemented.

## Important limitations and security

- “Free” means the AI inference runs locally with Ollama; electricity, hardware, internet download bandwidth, and disk space are still needed. There is no cloud AI fallback.
- Local model output can contain mistakes. Review generated source and build logs.
- Generated Gradle builds execute code. Only build projects you trust; public multi-user hosting needs isolated build containers, authentication, rate limits, quotas, and abuse controls.
- The extension only sends text when the user clicks its button or context-menu item.


## Build the EXE using GitHub (no Windows build machine needed)

This repository includes `.github/workflows/build-windows.yml`.

1. Create a new **public or private** repository on https://github.com.
2. Upload the contents of this ZIP to the repository root (make sure `.github/workflows/build-windows.yml` is included).
3. Open the repository's **Actions** tab and enable Actions if GitHub asks.
4. Select **Build ModForge AI for Windows** and click **Run workflow**.
5. Wait for the green check mark, open the completed workflow run, and download the **ModForge-AI-Windows** artifact.
6. Extract that artifact ZIP. It contains the Windows installer and portable `.exe`.

Pushing commits to `main`/`master` also starts a build. To publish a GitHub Release,
The workflow only builds and uploads artifacts; it does not attempt to publish a GitHub Release or require a `GH_TOKEN`.

GitHub Actions builds the Windows EXE; it does not install Ollama or download the AI model
into the EXE. Users install Ollama separately and run `ollama pull qwen2.5-coder:7b`
once to enable local AI generation. The browser extension is in `browser-extension/`.
