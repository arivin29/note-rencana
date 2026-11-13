#!/bin/bash
# Sumber konfigurasi untuk skrip shell di repo ini — pasangan dari scripts/lib/env-config.js.
#
# JANGAN menulis host atau kata sandi langsung di dalam skrip .sh. Host publik lama
# 109.105.194.174 sudah pensiun (akses WAJIB lewat tailnet), dan kata sandi yang
# ditulis di berkas skrip ikut ter-commit ke git selamanya. `.env` sudah di-gitignore.
#
# Pakai dari skrip mana pun:
#   source "$(dirname "$0")/scripts/lib/env.sh"      # dari akar repo
#   source "$(dirname "$0")/../lib/env.sh"           # dari scripts/test/
# lalu panggil `pg "SELECT 1"` atau `pg_t "SELECT 1"` (mode tuples-only).

# Sengaja TIDAK memakai `set -u`/`set -e`: berkas ini di-source, jadi opsi apa pun
# yang dipasang di sini ikut mengubah perilaku skrip pemanggilnya.

_ENV_SH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_REPO_ROOT="$(cd "$_ENV_SH_DIR/../.." && pwd)"
_ENV_FILE="$_REPO_ROOT/.env"

if [ ! -f "$_ENV_FILE" ]; then
    echo "❌ .env tidak ditemukan di $_ENV_FILE" >&2
    exit 1
fi

# Baca .env tanpa mengeksekusi isinya sebagai perintah.
while IFS='=' read -r _key _value; do
    case "$_key" in
        ''|\#*) continue ;;
    esac
    _value="${_value%\"}"
    _value="${_value#\"}"
    _value="${_value%\'}"
    _value="${_value#\'}"
    export "$_key=$_value"
done < <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$_ENV_FILE")

for _required in DB_HOST DB_USERNAME DB_PASSWORD; do
    if [ -z "${!_required:-}" ]; then
        echo "❌ $_required belum diisi di $_ENV_FILE" >&2
        echo "   Skrip ini sengaja tidak punya nilai cadangan supaya tidak ada" >&2
        echo "   kredensial yang tertinggal di dalam kode." >&2
        exit 1
    fi
done

DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-iot}"

# Target koneksi untuk dicetak — tanpa kata sandi.
DB_TARGET="$DB_USERNAME@$DB_HOST:$DB_PORT/$DB_NAME"
export DB_TARGET

# pg "<sql>"    → keluaran tabel biasa
# pg_t "<sql>"  → tuples-only, untuk diambil nilainya ke variabel
pg() {
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" "$@"
}

pg_t() {
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -t "$@"
}
