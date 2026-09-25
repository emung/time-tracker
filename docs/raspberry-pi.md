# Running on a Raspberry Pi 5

The Docker setup is architecture-neutral: `oven/bun` and `postgres:17-alpine` both publish
`linux/arm64` images, so the same `Dockerfile` and `docker-compose.yml` used on the Mac build
and run natively on the Pi. The image is built on the Pi itself — no registry needed.

## Prerequisites

- **64-bit Raspberry Pi OS** (Bookworm or newer, or any other arm64 distro). Bun has no 32-bit
  ARM build, so a 32-bit OS will not work. Check with `uname -m` → must print `aarch64`.
- Docker Engine + Compose plugin: `curl -fsSL https://get.docker.com | sh`, then
  `sudo usermod -aG docker $USER` and log out/in.
- Recommended for 24/7 use: boot from / store Docker data on an SSD (NVMe HAT or USB) rather
  than the SD card — Postgres writes continuously and SD cards wear out.

### Kernel page size (only if the app container crash-loops)

The Pi 5's default kernel uses **16K memory pages**. Some software built for 4K pages
(notably anything using jemalloc) crashes on it. If the `app` or `postgres` container keeps
restarting with allocator / page-size errors in `docker compose logs`, switch to the 4K kernel:

```bash
echo "kernel=kernel8.img" | sudo tee -a /boot/firmware/config.txt
sudo reboot
```

`getconf PAGESIZE` should then print `4096`.

## First start

```bash
git clone <repo-url> time-tracker && cd time-tracker
cp .env.example .env    # set POSTGRES_PASSWORD (URL-safe) and the report email settings
docker compose up --build -d
```

Set `POSTGRES_*` **before** the first start — Postgres only reads them when it initialises the
`pgdata` volume. Set up Caddy (next section) before the first start too, so the app is never
exposed without a login.

## HTTPS + basic auth with Caddy

The app itself has no authentication, and the base compose file publishes port 3100 to the
whole LAN. On the Pi, `docker-compose.pi.yml` adds a [Caddy](https://caddyserver.com) container
in front of it that:

- serves HTTPS on 443 only, using Caddy's own local CA (`tls internal`, no Let's Encrypt
  needed), so the password never crosses the LAN in cleartext. Port 80 is left to the host's
  nginx, which redirects `http://` to `https://` (step 3);
- asks for a username/password (`basic_auth`) on every request;
- removes the app's `3100:3100` port mapping (`ports: !reset []`, needs Compose ≥ 2.24.4), so
  Caddy is the only way in. Don't rely on ufw for this — Docker-published ports bypass it.

The Mac setup is unaffected: the override is only loaded when `COMPOSE_FILE` is set in `.env`.

1. Create a bcrypt hash of your password (you're prompted for it, so it stays out of shell
   history):

   ```bash
   docker run --rm -it caddy:2-alpine caddy hash-password
   ```

2. Add to the Pi's `.env` (templates are in `.env.example`):

   ```dotenv
   COMPOSE_FILE=docker-compose.yml:docker-compose.pi.yml
   SITE_ADDRESS=tracker.local
   BASIC_AUTH_USER=admin
   BASIC_AUTH_HASH='$2a$14$...'
   ```

   - **Keep the single quotes** around the hash — without them Compose treats each `$...` as a
     variable and silently corrupts it.
   - `SITE_ADDRESS` is what you type in the browser: a name your devices already resolve (here
     `tracker.local`), `<hostname>.local` (Raspberry Pi OS announces it via mDNS, e.g.
     `rpi.local`) or a fixed IP such as `192.168.1.50`. The certificate is issued for exactly
     this name, so use the same one on every device.

3. Point the host nginx's site for the app at HTTPS instead of `localhost:3100` (which is no
   longer published). In `/etc/nginx/sites-available/tracker`, with `server_name` equal to
   `SITE_ADDRESS`:

   ```nginx
   server {
       listen 80;
       server_name tracker.local;
       return 301 https://$host$request_uri;
   }
   ```

   Then `sudo nginx -t && sudo systemctl reload nginx`. Without nginx on the host, you can
   instead publish `"80:80"` for Caddy in `docker-compose.pi.yml` and remove
   `auto_https disable_redirects` from the `Caddyfile` to let Caddy do the redirect.

4. Start (or restart) everything — `COMPOSE_FILE` makes plain `docker compose` load both files:

   ```bash
   docker compose up --build -d
   ```

5. Check:

   ```bash
   curl -I http://<pi-ip>:3100              # connection refused — app no longer exposed
   curl -I http://tracker.local             # 301 → https://tracker.local/ (via nginx)
   curl -kI https://tracker.local           # 401 Unauthorized
   curl -kI -u admin:<password> https://tracker.local   # 200
   ```

The app is now at `https://<SITE_ADDRESS>`. Browsers warn about the certificate until they
trust Caddy's local root CA. Either accept the warning once per device, or export the root
certificate and install it as trusted on your devices:

```bash
docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
```

The CA lives in the `caddy_data` volume, so it survives restarts and rebuilds — don't delete
that volume or devices will have to trust a new one.

To change the password, generate a new hash, update `BASIC_AUTH_HASH` in `.env` and run
`docker compose up -d caddy`.

Still keep this on your LAN — don't port-forward 80/443 to the Pi.

## Running 24/7

The compose file already covers this:

- `restart: unless-stopped` — both containers come back after crashes and reboots (enable
  Docker on boot: `sudo systemctl enable docker`, the install script does this by default).
- Log rotation — each container keeps at most 3 × 10 MB of logs.
- `init: true` + `stop_grace_period` — clean shutdowns on reboot so Postgres doesn't have to
  recover from an unclean stop.
- The app image has a `HEALTHCHECK` on `/api/health`; `docker compose ps` shows its status.

## Updating

```bash
git pull
docker compose up --build -d app
```

This rebuilds only the app; the `postgres` service and `pgdata` volume are untouched.

## Moving data from the Mac

Use **Settings → Data → Export all (CSV)** on the Mac instance and **Import CSV** on the Pi.
The same export works as a periodic backup.
