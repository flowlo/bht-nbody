# Barnes-Hut N-Body Simulation

This is a two dimensional simulation of gravitational interactions between bodies using the [Barnes-Hut Simulation](http://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation) algorithm. [Try it out](https://flowlo.github.io/bht-nbody)!

This program is mainly intended for educational use and/or to experiment with gravity in gravitational systems etc.

## Copyright Notice

Substantial parts of this program were obtained from [here](https://github.com/Elucidation/Barnes-Hut-Tree-N-body-Implementation-in-HTML-Js) and are licensed by Sameer Ansari under a BSD license which can be found in the file `LICENSE`.

## Differences to parent repository

This fork adds following features to the parent repository:

 - Greater modularity (Barnes-Hut tree more separated)
 - Use of JavaScript prototype instead of functions for Barnes-Hut Tree
 - More compact Barnes-Hut Tree implementation
 - True Barnes-Hut Tree (only *one* body per cell)
 - Representation of bodies as array of objects instead of multiple arrays of properties
 - Colouring of bodies depending on their velocity
 - More compact input files (maintaingin backwards compatibility)
 - Various other minor differences

## TODO

 [ ] Three dimensions
 [ ] Detailed documentation of input format
