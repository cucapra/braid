CLI_JS := build/ssc.js
CLI_TS := ssc.ts

.PHONY: cli dingus all
cli: $(CLI_JS)
all: cli dingus
dingus:
	make -C dingus

.PHONY: clean
clean:
	rm -rf parser.js build/ tool/munge.js node_modules typings
	make -C dingus clean

include ts.mk


# Build the parser from the grammar.

parser.js: src/grammar.pegjs $(call npmdep,pegjs)
	$(call npmbin,pegjs) --cache $< $@


# The command-line Node tool.

TS_SRC := $(shell find src/ -type f -name '*.ts')
$(CLI_JS): $(TS_SRC) $(CLI_TS) parser.js $(TYPINGS_MAIN) $(TSC)
	$(TSC)


# Running tests.

define run_tests
for name in $1 ; do \
	sh test.sh $2 $$name ; \
	if [ $$? -ne 0 ] ; then failed=1 ; fi ; \
done
endef

TESTS_BASIC := $(wildcard test/basic/*.ss) $(wildcard test/snippet/*.ss) \
	$(wildcard test/if/*.ss)
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

tool/munge.js: tool/munge.ts $(TSC) $(TYPINGS_MAIN)
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

.PHONY: site deploy

DEPLOY_DIR := _site
RSYNC := rsync -a --delete --exclude node_modules --exclude *.ts \
	--exclude Makefile --exclude package.json --exclude typings
site: dingus docs
	mkdir -p $(DEPLOY_DIR)/docs
	$(RSYNC) docs/build/* $(DEPLOY_DIR)/docs
	mkdir -p $(DEPLOY_DIR)/dingus
	$(RSYNC) --exclude build dingus/* $(DEPLOY_DIR)/dingus

DEPLOY_BRANCH := gh-pages
deploy: site
	git symbolic-ref HEAD refs/heads/$(DEPLOY_BRANCH)
	git --work-tree $(DEPLOY_DIR) reset --mixed --quiet
	git --work-tree $(DEPLOY_DIR) add --all
	git --work-tree $(DEPLOY_DIR) commit -m "gh-pages deployment"
	# git push origin $(DEPLOY_BRANCH)
	git symbolic-ref HEAD refs/heads/master  # This should probably use the "old" branch.


# Lint.

.PHONY: lint
lint:
	find src -name '*.ts' | xargs tslint
	find dingus -name '*.ts' | xargs tslint
	tslint $(CLI_TS)
