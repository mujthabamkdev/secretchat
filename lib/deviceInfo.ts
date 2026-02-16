/**
 * Collects all available device and browser information from the client.
 * This data can be used for testing, analytics, and security purposes.
 */
export function collectDeviceInfo(): Record<string, any> {
    const nav = navigator as any;
    const screen = window.screen;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    const info: Record<string, any> = {
        // Browser & UA
        userAgent: nav.userAgent || '',
        platform: nav.platform || '',
        vendor: nav.vendor || '',
        language: nav.language || '',
        languages: (nav.languages || []).join(','),
        cookiesEnabled: nav.cookieEnabled ?? null,
        onLine: nav.onLine ?? null,
        doNotTrack: nav.doNotTrack || null,

        // Screen & Display
        screenWidth: screen.width,
        screenHeight: screen.height,
        screenAvailWidth: screen.availWidth,
        screenAvailHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,

        // Hardware
        hardwareConcurrency: nav.hardwareConcurrency || null,
        maxTouchPoints: nav.maxTouchPoints ?? 0,
        deviceMemory: nav.deviceMemory || null, // Chrome-only

        // Timezone
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
        timezoneOffset: new Date().getTimezoneOffset(),

        // Network (Chrome/Edge/Android browsers)
        connection: conn ? {
            effectiveType: conn.effectiveType || null,
            downlink: conn.downlink || null,
            rtt: conn.rtt || null,
            saveData: conn.saveData || false,
            type: conn.type || null,
        } : null,

        // Media devices
        mediaDevices: !!nav.mediaDevices,

        // WebGL renderer (GPU info)
        gpu: getGPUInfo(),

        // Battery (if available)
        // NOTE: getBattery() is async, handled separately

        // Storage estimate
        storageEstimate: null, // filled async below

        // PDF viewer
        pdfViewerEnabled: nav.pdfViewerEnabled ?? null,

        // Bluetooth
        bluetooth: !!nav.bluetooth,

        // USB
        usb: !!nav.usb,

        // Permissions API available
        permissions: !!nav.permissions,

        // Geolocation available
        geolocation: !!nav.geolocation,

        // Timestamp
        collectedAt: new Date().toISOString(),
    };

    return info;
}

function getGPUInfo(): string | null {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && gl instanceof WebGLRenderingContext) {
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) {
                return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || null;
            }
        }
    } catch (e) { }
    return null;
}

/**
 * Collects async device info (battery, storage) and merges with sync info.
 */
export async function collectFullDeviceInfo(): Promise<Record<string, any>> {
    const info = collectDeviceInfo();

    // Battery API (Chrome, Firefox)
    try {
        const nav = navigator as any;
        if (nav.getBattery) {
            const battery = await nav.getBattery();
            info.battery = {
                charging: battery.charging,
                level: battery.level,
                chargingTime: battery.chargingTime,
                dischargingTime: battery.dischargingTime,
            };
        }
    } catch { }

    // Storage estimate
    try {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            info.storageEstimate = {
                quota: estimate.quota,
                usage: estimate.usage,
            };
        }
    } catch { }

    return info;
}
