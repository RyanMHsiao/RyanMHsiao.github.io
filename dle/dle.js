let wordLength = 5;
let guesses = [];
let newEntry = [];

// Data should be initialized in setShuffle
let solutions = new Array(26**5);
let seed = Math.floor(Date.now() / 11881376);

let tableStartIndex = 0;
let tableCount = null;
let tc = null;

function setShuffle(seed) {
	seed ??= (Math.random() * 4294967296) >>> 0;
	localStorage.setItem("savedSeed", seed);
	// TODO Consider removing these initializations
	guesses = [];
	newEntry = [];
	tableStartIndex = 0;
	let seededRand = mulberry32(seed);
	for (let i = 0; i < 15; ++i) {
		seededRand();
	}
	for (let i = 0; i < solutions.length; ++i) {
		solutions[i] = i;
	}
	for (let i = solutions.length - 1; i >= 0; --i) {
		let j = Math.floor(seededRand() * i);
		let temp = solutions[i];
		solutions[i] = solutions[j];
		solutions[j] = temp;
	}
}

function populateTables() {
	tc.innerHTML = "";
	tc.appendChild(createDleBoard(tableStartIndex));
	let tableWidth = tc.children[0].offsetWidth;
	tableCount = Math.max(1, Math.floor(window.innerWidth / tableWidth) - 1);
	for (let i = tableStartIndex + 1; i < tableStartIndex + tableCount; ++i) {
		tc.appendChild(createDleBoard(modulo(i, solutions.length)));
	}
}

function modulo(a, b) {
	a %= b;
	if (a < 0) {
		return a + b;
	}
	return a;
}

document.addEventListener("DOMContentLoaded", () => {
	tc = document.getElementById("tables-container");
	let savedGuesses = localStorage.getItem("savedGuesses");
	console.log(savedGuesses);
	if (savedGuesses === null) {
		setShuffle(seed);
	} else {
		console.log("found saved guess");
		seed = JSON.parse(localStorage.getItem("savedSeed"));
		setShuffle(seed);
		guesses = JSON.parse(savedGuesses);
		toggleHelp();
	}
	populateTables();
	document.getElementById("prev-button").addEventListener("click", () => {
		tableStartIndex = modulo(tableStartIndex - tableCount, solutions.length);
		populateTables();
	});
	document.getElementById("next-button").addEventListener("click", () => {
		tableStartIndex = modulo(tableStartIndex + tableCount, solutions.length);
		populateTables();
	});
	document.getElementById("close-help").addEventListener("click", toggleHelp);
	document.getElementById("help-button").addEventListener("click", toggleHelp);
	document.getElementById("featured-game-button").addEventListener("click", () => {
		seed = Math.floor(Date.now() / 11881376);
		setShuffle(seed);
		tableStartIndex = 0;
		populateTables();
	});
	document.getElementById("free-play-button").addEventListener("click", () => {
		setShuffle(); // Random seed gets generated
		tableStartIndex = 0;
		populateTables();
	});
});

// No support for responding to resize and zoom becaues I don't want to introduce
// the complication or dependency that would require.
// The user can just click the next page and click back to fix zoom issues.

function addLetter(letter) {
	// Assuming valid input for letter
	if (newEntry.length < wordLength) {
		document.querySelectorAll("tr.new-entry").forEach(node => {
			node.children[newEntry.length].innerHTML = letter;
		});
		newEntry.push(letter);
	}
}

function removeLetter() {
	if (newEntry.length >= 1) {
		newEntry.pop();
		document.querySelectorAll("tr.new-entry").forEach(node => {
			node.children[newEntry.length].innerHTML = "";
		});
	}
}

function submitEntry() {
	if (newEntry.length == wordLength) {
		let guessCode = 0;
		for (let i = 0; i < newEntry.length; ++i) {
			guessCode += (newEntry[i].charCodeAt(0) - 65) * 26**i;
		}
		guesses.push(guessCode);
		// TODO Consider saving only when necessary to improve performance
		localStorage.setItem("savedGuesses", JSON.stringify(guesses));
		document.querySelectorAll("tr.new-entry").forEach(entryNode => {
			entryNode.classList.remove("new-entry");
			let index = entryNode.parentElement.dataset.index;
			colorGuess(guessCode, solutions[index], entryNode);
			if (guessCode != solutions[index]) {
				newEntry = [];
				entryNode.parentElement.appendChild(createNewEntry());
			}
		});
	}
}

function colorGuess(actual, expected, tr) {
	let a = new Array(wordLength);
	let e = new Array(wordLength);
	for (let i = 0; i < wordLength; ++i) {
		a[i] = actual % 26;
		e[i] = expected % 26;
		actual = Math.floor(actual / 26);
		expected = Math.floor(expected / 26);
	}
	let missCount = new Map();
	// Coloring greens and setting td content
	for (let i = 0; i < wordLength; ++i) {
		tr.children[i].innerHTML = String.fromCharCode(a[i] + 65);
		if (a[i] == e[i]) {
			tr.children[i].classList.add("dle-green");
		} else {
			missCount.set(e[i], (missCount.get(e[i]) ?? 0) + 1);
		}
	}
	// Coloring yellows and greys
	for (let i = 0; i < wordLength; ++i) {
		let td = tr.children[i];
		if (td.classList.contains("dle-green")) {
			continue;
		}
		let c = missCount.get(a[i]);
		if (!isNaN(c) && c >= 1) {
			td.classList.add("dle-yellow");
			missCount.set(a[i], c - 1);
		} else {
			td.classList.add("dle-gray");
		}
	}
}

function createDleBoard(index) {
	let expected = solutions[index];
	let result = document.createElement("table");
	result.appendChild(document.createElement("tbody"));
	let tbody = result.children[0];
	tbody.classList.add("dle-board");
	tbody.dataset.index = index;
	let solved = false;
	for (let i = 0; i < guesses.length; ++i) {
		tbody.appendChild(createNewEntry());
		tbody.children[i].classList.remove("new-entry");
		colorGuess(guesses[i], expected, tbody.children[i]);
		if (guesses[i] == expected) {
			solved = true;
			break;
		}
	}
	if (!solved) {
		let tr = createNewEntry();
		tbody.appendChild(tr);
		for (let i = 0; i < newEntry.length; ++i) {
			tr.children[i].innerHTML = newEntry[i];
		}
	}
	return result;
}

function createNewEntry() {
	let result = document.createElement("tr");
	result.classList.add("new-entry");
	for (let i = 0; i < wordLength; ++i) {
		result.appendChild(document.createElement("td"));
	}
	return result;
}

window.addEventListener("keydown", event => {
	if (event.key == "Enter") {
		submitEntry();
		return;
	}
	// Prevent unwanted triggering of buttons
	let dummyButton = document.getElementById("prev-button");
	dummyButton.focus();
	dummyButton.blur();
	if (event.key == "Backspace") {
		removeLetter();
	} else {
		if (event.key.length != 1) {
			return;
		}
		let letter = event.key.toUpperCase();
		let code = letter.charCodeAt(0);
		if (code >= 65 && code <= 90) {
			addLetter(letter);
		}
	}
});

function toggleHelp() {
	let helpOverlay = document.getElementById("help-overlay");
	let toolbar = document.getElementById("toolbar");
	if (helpOverlay.style.display == "none") {
		helpOverlay.style.display = "flex";
		toolbar.style.display = "none";
	} else {
		helpOverlay.style.display = "none";
		toolbar.style.display = "flex";
	}
}

// Not original code
function mulberry32(a) {
	return function() {
		let t = a += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
}
