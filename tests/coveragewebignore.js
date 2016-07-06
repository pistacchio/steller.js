const fs = require('fs');
const ROWS = [
    'var _createClass',
    'function _classCallCheck',
    'function _possibleConstructorReturn',
    'function _inherits'
]
const content = fs.readFileSync('tests/steller.web.es5.js').toString();
const contents = content.split('\n');

for (let row of ROWS) {
    let rowNum = contents.findIndex(l => l.startsWith(row));
    contents.splice(rowNum, 0, '/* istanbul ignore next */');
}

fs.writeFileSync('tests/steller.web.es5.js', contents.join('\n'));
