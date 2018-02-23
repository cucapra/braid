# This Makefile fetches demo assets (to avoid including large files owned by
# someone else in this source repository).

CUBE_PARTS := negx.jpg negy.jpg negz.jpg posx.jpg posy.jpg posz.jpg

.PHONY: all
all: teapot.obj head.obj lambertian.jpg bump-lowRes.png default.png \
	bunny.obj $(CUBE_PARTS)

# Teapot.
teapot.obj:
	curl -LO "http://graphics.cs.utah.edu/courses/cs6620/fall2013/prj05/$@"
	touch $@

# Head.
head.OBJ: head.zip
	unzip $^ $@
	touch $@
head.obj: head.OBJ
	mv $^ $@
lambertian.jpg: head.zip
	unzip $^ $@
	touch $@
bump-lowRes.png: head.zip
	unzip $^ $@
	touch $@
head.zip:
	curl -L -o $@ "https://casual-effects.com/g3d/data10/research/model/lpshead/lpshead.zip"

# Cube.
default.png: cube.zip
	unzip $^ $@
	touch $@
cube.zip:
	curl -LO "https://casual-effects.com/g3d/data10/common/model/cube/$@"

# Bunny.
bunny.obj:
	curl -LO "https://raw.githubusercontent.com/McNopper/OpenGL/master/Binaries/bunny.obj"

# Cube map.
Yokohama2.zip:
	curl -LO http://www.humus.name/Textures/$@
$(CUBE_PARTS): Yokohama2.zip
	unzip $^ $@
