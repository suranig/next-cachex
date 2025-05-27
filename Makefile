# Makefile for next-cachex

.PHONY: test lint pipeline coverage

test:
	npx vitest run

lint:
	npx eslint . --ext .ts

pipeline: lint test 

coverage:
	npx vitest run --coverage 