var b64      = require('Base64');
var Renderer = require('./schematic_renderer');

require('./bounds');
require('./utils');

module.exports = L.Rectangle.extend({

  options: {
    opacity: 0.4,
    fillOpacity: 0,
    weight: 1,
    adjustToScreen: true,
    // hardcode zoom offset to snap to some level
    zoomOffset: 0
  },


  /**
   * @constructor
   * @param  {String}         svg     SVG string or URL
   * @param  {L.LatLngBounds} bounds
   * @param  {Object=}        options
   */
  initialize: function(svg, bounds, options) {

    /**
     * @type {String}
     */
    this._svg    = svg;

    if (!(bounds instanceof L.LatLngBounds)) {
      options = bounds;
      bounds = null;
    }

    options.renderer = new Renderer({
      schematic: this
      // padding: options.padding || this.options.padding || 0.25
    });

    /**
     * @type {L.LatLngBounds}
     */
    this._bounds = bounds;

    /**
     * @type {Number}
     */
    this._ratio = 1;


    /**
     * @type {L.Point}
     */
    this._size = null;


    /**
     * @type {L.Point}
     */
    this._origin = null;


    /**
     * @type {L.Transformation}
     */
    this._transformation = null;


    /**
     * @type {String}
     */
    this._base64encoded = '';


    /**
     * @type {String}
     */
    this._rawData = '';

    if (typeof svg === 'string' && !/\<svg/ig.test(svg)) {
      this._svg = null;

      /**
       * @type {String}
       */
      this._url = svg;

      if (!options.load) {
        throw new Error('SVGOverlay requires external request implementation. '+
          'You have to provide `load` function with the options');
      }
    }

    /**
     * @type {SVGElement}
     */
    this._group = null;


    /**
     * @type {Element}
     */
    this._image = null;


    /**
     * @type {Canvas}
     */
    this._canvas = null;


    L.Rectangle.prototype.initialize.call(
      this, L.latLngBounds([0,0], [0,0]), options);
  },


  onAdd: function(map) {
    L.Rectangle.prototype.onAdd.call(this, map);
    if (!this._svg) {
      this.load();
    } else {
      this.onLoad(this._svg);
    }
  },


  onRemove: function(map) {
    this._group.parentNode.removeChild(this._group);
    L.Rectangle.prototype.onRemove.call(this, map);
  },


  /**
   * Loads svg via XHR
   */
  load: function() {
    this.options.load(this._url, function(err, svg) {
      if (!err) {
        this.onLoad(svg);
      }
    }.bind(this));
  },


  /**
   * SVG is ready
   * @param  {String} svg markup
   */
  onLoad: function(svg) {
    this._rawData = svg;
    svg = L.DomUtil.getSVGContainer(svg);
    var bbox = this._bbox = L.DomUtil.getSVGBBox(svg);
    var size = this.getOriginalSize();
    var mapSize = this._map.getSize();

    if (this.options.adjustToScreen) {
      if (size.y !== mapSize.y) {
        var ratio = Math.min(mapSize.x / size.x, mapSize.y / size.y);
        this.options.zoomOffset = ratio;
        console.log(this.options.zoomOffset)
      }
    }

    if (svg.getAttribute('viewBox') === null) {
      this._rawData = this._rawData.replace('<svg',
        '<svg viewBox="' + bbox.join(' ') + '"');
    }

    // TODO: calculate zoom offset here to fit the screen

    var minZoom = this._map.getMinZoom() + this.options.zoomOffset;
    // calculate the edges of the image, in coordinate space
    this._bounds = new L.LatLngBounds(
      this._map.unproject([bbox[0], bbox[3]], minZoom),
      this._map.unproject([bbox[2], bbox[1]], minZoom)
    );

    var mapSize = this._map.getSize();
    if (size.y !== mapSize.y && this.options.adjustToScreen) {
      var ratio    = Math.min(mapSize.x / size.x, mapSize.y / size.y);
      this._bounds = this._bounds.scale(ratio);
      this._ratio  = ratio;
    }

    this._size   = size;
    this._origin = this._map.project(this._bounds.getCenter(), minZoom);
    this._viewBoxOffset = L.point(this._bbox[0], this._bbox[1]);
    this._transformation = new L.Transformation(
      1, this._origin.x, 1, this._origin.y);

    this._group = L.SVG.create('g');
    L.DomUtil.addClass(this._group, 'svg-overlay');

    if (L.Browser.ie) { // innerHTML doesn't work for SVG in IE
      var child = svg.firstChild;
      do {
        this._group.appendChild(child);
        child = svg.firstChild;
      } while(child);
    } else {
      this._group.innerHTML = svg.innerHTML;
    }
    this._renderer._container.insertBefore(
      this._group, this._renderer._container.firstChild);

    this.fire('load');
    this._latlngs = this._boundsToLatLngs(this._bounds);
    this._reset();
  },


  /**
   * @return {L.Point}
   */
  getOriginalSize: function() {
    var bbox = this._bbox;
    return new L.Point(
      Math.abs(bbox[0] - bbox[2]),
      Math.abs(bbox[1] - bbox[3])
    );
  },


  _updatePath: function() {
    L.Rectangle.prototype._updatePath.call(this);
    if (this._group) {
      var topLeft = this._map.latLngToLayerPoint(this._bounds.getNorthWest());
      // scale is scale factor, zoom is zoom level
      var scale   = this._map.options.crs.scale(
        this._map.getZoom() - this.options.zoomOffset) * this._ratio;

      // compensate viewbox dismissal with a shift here
      this._group.setAttribute('transform',
         L.DomUtil.getMatrixString(topLeft, scale));
    }
  },


  /**
   * Scales projected point FROM viewportized schematic ratio
   * @param  {L.Point} pt
   * @return {L.Point}
   */
  _unscalePoint: function(pt) {
    return this._transformation.transform(
      this._transformation.untransform(pt).divideBy(this._ratio));
  },


  /**
   * Scales projected point TO viewportized schematic ratio
   * @param  {L.Point} pt
   * @return {L.Point}
   */
  _scalePoint: function(pt) {
    return this._transformation.transform(
      this._transformation.untransform(pt).multiplyBy(this._ratio)
    );
  }

});
