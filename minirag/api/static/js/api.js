// State management
const state = {
    apiKey: localStorage.getItem('apiKey') || '',
    files: [],
    indexedFiles: [],
    currentPage: 'file-manager'
};

// Utility functions
const showToast = (message, duration = 3000) => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const inner = toast.querySelector('div');
    if (inner) inner.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), duration);
};

const fetchWithAuth = async (url, options = {}) => {
    const headers = {
        ...(options.headers || {}),
        ...(state.apiKey ? { 'Authorization': `Bearer ${state.apiKey}` } : {})
    };
    return fetch(url, { ...options, headers });
};

// Page renderers
const pages = {
    'file-manager': () => `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">File Manager</h2>

            <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input type="file" id="fileInput" multiple accept=".txt,.md,.doc,.docx,.pdf,.pptx" class="hidden">
            </div>
            <div id="uploadProgress" class="hidden mt-4">
                <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
                </div>
                <p class="text-sm text-gray-600 mt-2"><span id="uploadStatus">0</span> files processed</p>
            </div>
            <button id="rescanBtn" class="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" class="mr-2">
                    <path d="M12 4a8 8 0 1 1-8 8H2.5a9.5 9.5 0 1 0 2.8-6.7L2 3v6h6L5.7 6.7A7.96 7.96 0 0 1 12 4z"/>
                </svg>
                Rescan Files
            </button>
            <button id="uploadBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Upload & Index Files
            </button>

            <div id="indexedFiles" class="space-y-2">
                <h3 class="text-lg font-semibold text-gray-700">Indexed Files</h3>
                <div class="space-y-2"></div>
            </div>



        </div>
    `,

    'query': () => `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">Query Database</h2>

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Query Mode</label>
                    <select id="queryMode" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option value="light">Light</option>
                        <option value="naive">Naive</option>
                        <option value="mini">Mini</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700">Query</label>
                    <textarea id="queryInput" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
                </div>

                <button id="queryBtn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Send Query
                </button>

                <div id="queryResult" class="mt-4 p-4 bg-white rounded-lg shadow"></div>
            </div>
        </div>
    `,

    'knowledge-graph': () => `
        <div class="space-y-4 h-full flex flex-col">
            <h2 class="text-2xl font-bold text-gray-800">Knowledge Graph</h2>
            <div class="flex-1 border rounded-lg overflow-hidden shadow-sm relative">
                <iframe id="kgFrame" src="/knowledge_graph.html" class="w-full h-full" frameborder="0"></iframe>
            </div>
            <p class="text-sm text-gray-500">If the graph does not display, ensure knowledge_graph.html has been generated (run graph_with_html.py).</p>
        </div>
    `,
    'file-info': () => `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">File Info</h2>
            <div id="fileInfo" class="p-4 bg-white rounded-lg shadow text-sm text-gray-700">Loading...</div>
            <button onclick="navigate('file-manager')" class="text-blue-600 hover:underline text-sm">&larr; Back</button>
        </div>
    `,

    'status': () => `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">System Status</h2>
            <div id="statusContent" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-6 bg-white rounded-lg shadow-sm">
                    <h3 class="text-lg font-semibold mb-4">System Health</h3>
                    <div id="healthStatus"></div>
                </div>
                <div class="p-6 bg-white rounded-lg shadow-sm">
                    <h3 class="text-lg font-semibold mb-4">Configuration</h3>
                    <div id="configStatus"></div>
                </div>
            </div>
        </div>
    `,

    'settings': () => `
        <div class="space-y-6">
            <h2 class="text-2xl font-bold text-gray-800">Settings</h2>

            <div class="max-w-xl">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">API Key</label>
                        <input type="password" id="apiKeyInput" value="${state.apiKey}"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                    </div>

                    <button id="saveSettings" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    `
};

// Page handlers
const handlers = {
    'file-manager': () => {
        const fileInput = document.getElementById('fileInput');
        const dropZone = fileInput.parentElement.parentElement;
        const fileList = document.querySelector('#fileList div');
        const indexedFiles = document.querySelector('#indexedFiles div');
        const uploadBtn = document.getElementById('uploadBtn');

        const updateFileList = () => {
            fileList.innerHTML = state.files.map(file => `
                <div class="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                    <span>${file.name}</span>
                    <button class="text-red-600 hover:text-red-700" onclick="removeFile('${file.name}')">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            `).join('');
        };

        const updateIndexedFiles = async () => {
            const response = await fetchWithAuth('/health');
            const data = await response.json();
            indexedFiles.innerHTML = data.indexed_files.map(file => {
                const name = file.split(/[/\\]/).pop();
                return `
                <div class=\"flex items-center justify-between bg-white p-3 rounded-lg shadow-sm\">
                    <span class=\"truncate\">${name}</span>
                    <button class=\"text-sm text-blue-600 hover:underline ml-4\" onclick=\"openFileInfo('${encodeURIComponent(name)}')\">Info</button>
                </div>`;
            }).join('');
        };

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-blue-500');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500');
            const files = Array.from(e.dataTransfer.files);
            state.files.push(...files);
            updateFileList();
        });

        fileInput.addEventListener('change', () => {
            state.files.push(...Array.from(fileInput.files));
            updateFileList();
        });

        uploadBtn.addEventListener('click', async () => {
            if (state.files.length === 0) {
                showToast('Please select files to upload');
                return;
            }
            let apiKey = localStorage.getItem('apiKey') || '';
            const progress = document.getElementById('uploadProgress');
            const progressBar = progress.querySelector('div');
            const statusText = document.getElementById('uploadStatus');
            progress.classList.remove('hidden');

            for (let i = 0; i < state.files.length; i++) {
                const formData = new FormData();
                formData.append('file', state.files[i]);

                try {
                    await fetch('/documents/upload', {
                        method: 'POST',
                        headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
                        body: formData
                    });

                    const percentage = ((i + 1) / state.files.length) * 100;
                    progressBar.style.width = `${percentage}%`;
                    statusText.textContent = `${i + 1}/${state.files.length}`;
                } catch (error) {
                    console.error('Upload error:', error);
                }
            }
            progress.classList.add('hidden');
        });

        rescanBtn.addEventListener('click', async () => {
            const progress = document.getElementById('uploadProgress');
            const progressBar = progress.querySelector('div');
            const statusText = document.getElementById('uploadStatus');
            progress.classList.remove('hidden');

            try {
                // Start the scanning process
                const scanResponse = await fetch('/documents/scan', {
                    method: 'POST',
                });

                if (!scanResponse.ok) {
                    throw new Error('Scan failed to start');
                }

                // Start polling for progress
                const pollInterval = setInterval(async () => {
                    const progressResponse = await fetch('/documents/scan-progress');
                    const progressData = await progressResponse.json();

                    // Update progress bar
                    progressBar.style.width = `${progressData.progress}%`;

                    // Update status text
                    if (progressData.total_files > 0) {
                        statusText.textContent = `Processing ${progressData.current_file} (${progressData.indexed_count}/${progressData.total_files})`;
                    }

                    // Check if scanning is complete
                    if (!progressData.is_scanning) {
                        clearInterval(pollInterval);
                        progress.classList.add('hidden');
                        statusText.textContent = 'Scan complete!';
                    }
                }, 1000); // Poll every second

            } catch (error) {
                console.error('Upload error:', error);
                progress.classList.add('hidden');
                statusText.textContent = 'Error during scanning process';
            }
        });


        updateIndexedFiles();
    },

    'query': () => {
        const queryBtn = document.getElementById('queryBtn');
        const queryInput = document.getElementById('queryInput');
        const queryMode = document.getElementById('queryMode');
        const queryResult = document.getElementById('queryResult');

        let apiKey = localStorage.getItem('apiKey') || '';

        queryBtn.addEventListener('click', async () => {
            const query = queryInput.value.trim();
            if (!query) {
                showToast('Please enter a query');
                return;
            }

            queryBtn.disabled = true;
            queryBtn.innerHTML = `
                <svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Processing...
            `;

            try {
                const response = await fetchWithAuth('/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query,
                        mode: queryMode.value,
                        stream: false,
                        only_need_context: false
                    })
                });

                const data = await response.json();
                queryResult.innerHTML = marked.parse(data.response);
            } catch (error) {
                showToast('Error processing query');
            } finally {
                queryBtn.disabled = false;
                queryBtn.textContent = 'Send Query';
            }
        });
    },

    'status': async () => {
        const healthStatus = document.getElementById('healthStatus');
        const configStatus = document.getElementById('configStatus');

        try {
            const response = await fetchWithAuth('/health');
            const data = await response.json();

            healthStatus.innerHTML = `
                <div class="space-y-2">
                    <div class="flex items-center">
                        <div class="w-3 h-3 rounded-full ${data.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'} mr-2"></div>
                        <span class="font-medium">${data.status}</span>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Working Directory: ${data.working_directory}</p>
                        <p class="text-sm text-gray-600">Input Directory: ${data.input_directory}</p>
                        <p class="text-sm text-gray-600">Indexed Files: ${data.indexed_files_count}</p>
                    </div>
                </div>
            `;

            configStatus.innerHTML = Object.entries(data.configuration)
                .map(([key, value]) => `
                    <div class="mb-2">
                        <span class="text-sm font-medium text-gray-700">${key}:</span>
                        <span class="text-sm text-gray-600 ml-2">${value}</span>
                    </div>
                `).join('');
        } catch (error) {
            showToast('Error fetching status');
        }
    },

    'knowledge-graph': () => {
        // Adjust iframe height dynamically (optional if using flex)
        const frame = document.getElementById('kgFrame');
        const resize = () => {
            if (!frame) return;
            frame.style.height = `${window.innerHeight - frame.getBoundingClientRect().top - 24}px`;
        };
        window.addEventListener('resize', resize);
        resize();
    },
    'file-info': () => {
        const params = new URLSearchParams(location.hash.split('?')[1] || '');
        const fname = params.get('f');
        const box = document.getElementById('fileInfo');
        if (!fname) { box.textContent = 'No file selected'; return; }
        box.innerHTML = `<div class=\"space-y-2\">
            <div><span class=\"font-semibold\">Filename:</span> ${fname}</div>
            <div id=\"docMeta\" class=\"text-sm text-gray-600\">Loading document info...</div>
            <div id=\"docChunks\" class=\"mt-4\"></div>
            <div id=\"docEntities\" class=\"mt-4\"></div>
            <div id=\"docRelationships\" class=\"mt-4\"></div>
        </div>`;

        (async () => {
            try {
                const res = await fetch(`/documents/info?filename=${encodeURIComponent(fname)}`);
                if (!res.ok) {
                    document.getElementById('docMeta').textContent = `Error: ${res.status}`;
                    return;
                }
                const data = await res.json();
                const metaEl = document.getElementById('docMeta');
                metaEl.innerHTML = `
                    <div><span class=\"font-semibold\">Doc ID:</span> ${data.doc_id || 'n/a'}</div>
                    <div><span class=\"font-semibold\">Status:</span> ${data.status}</div>
                    <div><span class=\"font-semibold\">Created:</span> ${data.created_at}</div>
                    <div><span class=\"font-semibold\">Updated:</span> ${data.updated_at}</div>
                    <div><span class=\"font-semibold\">Length:</span> ${data.content_length}</div>
                    <div><span class=\"font-semibold\">Chunks:</span> ${data.chunks_count}</div>
                    <div><span class=\"font-semibold\">Metadata:</span> <pre class=\"whitespace-pre-wrap bg-gray-100 p-2 rounded\">${JSON.stringify(data.metadata, null, 2)}</pre></div>
                `;
                // Chunks
                // const chunksEl = document.getElementById('docChunks');
                // if (data.chunks && data.chunks.length) {
                //     const chunkHtml = data.chunks.map(c => `
                //         <div class=\"p-2 border rounded mb-2 bg-white shadow-sm\">
                //             <div class=\"text-xs text-gray-500 mb-1\">Chunk ${c.chunk_order_index ?? ''} (${c.tokens ?? '?'} tokens)</div>
                //             <div class=\"text-sm whitespace-pre-wrap\">${(c.content || '').slice(0, 500)}${(c.content || '').length > 500 ? '...' : ''}</div>
                //         </div>`).join('');
                //     chunksEl.innerHTML = `<h3 class=\"font-semibold mb-2\">Chunks</h3>${chunkHtml}`;
                // } else {
                //     chunksEl.innerHTML = '<h3 class="font-semibold mb-2">Chunks</h3><div class="text-sm text-gray-500">No chunks found</div>';
                // }
                // Entities
                const entEl = document.getElementById('docEntities');
                if (data.entities && data.entities.length) {
                    const entHtml = data.entities.map(e => `
                        <tr>
                            <td class=\"px-2 py-1 border\">${e.entity_name}</td>
                            <td class=\"px-2 py-1 border\">${e.entity_type || ''}</td>
                            <td class=\"px-2 py-1 border text-xs\">${(e.description || '').slice(0,150)}</td>
                        </tr>`).join('');
                    entEl.innerHTML = `<h3 class=\"font-semibold mb-2\">Entities</h3>
                        <div class=\"overflow-x-auto\"><table class=\"min-w-full text-xs border\">
                        <thead><tr class=\"bg-gray-100\"><th class=\"px-2 py-1 border\">Name</th><th class=\"px-2 py-1 border\">Type</th><th class=\"px-2 py-1 border\">Description</th></tr></thead>
                        <tbody>${entHtml}</tbody></table></div>`;
                } else {
                    entEl.innerHTML = '<h3 class="font-semibold mb-2">Entities</h3><div class="text-sm text-gray-500">No entities found</div>';
                }
                // Relationships
                const relEl = document.getElementById('docRelationships');
                if (data.relationships && data.relationships.length) {
                    const relHtml = data.relationships.map(r => `
                        <tr>
                            <td class=\"px-2 py-1 border\">${r.src_id}</td>
                            <td class=\"px-2 py-1 border\">${r.tgt_id}</td>
                            <td class=\"px-2 py-1 border text-xs\">${(r.description || '').slice(0,150)}</td>
                            <td class=\"px-2 py-1 border text-xs\">${r.keywords || ''}</td>
                        </tr>`).join('');
                    relEl.innerHTML = `<h3 class=\"font-semibold mb-2\">Relationships</h3>
                        <div class=\"overflow-x-auto\"><table class=\"min-w-full text-xs border\">
                        <thead><tr class=\"bg-gray-100\"><th class=\"px-2 py-1 border\">Source</th><th class=\"px-2 py-1 border\">Target</th><th class=\"px-2 py-1 border\">Description</th><th class=\"px-2 py-1 border\">Keywords</th></tr></thead>
                        <tbody>${relHtml}</tbody></table></div>`;
                } else {
                    relEl.innerHTML = '<h3 class="font-semibold mb-2">Relationships</h3><div class="text-sm text-gray-500">No relationships found</div>';
                }
            } catch (e) {
                document.getElementById('docMeta').textContent = 'Failed to load document info';
            }
        })();
    },
    'settings': () => {
        const saveBtn = document.getElementById('saveSettings');
        const apiKeyInput = document.getElementById('apiKeyInput');

        saveBtn.addEventListener('click', () => {
            state.apiKey = apiKeyInput.value;
            localStorage.setItem('apiKey', state.apiKey);
            showToast('Settings saved successfully');
        });
    }
};

// Navigation handling
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        document.getElementById('content').innerHTML = pages[page]();
        if (handlers[page]) handlers[page]();
        state.currentPage = page;
    });
});

// Initialize with file manager
document.getElementById('content').innerHTML = pages['file-manager']();
handlers['file-manager']();

// Global functions
window.removeFile = (fileName) => {
    state.files = state.files.filter(file => file.name !== fileName);
    document.querySelector('#fileList div').innerHTML = state.files.map(file => `
        <div class="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
            <span>${file.name}</span>
            <button class="text-red-600 hover:text-red-700" onclick="removeFile('${file.name}')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </button>
        </div>
    `).join('');
};

window.navigate = (page, hashQuery='') => {
    location.hash = page + (hashQuery?`?${hashQuery}`:'');
    document.getElementById('content').innerHTML = pages[page]();
    if (handlers[page]) handlers[page]();
    state.currentPage = page;
};

window.openFileInfo = (fname) => {
    navigate('file-info', `f=${fname}`);
};
