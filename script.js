// Global variables to store parsed FASTA data
let fastaData1 = [];
let fastaData2 = [];

// Configuration for illustrative side effects
const KNOWN_MUTATION_IMPACTS = [
    { position: 50, from: 'A', to: 'T', impact: "associated with an increased risk of Condition X. (Illustrative)" },
    { position: 123, from: 'C', to: 'G', impact: "might influence the function of Gene Y. (Illustrative)" },
    { position: 200, from: 'T', to: 'C', impact: "potentially linked to altered protein structure. (Illustrative)" },
    // You can add more illustrative examples here if needed
];

document.addEventListener('DOMContentLoaded', () => {
    // Get all necessary DOM elements
    const dna1TextInput = document.getElementById('dna1');
    const dna2TextInput = document.getElementById('dna2');
    const fastaFile1Input = document.getElementById('fastaFile1');
    const fastaFile2Input = document.getElementById('fastaFile2');
    const sequenceSelect1 = document.getElementById('sequenceSelect1');
    const sequenceSelect2 = document.getElementById('sequenceSelect2');
    const fastaSelectContainer1 = document.getElementById('fastaSelect1');
    const fastaSelectContainer2 = document.getElementById('fastaSelect2');

    // Add event listeners for FASTA file input changes
    fastaFile1Input.addEventListener('change', async (event) => {
        fastaData1 = await handleFastaFileChange(event, sequenceSelect1, fastaSelectContainer1);
        toggleInputDisability(); // Re-evaluate input states after file processing
    });
    fastaFile2Input.addEventListener('change', async (event) => {
        fastaData2 = await handleFastaFileChange(event, sequenceSelect2, fastaSelectContainer2);
        toggleInputDisability(); // Re-evaluate input states after file processing
    });

    // Add event listeners for manual text area input changes
    dna1TextInput.addEventListener('input', () => toggleInputDisability());
    dna2TextInput.addEventListener('input', () => toggleInputDisability());

    // Perform an initial check of input states when the page loads
    toggleInputDisability();
});

/**
 * Opens a new tab to the selected DNA sequence source (NCBI or Google).
 */
function openSource() {
    const source = document.getElementById('source').value;
    if (source === "ncbi") {
        window.open("https://www.ncbi.nlm.nih.gov/nucleotide/", "_blank");
    } else if (source === "google") {
        window.open("https://www.google.com/search?q=DNA+sequence", "_blank");
    }
}

/**
 * Reads a file asynchronously using the FileReader API.
 * @param {File} file - The File object to read.
 * @returns {Promise<string>} A promise that resolves with the file's content as a string.
 */
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

/**
 * Parses raw FASTA content to extract all sequences and their headers.
 * Handles multiple sequences within a single FASTA file.
 * @param {string} fastaContent - The raw text content from a FASTA file.
 * @returns {Array<Object>} An array of objects, each containing a 'header' and 'sequence'.
 */
function parseFasta(fastaContent) {
    const sequences = [];
    const lines = fastaContent.split('\n');
    let currentHeader = '';
    let currentSequence = '';

    for (const line of lines) {
        if (line.startsWith('>')) {
            // If we have a sequence accumulated, save it before starting a new one
            if (currentSequence !== '') {
                sequences.push({ header: currentHeader.trim(), sequence: currentSequence.trim() });
                currentSequence = ''; // Reset sequence for the new header
            }
            currentHeader = line.substring(1); // Remove the '>' character
        } else {
            currentSequence += line.trim(); // Append sequence data, removing leading/trailing whitespace
        }
    }
    // Add the last sequence after the loop finishes
    if (currentSequence !== '') {
        sequences.push({ header: currentHeader.trim(), sequence: currentSequence.trim() });
    }
    return sequences;
}

/**
 * Handles the logic when a FASTA file input changes. Reads the file, parses it,
 * populates the corresponding sequence selection dropdown, and handles errors/file size limits.
 * @param {Event} event - The change event from the file input.
 * @param {HTMLSelectElement} selectElement - The dropdown for selecting sequences.
 * @param {HTMLElement} selectContainer - The container div for the dropdown.
 * @returns {Promise<Array<Object>>} A promise that resolves with the parsed FASTA data for the file.
 */
async function handleFastaFileChange(event, selectElement, selectContainer) {
    const file = event.target.files[0];
    selectElement.innerHTML = '<option value="">Select a sequence</option>'; // Clear existing options
    selectContainer.classList.add('hidden'); // Hide dropdown by default

    const resultBox = document.getElementById('mutationResult');

    // If no file is selected (e.g., user clears the input), return empty data
    if (!file) {
        resultBox.innerHTML = '<p class="info-message">Ready to compare sequences. Upload files or type manually.</p>';
        return [];
    }

    // Basic file size validation (5 MB limit)
    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
        resultBox.innerHTML = `<p class="error-message">⚠️ File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 5 MB.</p>`;
        event.target.value = ''; // Clear the file input visually
        return [];
    }

    resultBox.innerHTML = `<p class="info-message">Reading file: <strong>${file.name}</strong>... Please wait.</p>`;

    try {
        const fastaContent = await readFileAsync(file);
        const parsedData = parseFasta(fastaContent);

        if (parsedData.length === 0) {
            resultBox.innerHTML = `<p class="error-message">⚠️ No valid FASTA sequences found in "${file.name}". Ensure it follows FASTA format (starts with '>') and contains sequence data.</p>`;
            event.target.value = '';
            return [];
        }

        // Populate the sequence selection dropdown
        parsedData.forEach((data, index) => {
            const option = document.createElement('option');
            option.value = index;
            // Display truncated header and sequence length for better readability
            const displayHeader = data.header.substring(0, 70).trim();
            option.textContent = `${displayHeader}${data.header.length > 70 ? '...' : ''} (${data.sequence.length} bp)`;
            selectElement.appendChild(option);
        });
        selectContainer.classList.remove('hidden'); // Show the dropdown

        resultBox.innerHTML = `<p class="info-message">File "${file.name}" loaded successfully. Please select a sequence from the dropdown.</p>`;
        return parsedData; // Return the parsed data for global storage

    } catch (error) {
        resultBox.innerHTML = `<p class="error-message">⚠️ Error reading "${file.name}": ${error.message}. Please ensure it's a valid text file.</p>`;
        event.target.value = '';
        return [];
    }
}

/**
 * Manages the disabled state of text areas and file inputs.
 * Prioritizes FASTA file selection over manual text input.
 */
function toggleInputDisability() {
    const dna1TextInput = document.getElementById('dna1');
    const dna2TextInput = document.getElementById('dna2');
    const fastaFile1Input = document.getElementById('fastaFile1');
    const fastaFile2Input = document.getElementById('fastaFile2');
    const fastaSelectContainer1 = document.getElementById('fastaSelect1');
    const fastaSelectContainer2 = document.getElementById('fastaSelect2');
    const sequenceSelect1 = document.getElementById('sequenceSelect1');
    const sequenceSelect2 = document.getElementById('sequenceSelect2');

    // Determine if FASTA files are loaded AND parsed (i.e., fastaData arrays are populated)
    const areFastaFilesReady = (fastaFile1Input.files.length > 0 && fastaData1.length > 0) &&
                               (fastaFile2Input.files.length > 0 && fastaData2.length > 0);

    // Determine if manual text areas have content
    const areTextFieldsPopulated = dna1TextInput.value.trim() !== '' || dna2TextInput.value.trim() !== '';

    if (areFastaFilesReady) {
        // If both FASTA files are ready, disable text areas
        dna1TextInput.disabled = true;
        dna2TextInput.disabled = true;
        // Ensure file inputs are enabled to allow deselecting or changing files
        fastaFile1Input.disabled = false;
        fastaFile2Input.disabled = false;
        fastaSelectContainer1.classList.remove('hidden'); // Show dropdowns
        fastaSelectContainer2.classList.remove('hidden');
        // Clear manual text inputs when files are active
        dna1TextInput.value = '';
        dna2TextInput.value = '';

    } else if (areTextFieldsPopulated) {
        // If text areas have content (and no files are ready), disable file inputs
        dna1TextInput.disabled = false;
        dna2TextInput.disabled = false;
        fastaFile1Input.disabled = true;
        fastaFile2Input.disabled = true;
        fastaFile1Input.value = ''; // Clear file inputs visually
        fastaFile2Input.value = '';
        fastaData1 = []; // Clear stored FASTA data
        fastaData2 = [];
        sequenceSelect1.innerHTML = '<option value="">Select a sequence</option>'; // Clear dropdowns
        sequenceSelect2.innerHTML = '<option value="">Select a sequence</option>';
        fastaSelectContainer1.classList.add('hidden'); // Hide dropdowns
        fastaSelectContainer2.classList.add('hidden');

    } else {
        // If neither files nor text are providing input, enable everything
        dna1TextInput.disabled = false;
        dna2TextInput.disabled = false;
        fastaFile1Input.disabled = false;
        fastaFile2Input.disabled = false;
        fastaSelectContainer1.classList.add('hidden'); // Hide dropdowns
        fastaSelectContainer2.classList.add('hidden');
        fastaData1 = []; // Ensure data is cleared if inputs are reset
        fastaData2 = [];
    }
}


/**
 * The main function to initiate DNA sequence comparison and display results.
 * It intelligently selects input from either text areas or selected FASTA sequences.
 */
async function findMutations() {
    const dna1TextInput = document.getElementById('dna1');
    const dna2TextInput = document.getElementById('dna2');
    const fastaFile1Input = document.getElementById('fastaFile1');
    const fastaFile2Input = document.getElementById('fastaFile2');
    const sequenceSelect1 = document.getElementById('sequenceSelect1');
    const sequenceSelect2 = document.getElementById('sequenceSelect2');
    const resultBox = document.getElementById('mutationResult');

    let dna1RawInput = ''; // Holds the raw sequence string from chosen input
    let dna2RawInput = '';
    let resultHTML = '';
    let sourceMessage = '';

    resultBox.innerHTML = '<p class="info-message">Processing sequences... Please wait.</p>'; // Show loading indicator

    // --- Determine the source of DNA sequences ---
    const areFastaFilesSelectedAndParsed = (fastaFile1Input.files.length > 0 && fastaData1.length > 0) &&
                                           (fastaFile2Input.files.length > 0 && fastaData2.length > 0);

    if (areFastaFilesSelectedAndParsed) {
        const selectedIndex1 = sequenceSelect1.value;
        const selectedIndex2 = sequenceSelect2.value;

        // Ensure sequences are selected from the dropdowns
        if (selectedIndex1 === '' || selectedIndex2 === '') {
            resultHTML = '<p class="error-message">⚠️ Please select a sequence from **both** uploaded FASTA files using the dropdowns.</p>';
            resultBox.innerHTML = resultHTML;
            return;
        }

        // Retrieve sequences from the globally stored parsed FASTA data
        dna1RawInput = fastaData1[selectedIndex1].sequence;
        dna2RawInput = fastaData2[selectedIndex2].sequence;

        sourceMessage = `<p class="info-message">Comparing sequences from FASTA files:<br>
                        <strong>File 1:</strong> ${fastaFile1Input.files[0].name} (Seq: ${fastaData1[selectedIndex1].header.substring(0, 50)}...)<br>
                        <strong>File 2:</strong> ${fastaFile2Input.files[0].name} (Seq: ${fastaData2[selectedIndex2].header.substring(0, 50)}...)
                        </p>`;
    } else {
        // If FASTA files are not fully ready/selected, fall back to manual text inputs
        dna1RawInput = dna1TextInput.value.trim();
        dna2RawInput = dna2TextInput.value.trim();
        sourceMessage = '<p class="info-message">Comparing sequences from manual text input.</p>';
    }

    // --- Clean and Normalize DNA Sequences ---
    // Convert to uppercase and remove any characters not A, T, C, or G
    const dna1Cleaned = dna1RawInput.toUpperCase().replace(/[^ATCG]/g, '');
    const dna2Cleaned = dna2RawInput.toUpperCase().replace(/[^ATCG]/g, '');

    // Reset result box content with the source message
    resultHTML = sourceMessage;

    // --- Input Validation ---
    if (!dna1Cleaned || !dna2Cleaned) {
        resultHTML += '<p class="error-message">⚠️ Please enter both DNA sequences manually, or upload and select from both FASTA files.</p>';
        resultBox.innerHTML = resultHTML;
        return;
    }

    // Inform user if invalid characters were stripped
    if (dna1RawInput.length !== dna1Cleaned.length || dna2RawInput.length !== dna2Cleaned.length) {
        resultHTML += '<p class="info-message">Note: Non-DNA characters (other than A, T, C, G) were removed from your input(s).</p>';
    }

    // Check if sequences have equal length
    if (dna1Cleaned.length !== dna2Cleaned.length) {
        resultHTML += `<p class="error-message">⚠️ DNA sequences must be of equal length for comparison!</p>`;
        resultHTML += `<p class="info-message">Sequence 1 has ${dna1Cleaned.length} bases, Sequence 2 has ${dna2Cleaned.length} bases.</p>`;
        resultBox.innerHTML = resultHTML;
        return;
    }

    // --- Mutation Finding Logic ---
    let mutations = [];
    let highlightedDna1 = '';
    let highlightedDna2 = '';

    for (let i = 0; i < dna1Cleaned.length; i++) {
        if (dna1Cleaned[i] !== dna2Cleaned[i]) {
            // If bases differ, record a mutation and add highlight spans
            mutations.push(`Position ${i + 1}: ${dna1Cleaned[i]} → ${dna2Cleaned[i]}`);
            highlightedDna1 += `<span class="mutation-highlight">${dna1Cleaned[i]}</span>`;
            highlightedDna2 += `<span class="mutation-highlight">${dna2Cleaned[i]}</span>`;
        } else {
            // If bases are the same, just append the character
            highlightedDna1 += dna1Cleaned[i];
            highlightedDna2 += dna2Cleaned[i];
        }
    }

    // --- Display Results ---
    if (mutations.length === 0) {
        resultHTML += '<p class="success-message">✅ No mutations found. Sequences are identical.</p>';
    } else {
        resultHTML += `<h3>🧪 Found ${mutations.length} mutation(s):</h3><ul>`;
        mutations.forEach(m => resultHTML += `<li>${m}</li>`);
        resultHTML += '</ul>';

        // Display the sequences with mutations highlighted visually
        resultHTML += `<h4>Visual Comparison:</h4>
                       <div class="sequence-display">
                           <p><strong>Sequence 1:</strong> ${highlightedDna1}</p>
                           <p><strong>Sequence 2:</strong> ${highlightedDna2}</p>
                       </div>`;

        // Add a button to download the list of mutations
        resultHTML += `<div class="download-button-container">
                           <button onclick="downloadMutations('${encodeURIComponent(mutations.join('\n'))}')">Download Mutations List</button>
                       </div>`;

        // --- Illustrative Side Effects Logic ---
        let sideEffects = [];

        // Example 1: High number of mutations (simple threshold)
        if (mutations.length > 10) {
            sideEffects.push("⚠️ A large number of mutations were detected. This could indicate significant genetic variation or potential for altered protein function.");
        }

        // Example 2: Check for specific pre-defined illustrative mutations from KNOWN_MUTATION_IMPACTS
        mutations.forEach(mutationString => {
            const match = mutationString.match(/Position (\d+): (.*) → (.*)/);
            if (match) {
                const position = parseInt(match[1]);
                const fromChar = match[2];
                const toChar = match[3];

                KNOWN_MUTATION_IMPACTS.forEach(known => {
                    if (known.position === position && known.from === fromChar && known.to === toChar) {
                        sideEffects.push(`🧬 Mutation at position ${position} (${fromChar}→${toChar}): ${known.impact}`);
                    }
                });
            }
        });

        // Display side effects if any were found
        if (sideEffects.length > 0) {
            resultHTML += `<br><h4>Possible Implications (Illustrative Examples):</h4><ul>`;
            sideEffects.forEach(effect => {
                resultHTML += `<li>${effect}</li>`;
            });
            resultHTML += '</ul>';
            resultHTML += '<p class="disclaimer"><strong>Disclaimer:</strong> The "Possible Implications" listed are illustrative examples for demonstration purposes only and are not based on real medical or genetic data. This tool is for educational use and not for diagnostic or medical advice. Always consult a qualified healthcare professional for any health concerns.</p>';
        }
    }

    // Finally, update the result box with all generated HTML
    resultBox.innerHTML = resultHTML;
}

/**
 * Creates and triggers a download for a text file containing the list of mutations.
 * @param {string} mutationsString - The URL-encoded string of mutations, where each mutation is on a new line.
 */
function downloadMutations(mutationsString) {
    // Decode the string and ensure proper newlines
    const mutations = decodeURIComponent(mutationsString);
    // Generate a filename with the current date
    const filename = `dna_mutations_${new Date().toISOString().slice(0, 10)}.txt`;
    // Create a Blob containing the mutation data
    const blob = new Blob([mutations], { type: 'text/plain;charset=utf-8' });
    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);
    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Append to body to ensure it's clickable
    a.click(); // Programmatically click the link to trigger download
    document.body.removeChild(a); // Clean up the temporary link
    URL.revokeObjectURL(url); // Release the object URL to free up memory
}
