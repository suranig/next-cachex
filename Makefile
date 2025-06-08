# Makefile for next-cachex

.PHONY: test lint pipeline coverage release-patch release-minor release-major

test:
	npx vitest run

lint:
	npx eslint . --ext .ts

pipeline: lint test 

coverage:
	npx vitest run --coverage

release-patch:
	npm version patch && git push && git push --tags

release-minor:
	npm version minor && git push && git push --tags

release-major:
	npm version major && git push && git push --tags 