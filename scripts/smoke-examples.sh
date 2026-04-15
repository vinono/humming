#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$(mktemp -d)"
CURRENT_PIDS=()
BASIC_PORT="${BASIC_PORT:-24877}"
PLUGINS_PORT="${PLUGINS_PORT:-24878}"
FORWARD_PORT="${FORWARD_PORT:-24879}"
FORWARD_UPSTREAM_PORT="${FORWARD_UPSTREAM_PORT:-24911}"
ASYNC_PORT="${ASYNC_PORT:-24880}"

cleanup() {
  for pid in "${CURRENT_PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
  done
}

finalize() {
  cleanup
  rm -rf "$LOG_DIR"
}

trap finalize EXIT

wait_for_url() {
  local url="$1"

  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 0.25
  done

  echo "Timed out waiting for $url" >&2
  return 1
}

start_example() {
  local name="$1"
  shift

  local log_file="$LOG_DIR/${name}.log"

  (
    cd "$ROOT_DIR"
    "$@"
  ) >"$log_file" 2>&1 &

  local pid=$!
  CURRENT_PIDS=("$pid")
}

print_log_on_failure() {
  local name="$1"
  local log_file="$LOG_DIR/${name}.log"

  if [[ -f "$log_file" ]]; then
    echo "---- ${name} log ----" >&2
    cat "$log_file" >&2
    echo "---------------------" >&2
  fi
}

assert_contains() {
  local haystack="$1"
  local needle="$2"

  if [[ "$haystack" != *"$needle"* ]]; then
    echo "Expected output to contain: $needle" >&2
    echo "$haystack" >&2
    return 1
  fi
}

run_basic() {
  start_example basic env PORT="$BASIC_PORT" bun run example:basic

  wait_for_url "http://localhost:${BASIC_PORT}/health" || {
    print_log_on_failure basic
    return 1
  }

  local health options
  health="$(curl -fsS "http://localhost:${BASIC_PORT}/health")"
  options="$(curl -fsS "http://localhost:${BASIC_PORT}/api/options?keys=status")"

  assert_contains "$health" '"status":"UP"'
  assert_contains "$options" '"key":"status"'
}

run_plugins() {
  start_example with-plugins env PORT="$PLUGINS_PORT" bun run example:with-plugins

  wait_for_url "http://localhost:${PLUGINS_PORT}/health" || {
    print_log_on_failure with-plugins
    return 1
  }

  local health metrics options
  health="$(curl -fsS "http://localhost:${PLUGINS_PORT}/health")"
  metrics="$(curl -fsS "http://localhost:${PLUGINS_PORT}/metrics")"
  options="$(curl -fsS "http://localhost:${PLUGINS_PORT}/api/options?keys=teams,countries")"

  assert_contains "$health" '"status":"UP"'
  assert_contains "$metrics" 'humming_http_requests_total'
  assert_contains "$options" '"key":"teams"'
  assert_contains "$options" '"key":"countries"'

  local first_headers first_code second_headers second_code third_headers third_code
  first_headers="$(mktemp)"
  second_headers="$(mktemp)"
  third_headers="$(mktemp)"

  first_code="$(curl -sS -o /dev/null -D "$first_headers" -w '%{http_code}' -H "Authorization: Bearer demo-token" "http://localhost:${PLUGINS_PORT}/api/hello")"
  second_code="$(curl -sS -o /dev/null -D "$second_headers" -w '%{http_code}' -H "Authorization: Bearer demo-token" "http://localhost:${PLUGINS_PORT}/api/hello")"
  third_code="$(curl -sS -o /dev/null -D "$third_headers" -w '%{http_code}' -H "Authorization: Bearer demo-token" "http://localhost:${PLUGINS_PORT}/api/hello")"

  [[ "$first_code" == "200" ]]
  [[ "$second_code" == "200" ]]
  [[ "$third_code" == "429" ]]

  grep -iq '^x-humming-cache: MISS' "$first_headers"
  grep -iq '^x-humming-cache: HIT' "$second_headers"
  grep -iq '^ratelimit-remaining: 0' "$third_headers"
  grep -iq '^retry-after: ' "$third_headers"

  rm -f "$first_headers" "$second_headers" "$third_headers"
}

run_forward() {
  start_example with-forward env PORT="$FORWARD_PORT" UPSTREAM_PORT="$FORWARD_UPSTREAM_PORT" bun run example:with-forward

  wait_for_url "http://localhost:${FORWARD_PORT}/health" || {
    print_log_on_failure with-forward
    return 1
  }

  local response
  response="$(curl -i -sS "http://localhost:${FORWARD_PORT}/api/backend/ping?name=humming")"

  assert_contains "$response" 'HTTP/1.1 200 OK'
  assert_contains "$response" 'x-forward-hook: after-response'
  assert_contains "$response" '"pluginHeader":"with-forward"'
  assert_contains "$response" '"pathname":"/ping"'
}

run_async() {
  start_example with-async-plugin env PORT="$ASYNC_PORT" bun run example:with-async-plugin

  wait_for_url "http://localhost:${ASYNC_PORT}/health" || {
    print_log_on_failure with-async-plugin
    return 1
  }

  local health ready
  health="$(curl -fsS "http://localhost:${ASYNC_PORT}/health")"
  ready="$(curl -fsS "http://localhost:${ASYNC_PORT}/api/ready")"

  assert_contains "$health" '"status":"UP"'
  assert_contains "$ready" '"message":"async plugin is ready"'
}

run_basic
cleanup
CURRENT_PIDS=()

run_plugins
cleanup
CURRENT_PIDS=()

run_forward
cleanup
CURRENT_PIDS=()

run_async

echo "example smoke tests passed"
