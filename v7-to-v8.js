const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');

function getPrefixedWords(str) {
	const regex = /\B\#\w+/gmi;
	const temp = [];
	while ((m = regex.exec(str)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}
		m.forEach((match, groupIndex) => {
			temp.push(match);
		});
	}
	return temp;
}

async function processFile(file) {
	console.log('processing file', file);
	let changed = false;
	const currentFile = fs.readFileSync(file, 'utf8');

	const angularStrings = getPrefixedWords(currentFile);
	
	const dom = await new JSDOM(currentFile);

	const document = dom.window.document;
	const elementsWithLabel = document.querySelectorAll('*[labeltext]');
	elementsWithLabel.forEach(el => {
		const labelText = el.getAttribute('labeltext');
		const newLabel = document.createElement('label');
		newLabel.slot = 'label';
		newLabel.innerHTML = labelText;

		el.removeAttribute('labeltext');
		el.append(newLabel);
		changed = true;
	});


	const elementsWithInfoMsg = document.querySelectorAll('*[infotext]');
	elementsWithInfoMsg.forEach(el => {
		const infoMsg = el.getAttribute('infotext');
		const newInfoMsg = document.createElement('span');
		newInfoMsg.slot = 'info';
		newInfoMsg.innerHTML = infoMsg;

		el.removeAttribute('infotext');
		el.append(newInfoMsg);
		changed = true;
	});

	const elementsWithErrorMsg = document.querySelectorAll('*[inputerrormsg]');
	elementsWithErrorMsg.forEach(el => {
		const errorMsg = el.getAttribute('inputerrormsg');
		const newErrorMsg = document.createElement('span');
		newErrorMsg.slot = 'error';
		newErrorMsg.innerHTML = errorMsg;

		el.removeAttribute('inputerrormsg');
		el.append(newErrorMsg);
		changed = true;
	});

	let domString = dom.window.document.body.innerHTML;

	const gridAttributes = [
		{invalid: '[currentpage]', valid: '[attr.currentpage]'},
		{invalid: '[maxpages]', valid: '[attr.maxpages]'},
		{invalid: '[loading]', valid: '[attr.loading]'},
	];

	gridAttributes.forEach(gridAttr => {
		while (domString.indexOf(gridAttr.invalid) > -1) {
			domString = domString.replace(gridAttr.invalid, gridAttr.valid);
			changed = true;
		}
	});

	const changedSlots = [
		{invalid: 'inputelement', valid: 'input'},
		{invalid: 'inputlabel', valid: 'label'},
		{invalid: 'selectelement', valid: 'select'},
		{invalid: 'selectlabel', valid: 'label'},
		{invalid: 'checkboxelement', valid: 'checkbox'},
		{invalid: 'checkboxlabel', valid: 'label'},
	];
	
	changedSlots.forEach(changedSlot => {
		while (domString.indexOf(changedSlot.invalid) > -1) {
			domString = domString.replace(changedSlot.invalid, changedSlot.valid);
			changed = true;
		}
	});

	const gridEvents = [
		{invalid: '(pagechange)', valid: '(pageChange)'},
		{invalid: '(sortchange)', valid: '(sortChange)'}
	];
	
	gridEvents.forEach(gridEvent => {
		while (domString.indexOf(gridEvent.invalid) > -1) {
			domString = domString.replace(gridEvent.invalid, gridEvent.valid);
			changed = true;
		}
	});

	if (changed) {
		const angularSyntaxMarkers = [
			{ invalid: 'formgroup', valid: 'formGroup' },
			{ invalid: 'routerlink', valid: 'routerLink' },
			{ invalid: 'formcontrolname', valid: 'formControlName' },
			{ invalid: '*ngfor', valid: '*ngFor' },
			{ invalid: '*ngif', valid: '*ngIf' }
		];
		angularSyntaxMarkers.forEach(marker => {
			while (domString.indexOf(marker.invalid) > -1) {
				domString = domString.replace(marker.invalid, marker.valid);
			}
			const tempStrings = getPrefixedWords(domString);
			angularStrings.forEach(str => {
				const lowerCased = str.toLowerCase();
				if (tempStrings.includes(lowerCased)) {
					const found = tempStrings.find(tempStr => tempStr === lowerCased) + '=""';
					while (domString.indexOf(found) > -1) {
						domString = domString.replace(found, str);
					}
				}
			})
		})
		fs.writeFileSync(file, domString);
	}
}

function getFiles(nextPath) {
	if (fs.existsSync(nextPath) && fs.lstatSync(nextPath).isDirectory()) {
		const nextDirPath = fs.readdirSync(nextPath);
		nextDirPath.forEach(filePath => getFiles(`${nextPath}/${filePath}`));
	} else {
		if (nextPath.indexOf('.html') > -1) {
			processFile(nextPath);
		}
	}
}
getFiles('./src/app/modules');
