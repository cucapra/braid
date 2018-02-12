Since it would be rather tedious to implement from scratch in C the functionality
necessary to parse mesh files and do 3D math, we use two libraries:

graphene - for manipulating matricies and vectors
https://github.com/ebassi/graphene
- this has to be installed: not terribly difficult to build from source. See
instructions on github.

tinyobjloader - for loading object files
https://github.com/syoyo/tinyobjloader-c
- this is a header only library: it's included in the repository, so there's no
need to build anything.
