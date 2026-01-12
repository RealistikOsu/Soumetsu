#!/bin/sh
set -e

if [ -z "$APP_COMPONENT" ]; then
  echo "Please set APP_COMPONENT"
  exit 1
fi

if [ -z "$SOUMETSU_ENV" ]; then
  echo "Please set SOUMETSU_ENV"
  exit 1
fi

if [ "$APP_COMPONENT" = "api" ]; then
    exec ./soumetsu
else
    echo "Unknown component: $APP_COMPONENT"
    exit 1
fi