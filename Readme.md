# Leaflet schematics

This is a set of tools to display and work with non-cartographic large
high-detailed SVG schematics or blueprints. SVG is a perfect format for the 
task - it's vector, relatively compact, has all the means to work with templates 
and symbols, so it can really be a great representation and metadata container
at the same time.

### Problem

The problem is that if you want to work with the SVG as with image overlay, 
several technical limitations and performance issues strike in:

* you cannot work on larger scales with the whole canvas because of the
  dimension restrictions of browsers
* you have to scale the drawing initially to fit the viewport on the certain
  zoom level
* IE (as always) - I wouldn't even call that "SVG support"
  * `<use>` elements have a special freaky non-compliant API which is also broken
  * css-transforms - unsupported
  * `translate() + scale()` transform on `<g>` -_doesn't work_, use matrix
  * **horrible performance** - the more SVG nodes you have the slower it is

### Approach

* Use leaflet viewportized layer container to render part of the `SVG` with padding
* scale `SVG` to fit the viewport and zoom levels
* pack `SVG` contents into moving `<g>`
* for IE - *hardcore* hacking:
  * render `SVG` > base64 > `<canvas>`
  * replace `SVG` with this canvas on drag and zoom
  * also keep a hidden PNG rendered to overcome IE's performance drop on image 
    scaling, somehow it works like a directive to switch the faulty smoothing off


## License

MIT

