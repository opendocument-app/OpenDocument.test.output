#!/usr/bin/env bash
find -name '*.html' -exec tidy -config .html-tidy -q -m "{}" \;
