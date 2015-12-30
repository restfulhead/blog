#!/bin/bash
set -e

export JEKYLL_ENV=prod
jekyll build --config _config_prod.yml
