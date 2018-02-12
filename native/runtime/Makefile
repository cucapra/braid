TEST_SOURCE := test.c runtime.c
MESH_TEST_SOURCE := mesh_test.c runtime.c
CFLAGS := -g
LIBFLAGS :=

ifeq ($(shell uname -s),Darwin)
	# glfw3, as installed by Homebrew.
	CFLAGS += -I/usr/local/include -I/usr/local/include/graphene-1.0 -I/usr/local/lib/graphene-1.0/include
	LIBFLAGS += -L/usr/local/lib -framework OpenGL -lglfw.3 -lgraphene-1.0.0
else
	LIBFLAGS += -lGL -lglfw -lm
endif

test: $(TEST_SOURCE)
	$(CC) $(CFLAGS) $(LIBFLAGS) -o $@ $^

mesh_test: $(MESH_TEST_SOURCE)
	$(CC) $(CFLAGS) $(LIBFLAGS) -o $@ $^

.PHONY: clean
clean:
	rm -r test mesh_test test.dSYM mesh_test.dSYM *.o
