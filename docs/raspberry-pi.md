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
`pgdata` volume. The app is then reachable at `http://<pi-ip>:3100`.

Note the app has no authentication — keep port 3100 on your LAN (don't port-forward it).

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
