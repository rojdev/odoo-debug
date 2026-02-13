document.addEventListener('DOMContentLoaded', () => {
    const modeSelect = document.getElementById('mode');
    const quickToggle = document.getElementById('quickActive');
    const autoToggle = document.getElementById('autoAdd');
    const pauseToggle = document.getElementById('globalPause');
    const container = document.getElementById('domainListContainer');
    const toggleBtn = document.getElementById('toggleList');
    const domainList = document.getElementById('domainList');

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.url) return;
        const currentUrl = new URL(tabs[0].url);

        chrome.storage.sync.get(['odooConfigs', 'isEnabled', 'quickActive', 'autoAdd'], (data) => {
            pauseToggle.checked = data.isEnabled !== false;
            quickToggle.checked = data.quickActive || false;
            autoToggle.checked = data.autoAdd || false;

            const configs = data.odooConfigs || [];
            const currentMatch = configs.find(c => currentUrl.host.includes(c.domain));
            if (currentMatch) modeSelect.value = currentMatch.mode;
            render(configs);
        });
    });

    domainList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const index = parseInt(e.target.dataset.index);
            chrome.storage.sync.get(['odooConfigs'], (data) => {
                let configs = data.odooConfigs || [];
                configs.splice(index, 1);
                chrome.storage.sync.set({ odooConfigs: configs }, () => {
                    render(configs);
                });
            });
        }
    });

    toggleBtn.addEventListener('click', () => {
        const isHidden = container.classList.toggle('hidden');
        toggleBtn.textContent = isHidden ? 'Ver dominios guardados ▼' : 'Ocultar dominios ▲';
    });

    modeSelect.addEventListener('change', () => {
        const newMode = modeSelect.value;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            const url = new URL(tab.url);

            chrome.storage.sync.get(['odooConfigs', 'isEnabled'], (data) => {
                let configs = data.odooConfigs || [];
                let idx = configs.findIndex(c => url.host.includes(c.domain));

                if (idx !== -1) {
                    configs[idx].mode = newMode;
                    chrome.storage.sync.set({ odooConfigs: configs }, () => {
                        if (data.isEnabled !== false) {
                            url.searchParams.set('debug', newMode);
                            chrome.tabs.update(tab.id, { url: url.toString() });
                        }
                        render(configs);
                    });
                }
            });
        });
    });

    quickToggle.addEventListener('change', () => {
        chrome.storage.sync.set({ quickActive: quickToggle.checked });
        chrome.action.setPopup({ popup: quickToggle.checked ? "" : "popup.html" });
    });
    autoToggle.addEventListener('change', () => chrome.storage.sync.set({ autoAdd: autoToggle.checked }));
    pauseToggle.addEventListener('change', () => chrome.storage.sync.set({ isEnabled: pauseToggle.checked }));

    document.getElementById('addCurrent').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const url = new URL(tabs[0].url);
            const mode = modeSelect.value;
            chrome.storage.sync.get(['odooConfigs', 'isEnabled'], (data) => {
                let configs = data.odooConfigs || [];
                if (!configs.some(c => c.domain === url.host)) {
                    configs.push({ domain: url.host, mode });
                    chrome.storage.sync.set({ odooConfigs: configs }, () => {
                        if (data.isEnabled !== false) {
                            url.searchParams.set('debug', mode);
                            chrome.tabs.update(tabs[0].id, { url: url.toString() });
                        }
                        render(configs);
                    });
                }
            });
        });
    });

    function render(configs) {
        domainList.innerHTML = configs.map((c, i) => `
            <div class="domain-item">
                <span><strong>${c.domain}</strong> <small>(${c.mode})</small></span>
                <span class="btn-delete" data-index="${i}">✕</span>
            </div>
        `).join('');
    }
});