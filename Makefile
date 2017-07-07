CLI_JS := build/ssc.js
CLI_TS := ssc.ts

.PHONY: cli dingus all
cli: $(CLI_JS)
all: cli dingus
dingus:
	make -C dingus

.PHONY: clean
clean:
	rm -rf parser.js build/ tool/munge.js node_modules _web/
	make -C dingus clean

include ts.mk


# Build the parser from the grammar.

parser.js: src/grammar.pegjs $(call npmdep,pegjs)
	npm run parser


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
	$(wildcard test/interp/*.ss) $(wildcard test/macro/*.ss) \
	$(wildcard test/error/*.ss) $(wildcard test/type/*.ss)

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

.PHONY: docs
docs:
	cd $@ ; gitbook build


# Put the dingus and docs together into a _web directory (and publish).

.PHONY: web deploy

DEPLOY_DIR := _web
RSYNC := rsync -a --delete --prune-empty-dirs \
	--exclude node_modules --exclude build
web: dingus docs
	rm -rf $(DEPLOY_DIR)/docs
	mkdir -p $(DEPLOY_DIR)
	cp -r docs/_book $(DEPLOY_DIR)/docs
	rm -rf $(DEPLOY_DIR)/dingus
	mkdir -p $(DEPLOY_DIR)/dingus
	cp -r dingus/assets $(DEPLOY_DIR)/dingus
	cp dingus/*.css $(DEPLOY_DIR)/dingus
	cp dingus/*.html $(DEPLOY_DIR)/dingus
	cp dingus/ssc.bundle.js $(DEPLOY_DIR)/dingus
	cp site/* _web

RSYNCARGS := --compress --recursive --checksum --itemize-changes \
	--delete -e ssh --perms --chmod=Du=rwx,Dgo=rx,Fu=rw,Fog=r
DEST := courses:coursewww/capra.cs.cornell.edu/htdocs/braid
deploy: web
	rsync $(RSYNCARGS) _web/ $(DEST)


# Lint.

.PHONY: lint
lint:
	find src -name '*.ts' | xargs tslint
	find dingus -name '*.ts' | xargs tslint
	tslint $(CLI_TS)
