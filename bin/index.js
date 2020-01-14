#!/usr/bin/env node

const app = require('../server/app');

var opts = Object.assign({}, ...process.argv.map((arg)=>{
	if (!/--[^ ]+=/.test(arg)) return;
	const matches = arg.match(/--([^ ]+)=(.*)/);
	if (!matches || matches.length < 3) return;
	return { [matches[1]]: matches[2] };
}).filter(Boolean));

app(opts.port, opts.sport, opts.nocors);
