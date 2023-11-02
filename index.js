if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/dom.cmn.js')
} else {
  module.exports = require('./dist/dom.cmn.js')
}
