#!/bin/bash
set -e

if [ -z "$APP_COMPONENT" ]; then
  echo "Please set APP_COMPONENT"
  exit 1
fi

if [ -z "$SOUMETSU_ENV" ]; then
  echo "Please set SOUMETSU_ENV"
  exit 1
fi

cd /app
if [ "$APP_COMPONENT" = "api" ]; then
  ./soumetsu
else
  echo "Unknown component: $APP_COMPONENT"
  exit 1
fi
