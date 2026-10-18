# ScriptReel

Turns any text into a narrated video with matching footage, captions and branding.
Built with Node.js, Express, MongoDB Atlas, Groq, Edge TTS, Pixabay and FFmpeg.

## One-time setup
1. Install Node.js 18 or newer.
2. Install FFmpeg (`winget install Gyan.FFmpeg` on Windows, `brew install ffmpeg` on macOS, `sudo apt install ffmpeg` on Linux). Reopen the terminal and check `ffmpeg -version` and `ffprobe -version`.
3. In MongoDB Atlas, open Network Access and allow your current IP address.
4. In this folder run: `npm install`

Your keys go in `.env`.

## Run
```
npm start
```
Open http://localhost:3000

## Features
- **Write with AI:** type a topic, pick a tone, length and language, and get a full script. Urdu, Hindi, Arabic, Spanish, French, German, Portuguese and Turkish voices are included.
- **Scene editor:** review the scenes before the video is made. Edit the words, change the search words, reorder, duplicate or delete scenes, and pick the exact video or photo for any scene.
- **Reads any text:** plain paragraphs, articles, lists or storyboards. Long scripts are split into pieces automatically. If the AI planner is unavailable, a built-in splitter takes over.
- **Footage matching:** results are ranked by how well their tags match each scene. Long scenes get several shots. When no good video exists, a photo with a slow zoom is used.
- **Captions:** style presets, position, size, font, colours, background box, uppercase, words at a time, fade or pop animation, live preview. A captions file (SRT) is saved with each video.
- **Branding:** text or logo watermark (position, size, opacity), title card, closing card.
- **Look and sound:** narrator and character voices (press the play button next to a voice to hear it), speaking speed, background music with volume, colour looks, soft fades.
- **Output:** 16:9 or 9:16, 720p or 1080p.
- **Library:** search, filter, watch, download, reuse a script with all its settings, delete one or all.
- Light and dark mode, five accent colours, saved settings of your own, recent videos on the Create page, and a library with totals, sorting and a grid view.
- Light and dark mode. Quick start presets for YouTube, Shorts/Reels/TikTok, Cinematic and Clean.

## Putting it online
See `DEPLOY.md` for free hosting options, a `Dockerfile`, and what to set before the site is public (`APP_PASSWORD`, `MAX_VIDEOS_PER_HOUR`). Videos are made one at a time by default.

## Files
- `server.js` API and the video pipeline
- `models/Video.js` MongoDB model
- `services/groq.js` scene planning with the AI
- `services/script.js` text cleaning, chunking and the built-in splitter
- `services/pixabay.js` footage search, ranking and download
- `services/tts.js` voiceover
- `services/captions.js` captions, subtitle files and title cards
- `services/render.js` all FFmpeg work
- `services/options.js` validates settings from the browser
- `public/` the web app (`index.html`, `style.css`, `app.js`)
- Finished videos, posters and caption files are saved in `output/`
