example.bundle.js: build/example.js
	yarn run webpack

render.js: render.braid
	cat ../glrt/preamble.braid $^ | braid -cmw > $@

build/example.js: $(wildcard *.ts) render.js
	yarn run tsc
