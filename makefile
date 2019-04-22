default: main.js
	browserify main.js -p tinyify -o bundle.js

quick: main.js
	browserify main.js -o bundle.js
