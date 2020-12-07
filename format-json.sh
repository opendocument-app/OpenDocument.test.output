#!/usr/bin/env bash
find -name '*.json' -exec bash -c "python -m json.tool '{}' > .format-json.tmp; mv .format-json.tmp '{}'" \;

