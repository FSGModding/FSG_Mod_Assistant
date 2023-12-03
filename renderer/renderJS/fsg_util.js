/*  _______           __ _______               __         __   
   |   |   |.-----.--|  |   _   |.-----.-----.|__|.-----.|  |_ 
   |       ||  _  |  _  |       ||__ --|__ --||  ||__ --||   _|
   |__|_|__||_____|_____|___|___||_____|_____||__||_____||____|
   (c) 2022-present FSG Modding.  MIT License. */

// FSG Mod Assist Utilities (client side)

/* global l10n, bootstrap */
/* exported tableBuilder */

const getText = (text, extraTitle = null) => `<l10n ${extraTitle!==null ? `data-extra-title="${extraTitle}"` : ''} name="${text}"></l10n>`

const fsgUtil = {
	badgeDefault : {
		broken      : 'danger',
		collect     : 'primary fw-bold fst-italic',
		depend      : 'danger',
		depend_flag : 'success',
		folder      : 'primary',
		fs0         : 'danger',
		fs11        : 'info border-danger',
		fs13        : 'info border-danger',
		fs15        : 'info border-danger',
		fs17        : 'info border-danger',
		fs19        : 'info border-danger',
		fs22        : 'info border-danger',
		keys_bad    : 'danger',
		keys_ok     : 'success',
		log         : 'info fw-bold fst-italic',
		map         : 'primary fst-italic',
		new         : 'success',
		nomp        : 'secondary',
		nonmh       : 'dark border-light-subtle',
		notmod      : 'danger',
		pconly      : 'info text-black',
		problem     : 'warning',
		recent      : 'success',
		require     : 'info text-black',
		savegame    : 'info fw-bold fst-italic',
		update      : 'light border-dark-subtle text-black',
		web         : 'light border-dark-subtle text-black',
	},
	led        : {
		product    : 0x1710,
		vendor     : 0x340d,

		blink      : new Uint8Array([0xFF, 0x07, 0xFF, 0x64, 0xFF, 0xEB, 0x7D, 0x9A, 0x03]),
		off        : new Uint8Array([0xFF, 0x00, 0x00, 0x64, 0x00, 0x32, 0x9E, 0xD7, 0x0D]),
		spin       : new Uint8Array([0xFF, 0x01, 0x66, 0xC8, 0xFF, 0xAD, 0x52, 0x81, 0xD6]),
	},

	byId       : ( id )    => document.getElementById( id ),
	checkChangeAll : ( elements, newValue ) => {
		for ( const element of elements ) { element.checked = newValue}
	},
	clsAddToAll : ( queryOrNodes, classList ) => {
		const classArray = ( typeof classList === 'string' ) ? [classList] : classList
		const iterArray  = ( typeof queryOrNodes === 'string' ) ? fsgUtil.query(queryOrNodes) : queryOrNodes
		for ( const element of iterArray ) {
			element.classList.add(...classArray)
		}
	},
	clsHide : ( id ) => { fsgUtil.clsHideTrue(id, true) },
	clsHideFalse : ( id, test ) => { fsgUtil.clsHideTrue(id, !test) },
	clsHideTrue  : ( id, test ) => {
		const element = fsgUtil.byId(id)
		if ( test ) {
			element.classList.add('d-none')
		} else {
			element.classList.remove('d-none')
		}
	},
	clsOrGate   : ( id, test, ifTrue, ifFalse ) => {
		const element = fsgUtil.byId(id)
		if ( test ) {
			element.classList.add(ifTrue)
			element.classList.remove(ifFalse)
		} else {
			element.classList.add(ifFalse)
			element.classList.remove(ifTrue)
		}
	},
	clsRemoveFromAll : ( queryOrNodes, classList ) => {
		const classArray = ( typeof classList === 'string' ) ? [classList] : classList
		const iterArray  = ( typeof queryOrNodes === 'string' ) ? fsgUtil.query(queryOrNodes) : queryOrNodes
		for ( const element of iterArray ) {
			element.classList.remove(...classArray)
		}
	},
	clsShow : ( id ) => { fsgUtil.clsShowTrue(id, true) },
	clsShowFalse : ( id, test ) => { fsgUtil.clsHideTrue(id, test) },
	clsShowTrue : ( id, test ) => { fsgUtil.clsHideFalse(id, test) },
	getAttribNullEmpty : (element, attrib) => {
		const attribValue = element.getAttribute(attrib)
	
		return ( typeof attribValue !== 'string' || attribValue === null ) ?
			null :
			attribValue
	},
	query      : ( query ) => document.querySelectorAll( query ),
	queryA     : ( query ) => [...document.querySelectorAll( query )],

	getIcon    : ( type, cls ) => `<span class="text-${cls}">${fsgUtil.getIconSVG(type)}</span>`,
	getIconCLR : ( isAct = false, colorIDX = 0 ) => {
		if ( isAct ) { return ['#225511', '#44bb22', '#b3a50b'] }

		switch ( colorIDX ) {
			case 1 :
				return ['#ffaf00', '#ffbb27', '#d89400']
			case 2 :
				return ['#ff6201', '#ff7a27', '#d85200']
			case 3 :
				return ['#db277e', '#e668a5', '#b91f69']
			case 4 :
				return ['#8a13bd', '#c45fef', '#7510a0']
			case 5 :
				return ['#7958ef', '#7e5ef0', '#2f0fa1']
			case 6 :
				return ['#638aff', '#4e7bff', '#002cb1']
			case 7 :
				return ['#63f6ff', '#9df9ff', '#00cbd8']
			case 8 :
				return ['#84ff82', '#c5ffc4', '#52ff50']
			default :
				return ['#FFC843', '#E0B03B', '#7f7f00']
		}
	},
	getIconSVG : ( type, isFav = false, isAct = false, isDrop = false, colorIdx = 0 )  => {
		const colors = fsgUtil.getIconCLR(isAct, colorIdx)

		switch (type) {
			case 'check':
				return '<i class="bi bi-check2-circle"></i>'
			case 'x':
				return '<i class="bi bi-x-circle"></i>'
			case 'folder':
				return `<svg enable-background="new 0 0 347.479 347.479" version="1.1" viewBox="0 0 347.48 347.48" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" width="25" height="25" style="margin-left: 15px;">
				<path d="m292.25 79.766h-188.61v-8.544c0-5.974-4.888-10.862-10.862-10.862h-62.368c-5.975 0-10.862 4.888-10.862 10.862v8.544h-3.258c-8.962 0-16.294 7.332-16.294 16.293v174.77c0 8.961 7.332 16.293 16.293 16.293h275.96c8.961 0 16.293-7.332 16.293-16.293v-174.77c1e-3 -8.961-7.331-16.293-16.293-16.293z" fill="${colors[1]}"/>
				<rect x="23.243" y="95.385" width="262.06" height="176.11" fill="#fff"/>
				<path d="m312.43 271.29c-2.135 8.704-11.213 15.825-20.175 15.825h-275.96c-8.961 0-14.547-7.121-12.412-15.825l34.598-141.05c2.135-8.704 11.213-15.825 20.175-15.825h275.96c8.961 0 14.547 7.121 12.412 15.825l-34.598 141.05z" fill="${colors[0]}"/>
				${(isFav) ? `<path d="m171,126.25l22.06,62.76l65.93,0l-54.22,35.49l21.94,61.46l-55.74,-38.21l-55.74,38.21l22.06,-61.46l-54.32,-35.49l66.06,0l21.94,-62.76l0.03,0z" fill="${colors[2]}" id="svg_5"/>` : ''}
				${(isAct) ? '<polygon fill="#eeeeee" points="290.088 61.432 117.084 251.493 46.709 174.18 26.183 197.535 117.084 296.592 310.614 83.982"></polygon>' : ''}
				${(isDrop && !(isFav || isAct)) ? `<path fill="${colors[2]}" d="M 165.996 136.166 C 158.086 136.166 151.683 142.568 151.683 150.479 L 151.683 155.25 L 118.287 155.25 C 110.377 155.25 103.974 161.652 103.974 169.562 L 103.974 245.897 C 103.974 253.798 110.377 260.21 118.287 260.21 L 242.331 260.21 C 250.231 260.21 256.643 253.798 256.643 245.897 L 256.643 169.562 C 256.643 161.652 250.231 155.25 242.331 155.25 L 208.934 155.25 L 208.934 150.479 C 208.934 142.568 202.522 136.166 194.621 136.166 L 165.996 136.166 Z M 165.996 145.708 L 194.621 145.708 C 197.255 145.708 199.392 147.845 199.392 150.479 L 199.392 155.25 L 161.225 155.25 L 161.225 150.479 C 161.225 147.845 163.353 145.708 165.996 145.708 Z M 183.992 211.68 L 247.102 194.858 L 247.102 245.897 C 247.102 248.531 244.964 250.668 242.331 250.668 L 118.287 250.668 C 115.644 250.668 113.516 248.531 113.516 245.897 L 113.516 194.848 L 176.626 211.68 C 179.03 212.319 181.578 212.319 183.992 211.68 Z M 118.287 164.791 L 242.331 164.791 C 244.964 164.791 247.102 166.929 247.102 169.562 L 247.102 184.982 L 181.54 202.463 C 180.729 202.673 179.879 202.673 179.078 202.463 L 113.516 184.982 L 113.516 169.562 C 113.516 166.929 115.644 164.791 118.287 164.791 Z" style=""/>` : ''}
				</svg>`
			default:
				return '&nbsp;'
		}
	},
	iconMaker : (icon = null) => {
		return ( typeof icon === 'string' ) ?
			icon :
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAASe0lEQVR4nOVbW2wc13n+5sxtr9xdXrQUKUokZZKRI8u2pCSmZLWSE6eNk7RN2iKQC7hPRRCgDw2CvhRt0QJFkdZN0KQ1iqBF0BYo2MRu06RNYkm24ty8lmXZqSzRkkiRK96X3Fly77NzOacPZ4Y7XM5SuxSDPPQHBrvknjkz33/++/mPwBjD/2civ+gX+EWT5H4RBOHnMT/xuQTP5UfMuajn0/b8vack3X9I2yQAEJ25VQAyAMX5W3QuLyO85AJ2QdsATOcyPN/3jBnbGHB+fHxXE02kUoIznwwg+FAy2TfQ1XUqKMuPypI0IhGSJIR0E0GIEkEIoUH9GGAxSss2YwWbUs207UzVMO7kK5Ub787PX6tZVhFAGUAFgA7OCPv8+HjbjJhIpTa/C64RdFWgXQZ4gCsAgk+OjZ2KBYOfUGX5uETIkEhIZ7sv6CFq2vZqzTTvFXX9nXQ2eym9tnYHQAFACUAVXDJoO4zYMwZMpFIiOPDQ2SNHzsVCoWcVSTohEXKw5UlaJMaYWbOs+ZKuX5vKZF5Mr63dArABoAjOCPP8+Dht8b03v+/KBnhWPXDs4MGRoZ6eL6iSdE4kZP9u5muFBEGQA7I8HJDloWgw+MRQd/fFH92+/a82pWsA1gEUJ1Kp2vnxcauteduVgIlUisBZ9Y8+8sizsWDw85IoDqG5Vf+5EGWsVjGM924vLf3jnZWVNwG4jKgCsHZSiV2rgCPyAZGQjmceffTPQ6r6GSIIHS2+M6uZZlbn14ZhWWWbMVMAIIliQBHFcEBROgOy3COLYqzFOWHadm5e0/75yt27/wFgBUAO3FCazZiwKxVwwAcHuroOnBgc/EpAUc4J3OI3JcaYVahW76wWCrcyhUK6pOsblm0bFqWmTanNHO4LgkBEQogsiqIiSWo8FOpOxmKHu6PRR0KKcminZ8ii2DnY0/O5oKIkX3vvva+BexcNQHkilWrKBJdakgAX/GB398HjQ0P/pErSE9hB5G1Kq5l8/s3by8tv5KvV9ZpllSmlOupW20ZzPy4AkGRRDKqy3NEXjw8dTibPxUKhY8IOkStjzFwrFv/n1Zs3vwpg2WFCET7GsS0VcHQ+ONDVNfCB4eGv7wSeMmZqpdLPbszPX84WixmL0hK4OLr+e9Niox7xNYIX4LhUAFEAYVWSOob27Ts62tv762FVPdzs+Q4Tvnt5cvIFxtgyuF0oAKh5JaFlFXDAq7FQqOvE4OBXdwDPdNNcfW9x8Tt3VlYmKWMV58EbzuUyolECmjFg070CCNcsK3JraWltZnX13eODgx8b6Ox8RhLFaONLCIIg90Sjz5weHS2/PjX1b5RSAfXI0vDDeD8bIIVVNX5mbOxPA4py1g88A2i+XL6Zmp7+z41KZRVAHtwaaw74gge45YBvGrg4LpY4TCh4GFE0LEtfyOXe6o3FTvkxwGGC0h+Pf/rogQOr1+fmXgaXNmsilbLPj4/bLTPA0fvQEw899NsRVf2Mn8FjjNlrxeKbl2/efJHxVc4BWAWQdcCXwcNWq9UgxWGMmwcYE6mUDs484djBg4+NJJOfUyRpYKc5CCHBkWTydzL5/Gwmn68CqAEwJ1KpauN7+DLAFf339fUd7oxE/kAQhIjPMLpWLL756s2b3wBfqSy4G1pzwLcVne1AAgDx9Ojoyf3x+J/Jojjcyk2KJO07Pjj43Ks3b2YMy3LVzwJnxiY1kwBJleWO0d7eP5QI8XVDG5XK5OWbN18EB78CbnlXnb+rfuLWLk2kUhJ4fnF2fyz2vNQieJc6AoGjRw8ceOrtdLoARxonUilXDQH4uBVn9QMnBgfPBGT5I35jdNPMvD419ZIj9llw8CtwIrG9BH9mbOyp3ljsS5IoPuQ3jlKqrxWLVx03u4UIIYGBzs6nO4LBfgAJABFwVd60ZX5+VRIJCfdEo8+JhHQ1/sgYs95bXPxOvlLJgBu6FfCVz4O7m71b+dHRs8lY7K/lZuAZM9KaduGVGzcmMoXCj/3GBBSl/0h//zkAXQBiAALw4G5kgABAOTk8fFKR5RN+E2ql0s9uLS9fB9fzDOpib+yBvm+CPz06eqY3Hv+iLIqjfuMoY+ZCLvfKlenpSwDyb6fT3zIsK9M4jgiC2hONHg8pSg+AOIAwPAa9kQEigEB3JPJrEiHJxslsSvXr8/MXUBf9VTgGby9X/vTo6JP74/HnZVF82G8c4+Av/fTOne+CS+FyoVq9u7C+/k2/8SFFGTicTD4OzoAouGslwHYGSIf37etTZfm4z29YLRTeyOTzi+Di7rq6PQU/PjLy5P54/G92AG/Nadqln965831wm7MCYB7A4uTCwnd105xtvEckJLKvo+MYgA5wNYiAM0HwgiQA1INdXU/IhAw1TkIZM24tLaXA3ckG6n7e3DVqhzwrf7Y/kfjyTis/p2kX33DEHlwFl+C436KuL64WCt/2uzesqgPxcHi/IAid4JIQBCA1MkAOqupjhJB44wTFavVurlzOgQc2RfDQ1thNTc5LDvjQ6dHRs33x+JdlUXyf3zjKmJnOZi9cuXv3MmUsDx5vrICrQMF5p/xcNvsjSmmx8X5FknoOJBLvI4LQDaAbXAq2MUBRRHEEPiFvplCYtCitgktABTygeCDRd8GfGhl5si+R+EpTV8eYmV5be/nqzMxrNqXrqK/8Grg9cqvG1Y1KZblsGDca55BFMdIRDPY7tYYomkiA5FfWYoCdyefTjq91o6r75tqtgB8fGTnd39n595KP2nnAf//tdPpHHvCLzqeb7rrldKNmWaV8pfKOz1RCSFWTnZHIPtTL9WIjA0TiU8U1LCtXqtXy4OJfcj7bqr35gA9+cHj4gwc6O19oBp4xZs1lsxffTqd/Ytp2zgG9AC76eXhcr8MEy7CsSr5SueM3nypJ0c5wuAf1fQviZYAAQCSCsC3L0g1jzbLtGhwxQz2l3TX4E0NDJw52d+8MXtMuXUunf2jatuYDvuYTd1gAqiVdn6eMlRvnFAkJhlW1C3UGiI0MIEQQwo036qa5YVPqxtCm86C2gx4v+KGenq81C3Ica3/prdnZHxiW1Qy8n/rZAAyT0rzFJWYLiYSoAVmOwTH4AERvMtR0z86wrIpN6ZYiRrv63yp4ypgxr2mvXp2ZubyD2Dd7NgVgM8Zqto8nIIKgyKIYgkcFGrNB31KTzZjJ6vvofpWcHck1eB88fPhDB7u6XpC5p9n+9g74K3fvvupj8Lbo/H2Isoa0F+DFV0EQZHg2a1uqCj9Iwd/r6voTib9rltJSSvV7mnbxyvT0D9j2IGcD7ecazQqoDI66AxBaYoBIiCoIQrMJm1I74NOaduHK9PQr4ODXwMG7uUZb4IkgECIIgcb/M8Ysm1I3cmWAT0GEAZbQ8H9VkiISIaJvVbEJeSK8X+qLx/+2hZW/CF5Sy4Cvehbcz7edZcqiKImEbNtcoYyZpm2XUVdj1riqjPm4j4CidEripscQAAhO8dKXPPn8LzvgD/uNo4wZ93hsfwE8pF0CN3gZPECKHVSUsERIovH/FqXVqmFswNN04WUAA0BtSguNNwZkuUeRJBX37+7YktX1xuPP7wR+XtMuecAvgxu8Nexy5eFEsx3B4EFBENTGHy3brhZ1XQMHbwGw/RiwzX/KohiLhUKdqPcBuF0eW8gFf2pk5HR/IvElWRTH/N7SBf/61NT3wMV+GXz1NfAMc8fNzR1IioVCoWgg8IjfjzXT3MiVSquoxzNbGEAB2KZtL/vd3BuLjciiGARPIlwmbJK3ktPHwR/xm4cyZizkcq94wC85VxYPBh4AJFWSOkKqeqrxBwbYJV1fWy+XC9hBAuyqYUwznzC3Jxp9VBbFCHgaGYKnrOSp3p7bqZjhrrxTyXFXfnkvwLs9C73x+CFVkrY937SsDa1cXqH1hisLAPVaewrA3CiX302Ew1lZFLeUxIKKMtCfSAxPZTJLDgMUZ9NCAK/efjgZi31xB7GvzWWzF1PT0y9jq9hnwTPMB1l5wNlO608kPukEO1tIN83s0vr6AqPUgLNRggYJsAGYd1dXr9dM857fE0Z6ez/ibJJEwZkQABA6Mzb2VDIW+6uddP5eNnshxV3dOrYavDIePLUWAMhH+voORQOB32z8nQG0UK3OVQ2jwLiBLYJntNtsgLFRqayXdP0dxtg2tx8LhY6O9fYeA6+xJwAkTo+OfjgZiz2/U2yfzmYvXJme/gF4kONuorhi/0DgHRIBhA4nk78nEtLd+KNpWfk5TbvhPE9D3dNYjTbABFCazmS+Z/gbQzK2f/+nnc6v3kcGBs461Vvf2J4xZt7LZi9enZn5oRPerqIe5DyowQNQ38b7wPDwo2FVPe83pqTr6XlNmwUHrcHTStPoykwAlflcbqak61f9jGFIVYc/MDz88YNdXY+P9vb+hdzEzzPAntO0S2/NzPyQbi1j7SV4AdwYRwa6uv7Er5ZhU1qe07RrlDEdPLjKO8834BMJUnDdKEwuLk6YlrXi9+CDXV2fPDk09HlFknz3DRlj9lw2e/Gt2dnXLB5XuFndKupBzl50ekoAQh9/7LEvqJJ0xm9AoVq9O53JTDrP3XCfDycX2BYKw1GDhVxuSiuVXvazBSIhIVWWfVviGGP2nKZd3EUxoy1yc42njx59NhIIfBYNcQkAmLZdfG9p6VXTtt1mDVf0N0v5fhme7QzaeDud/veKYdxq9aWcMtaFa7Ozr3nAN+bzDyz2E6mUDCD84fe//zcS4fAf+3WqMcasTD7/xr1sdhocvLuRo8NTzdrGAOcFDQDFQrW6OLm4+A+mT3mpkWxK9dm1te9fnZl5rbYV/G7z+W3k6VEMP3306LNdkcgXRUJ6/cYWdX3m6szMK+AinwU3fm4JfZOa5fiuLVifzmSuzWnavzhGpCnlSqX/vToz81PTtt1mKM158ANvnE6kUmQilVLANzYTzzz22B91RiJ/2Qy8YVnZqzMzL+mmuQ4edGXRpJDqywCvFABYuzY7+52VjY1vM8aaboN1RiLHnhwbezoWDAYFQXDrh5vFR2f1dg1claSuxw8dOvWpkycnYsHg54kgxP3usSktX5+f/+ZqoTAPvgirqDdPbvNqO7bJOYYmAqBXEIRD544c+f19HR2/4hdqOsRqlrU6r2n/dWtp6VLFMBac7NKNvLY0SjWZg4BbdwmAEg0Ewn2JxODhffueiwaDn3FcnX/tktLq5OLiN24sLLwJvuoLqGeZm5u47XSK2uCc0xhj8uXJyReeevhhuq+j42NNmCCokpR8KJn87IHOzo+ubGy8PKdpPynVass108zppun2Ce60ryAlwuFwSFHiXZHIob5E4hMdweCn/CK8BvDlycXFFx3wbn3B7VrRm+1gt9ooqYBvLfcA6D0zNvZcXzz+W4SQ0E4v5bxYqVyrXS9Uq9fz1ertQrWappSWHJtCAV7Dk0RRDClKJBYKHYqo6iMhVX1CleX3368dF+A6f31+/sWplZV3Ua8sbdYXGjvI2+oVPj8+TidSKQPcmFEA1o9v3/7644ODK8M9Pc8pkuRriFwSCYl0BIOnOoLBUwcAUEpLFqXrNqVFp3RNiCAEREJiEiEJv0pOM2KMmUVdn7k2O/utlXz+Huor74L31XsvtVQVdphQg+cszzvp9H+v5vPpYwMDvxsNBo+KhGzbUfIjQkhEIcSv7a4tMm17PZPPv5WamrpgUZpHPcX2dozfN9xuuVv8/Pg4m0ilTHBfygDYi+vr1uL6+tLJ4eFf7YvHPxJUlAHSxgruhkzbLhZ1/e7U8vJrM/z4TBFczzOonxmooMXzRG2dGHGYYIEzwa2rVd+amXkppKqvHxsY+Gh3NHo8IMsHZFFs9RxBS1SzrLWyrs8vrq//7MbCwtvgCU0eXNQ18FUvghu8lneu2z4y425DT6RSFdQ7L8uVWq30xvS0JhFy8eH+/g/1dHQcDavqgCJJXe0cgHCJAbZpWRu6aWYL1eq9xVxucmZtbQr1rnM3yFlHvR/ZbLdfadfnBs+Pj9tOScwG9/FlAAWL0o3r8/MagB/3RKP7e+PxhzqCwQMhRUkqkhSTCAmJhAQEQZDd3SbGmE0ZMyxKdcu2KzXTzJVqtdX1cnlpIZdLVw3Dbbcvga/6BuqZnZva7uoI3TY3uEsSwd1VALxUFvVcEdQryRL8T5F6N169J0U3W1/AwXrzeW+bzq7D7L1iAFDfcHRPigbAgYecz4DzmxvlNZ4e9Z4atZzLAJcuty/JPTTpBlIP3Ji5lwzwktvv726kyKiDbzw662VA49FZC1uPzrph9J6dIf55MWBzftQlo9nhaS8D3E8vI9xrzw9OA8D/ATmR9Oe6wYUlAAAAAElFTkSuQmCC'
	},

	arrayToTableRow : (items) => {
		if ( typeof items === 'string' ) {
			return `<tr><td>${items}</td></tr>`
		}

		const itemsHTML = items.map((item) => `<td>${item}</td>`)
		return `<tr>${itemsHTML.join('')}</tr>`
	},
	badge              : (color, name, fullName = false) => `<span class="border border-2 badge bg-${(color !== false)?color:fsgUtil.badgeDefault[name.toLowerCase()]}">${getText(`${(fullName)?'':'mod_badge_'}${name}`)}</span>`,
	badge_main         : (badgeRec) => {
		const badgeName  = badgeRec[0].toLowerCase()
		const badgeText  = getText(`mod_badge_${badgeName}`, badgeRec[1][1])
		const badgeColor = `bg-${fsgUtil.badgeDefault[badgeName]}`
		const badgeClass = ['border border-2 badge', badgeRec[1][0], badgeColor].join(' ')

		return `<span class="${badgeClass}">${badgeText}</span>`
	},
	buildScrollCollect : (collectKey, scrollRows) => `<div class="${collectKey} scroll_col flex-grow-1"></div>${scrollRows.join('')}`,
	buildScrollMod     : (collectKey, modUUID) => `<div class="${collectKey}_mods ${modUUID} scroll_mod d-none flex-grow-1 bg-opacity-25"></div>`,
	buildSelectOpt     : (value, text, selected, disabled = false, title = null) => `<option ${( title !== null ) ? `title="${title}"` : '' } value="${value}" ${( value === selected ) ? 'selected' : ''} ${( disabled ) ? 'disabled' : ''}>${text}</option>`,
	useTemplate        : ( templateName, replacements ) => {
		try {
			let thisTemplate = fsgUtil.byId(templateName).innerHTML

			for ( const key in replacements ) {
				thisTemplate = thisTemplate.replaceAll(new RegExp(`{{${key}}}`, 'g'), replacements[key])
			}

			return thisTemplate
		} catch (err) {
			window.log.warning(`Template usage failed :: ${err}`, templateName)
		}
	},
	
	basename  : (name, sep = '\\') => name.substr(name.lastIndexOf(sep) + 1),
	bytesToHR : ( inBytes, locale ) => {
		const thisLocale = ( locale !== null ) ? locale : 'en'
		let bytes = inBytes

		if (Math.abs(bytes) < 1024) { return '0 kB' }

		const units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		let u = -1
		const r = 10**2

		do {
			bytes /= 1024
			++u
		} while (Math.round(Math.abs(bytes) * r) / r >= 1024 && u < units.length - 1)

		return [
			bytes.toLocaleString( thisLocale, { minimumFractionDigits : 2, maximumFractionDigits : 2 } ),
			units[u]
		].join(' ')
	},
	bytesToMB     : (count, suffix = true) => `${Math.round((count / ( 1024 * 1024)*100))/100}${suffix?' MB':''}`,
	escapeDesc    : ( text ) => typeof text === 'string' ? text.replaceAll(/&/g, '&amp;').replaceAll(/<(?!(a |\/a))/g, '&lt;') : text,
	escapeSpecial : ( text ) => typeof text === 'string' ? text.replaceAll(/&/g, '&amp;').replaceAll(/</g, '&lt;').replaceAll(/>/g, '&gt;').replaceAll(/"/g, '&quot;').replaceAll(/'/g, '&#39;') : text,

	firstOrNull : ( arr ) => {
		if ( !Array.isArray(arr) || arr.length !== 1 ) { return null }
		return arr[0]
	},
	
	classPerTest : ( query, test, class_add_when_false = 'd-none' ) => {
		for ( const element of fsgUtil.query(query) ) {
			element.classList[test ? 'remove' : 'add'](class_add_when_false)
		}
	},
	setTextOrHide : ( id, content, test ) => {
		if ( test === null || test === '' ) {
			fsgUtil.byId(id).classList.add('d-none')
		} else {
			fsgUtil.byId(id).innerHTML = content
		}
	},

	clearTooltips   : () => { for ( const tooltip of fsgUtil.query('.tooltip') ) { tooltip.remove() } },
	setTheme        : (theme) => { document.body.setAttribute('data-bs-theme', theme) },
	windowCheckAll  : () => { fsgUtil.windowCheckOp(true) },
	windowCheckInv  : () => {
		for ( const element of fsgUtil.query('[type="checkbox"]') ) { element.checked = !element.checked }
	},
	windowCheckNone : () => { fsgUtil.windowCheckOp(false) },
	windowCheckOp   : ( newChecked = true ) => {
		for ( const element of fsgUtil.query('[type="checkbox"]') ) { element.checked = newChecked }
	},

	setContent      : (kvPair) => {
		for ( const [id, value] of Object.entries(kvPair) ) {
			fsgUtil.byId(id).innerHTML = value
		}
	},

	getFillImage    : (name, height = 25) => {
		return `<img title="${name}" style="height: ${height}px" src="img/fills/${fsgUtil.knownFills.has(name) ? name : 'unknown'}.webp">`
	},

	/* cSpell:disable */
	knownFills : new Set([
		'air', 'barley', 'boards', 'bread', 'butter', 'cake', 'canola', 'cereals', 'chaff', 'cheese', 'chicken', 'chocolate', 'clothes', 'cotton', 'cow', 'def', 'diesel', 'digestate', 'dog', 'drygrass_windrow', 'egg', 'electriccharge', 'fabric', 'fertilizer', 'flour', 'forage', 'forage_mixing', 'foragemix', 'furniture', 'grape', 'grapejuice', 'grass', 'grass_windrow', 'herbicide', 'honey', 'horse', 'lettuce', 'lime', 'liquidfertilizer', 'liquidmanure', 'maize', 'manure', 'methane', 'milk', 'mineral_feed', 'oat', 'oil_canola', 'oil_olive', 'oil_sunflower', 'oilradish', 'olive', 'pig', 'pigfood', 'poplar', 'potato', 'product', 'raisins', 'roadsalt', 'roundbalecotton', 'roundbalegrass', 'roundbalehay', 'roundbalesilage', 'roundbalestraw', 'roundbalewood', 'seeds', 'sheep', 'silage', 'silage_additive', 'snow', 'sorghum', 'soybean', 'squarebalecotton', 'squarebalegrass', 'squarebalehay', 'squarebalesilage', 'squarebalestraw', 'squarebalewood', 'stone', 'straw', 'strawberry', 'sugar', 'sugarbeet', 'sugarbeet_cut', 'sugarcane', 'sunflower', 'tarp', 'tomato', 'treesaplings', 'unknown', 'water', 'weed', 'wheat', 'woodchips', 'wool',
		'wood', 'emptypallet', 'clover', 'alfalfa', 'woodbeam', 'wine', 'whiskey', 'table', 'sugarbeetcut', 'staircaserailing', 'squarebale', 'soymilk', 'silageadditive', 'shingle', 'roundbale', 'propane', 'prefabwall', 'plankslong', 'planks', 'pictureframe', 'peppergrinder', 'pasta', 'paperroll', 'oatmeal', 'mineralfeed', 'metal', 'ironore', 'floortiles', 'ethanol', 'easel', 'dryclover', 'dryalfalfa', 'dry_maize2', 'doghouse', 'cornstalks', 'chips', 'chair', 'cattree', 'cartonroll', 'bucket', 'bowl', 'birdhouse', 'beer', 'beanstraw', 'bathtub', 'barrel', 'armoire', 'anhydrous'
	]),

	knownBrand : new Set([
		'brand_abi', 'brand_aebi', 'brand_agco', 'brand_agrisem', 'brand_agromasz', 'brand_albutt', 'brand_aldi', 'brand_alpego', 'brand_amazone', 'brand_amitytechnology', 'brand_andersongroup', 'brand_annaburger', 'brand_apv', 'brand_arcusin', 'brand_armatrac', 'brand_bednar', 'brand_bergmann', 'brand_berthoud', 'brand_bkt', 'brand_bmvolvo', 'brand_boeckmann', 'brand_bomech', 'brand_bourgault', 'brand_brantner', 'brand_bredal', 'brand_bremer', 'brand_brielmaier', 'brand_briri', 'brand_buehrer', 'brand_capello', 'brand_caseih', 'brand_challenger', 'brand_claas', 'brand_continental', 'brand_conveyall', 'brand_corteva', 'brand_dalbo', 'brand_damcon', 'brand_degelman', 'brand_demco', 'brand_deutzfahr', 'brand_dfm', 'brand_duevelsdorf', 'brand_easysheds', 'brand_einboeck', 'brand_elho', 'brand_elmersmfg', 'brand_elten', 'brand_engelbertstrauss', 'brand_ero', 'brand_faresin', 'brand_farmax', 'brand_farmet', 'brand_farmtech', 'brand_fendt', 'brand_fiat', 'brand_flexicoil', 'brand_fliegl', 'brand_fmz', 'brand_fortschritt', 'brand_fortuna', 'brand_fsi', 'brand_fuhrmann', 'brand_gessner', 'brand_giants', 'brand_goeweil', 'brand_goldhofer', 'brand_gorenc', 'brand_greatplains', 'brand_gregoirebesson', 'brand_grimme', 'brand_groha', 'brand_hardi', 'brand_hatzenbichler', 'brand_hauer', 'brand_hawe', 'brand_heizomat', 'brand_helm', 'brand_holaras', 'brand_holmer', 'brand_horsch', 'brand_husqvarna', 'brand_impex', 'brand_iseki', 'brand_jcb', 'brand_jenz', 'brand_johndeere', 'brand_jonsered', 'brand_joskin', 'brand_jungheinrich', 'brand_kaercher', 'brand_kaweco', 'brand_kemper', 'brand_kesla', 'brand_kingston', 'brand_kinze', 'brand_kline', 'brand_knoche', 'brand_koeckerling', 'brand_koller', 'brand_komatsu', 'brand_kongskilde', 'brand_kotschenreuther', 'brand_kotte', 'brand_kramer', 'brand_krampe', 'brand_kroeger', 'brand_krone', 'brand_kronetrailer', 'brand_ksag', 'brand_kubota', 'brand_kuhn', 'brand_kverneland', 'brand_lacotec', 'brand_landini', 'brand_lely', 'brand_lemken', 'brand_lindner', 'brand_lizard', 'brand_lizardbuilding', 'brand_lizardenergy', 'brand_lizardfarming', 'brand_lizardforestry', 'brand_lizardgoods', 'brand_lizardlawncare', 'brand_lizardlogistics', 'brand_lizardmotors', 'brand_lizardstorage', 'brand_lodeking', 'brand_mack', 'brand_mackhistorical', 'brand_magsi', 'brand_mahindra', 'brand_man', 'brand_manitou', 'brand_masseyferguson', 'brand_mccormack', 'brand_mccormick', 'brand_mcculloch', 'brand_meridian', 'brand_michelin', 'brand_michieletto', 'brand_mitas', 'brand_nardi', 'brand_neuero', 'brand_newholland', 'brand_nokian', 'brand_none', 'brand_nordsten', 'brand_olofsfors', 'brand_paladin', 'brand_pesslinstruments', 'brand_pfanzelt', 'brand_pioneer', 'brand_planet', 'brand_ploeger', 'brand_poettinger', 'brand_ponsse', 'brand_porschediesel', 'brand_prinoth', 'brand_provita', 'brand_provitis', 'brand_quicke', 'brand_rabe', 'brand_randon', 'brand_rau', 'brand_reform', 'brand_reiter', 'brand_riedler', 'brand_rigitrac', 'brand_risutec', 'brand_ropa', 'brand_rostselmash', 'brand_rottne', 'brand_rudolfhoermann', 'brand_rudolph', 'brand_salek', 'brand_salford', 'brand_samasz', 'brand_samporosenlew', 'brand_samsonagro', 'brand_schaeffer', 'brand_schaumann', 'brand_schouten', 'brand_schuitemaker', 'brand_schwarzmueller', 'brand_seppknuesel', 'brand_siloking', 'brand_sip', 'brand_stadia', 'brand_stara', 'brand_starkindustries', 'brand_stepa', 'brand_steyr', 'brand_stihl', 'brand_stoll', 'brand_strautmann', 'brand_suer', 'brand_tajfun', 'brand_tatra', 'brand_tenwinkel', 'brand_thueringeragrar', 'brand_thundercreek', 'brand_tmccancela', 'brand_treffler', 'brand_trelleborg', 'brand_tt', 'brand_unia', 'brand_unverferth', 'brand_vaederstad', 'brand_valtra', 'brand_valtravalmet', 'brand_veenhuis', 'brand_vermeer', 'brand_versatile', 'brand_vervaet', 'brand_vicon', 'brand_volvo', 'brand_volvobm', 'brand_volvokrabat', 'brand_vredestein', 'brand_walkabout', 'brand_warzee', 'brand_webermt', 'brand_welger', 'brand_westtech', 'brand_wilson', 'brand_zetor', 'brand_ziegler', 'brand_zunhammer'
	]),
	/* cSpell:enable */
}

/*  __ ____   ______        
   |  |_   | |      |.-----.
   |  |_|  |_|  --  ||     |
   |__|______|______||__|__| */

function processL10N()          { clientGetL10NEntries() }

function clientGetL10NEntries() {
	const l10nSendArray = fsgUtil.queryA('l10n').map((element) => fsgUtil.getAttribNullEmpty(element, 'name'))

	l10n.getText_send(new Set(l10nSendArray))
}

window?.l10n?.receive('fromMain_getText_return', (data) => {
	if ( data[0] === '__currentLocale__'  ) {
		document.body.setAttribute('data-i18n', data[1])
	} else {
		for ( const item of fsgUtil.query(`l10n[name="${data[0]}"]`) ) { item.innerHTML = data[1] }
	}
})

const currentTooltips = []
window?.l10n?.receive('fromMain_getText_return_title', (data) => {
	for ( const item of fsgUtil.query(`l10n[name="${data[0]}"]`) ) {
		const extTitle = item.getAttribute('data-extra-title')
		let thisTitle   = item.closest('button')
		thisTitle     ??= item.closest('span')
		thisTitle     ??= item.closest('label')

		if ( data[0] === 'game_icon_lg' ) { thisTitle = item.closest('#multi_version_button') }

		if ( thisTitle !== null ) {
			thisTitle.title = `${data[1]}${extTitle !== null && extTitle !== '' ? ` : ${extTitle}` : ''}`
			currentTooltips.push(new bootstrap.Tooltip(thisTitle))
		}
	}
})

window?.l10n?.receive('fromMain_l10n_refresh', (newLang) => {
	for ( const oldTooltip of currentTooltips ) {
		oldTooltip?.dispose?.()
	}
	currentTooltips.length = 0
	document.body.setAttribute('data-i18n', newLang)
	processL10N()
})

window?.l10n?.receive('fromMain_langList_return', (listData, selected) => {
	fsgUtil.byId('language_select').innerHTML = listData.map((x) => {
		return fsgUtil.buildSelectOpt(x[0], x[1], selected)
	}).join('')
})

window?.l10n?.receive('fromMain_themeList_return', (listData, selected) => {
	fsgUtil.byId('theme_select').innerHTML = listData.map((x) => {
		return fsgUtil.buildSelectOpt(x[0], x[1], selected)
	}).join('')
})


document.addEventListener('keydown', (event) => {
	const evt = event || window.event
	if (evt.code === 'Escape' && ! document.location.href.includes('main.html') ) {
		window.win_ops.closeWindow()
	}
})

window.addEventListener('error', (errorObj) => {
	if ( typeof errorObj === 'object' ) {
		window.log.warning(errorObj.message, errorObj.filename.split('/').pop())
	}
})

window?.win_ops?.receive('fromMain_themeSetting', (theme) => fsgUtil.setTheme(theme))
window?.win_ops?.receive('fromMain_clearTooltips', fsgUtil.clearTooltips)
window.addEventListener('click', fsgUtil.clearTooltips)