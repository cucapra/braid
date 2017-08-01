SASS_DEP := node_modules/shevy/package.json

braid.css: braid.scss $(SASS_DEP)
	sassc --style compressed $< $@

$(SASS_DEP):
	yarn
