#!/bin/sh
# Open the Fantasy Draft Board in the default browser.
# Usage: ./open.sh
DIR=$(cd "$(dirname "$0")" && pwd)
open "$DIR/index.html"
