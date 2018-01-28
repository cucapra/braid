example.bundle.js: build/example.js
	yarn run webpack

render.js: render.braid
	echo 'export default' > $@
	cat ../dingus/gl_preamble.ss $^ | braid -cgw >> $@

build/example.js: $(wildcard *.ts) render.js
	yarn run tsc
