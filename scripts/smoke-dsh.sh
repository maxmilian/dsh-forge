#!/usr/bin/env bash

set -euo pipefail

smoke_root="$(mktemp -d)"
trap 'rm -rf "$smoke_root"' EXIT

package_version="$(node --print "require('./package.json').version")"
package_slug="$(node --print "require('./package.json').name.replace('@', '').replace('/', '-')")"
tarball="$smoke_root/${package_slug}-${package_version}.tgz"
bun pm pack --destination "$smoke_root" --quiet
test -f "$tarball"

DSH_HOME="$smoke_root/dsh-home" dsh plugin --profile web add "$tarball"
DSH_HOME="$smoke_root/dsh-home" dsh --profile web --dump-config >"$smoke_root/config.yml"
DSH_HOME="$smoke_root/dsh-home" dsh --profile web --help >"$smoke_root/help.txt"

grep --fixed-strings --quiet 'dsh-forge' "$smoke_root/dsh-home/profiles/web/package.json"
grep --fixed-strings --quiet 'forge-tools' "$smoke_root/config.yml"
