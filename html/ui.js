//  _______           __ ______ __                __               
// |   |   |.-----.--|  |      |  |--.-----.----.|  |--.-----.----.
// |       ||  _  |  _  |   ---|     |  -__|  __||    <|  -__|   _|
// |__|_|__||_____|_____|______|__|__|_____|____||__|__|_____|__|  

// Renderer Thread - UI Functions that don't require data from browser process

// (c) 2021 JTSage.  MIT License.


const byId = function( id ) { return document.getElementById( id ) }



// ipcRenderer.on('processModsDone', (event, arg) => {
// 	byId("process_percentage").classList.add("d-none")
// 	byId("process_percentage_done").classList.remove("d-none")
// 	byId("button_process").classList.remove("disabled")
// 	byId("button_load").classList.remove("disabled")
// 	// TODO: update all the data now!
// })







// processButton = () => {
// 	ipcRenderer.send('processMods')
// 	byId("button_process").classList.add("disabled")
// 	byId("button_load").classList.add("disabled")
// 	byId("process_percentage_done").classList.add("d-none")
// 	byId("process_percentage").classList.remove("d-none")
// }



