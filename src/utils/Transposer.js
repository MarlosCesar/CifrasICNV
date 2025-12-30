const NOTES = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
];

const REGEX_NOTA = /\b([A-G](#|b)?(m|maj|min|sus|dim|aug|add)?[0-9]?(\/[A-G](#|b)?)?)\b/g;

export class Transposer {
    static normalizeNote(note) {
        let m = note.match(/^([A-G](#|b)?)/);
        return m ? m[1] : note;
    }

    static transposeNote(note, steps) {
        let base = this.normalizeNote(note);
        let idx = NOTES.findIndex(n => n === base);
        if (idx < 0) return note;
        let sufixo = note.slice(base.length);
        let newIdx = (idx + steps + 12) % 12;
        let newBase = NOTES[newIdx];
        return newBase + sufixo;
    }

    static render(text, steps) {
        return text.replace(REGEX_NOTA, (match) => {
            let trans = steps !== 0 ? this.transposeNote(match, steps) : match;
            if (steps === 0 || trans === match) return `<span class="nota-cifra text-emerald-400 font-bold">${match}</span>`;
            return `<span class="nota-cifra overlay group relative inline-block cursor-help">
        <span class="nota-transposta text-emerald-400 font-bold">${trans}</span>
        <span class="nota-original absolute -top-4 left-0 text-xs text-gray-400 opacity-0 group-hover:opacity-100 bg-black/80 px-1 rounded transition-opacity">${match}</span>
      </span>`;
        });
    }
}
