import { signAddon } from 'web-ext/util/submit-addon';

const filename = process.argv[2];
const version = process.argv[3];

const signAddonOptions = {
	apiKey: process.env.FF_API_KEY,
	apiSecret: process.env.FF_API_SECRET,
	amoBaseUrl: 'https://addons.mozilla.org/api/v5/',
	// The explicit extension ID; an existing ID submits a new version rather than a new add-on.
	id: 'gitkraken-browser@gitkraken.com',
	xpiPath: `./${filename}`,
	// The release channel (listed or unlisted).
	channel: 'unlisted',
	// Save downloaded files to the current working directory.
	downloadDir: process.cwd(),
	// Caches the AMO upload UUID so a retry of the same xpi skips re-uploading.
	savedUploadUuidPath: '.amo-upload-uuid',
};

console.log('signing', filename, 'version', version);

signAddon(signAddonOptions)
	.then(function (result) {
		console.log('The following signed files were downloaded:');
		console.log(result.downloadedFiles);
		console.log('Your extension ID is:');
		console.log(result.id);
		console.log('SUCCESS');
	})
	.catch(function (error) {
		console.error('Your add-on could not be signed!');
		console.error('Signing error:', error);
		console.log('FAIL');
		process.exitCode = 1;
	});
