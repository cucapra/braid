DINGUS_JS := build/dingus/src/dingus.js
GENERATED := examples.json preambles.json ssc.bundle.js \
	codemirror.css dingus.css

.PHONY: all clean
all: ssc.bundle.js codemirror.css dingus.css
clean:
	rm -rf build/ node_modules/ $(GENERATED)

include ../ts.mk


# Build the TypeScript and JavaScript sources.

TS_SRC := $(shell find ../src/ -type f -name '*.ts') \
	$(shell find ./src/ -type f -name '*.ts') \
	$(shell find ../glrt/ -type f -name '*.ts')
JS_SRC := examples.json preambles.json ../parser.js
$(DINGUS_JS): $(TS_SRC) $(JS_SRC) $(TSC)
	$(TSC)

# It's a shame we have to duplicate this rule here.
../parser.js: ../src/grammar.pegjs
	make -C .. parser.js


# Bundle the built sources for the Web.

ssc.bundle.js: $(DINGUS_JS) $(call npmdep,webpack)
	npm run bundle


# Build the CSS.

dingus.css: dingus.scss dingus.tools.scss
	sassc $< > $@


# Copy the CSS resource we need.

codemirror.css: $(call npmdep,codemirror)
	cp node_modules/codemirror/lib/codemirror.css $@


# Munge the examples and preamble files.

MUNGE := ../tool/munge.js
$(MUNGE):
	make -C .. tool/munge.js

EXAMPLES := basics splice persist progfunc extern \
	presplice macro normcolor objects phong texture head \
	couch environment shadow dynamic multitexture array
EXAMPLE_FILES := $(EXAMPLES:%=examples/%.ss)
examples.json: $(MUNGE) $(EXAMPLE_FILES)
	node $< $(EXAMPLE_FILES) > $@

preambles.json: $(MUNGE) ../glrt/preamble.braid preamble.braid
	node $< ../glrt/preamble.braid preamble.braid > $@
