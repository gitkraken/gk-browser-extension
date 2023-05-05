/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');

// Patch package.json
const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
let packageJSON = require('../package.json');

packageJSON = JSON.stringify(
	{
		...packageJSON,
		version: `${String(date.getFullYear())}.${date.getMonth() + 1}.${date.getDate()}${String(
			date.getHours(),
		).padStart(2, '0')}`,
	},
	undefined,
	'\t',
);
packageJSON += '\n';

fs.writeFileSync('./package.json', packageJSON);
