/* Mode Atlas global version source.
   Load this before mode-atlas-head-bootstrap.js. The service worker imports it too. */
(function ModeAtlasVersionSource(root){
  var VERSION = '2.19.74';
  var CACHE_REVISION = 'assets-2.19.74';
  root.ModeAtlasVersion = VERSION;
  root.MODE_ATLAS_VERSION = VERSION;
  root.ModeAtlasCacheRevision = CACHE_REVISION;
  root.MODE_ATLAS_CACHE_REVISION = CACHE_REVISION;
})(typeof self !== 'undefined' ? self : window);
