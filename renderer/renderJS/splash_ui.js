/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// Splash Screen UI

window.addEventListener('DOMContentLoaded', () => {
	const urlParams = new URLSearchParams(window.location.search)
	const version = urlParams.get('version')
	document.getElementById('version').innerText = `v${version}`
})

