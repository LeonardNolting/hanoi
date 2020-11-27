class Kontrolle extends HTMLElement {
	private scheibenMin: number;
	private scheibenMax: number;
	connectedCallback () {
		this.scheibenMin = Number(this.dataset.scheibenMin)
		this.scheibenMax = Number(this.dataset.scheibenMax)

		for (let i = this.scheibenMin; i <= this.scheibenMax; i++) {
			const button = document.createElement("button")
			button.dataset.anzahlScheiben = String(i);
			button.textContent = i + " Scheiben"
			button.addEventListener("click", e => {
				Array.from(document.body.children).filter(child => child instanceof Spiel).forEach(spiel => spiel.remove())
				document.body.appendChild(new Spiel(i))
			})
			this.appendChild(button)
		}
	}
}
// @ts-ignore
customElements.define("hanoi-kontrolle", Kontrolle)

class Spiel extends HTMLElement {
	public readonly anzahlScheiben: number;

	constructor(anzahlScheiben: number) {
		super();
		this.anzahlScheiben = anzahlScheiben
	}

	istFertig () {
		if (this.tuerme[0].scheiben.length != 0) return false
		if (this.tuerme[1].scheiben.length != 0) return false
		return this.tuerme[2].scheiben.length == this.anzahlScheiben;
	}

	connectedCallback() {
		this.append(
			new Turm(this.anzahlScheiben || Number(this.dataset.scheiben)),
			new Turm(),
			new Turm()
		)
	}

	get tuerme() {
		return Array.from(this.children).filter(child => child instanceof Turm) as Turm[]
	}
}

// @ts-ignore
customElements.define("hanoi-spiel", Spiel)

class Turm extends HTMLElement {
	private readonly anzahlScheiben: number;

	constructor(anzahlScheiben: number = 0) {
		super();
		this.anzahlScheiben = anzahlScheiben

		this.addEventListener("dragover", ev => {
			ev.preventDefault()
		})
		this.addEventListener("drop", event => {
			event.preventDefault()
			const data = event.dataTransfer.getData("text"),
				scheibe = document.getElementById(data) as Scheibe,
				turm = event.target as Turm

			// if (turm.firstChild === this.firstChild) return

			if (turm.firstChild && (turm.firstChild as Scheibe).size <= scheibe.size) return alert("Du kannst nur kleinere Scheiben auf diese Scheibe legen.")

			if (scheibe && !turm.scheiben.includes(scheibe)) turm.insertBefore(scheibe, turm.firstChild)

			if (this.spiel.istFertig()) alert("Du hast gewonnen!")
		})
	}

	connectedCallback() {
		for (let i = 1; i <= this.anzahlScheiben; i++) this.appendChild(new Scheibe(i))
	}

	get scheiben() {
		return Array.from(this.children).filter(child => child instanceof Scheibe) as Scheibe[]
	}
	get spiel () {
		return this.parentElement as Spiel
	}
}

// @ts-ignore
customElements.define("hanoi-turm", Turm)

class Scheibe extends HTMLElement {
	public readonly size: number;

	constructor(size = 1) {
		super();
		this.size = size
		this.addEventListener("dragstart", event => {
			if (this !== this.turm.firstChild) event.preventDefault()
			event.dataTransfer.setData("text", event.target["id"])
		})
	}

	connectedCallback() {
		this.dataset.size = (this.size || this.dataset.size).toString()
		this.setAttribute("id", "scheibe-" + Scheibe.counter++)
		this.setAttribute("draggable", "true")
		this.style.width = Number(this.size || this.dataset.size) * 4 + 2 + "em"
	}

	get turm () {
		return this.parentElement as Turm
	}

	static counter = 0
}

// @ts-ignore
customElements.define("hanoi-scheibe", Scheibe)