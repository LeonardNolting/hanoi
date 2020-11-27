class Scheibe extends HTMLElement {
    constructor(size) {
        super();
        this.size = size;
        this.addEventListener("dragstart", event => {
            event.dataTransfer.setData("text", event.target["id"]);
        });
    }
    connectedCallback() {
        this.dataset.size = (this.size || this.dataset.size).toString();
        this.setAttribute("id", "scheibe-" + Scheibe.counter++);
        this.setAttribute("draggable", "true");
        this.style.width = Number(this.size || this.dataset.size) * 4 + 2 + "em";
    }
}
Scheibe.counter = 0;
// @ts-ignore
customElements.define("hanoi-scheibe", Scheibe);
// import Turm from "./turm.js";
class Spiel extends HTMLElement {
    constructor(anzahlScheiben) {
        super();
        this.anzahlScheiben = anzahlScheiben;
    }
    connectedCallback() {
        this.append(new Turm(this.anzahlScheiben || Number(this.dataset.scheiben)), new Turm(), new Turm());
    }
    get tuerme() {
        return Array.from(this.children).filter(child => child instanceof Turm);
    }
}
// @ts-ignore
customElements.define("hanoi-spiel", Spiel);
// import Scheibe from "./scheibe.js";
class Turm extends HTMLElement {
    constructor(anzahlScheiben = 0) {
        super();
        this.anzahlScheiben = anzahlScheiben;
        this.addEventListener("dragover", ev => {
            ev.preventDefault();
        });
        this.addEventListener("drop", event => {
            event.preventDefault();
            const data = event.dataTransfer.getData("text"), scheibe = document.getElementById(data), turm = event.target;
            if (scheibe && !turm.scheiben.includes(scheibe))
                turm.appendChild(scheibe);
        });
    }
    connectedCallback() {
        for (let i = 1; i <= this.anzahlScheiben; i++)
            this.appendChild(new Scheibe(i));
    }
    get scheiben() {
        return Array.from(this.children).filter(child => child instanceof Scheibe);
    }
}
// @ts-ignore
customElements.define("hanoi-turm", Turm);
//# sourceMappingURL=build.js.map