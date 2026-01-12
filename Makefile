#!/usr/bin/make

run:
	docker run --network=host --env-file=.env soumetsu:latest

build:
	docker build -t soumetsu:latest .
