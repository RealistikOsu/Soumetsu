#!/usr/bin/env bash
set -eo pipefail

if [ -z "$SOUMETSU_COMPONENT" ]; then
  echo "Please set SOUMETSU_COMPONENT"
  exit 1
fi

if [ -z "$SOUMETSU_ENV" ]; then
  echo "Please set SOUMETSU_ENV"
  exit 1
fi

if [ "$SOUMETSU_COMPONENT" = "api" ]; then
    exec ./soumetsu
else
    echo "Unknown component: $SOUMETSU_COMPONENT"
    exit 1
fi