# Putting ScriptReel online for free

Checked October 2026. Free plans change often, so confirm on each host's own pricing page before you rely on one.

## What this app needs
ScriptReel is not a normal website. Making a video runs FFmpeg for a minute or more, needs real CPU and memory, and writes files to disk. That rules out most "free website" hosts.

| Host | Free? | Works for ScriptReel? |
|---|---|---|
| **Your own computer + Cloudflare Tunnel** | Yes | **Best free option.** Fast, FFmpeg already installed. The site is only online while your computer is on. |
| **Oracle Cloud Always Free VM** | Yes (card needed to sign up) | **Best always-on option.** Oracle cut the free Arm server to 2 CPUs and 12 GB in 2026. New servers are often "out of capacity", so you may need to retry. |
| **Render free web service** (Docker) | Yes | Works for trying it out, but slow: about 0.1 CPU and 512 MB RAM. It sleeps after 15 minutes idle, and files are erased on restart. |
| Vercel, Netlify, Cloudflare Workers | Yes | **No.** No FFmpeg and short time limits. |
| Hugging Face Spaces | Reported paid-only for Docker apps since mid 2026 | Check before relying on it. |
| Fly.io | No free plan | No. |

## Before going public (all options)
1. Set `APP_PASSWORD` so strangers cannot use your Groq and Pixabay keys. Also set `MAX_VIDEOS_PER_HOUR`.
2. In MongoDB Atlas, Network Access: allow the host's address. On hosts with changing addresses, use `0.0.0.0/0`. The database password is then your protection.
3. Put your keys in the host's environment variables. Never upload your `.env` file. The Docker setup already skips it.
4. Free hosts erase saved videos when they restart. Download videos you want to keep. The Library shows "Expired" for files that are gone.
5. Your Groq and Pixabay free limits are shared by every visitor.
6. Microsoft's free voice service may refuse requests from some hosting addresses. Test a short video first.

## Option 1: your computer + Cloudflare Tunnel
1. Start the app: `npm start`.
2. Install `cloudflared` from Cloudflare's website.
3. Run: `cloudflared tunnel --url http://localhost:3000`
4. It prints a public `https://...trycloudflare.com` address. Share it. It changes each time you start it.
5. Set `APP_PASSWORD` in `.env` first.

## Option 2: Oracle Cloud Always Free VM
1. Create an Oracle Cloud account and an Ubuntu "Ampere A1" instance (max 2 CPUs, 12 GB total).
2. Install Docker: `sudo apt update && sudo apt install -y docker.io`
3. Copy the project folder to the server (zip it, then `scp`), unzip it.
4. Create `.env` there with your keys and `APP_PASSWORD`.
5. Build and run:
   ```
   sudo docker build -t scriptreel .
   sudo docker run -d --restart always --name scriptreel --env-file .env -p 3000:3000 -v $(pwd)/output:/app/output scriptreel
   ```
6. Open port 3000 in Oracle's network rules, or put Cloudflare Tunnel in front instead.
7. The `-v` line keeps videos when you rebuild.

## Option 3: Render (free web service, to try it out)
1. Put the project on GitHub (the `.gitignore` keeps `.env` out).
2. On Render: New, then Web Service, pick your repo, and choose **Docker** as the language.
3. Choose the Free instance type.
4. Add the environment variables from `.env.example` (`MONGODB_URI`, `GROQ_API_KEY`, `PIXABAY_API_KEY`, `APP_PASSWORD`, `TRUST_PROXY=1`, `MAX_VIDEOS_PER_HOUR=3`).
5. Set the health check path to `/healthz`.
6. Expect slow renders and a 30 to 50 second wait when the site wakes up.
