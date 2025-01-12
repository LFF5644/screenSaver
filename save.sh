#!/bin/bash
xz -e -9 -T 0 -M 5G -c /dev/fb0 --stdout > "fb_$1.xz"
