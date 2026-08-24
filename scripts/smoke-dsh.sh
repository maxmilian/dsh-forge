#!/usr/bin/env bash

set -euo pipefail

smoke_root="$(mktemp -d)"
trap 'rm -rf "$smoke_root"' EXIT

package_version="$(node --print "require('./package.json').version")"
tarball="$smoke_root/dsh-forge-${package_version}.tgz"
bun pm pack --destination "$smoke_root" --quiet
test -f "$tarball"

DSH_HOME="$smoke_root/dsh-home" dsh plugin --profile web add "$tarball"
DSH_HOME="$smoke_root/dsh-home" dsh --profile web --dump-config >"$smoke_root/config.yml"
DSH_HOME="$smoke_root/dsh-home" dsh --profile web --help >"$smoke_root/help.txt"

grep --fixed-strings --quiet 'dsh-forge' "$smoke_root/dsh-home/profiles/web/package.json"
grep --fixed-strings --quiet 'forge-tools' "$smoke_root/config.yml"
