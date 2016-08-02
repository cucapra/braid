CLI_JS := build/ssc.js
CLI_TS := ssc.ts

.PHONY: cli dingus all
cli: $(CLI_JS)
all: cli dingus
dingus:
	make -C dingus

.PHONY: clean
clean:
	rm -rf parser.js build/ tool/munge.js node_modules
	make -C dingus clean

include ts.mk


# Build the parser from the grammar.

parser.js: src/grammar.pegjs $(call npmdep,pegjs)
	$(call npmbin,pegjs) --cache $< $@


# The command-line Node tool.

TS_SRC := $(shell find src/ -type f -name '*.ts')
$(CLI_JS): $(TS_SRC) $(CLI_TS) parser.js $(TSC)
	$(TSC)


# Running tests.

define run_tests
for name in $1 ; do \
	sh test.sh $2 $$name ; \
	if [ $$? -ne 0 ] ; then failed=1 ; fi ; \
done
endef

TESTS_BASIC := $(wildcard test/basic/*.ss) $(wildcard test/snippet/*.ss) \
	$(wildcard test/if/*.ss) $(wildcard test/while/*.ss)
TESTS_COMPILE := $(TESTS_BASIC) $(wildcard test/compile/*.ss)
TESTS_INTERP := $(TESTS_BASIC) $(wildcard test/static/*.ss) \
	$(wildcard test/interp/*.ss) $(wildcard test/macro/*.ss)

.PHONY: test-compile
test-compile: $(CLI_JS)
	@ node $(CLI_JS) -t -cx $(TESTS_COMPILE)

.PHONY: test-interp
test-interp: $(CLI_JS)
	@ node $(CLI_JS) -t $(TESTS_INTERP)

# A few compile tests *without* pre-splicing. This can fail when using splices
# in a function quote.
.PHONY: test-compile-unsplice
test-compile-unsplice:
	@ node $(CLI_JS) -t -cPx $(wildcard test/snippet/*.ss)

.PHONY: test
test: $(CLI_JS)
	@ echo "interpreter" ; \
	node $(CLI_JS) -t $(TESTS_INTERP) || failed=1 ; \
	echo ; \
	echo "compiler" ; \
	node $(CLI_JS) -t -cx $(TESTS_COMPILE) || failed=1 ; \
	[ ! $$failed ]

# Just dump the output code for the WebGL examples.
.PHONY: dump-gl
dump-gl: $(CLI_JS)
	@ node $(CLI_JS) -cw $(wildcard test/webgl/*.ss)


# An asset-munging tool.

tool/munge.js: tool/munge.ts $(TSC)
	$(TSC) --out $@ $<


# Documentation.

DOC_PAGES := index hacking
DOC_BUILD := docs/build

.PHONY: docs watch-docs
docs: $(DOC_PAGES:%=$(DOC_BUILD)/%.html) $(DOC_BUILD)/docs.js

watch-docs:
	liveserve -h 0.0.0.0 -w docs -x 'make docs' -i $(DOC_BUILD) $(DOC_BUILD)

$(DOC_BUILD)/%.html: docs/%.md $(call npmdep,madoko)
	cd docs; $(call npmbin,madoko) --odir=build ../$<

$(DOC_BUILD)/docs.js: docs/docs.ts $(TSC)
	$(TSC) --out $@ $<


# Deploy the dingus and docs to the gh-pages branch.

.PHONY: site deploy home

DEPLOY_DIR := _site
RSYNC := rsync -a --delete --prune-empty-dirs \
	--exclude node_modules --exclude build
site: dingus docs home
	mkdir -p $(DEPLOY_DIR)/docs
	$(RSYNC) --include '*.html' --include '*.js' --include '*.css' \
		--include '*/' --exclude '*' \
		docs/build/* $(DEPLOY_DIR)/docs
	mkdir -p $(DEPLOY_DIR)/dingus
	$(RSYNC) --include '*.html' --include '*.bundle.js' --include '*.css' \
		--exclude 'assets/*.zip' --include 'assets/*' --include 'assets/*/*' \
		--include '*/' --exclude '*' \
		dingus/* $(DEPLOY_DIR)/dingus
	cp site/index.html site/main.css site/main.js $(DEPLOY_DIR)
	cd $(DEPLOY_DIR) ; rm -rf assets ; cp -r dingus/assets assets

RSYNCARGS := --compress --recursive --checksum --itemize-changes \
	--delete -e ssh
DEST := dh:domains/adriansampson.net/braid
deploy: site
	rsync $(RSYNCARGS) _site/ $(DEST)

home:
	make -C site



# Lint.

.PHONY: lint
lint:
	find src -name '*.ts' | xargs tslint
	find dingus -name '*.ts' | xargs tslint
	tslint $(CLI_TS)
