const konfiguration = {
	standard: {
		scheibenHoehe: 2,
		anzahlScheibenMin: 3,
		anzahlScheibenMax: 7,
		zahlenZeigen: false
	},
	text: {
		zahlenZeigen: "Zahlen anzeigen",
		zeit: (ms: number) => (ms / 1000).toFixed(3) + "s",
		bestaetigung: "Möchtest du wirklich neu starten? Dein Spielstand wird verloren gehen.",
		generator: (anzahlScheiben: number) => anzahlScheiben + " Scheiben",
		zuege: (anzahlZuege: number) => anzahlZuege.toString() + " " + (anzahlZuege === 1 ? "Zug" : "Züge")
	},
	zeitUpdateInterval: 50,
	zeitWartenZurSiegAnimation: 500,
	sieg: {
		h1: "Gewonnen",
		h2: "Tippe, um mit einer zusätzlichen Scheibe fortzufahren..."
	}
}

type Highscore = {
	zuege?: number,
	zeit?: number
}

type Highscores = {
	[T: number]: Highscore
}

namespace Helper {
	export namespace Cookie {
		export function set(name: string, value: string) {
			document.cookie = name + "=" + value
		}

		export function get(name: string) {
			return document.cookie.split(";").find(item => item.trim().startsWith(name))?.trim().substring(name.length + 1)
		}
	}

	export namespace Highscore {
		export function get() {
			return JSON.parse(Helper.Cookie.get("highscores") || "{}") as Highscores
		}

		export function set(anzahlScheiben: number, zuegeOderZeit: "zuege" | "zeit", value: number) {
			const highscores = this.get()
			if (highscores[anzahlScheiben] === undefined) highscores[anzahlScheiben] = {}
			highscores[anzahlScheiben][zuegeOderZeit] = value
			Cookie.set("highscores", JSON.stringify(highscores))
		}

		export enum State {
			besser,
			knapp,
			gleich,
			schlechter
		}

		export function getState(highscore: number, value: number, knapperBereich: number) {
			if (highscore === value) return Helper.Highscore.State.gleich
			if (highscore < value) return Helper.Highscore.State.schlechter
			if (highscore - knapperBereich < value) return Helper.Highscore.State.knapp
			return Helper.Highscore.State.besser
		}
	}
}

class Container extends HTMLElement {
	private _spiel: Spiel
	set spiel(value: Spiel) {
		if (this._spiel) this._spiel.remove()
		this._spiel = value
		this.appendChild(this._spiel)
		this.kontrolle.buttons.generators.forEach(generator => generator.classList.remove("active"))
		this.kontrolle.buttons.generators.find(generator => Number(generator.dataset.anzahlScheiben) === value.anzahlScheiben).classList.add("active")
		Helper.Cookie.set("anzahlScheiben", value.anzahlScheiben.toString())
	}

	get spiel() {
		return this._spiel
	}

	get kontrolle() {
		return Array.from(this.children).find(child => child instanceof Kontrolle) as Kontrolle
	}

	get anleitung() {
		return Array.from(this.children).find(child => child instanceof Anleitung) as Anleitung
	}

	set zahlenZeigen(value: boolean) {
		Helper.Cookie.set("zahlenZeigen", value.toString())
		this.classList[value ? "add" : "remove"]("zahlen-zeigen")
	}

	get zahlenZeigen() {
		return this.classList.contains("zahlen-zeigen")
	}

	constructor(
		public anzahlScheibenMin: number = konfiguration.standard.anzahlScheibenMin,
		public anzahlScheibenMax: number = konfiguration.standard.anzahlScheibenMax,
		private scheibenHoehe: number = konfiguration.standard.scheibenHoehe
	) {
		super();
		window.onbeforeunload = () => {
			if (this.spiel.istBewegtWorden() && !this.spiel.istFertig()) return konfiguration.text.bestaetigung
		}
	}

	// noinspection JSUnusedGlobalSymbols
	connectedCallback() {
		this.anzahlScheibenMin = this.dataset.anzahlScheibenMin ? Number(this.dataset.anzahlScheibenMin) : this.anzahlScheibenMin
		this.anzahlScheibenMax = this.dataset.anzahlScheibenMax ? Number(this.dataset.anzahlScheibenMax) : this.anzahlScheibenMax
		this.scheibenHoehe = this.dataset.scheibenHoehe ? Number(this.dataset.scheibenHoehe) : this.scheibenHoehe

		this.append(
			document.importNode((document.getElementById("anleitung") as HTMLTemplateElement).content, true),
			new Kontrolle(this.anzahlScheibenMin, this.anzahlScheibenMax)
		)
		this.spiel = new Spiel(Number(Helper.Cookie.get("anzahlScheiben")) || this.anzahlScheibenMin)

		const erlaubteKeys = ["1", "2", "3"]
		const keys = {
			from: null,
			to: null
		}
		const setFrom = value => {
			const alterTurm = this.spiel.feld.tuerme[erlaubteKeys.indexOf(keys.from)]
			if (value === null) {
				if (alterTurm && alterTurm.scheibe) alterTurm.scheibe.loslassen()
			} else {
				const neuerTurm = this.spiel.feld.tuerme[erlaubteKeys.indexOf(value)]
				if (neuerTurm.scheibe) neuerTurm.scheibe.aufheben()
			}
			keys.from = value
		}
		const setTo = value => {
			if (value !== null) {
				const alterTurm = this.spiel.feld.tuerme[erlaubteKeys.indexOf(keys.from)]
				const neuerTurm = this.spiel.feld.tuerme[erlaubteKeys.indexOf(value)]

				if (
					// Kann Scheibe dort nicht ablegen
					neuerTurm.disabled ||
					// Da keine Scheibe da ist, kann auch keine bewegt werden
					!alterTurm.scheibe
				) return

				console.log("Bewege von Turm " + keys.from + " zu Turm " + value + ".")
				alterTurm.scheibe.loslassen()
				neuerTurm.ablegen(alterTurm.scheibe)
			}
			keys.to = value
		}
		window.onkeydown = event => {
			if (!erlaubteKeys.includes(event.key)) return
			if (keys.from === null) setFrom(event.key)
			else if (keys.to === null) {
				if (keys.from === event.key) return
				setTo(event.key)
			}
		}
		window.onkeyup = event => {
			if (!erlaubteKeys.includes(event.key)) return
			if (event.key === keys.from) setFrom(keys.to)
			else setFrom(keys.from)
			setTo(null)
		}
	}
}

// @ts-ignore
customElements.define("hanoi-container", Container)

class Anleitung extends HTMLElement {
	onclick = () => this.offen = false

	set offen(value: boolean) {
		this.classList[value ? "add" : "remove"]("offen")
	}

	get offen() {
		return this.classList.contains("offen")
	}
}

customElements.define("hanoi-anleitung", Anleitung)

class Kontrolle extends HTMLElement {
	constructor(
		private readonly anzahlScheibenMin: number,
		private readonly anzahlScheibenMax: number
	) {
		super();
	}

	buttons: {
		zahlenZeigen: HTMLButtonElement,
		generators: HTMLButtonElement[],
		dunkel: HTMLButtonElement,
		anleitung: HTMLButtonElement
	} = {
		zahlenZeigen: document.createElement("button"),
		generators: [],
		dunkel: document.createElement("button"),
		anleitung: document.createElement("button"),
	}

	// noinspection JSUnusedGlobalSymbols
	connectedCallback() {
		this.buttons.zahlenZeigen.textContent = konfiguration.text.zahlenZeigen
		this.buttons.zahlenZeigen.onclick = () => {
			this.container.zahlenZeigen = !this.container.zahlenZeigen
			this.buttons.zahlenZeigen.classList.toggle("active")
		}
		if (Helper.Cookie.get("zahlenZeigen") === "true") this.buttons.zahlenZeigen.click()

		for (let i = this.anzahlScheibenMin; i <= this.anzahlScheibenMax; i++) {
			const button = document.createElement("button")
			button.textContent = konfiguration.text.generator(i)
			button.dataset.anzahlScheiben = String(i)
			button.onclick = () => {
				if (
					!this.container.spiel.istBewegtWorden() ||
					this.container.spiel.istFertig() ||
					confirm(konfiguration.text.bestaetigung)
				) this.container.spiel = new Spiel(i)
			}
			this.buttons.generators.push(button)
		}

		const setThemeText = () => this.buttons.dunkel.textContent = document.body.classList.contains("dunkel") ? "☀️" : "🌙"
		setThemeText()
		this.buttons.dunkel.classList.add("shrink")
		this.buttons.dunkel.onclick = () => {
			document.body.classList.toggle("dunkel")
			Helper.Cookie.set("dunkel", document.body.classList.contains("dunkel").toString())
			this.buttons.dunkel.classList.toggle("active")
			setThemeText()
		}
		if (Helper.Cookie.get("dunkel") === "true") this.buttons.dunkel.click()

		this.buttons.anleitung.classList.add("shrink", "anleitung")
		this.buttons.anleitung.textContent = "❓"
		this.buttons.anleitung.onclick = () => {
			this.container.anleitung.offen = true
		}

		const buttons = Object.values(this.buttons).reduce<HTMLButtonElement[]>((acc, val) => acc.concat(val), [])
		buttons.forEach(button => button.tabIndex = 0)
		this.append(...buttons)
	}

	get container() {
		return this.parentElement as Container
	}
}

// @ts-ignore
customElements.define("hanoi-kontrolle", Kontrolle)

class Spiel extends HTMLElement {
	get container() {
		return this.parentElement as Container
	}

	highscore: Highscore = {zeit: Number.MAX_VALUE, zuege: Number.MAX_VALUE}

	constructor(
		readonly anzahlScheiben: number
	) {
		super();

		const highscore = Helper.Highscore.get()[anzahlScheiben] || {};
		["zuege", "zeit"].forEach(zuegeOderZeit => {
			if (zuegeOderZeit in highscore) this.highscore[zuegeOderZeit] = highscore[zuegeOderZeit]
		})
	}

	start: number
	private startInterval: NodeJS.Timeout
	private pause: number
	private _pausiert: boolean

	set zeit(value: number) {
		this.status.sections.zeit.textContent = konfiguration.text.zeit(value)
		this.status.sections.zeit.dataset.state = Helper.Highscore.State[Helper.Highscore.getState(this.highscore.zeit, value, 10000)]
	}

	get zeit() {
		return this.start ? Date.now() - this.start : 0
	}

	starten() {
		if (this.gestartet) return
		this.start = Date.now()
		this.fortfahren()
	}

	get gestartet() {
		return !!this.start
	}

	pausieren() {
		if (this.pausiert || !this.gestartet) return
		this._pausiert = true
		this.pause = this.zeit
		clearInterval(this.startInterval)
	}

	get pausiert() {
		return this._pausiert
	}

	fortfahren() {
		if (this.pausiert) {
			this._pausiert = false
			this.start = Date.now() - this.pause
		}
		this.startInterval = setInterval(() => this.zeit = this.zeit, konfiguration.zeitUpdateInterval)
	}

	pausierenOderFortfahren() {
		if (this.pausiert) this.fortfahren()
		else this.pausieren()
	}

	startenOderFortfahren() {
		if (this.pausiert) this.fortfahren()
		else this.starten()
	}

	beenden() {
		if (this.beendet) return
		this.disabled = true
		this.pausieren()
		this.sieg.anzeigen()
		setTimeout(() => this.feld.spiel.classList.add("beendet"), konfiguration.zeitWartenZurSiegAnimation);

		["zuege", "zeit"].forEach((zuegeOderZeit: "zuege" | "zeit") => {
			if (this.highscore[zuegeOderZeit] > this[zuegeOderZeit])
				Helper.Highscore.set(this.anzahlScheiben, zuegeOderZeit, this[zuegeOderZeit])
		})
	}

	get beendet() {
		return this.feld.classList.contains("beendet")
	}

	private _zuege: number
	set zuege(value: number) {
		this.status.sections.zuege.textContent = konfiguration.text.zuege(value)
		this._zuege = value
		this.status.sections.zuege.dataset.state = Helper.Highscore.State[Helper.Highscore.getState(this.highscore.zuege, value, 5)]
	}

	get zuege() {
		return this._zuege
	}

	istBewegtWorden() {
		return this.feld.tuerme[0].scheiben.length !== this.anzahlScheiben
	}

	istFertig() {
		return this.feld.tuerme[2].scheiben.length === this.anzahlScheiben;
	}

	// noinspection JSUnusedGlobalSymbols
	connectedCallback() {
		this.feld = new Feld(this.anzahlScheiben)
		this.status = new Status()
		this.appendChild(new Sieg())
		this.zuege = 0
		this.zeit = this.zeit

		this.status.sections.zeit.dataset.highscore = konfiguration.text.zeit(this.highscore.zeit)
		this.status.sections.zuege.dataset.highscore = this.highscore.zuege.toString()
	}

	private _feld: Feld
	set feld(value: Feld) {
		if (this._feld) this._feld.remove()
		this._feld = value
		this.appendChild(this._feld)
	}

	get feld() {
		return this._feld
	}

	get sieg() {
		return Array.from(this.children).find(child => child instanceof Sieg) as Sieg
	}

	private _status: Status
	set status(value: Status) {
		if (this._status) this._status.remove()
		this._status = value
		this.appendChild(this._status)
	}

	get status() {
		return this._status
	}

	set disabled(value: boolean) {
		this.classList[value ? "add" : "remove"]("disabled")
	}

	get disabled() {
		return this.classList.contains("disabled")
	}
}

// @ts-ignore
customElements.define("hanoi-spiel", Spiel)

class Feld extends HTMLElement {
	constructor(
		readonly anzahlScheiben: number
	) {
		super();
	}

	// noinspection JSUnusedGlobalSymbols
	connectedCallback() {
		this.append(
			new Turm(this.anzahlScheiben, this.anzahlScheiben),
			new Turm(0, this.anzahlScheiben),
			new Turm(0, this.anzahlScheiben)
		)
	}

	get tuerme() {
		return Array.from(this.children) as Turm[]
	}

	get spiel() {
		return this.parentElement as Spiel
	}
}

// @ts-ignore
customElements.define("hanoi-feld", Feld)

class Status extends HTMLElement {
	readonly sections = {
		zuege: document.createElement("div"),
		zeit: document.createElement("div")
	}

	constructor() {
		super();
		this.sections.zeit.tabIndex = 0
		this.sections.zeit.onclick = () => this.spiel.pausierenOderFortfahren()
		Object.entries(this.sections).forEach(([id, section]) => section.id = id)
	}

	// noinspection JSUnusedGlobalSymbols
	connectedCallback() {
		this.append(...Object.values(this.sections))
	}

	get spiel() {
		return this.parentElement as Spiel
	}
}

customElements.define("hanoi-status", Status)

class Sieg extends HTMLElement {
	private readonly h1 = document.createElement("h1")
	private readonly h2 = document.createElement("h2")

	constructor() {
		super();

		this.h1.textContent = konfiguration.sieg.h1
		this.h2.textContent = konfiguration.sieg.h2
	}

	// noinspection JSUnusedGlobalSymbols
	connectedCallback() {
		this.append(this.h1, this.h2)
	}

	private setzeSpiel() {
		this.spiel.container.spiel = new Spiel(this.spiel.anzahlScheiben + 1)
	}

	anzeigen() {
		window.addEventListener("keydown", event => {
			if (event.key === "enter") this.setzeSpiel()
		})

		this.onclick = () => this.setzeSpiel()
	}

	get spiel() {
		return this.parentElement as Spiel
	}
}

customElements.define("hanoi-sieg", Sieg)

class Turm extends HTMLElement {
	constructor(
		private readonly anzahlScheibenAnfang: number = 0,
		private readonly anzahlScheibenMax: number
	) {
		super();
	}

	ondragover = event => {
		if (!this.disabled) event.preventDefault()
	}

	ondrop = event => {
		event.preventDefault()

		const scheibe = Scheibe.get(this.feld, Number(event.dataTransfer.getData("text")))
		this.ablegen(scheibe)
	};

	ablegen(scheibe: Scheibe) {
		// this.geschwisterTuerme.forEach(turm => turm.disabled = false)
		if (!scheibe || scheibe === this.scheibe) return

		if (this.scheibe) this.scheibe.removeAttribute("tabindex")
		scheibe.tabIndex = 0
		const alterTurm = scheibe.turm
		this.insertBefore(scheibe, this.firstChild)
		if (alterTurm.scheibe) alterTurm.scheibe.tabIndex = 0
		this.feld.spiel.zuege++
		if (this.feld.spiel.istFertig()) this.feld.spiel.beenden()
	}

	// noinspection JSUnusedGlobalSymbols
	connectedCallback() {
		this.style.minHeight = (this.anzahlScheibenMax + 0.7) * 2 + "em"
		for (let i = 1; i <= this.anzahlScheibenAnfang; i++) this.appendChild(new Scheibe(i, this.anzahlScheibenMax))
		if (this.scheibe) this.scheibe.tabIndex = 0
	}

	kannAblegen(scheibe: Scheibe) {
		return this.scheiben.length == 0 || (this.scheibe.breite > scheibe.breite)
	}

	get scheiben() {
		return Array.from(this.children).filter(child => child instanceof Scheibe) as Scheibe[]
	}

	get scheibe() {
		return this.scheiben[0]
	}

	get geschwisterTuerme() {
		return this.feld.tuerme.filter(turm => turm !== this)
	}

	get feld() {
		return this.parentElement as Feld
	}

	set disabled(value: boolean) {
		this.classList[value ? "add" : "remove"]("disabled")
	}

	get disabled() {
		return this.classList.contains("disabled")
	}
}

// @ts-ignore
customElements.define("hanoi-turm", Turm)

class Scheibe extends HTMLElement {
	readonly scheibeId: number

	constructor(
		readonly breite = 1,
		private readonly anzahlScheibenMax: number,
		private readonly hoehe = konfiguration.standard.scheibenHoehe
	) {
		super();
		this.scheibeId = Scheibe.counter++
	}

	ondragstart = event => {
		if (this !== this.turm.scheibe) return event.preventDefault()
		event.dataTransfer.setData("text", this.scheibeId.toString())
		this.aufheben()
	}
	ondragend = () => {
		this.loslassen()
	}

	aufheben() {
		if (this.turm.feld.spiel.disabled) return
		this.turm.geschwisterTuerme.forEach(turm => {
			if (!turm.kannAblegen(this)) turm.disabled = true
		})
		this.turm.feld.spiel.startenOderFortfahren()
	}

	loslassen() {
		this.turm.geschwisterTuerme.forEach(turm => turm.disabled = false)
	}

	// noinspection JSUnusedGlobalSymbols
	connectedCallback() {
		this.setAttribute("draggable", "true")
		this.dataset.breite = String(this.breite)
		this.style.minWidth = "calc(2 * var(--turm-breite) + " + this.breite + "em)"
		this.style.width = this.breite / this.anzahlScheibenMax * 100 + "%"
		this.style.maxWidth = Number(this.breite || this.dataset.breite) * 4 + 2 + "em"
		this.style.height = this.hoehe + "em"
	}

	get turm() {
		return this.parentElement as Turm
	}

	static counter = 0

	static get(feld: Feld, id: number) {
		return (Array.from(feld.getElementsByTagName("hanoi-scheibe")) as Scheibe[]).find(scheibe => scheibe.scheibeId === id)
	}
}

// @ts-ignore
customElements.define("hanoi-scheibe", Scheibe)