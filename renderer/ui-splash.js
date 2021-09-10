/*  _______           __ ______ __                __               
   |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
   |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
   |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  */

// Mod File Parser - UI Tweaks, Renderer (Splash Screen)

// (c) 2021 JTSage.  MIT License.
window.addEventListener('DOMContentLoaded', () => {
	const urlParams = new URLSearchParams(window.location.search)
	const version = urlParams.get('version')
	document.getElementById('version').innerText = `v${version}`
})

