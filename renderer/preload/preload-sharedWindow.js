/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// preload file.  all windows.

const {contextBridge, ipcRenderer} = require('electron')

const pageName = window.location.pathname.split('/').pop().replace('.html', '')

const pageAPI = {
	'basegame' : {
		functions : {
			context     : ()         => ipcRenderer.send('context:cutCopyPaste'),
			openFolder  : (folder)   => ipcRenderer.invoke('basegame:folder', folder),
			sendCompare : (aCompare) => ipcRenderer.send('dispatch:compare', aCompare),
		},
		validAsync : new Set(['basegame:setPage']),
	},
	'compare' : {
		functions : {
			get     : ()    => ipcRenderer.invoke('compare:get'),
			clear   : ()    => ipcRenderer.invoke('compare:clear'),
			remove  : (key) => ipcRenderer.invoke('compare:remove', key),
		},
		validAsync : new Set(),
	},
	'debug' : {
		functions : {
			all     : () => ipcRenderer.invoke('debug:all'),
			context : () => ipcRenderer.send('context:copy'),
		},
		validAsync : new Set(['debug:item']),
	},
	'detail' : {
		functions : {
			getBinds   : ()    => ipcRenderer.invoke('collect:bindConflict'),
			getMalware : ()    => ipcRenderer.invoke('collect:malware'),
			getMod     : (key) => ipcRenderer.invoke('mod:modColUUID', key),
			getStore   : (key) => ipcRenderer.invoke('store:modColUUID', key),

			sendBase    : (pageObject)   => ipcRenderer.send('dispatch:basegame', pageObject),
			sendCompare : (compareArray) => ipcRenderer.send('dispatch:compare', compareArray),
		},
		validAsync : new Set(),
	},
	'find' : {
		functions : {
			inputContext : ()     => ipcRenderer.send('context:cutCopyPaste'),
			modContext   : (data) => ipcRenderer.send('context:find', data),
			all          : ()     => ipcRenderer.invoke('collect:all'),
		},
		validAsync : new Set(['find:filterText']),
	},
	'gamelog' : {
		functions : {
			auto         : () => ipcRenderer.invoke('gamelog:auto'),
			filename     : () => ipcRenderer.invoke('gamelog:getFile'),
			get          : () => ipcRenderer.invoke('gamelog:get'),
			inputContext : () => ipcRenderer.send('context:cutCopyPaste'),
			logContext   : () => ipcRenderer.send('context:copy'),
			openFolder   : () => ipcRenderer.send('gamelog:folder'),
			pickFile     : () => ipcRenderer.invoke('gamelog:open'),
		},
		validAsync : new Set(),
	},
	'main' : {
		functions : {
			dispatch        : (win) => {
				const knownWindows = new Set([
					'compare', 'basegame', 'game', 'gamelog', 'help',
					'changelog', 'find', 'notes', 'version',
					'resolve', 'debug', 'savetrack', 'savemanage',
					'mini',
				])
				if ( knownWindows.has(win) ) {
					ipcRenderer.send(`dispatch:${win}`)
				}
			},
			dispatchDetail : (id)                => { ipcRenderer.send('dispatch:detail', id) },
			dispatchLog    : (file)              => { ipcRenderer.send('dispatch:gamelog', file) },
			dispatchNotes  : (CKey)              => { ipcRenderer.send('dispatch:notes', CKey) },
			dispatchSave   : (CKey, file = null) => { ipcRenderer.send('dispatch:save', CKey, file) },
	
			cancelDownload    : () => { ipcRenderer.send('file:downloadCancel') },
			minimizeToTray    : () => { ipcRenderer.send('main:minimizeToTray') },
			startFarmSim      : () => { ipcRenderer.send('dispatch:game') },
			updateApplication : () => { ipcRenderer.send('main:runUpdateInstall') },
			updateState       : () => ipcRenderer.invoke('state:all'),
	
			contextCol   : (CKey)         => { ipcRenderer.send('context:collection', CKey) },
			contextInput : ()             => ipcRenderer.send('context:cutCopyPaste'),
			contextMod   : (mod, select ) => { ipcRenderer.send('context:mod', mod, select ) },
			
			cache : {
				clean   : () => { ipcRenderer.send('cache:clean') },
				clear   : () => { ipcRenderer.send('cache:clear') },
				detail  : () => { ipcRenderer.send('cache:detail') },
				malware : () => { ipcRenderer.send('cache:malware') },
			},
			
			drag : {
				out : (modID)  => { ipcRenderer.send('main:dragOut', modID ) },
			},
	
			files : {
				drop        : (files)      => ipcRenderer.invoke('files:drop', files),
				exportZIP   : (MKey_s)     => { ipcRenderer.send('file:exportZIP', MKey_s) },
				list        : (mode, mods) => ipcRenderer.invoke('files:list', mode, mods),
				listFavs    : ()           => ipcRenderer.invoke('files:list:favs'),
				openExplore : (MKey_s)     => { ipcRenderer.send('files:openExplore', MKey_s) },
				openExtSite : (MKey_s)     => { ipcRenderer.send('files:openExtSite', MKey_s) },
				openModHub  : (MKey_s)     => { ipcRenderer.send('files:openModHub', MKey_s) },
				process     : ( object )   => ipcRenderer.invoke('file:operation', object),
			},
	
			folder : {
				active   : (CKey)   => ipcRenderer.invoke('folders:activate', CKey),
				add      : ()       => { ipcRenderer.send('folders:add') },
				alpha    : ()       => { ipcRenderer.send('folders:alpha') },
				download : (CKey)   => { ipcRenderer.send('file:download', CKey) },
				drop     : (folder) => { ipcRenderer.send('folders:addDrop', folder) },
				edit     : ()       => { ipcRenderer.send('folders:edit') },
				export   : (CKey)   => { ipcRenderer.send('file:exportCSV', CKey ) },
				inactive : ()       => ipcRenderer.invoke('folders:active', null),
				open     : (CKey)   => { ipcRenderer.send('folders:open', CKey) },
				reload   : ()       => { ipcRenderer.send('folders:reload') },
				remove   : (CKey)   => { ipcRenderer.send('folders:remove', CKey) },
				set      : (f, t)   => { ipcRenderer.send('folders:set', f, t) },
			},
		},
		validAsync : new Set([
			'files:operation',
			'loading:current',
			'loading:download',
			'loading:hide',
			'loading:noCount',
			'loading:show',
			'loading:titles',
			'loading:total',
			'mods:list',
			'mods:site',
			'select:list',
			'select:withText',
			'status:all',
		]),
	},
	'mini' : {
		functions : {
			dispatchLog  : ()     => { ipcRenderer.send('dispatch:gamelog', null) },
			setActive    : (CKey) => ipcRenderer.invoke('folders:activate', CKey),
			startFarmSim : ()     => { ipcRenderer.send('dispatch:game') },
			togglePin    : ()     => { ipcRenderer.send('mini:togglePin') },
			updateState  : () => ipcRenderer.invoke('state:all'),
		},
		validAsync : new Set(['mods:list', 'status:all']),
	},
	'notes' : {
		functions : {
			active       : ()    => ipcRenderer.invoke('settings:activeCollection'),
			collectName  : (key) => ipcRenderer.invoke('collect:name', key),
			get          : (key) => ipcRenderer.invoke('settings:collection:get', key),
			getSetting   : (key) => ipcRenderer.invoke('settings:get', key),
			inputContext : ()    => ipcRenderer.send('context:cutCopyPaste'),
			last         : ()    => ipcRenderer.invoke('settings:lastGame'),
			verList      : ()    => ipcRenderer.invoke('settings:verList'),

			set          : (collect, key, value) => ipcRenderer.invoke('settings:collection:set', collect, key, value),
		},
		validAsync : new Set(['settings:collection:id']),
	},
	'resolve' : {
		functions : {
			fileOp : ( object ) => ipcRenderer.invoke('file:operation', object),
			get    : ( key )    => ipcRenderer.invoke('collect:resolveList', key),
		},
		validAsync : new Set(['resolve:shortname']),
	},
	'savegame' : {
		functions : {
			cacheDetails   : (content) => ipcRenderer.send('save:cacheGameSave', content),
			drop : {
				folder : (path)  => { ipcRenderer.send('save:drop', 'folder', path)},
				file   : (path)  => { ipcRenderer.send('save:drop', 'zip', path)},
			},
			open : {
				folder     : ()      => { ipcRenderer.send('save:folder')},
				hub        : (hubID) => { ipcRenderer.send('files:openModHubID', parseInt(hubID, 10) ) },
				file       : ()      => { ipcRenderer.send('save:file')},
			},
			selectInMain   : (list)  => { ipcRenderer.send('select:listInMain', list)},
		},
		validAsync : new Set(['save:collectName', 'save:saveInfo']),
	},
	'savemanage' : {
		functions : {
			compare     : (path, collectKey) => { ipcRenderer.send('savemanage:compare', path, collectKey) },
			delete      : (path)             => { ipcRenderer.send('savemanage:delete', path) },
			export      : (path)             => { ipcRenderer.send('savemanage:export', path) },
			import      : (path, slot)       => { ipcRenderer.send('savemanage:import', path, slot) },
			importLoad  : ()                 => { ipcRenderer.send('savemanage:getImport') },
			restore     : (path, slot)       => { ipcRenderer.send('savemanage:restore', path, slot) },
		},
		validAsync : new Set(['savemanage:info', 'savemanage:import']),
	},
	'savetrack' : {
		functions : {
			openFolder     : ()      => { ipcRenderer.send('savetrack:folder')},
		},
		validAsync : new Set(['savetrack:results']),
	},
	'version' : {
		functions : {
			get     : ()    => ipcRenderer.invoke('collect:all'),
			resolve : (key) => ipcRenderer.send('dispatch:resolve', key),
		},
		validAsync : new Set(),
	},
}

if ( typeof pageAPI[pageName] !== 'undefined' ) {
	contextBridge.exposeInMainWorld(
		`${pageName}_IPC`, {
			...pageAPI[pageName].functions,

			receive   : ( channel, func ) => {
				if ( pageAPI[pageName].validAsync.has( channel ) ) {
					ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
				}
			},
		}
	)
}

contextBridge.exposeInMainWorld(
	'log', {
		debug   : (...args) => ipcRenderer.send('debug:log', 'debug', `render-${pageName}`, ...args),
		error   : (...args) => ipcRenderer.send('debug:log', 'danger', `render-${pageName}`, ...args),
		log     : (...args) => ipcRenderer.send('debug:log', 'info', `render-${pageName}`, ...args),
		warning : (...args) => ipcRenderer.send('debug:log', 'warning', `render-${pageName}`, ...args),
	}
)

contextBridge.exposeInMainWorld(
	'i18n', {
		get  : (key)       => ipcRenderer.invoke('i18n:get', key),
		lang : (nv = null) => ipcRenderer.invoke('i18n:lang', nv),
		list : ()          => ipcRenderer.invoke('i18n:langList'),

		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'i18n:refresh',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'settings', {
		dev         : ()         => ipcRenderer.invoke('settings:dev'),
		get         : (key)      => ipcRenderer.invoke('settings:get', key),
		set         : (k, v)     => ipcRenderer.invoke('settings:set', k, v),
		setGamePath : (ver = 22) => { ipcRenderer.send('settings:gamePath', ver) },
		setPrefFile : (ver = 22) => { ipcRenderer.send('settings:prefFile', ver) },
		site        : (k, v)     => ipcRenderer.invoke('settings:site', k, v),
		theme       : ()         => ipcRenderer.invoke('settings:theme'),
		themeChange : (k)        => { ipcRenderer.send('settings:themeChange', k) },
		themeList   : ()         => ipcRenderer.invoke('settings:themeList'),
		units       : ()         => ipcRenderer.invoke('settings:units'),
		winReset    : ()         => { ipcRenderer.send('settings:resetWindows') },

		receive   : ( channel, func ) => {
			const validChannels = new Set([
				'settings:invalidate',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)

contextBridge.exposeInMainWorld(
	'operations', {
		clip    : (value) => { ipcRenderer.send('win:clipboard', value)},
		close   : ()      => { ipcRenderer.send('win:close') },
		url     : (url)   => { ipcRenderer.send('win:openURL', url)},

		receive : ( channel, func ) => {
			const validChannels = new Set([
				'win:updateFontSize',
				'win:updateTheme',
				'win:forceRefresh',

				'select:all',
				'select:none',
				'select:invert',
			])
		
			if ( validChannels.has( channel ) ) {
				ipcRenderer.on( channel, ( _, ...args ) => func( ...args ))
			}
		},
	}
)
