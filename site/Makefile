SASS_DEP := node_modules/shevy/package.json \
	node_modules/github-fork-ribbon-css/gh-fork-ribbon.css

braid.css: braid.scss $(SASS_DEP)
	sassc --style compressed $< $@

$(SASS_DEP):
	yarn
