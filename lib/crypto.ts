/**
 * End-to-End Encryption (E2EE) Module using Web Crypto API
 * Protocol: ECDH (P-256) for Key Exchange + AES-256-GCM for Symmetric Payload Encryption
 */

// Generate a fresh ECDH keypair
export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        ['deriveKey', 'deriveBits']
    );
}

// Export public key to JSON string for sending to server / peers
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const jwk = await window.crypto.subtle.exportKey('jwk', publicKey);
    return JSON.stringify(jwk);
}

// Import a peer's public key from JSON string
export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        []
    );
}

// Export private key to stored format
async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
    const jwk = await window.crypto.subtle.exportKey('jwk', privateKey);
    return JSON.stringify(jwk);
}

// Import private key from stored format
async function importPrivateKey(jwkString: string): Promise<CryptoKey> {
    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        {
            name: 'ECDH',
            namedCurve: 'P-256',
        },
        true,
        ['deriveKey', 'deriveBits']
    );
}

// Derive a shared AES-GCM 256-bit key from my private key and peer's public key
export async function deriveSharedKey(myPrivateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
    return await window.crypto.subtle.deriveKey(
        {
            name: 'ECDH',
            public: peerPublicKey,
        },
        myPrivateKey,
        {
            name: 'AES-GCM',
            length: 256,
        },
        false,
        ['encrypt', 'decrypt']
    );
}

// Encrypt plaintext with AES-GCM 256
export async function encryptText(plaintext: string, sharedKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random 96-bit (12-byte) IV
    const ivBytes = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: ivBytes,
        },
        sharedKey,
        data
    );

    const ciphertext = bufferToBase64(encryptedBuffer);
    const iv = bufferToBase64(ivBytes.buffer);

    return { ciphertext, iv };
}

// Decrypt ciphertext with AES-GCM 256
export async function decryptText(ciphertext: string, iv: string, sharedKey: CryptoKey): Promise<string> {
    const cipherBuffer = base64ToBuffer(ciphertext);
    const ivBuffer = base64ToBuffer(iv);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: new Uint8Array(ivBuffer),
        },
        sharedKey,
        cipherBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

// Helper: ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// Helper: Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Local Storage Keys Management per user session
export async function getOrGenerateLocalKeyPair(userId: string): Promise<{ keyPair: CryptoKeyPair; publicKeyString: string }> {
    const privKeyKey = `sc_priv_${userId}`;
    const pubKeyKey = `sc_pub_${userId}`;

    const existingPriv = localStorage.getItem(privKeyKey);
    const existingPub = localStorage.getItem(pubKeyKey);

    if (existingPriv && existingPub) {
        try {
            const privateKey = await importPrivateKey(existingPriv);
            const publicKey = await importPublicKey(existingPub);
            return {
                keyPair: { privateKey, publicKey },
                publicKeyString: existingPub
            };
        } catch (e) {
            console.warn('Failed to parse stored keypair, regenerating...', e);
        }
    }

    // Generate new keypair
    const newKeyPair = await generateECDHKeyPair();
    const pubStr = await exportPublicKey(newKeyPair.publicKey);
    const privStr = await exportPrivateKey(newKeyPair.privateKey);

    localStorage.setItem(privKeyKey, privStr);
    localStorage.setItem(pubKeyKey, pubStr);

    return {
        keyPair: newKeyPair,
        publicKeyString: pubStr
    };
}
