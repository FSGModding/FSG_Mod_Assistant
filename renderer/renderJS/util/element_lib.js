//  = {

Element.prototype.clsOrGate = function ( test, ifTrue = 'text-success', ifFalse = 'text-danger' ) {
	if ( test ) {
		if ( ifTrue !== null ) { this.classList.add(ifTrue) }
		if ( ifFalse !== null ) { this.classList.remove(ifFalse) }
		return this
	}
	if ( ifFalse !== null ) { this.classList.add(ifFalse) }
	if ( ifTrue !== null ) { this.classList.remove(ifTrue) }
	return this
}
Element.prototype.clsOrGateArr = function ( arr, ifTrue = 'text-danger', ifFalse = 'text-success') {
	return this.clsOrGate((Array.isArray(arr) && arr.length !== 0), ifTrue, ifFalse )
}

Element.prototype.clsHideByValue = function (value, testValue = null) {
	return this.clsOrGate(!this.clsBoolTest(value, testValue), null, 'd-none')
}
Element.prototype.clsShowByValue = function (value, testValue = null) {
	return this.clsOrGate(this.clsBoolTest(value, testValue), null, 'd-none')
}
Element.prototype.clsDisableByValue = function (value, testValue = null) {
	return this.clsOrGate(!this.clsBoolTest(value, testValue), null, 'disabled')
}
Element.prototype.clsEnableByValue = function (value, testValue = null) {
	return this.clsOrGate(this.clsBoolTest(value, testValue), null, 'disabled')
}

Element.prototype.clsHide = function (test = true) {
	return this.clsOrGate(!test, null, 'd-none')
}
Element.prototype.clsShow = function (test = true) {
	return this.clsOrGate(test, null, 'd-none')
}
Element.prototype.clsDisable = function (test = true) {
	return this.clsOrGate(!test, null, 'disabled')
}
Element.prototype.clsEnable = function (test = true) {
	return this.clsOrGate(test, null, 'disabled')
}
Element.prototype.clsBoolTest = function (value, requiredValue = null ) {
	if ( typeof value === 'undefined' || value === null || value === false || value.length === 0 || value === 0 ) {
		return false
	}
	if ( Array.isArray(value) && value.filter((x) => x !== null).length === 0 ) { return true }
	if ( requiredValue !== null ) {
		if ( typeof value === 'string' && typeof requiredValue === 'string' && value.toLowerCase() === requiredValue.toLowerCase() ) {
			return true
		} else if ( typeof value === 'number' && typeof requiredValue === 'number' && value === requiredValue ) {
			return true
		}
		return false
	}
	return true
}

Element.prototype.safeAttribute = function (attrib, replacer = null) {
	const attribValue = this.getAttribute(attrib)

	return ( typeof attribValue !== 'string' || attribValue === null || attribValue === '' ) ?
		replacer :
		attribValue
}
Element.prototype.stringAttribute = function (attrib) {
	return this.safeAttribute(attrib, '')
}