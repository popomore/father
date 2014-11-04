jshint:
	node_modules/.bin/jshint .

test: jshint
	./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha -- -R spec -t 20000
	./node_modules/.bin/istanbul check-coverage --statement 100

coveralls: test
	cat ./coverage/lcov.info | ./node_modules/.bin/coveralls

debug:
	node $(NODE_DEBUG) ./node_modules/.bin/_mocha -R spec -t 20000

totoro:
	./node_modules/.bin/totoro --runner test/spm.test.js -b "windows7/node/0.10,linux/node/0.10"

.PHONY: test
