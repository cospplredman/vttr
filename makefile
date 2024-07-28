

all: main.js

main.js: vt_tracker.js node_modules
	browserify $< -p esmify -o $@

node_modules: update

host:
	python -m http.server

clean:
	rm -rf ./main.js

distclean:
	rm -rf ./main.js ./node_modules ./package-lock.json

update:
	npm install


