example.bundle.js: build/example.js
	yarn run webpack

render.js: render.braid
	echo 'export default' > $@
	cat ../glrt/preamble.braid $^ | braid -cgw >> $@

build/example.js: $(wildcard *.ts) render.js
	yarn run tsc
