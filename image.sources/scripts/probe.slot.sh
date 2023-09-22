#!/bin/bash

# probe file passed as parameter (up 1 level)
ffprobe -of json -show_format "$1"