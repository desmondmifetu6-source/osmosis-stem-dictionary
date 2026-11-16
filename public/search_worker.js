// Background Web Worker: Prefix Trie + NaCCA 6-Subject Classifier for 60fps STEM Search
'use strict';

const SUBJECT_RULES = {
  'Biology': /\b(cell|cells|enzyme|organism|plant|plants|animal|animals|chromosome|dna|rna|mitosis|meiosis|blood|tissue|organ|leaf|leaves|flower|photosynthesis|respiration|bacteria|fungus|fungi|virus|species|genus|phylum|mammal|reptile|amphibian|bird|fish|insect|neuron|nerve|hormone|protein|amino acid|lipid|carbohydrate|genetics|gene|allele|ecosystem|habitat|kidney|heart|lung|stomach|intestine|liver|brain|skeleton|bone|muscle|xylem|phloem|spore|gamete|zygote|ovum|sperm|embryo|anatomy|physiology|botany|zoology|microbiology|ecology|evolution|membrane|cytoplasm|nucleus|mitochondria|chloroplast|osmosis|transpiration|pollination|germination|parasite|symbiosis)\b/g,
  'Chemistry': /\b(atom|atomic|molecule|molecular|compound|element|ion|ionic|anion|cation|acid|acidic|alkali|alkaline|salt|electron|proton|neutron|orbital|valence|valency|covalent|bond|bonding|reaction|reactant|product|catalyst|catalysis|molar|mole|solubility|solvent|solute|oxide|hydroxide|chloride|sulfate|sulphate|nitrate|carbonate|hydrocarbon|alkane|alkene|alkyne|alcohol|aldehyde|ketone|ester|polymer|periodic table|isotope|redox|oxidation|reduction|electrolysis|electrolyte|electrode|anode|cathode|titration|enthalpy|entropy|equilibrium|reagent|precipitate|crystal|crystallization|distillation|chromatography|isomer|benzene|halide|halogen|noble gas)\b/g,
  'Physics': /\b(force|energy|kinetic|potential|velocity|speed|acceleration|momentum|impulse|mass|weight|gravity|gravitational|newton|joule|watt|volt|voltage|ampere|ohm|resistance|resistor|current|circuit|magnetic|magnetism|electromagnetic|electric|charge|wave|wavelength|frequency|amplitude|optics|optical|lens|mirror|refraction|reflection|diffraction|interference|photon|quantum|thermodynamics|heat|thermal|temperature|pressure|density|torque|friction|pendulum|oscillation|radiation|nuclear|radioactive|half-life|capacitor|capacitance|inductor|diode|transistor|semiconductor|scalar|kinematics|mechanics|prism|spectrum|doppler)\b/g,
  'Agric Science': /\b(soil|crop|crops|fertilizer|fertiliser|manure|irrigation|livestock|cattle|poultry|fowl|sheep|goat|pig|swine|pasture|tillage|plough|plow|harrow|harvest|weed|pesticide|herbicide|fungicide|pest|agronomy|horticulture|silviculture|erosion|humus|loam|clay|silt|compost|mulch|mulching|grafting|pruning|budding|breed|breeding|gestation|lactation|ruminant|rumen|abomasum|silage|fodder|forage|aquaculture|apiculture|beekeeping|farm|farming|agricultural|agriculture|crop rotation|fallow|seedling|nursery|dairy|broiler|layer)\b/g,
  'Computing / ICT': /\b(computer|computing|software|hardware|algorithm|data structure|database|binary|hexadecimal|bit|byte|kilobyte|megabyte|network|internet|protocol|http|tcp|server|client|cpu|processor|microprocessor|memory|ram|rom|cache|compiler|interpreter|programming|program|variable|loop|array|boolean|logic gate|and gate|or gate|xor|nand|operating system|packet|router|switch|ip address|html|css|sql|encryption|cipher|cybersecurity|pixel|resolution|bandwidth|modem|input device|output device|peripheral|printer|keyboard|monitor|von neumann|register|bus|ascii|unicode)\b/g,
  'Mathematics': /\b(equation|equations|function|functions|matrix|matrices|determinant|integral|integration|derivative|differentiation|calculus|algebra|algebraic|geometry|geometric|triangle|circle|polygon|quadrilateral|angle|angles|theorem|proof|polynomial|quadratic|linear|logarithm|exponent|exponential|sine|cosine|tangent|trigonometry|vector|vectors|probability|statistics|statistical|mean|median|mode|variance|standard deviation|set|subset|union|intersection|prime|integer|rational|irrational|fraction|ratio|proportion|sequence|series|graph|axis|abscissa|ordinate|coordinate|parabola|hyperbola|ellipse|factorial|permutation|combination)\b/g
};

const SUBJECT_NAMES = Object.keys(SUBJECT_RULES);

let records = []; // { idx, wordLower, synLowers, letter, subject }
let trieRoot = Object.create(null);

function createTrieNode() {
  return { c: Object.create(null), ids: null };
}

function insertIntoTrie(key, idx) {
  if (!key) return;
  let node = trieRoot;
  const maxDepth = Math.min(key.length, 32);
  for (let i = 0; i < maxDepth; i++) {
    const ch = key[i];
    let next = node.c[ch];
    if (!next) {
      next = createTrieNode();
      node.c[ch] = next;
    }
    node = next;
  }
  if (!node.ids) node.ids = [];
  if (node.ids.length < 40) {
    node.ids.push(idx);
  }
}

function collectFromNode(node, outSet, limit) {
  if (!node || outSet.size >= limit) return;
  if (node.ids) {
    for (let i = 0; i < node.ids.length && outSet.size < limit; i++) {
      outSet.add(node.ids[i]);
    }
  }
  const keys = Object.keys(node.c);
  for (let i = 0; i < keys.length && outSet.size < limit; i++) {
    collectFromNode(node.c[keys[i]], outSet, limit);
  }
}

function classifyEntry(wordLower, rawLower, defLower) {
  const headText = wordLower + ' ' + rawLower;
  let bestSubject = 'General STEM';
  let bestScore = 0;
  for (let i = 0; i < SUBJECT_NAMES.length; i++) {
    const subj = SUBJECT_NAMES[i];
    const rx = SUBJECT_RULES[subj];
    rx.lastIndex = 0;
    const headMatches = headText.match(rx);
    rx.lastIndex = 0;
    const defMatches = defLower.match(rx);
    const score = (headMatches ? headMatches.length * 4 : 0) + (defMatches ? defMatches.length : 0);
    if (score > bestScore) {
      bestScore = score;
      bestSubject = subj;
    }
  }
  return bestSubject;
}

function computeLetter(wordLower) {
  if (!wordLower) return '#';
  const ch = wordLower[0].toUpperCase();
  return ch >= 'A' && ch <= 'Z' ? ch : '#';
}

self.onmessage = function (e) {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'INIT') {
    const items = msg.items || [];
    records = new Array(items.length);
    trieRoot = createTrieNode();

    const subjectCounts = {
      All: items.length,
      Biology: 0,
      Chemistry: 0,
      Physics: 0,
      'Agric Science': 0,
      'Computing / ICT': 0,
      Mathematics: 0,
      'General STEM': 0,
    };
    const subjectsByIdx = new Array(items.length);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const wordLower = (it.w || '').trim().toLowerCase();
      const rawLower = (it.r || '').trim().toLowerCase();
      const defLower = (it.d || '').toLowerCase();
      const synLowers = Array.isArray(it.s)
        ? it.s.map((s) => String(s).trim().toLowerCase()).filter(Boolean)
        : [];
      const subject = classifyEntry(wordLower, rawLower, defLower);
      const letter = computeLetter(wordLower);

      records[i] = { idx: i, wordLower, rawLower, synLowers, letter, subject };
      subjectsByIdx[i] = subject;
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;

      insertIntoTrie(wordLower, i);
      for (let j = 0; j < synLowers.length; j++) {
        insertIntoTrie(synLowers[j], i);
      }
    }

    self.postMessage({
      type: 'READY',
      subjectCounts,
      subjectsByIdx,
    });
    return;
  }

  if (msg.type === 'AUTOCOMPLETE') {
    const q = (msg.query || '').trim().toLowerCase();
    const limit = msg.limit || 8;
    const subjectFilter = msg.subject || 'All';
    if (!q) {
      self.postMessage({ type: 'AUTOCOMPLETE_RESULT', id: msg.id, indices: [] });
      return;
    }

    // 1. O(k) Prefix Trie traversal
    let node = trieRoot;
    const maxDepth = Math.min(q.length, 32);
    for (let i = 0; i < maxDepth; i++) {
      node = node.c[q[i]];
      if (!node) break;
    }

    const picked = new Set();
    if (node) {
      const triePool = new Set();
      collectFromNode(node, triePool, limit * 8);
      for (const idx of triePool) {
        if (subjectFilter !== 'All' && records[idx].subject !== subjectFilter) continue;
        picked.add(idx);
        if (picked.size >= limit) break;
      }
    }

    // 2. Fast substring fallback if Trie yields fewer than limit
    if (picked.size < limit && q.length >= 2) {
      for (let i = 0; i < records.length && picked.size < limit; i++) {
        if (picked.has(i)) continue;
        const r = records[i];
        if (subjectFilter !== 'All' && r.subject !== subjectFilter) continue;
        if (
          r.wordLower.includes(q) ||
          r.rawLower.includes(q) ||
          r.synLowers.some((s) => s.includes(q))
        ) {
          picked.add(i);
        }
      }
    }

    self.postMessage({
      type: 'AUTOCOMPLETE_RESULT',
      id: msg.id,
      indices: Array.from(picked),
    });
    return;
  }

  if (msg.type === 'FILTER') {
    const q = (msg.query || '').trim().toLowerCase();
    const subject = msg.subject || 'All';
    const letter = msg.letter || 'ALL';
    const diagramOnly = !!msg.diagramOnly;
    const diagramSet = msg.diagramSet ? new Set(msg.diagramSet) : null;

    const matched = [];

    if (q.length > 0) {
      // Exact -> Synonym exact -> Word-boundary -> Prefix -> Substring priority (parity with module_library.js)
      const escaped = q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const wordRx = new RegExp(`\\b${escaped}\\b`, 'i');
      const exactMatches = [];
      const boundaryMatches = [];
      const prefixMatches = [];
      const otherMatches = [];

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        if (subject !== 'All' && r.subject !== subject) continue;
        if (letter !== 'ALL' && r.letter !== letter) continue;
        if (diagramOnly && diagramSet && !diagramSet.has(i)) continue;

        if (r.wordLower === q || r.rawLower === q || r.synLowers.includes(q)) {
          exactMatches.push(i);
        } else if (wordRx.test(r.wordLower) || wordRx.test(r.rawLower)) {
          boundaryMatches.push(i);
        } else if (r.wordLower.startsWith(q)) {
          prefixMatches.push(i);
        } else if (
          r.wordLower.includes(q) ||
          r.rawLower.includes(q) ||
          r.synLowers.some((s) => s.includes(q))
        ) {
          otherMatches.push(i);
        }
      }

      // Shortest word-boundary match first (e.g. "phone" -> "mobile phone")
      boundaryMatches.sort((a, b) => records[a].wordLower.length - records[b].wordLower.length);

      const combined = exactMatches
        .concat(boundaryMatches)
        .concat(prefixMatches)
        .concat(otherMatches);

      self.postMessage({
        type: 'FILTER_RESULT',
        id: msg.id,
        total: combined.length,
        indices: combined,
      });
      return;
    }

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (subject !== 'All' && r.subject !== subject) continue;
      if (letter !== 'ALL' && r.letter !== letter) continue;
      if (diagramOnly && diagramSet && !diagramSet.has(i)) continue;
      matched.push(i);
    }

    self.postMessage({
      type: 'FILTER_RESULT',
      id: msg.id,
      total: matched.length,
      indices: matched,
    });
  }
};
