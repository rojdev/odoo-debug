let clickTimer = null;

function updateIcon(tabId, urlString, isEnabled) {
    let color = '#95a5a6'; // Gris
    if (!isEnabled) {
        color = '#e74c3c'; // Rojo
    } else if (urlString) {
        try {
            const url = new URL(urlString);
            const debug = url.searchParams.get('debug');
            if (debug === 'assets') color = '#3498db'; 
            else if (debug === '1') color = '#2ecc71';
        } catch(e) {}
    }

    const canvas = new OffscreenCanvas(32, 32);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(0, 0, 32, 32, 8); ctx.fill();
    ctx.fillStyle = "white"; ctx.font = "bold 22px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("O", 16, 16);
    chrome.action.setIcon({ imageData: ctx.getImageData(0, 0, 32, 32), tabId: tabId });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({ id: "openConfig", title: "⚙️ Configuración Odoo Debug", contexts: ["action"] });
});
chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "openConfig") chrome.runtime.openOptionsPage();
});

chrome.action.onClicked.addListener((tab) => {
    if (clickTimer !== null) {
        clearTimeout(clickTimer);
        clickTimer = null;
        handleQuickAction(tab, 'assets');
    } else {
        clickTimer = setTimeout(() => {
            clickTimer = null;
            handleQuickAction(tab, '1');
        }, 250);
    }
});

async function handleQuickAction(tab, mode) {
    const data = await chrome.storage.sync.get(['isEnabled', 'autoAdd', 'odooConfigs']);
    if (data.isEnabled === false) return;

    const url = new URL(tab.url);
    let configs = data.odooConfigs || [];

    if (data.autoAdd && !configs.some(c => url.host === c.domain)) {
        configs.push({ domain: url.host, mode: mode });
        await chrome.storage.sync.set({ odooConfigs: configs });
    }

    url.searchParams.set('debug', mode);
    chrome.tabs.update(tab.id, { url: url.toString() });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url?.startsWith('http')) {
        chrome.storage.sync.get(['odooConfigs', 'isEnabled', 'quickActive'], (data) => {
            const isEnabled = data.isEnabled !== false;
            chrome.action.setPopup({ popup: data.quickActive ? "" : "popup.html" });

            if (isEnabled && changeInfo.status === 'loading') {
                const url = new URL(tab.url);
                const match = (data.odooConfigs || []).find(c => url.host.includes(c.domain));
                if (match && !url.searchParams.has('debug')) {
                    url.searchParams.set('debug', match.mode);
                    chrome.tabs.update(tabId, { url: url.toString() });
                }
            }
            updateIcon(tabId, tab.url, isEnabled);
        });
    }
});