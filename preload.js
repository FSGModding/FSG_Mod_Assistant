// const translator = require('./translations/translate.js');

// var myTranslator = new translator("en");
// const _ = myTranslator.translate;

window.addEventListener('DOMContentLoaded', () => {
	const replaceText = (selector, text) => {
	  const element = document.getElementById(selector)
	  if (element) element.innerText = text
	}
  
	// for (const type of ['chrome', 'node', 'electron']) {
	//   replaceText(`${type}-version`, process.versions[type])
	// }

})