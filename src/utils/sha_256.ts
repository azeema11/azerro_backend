import crypto from 'crypto';

/**
 * Generates SHA-256 hash of concatenated api_key + request_token + api_secret
 * @param apiKey - The API key
 * @param requestToken - The request token
 * @param apiSecret - The API secret
 * @returns SHA-256 hash as a hexadecimal string
 */
export function generateSHA256HashForKiteConnect(apiKey: string, requestToken: string, apiSecret: string): string {
    const concatenatedString = apiKey + requestToken + apiSecret;
    return crypto.createHash('sha256').update(concatenatedString).digest('hex');
}

/**
 * Alternative function with object parameter for better readability
 * @param params - Object containing apiKey, requestToken, and apiSecret
 * @returns SHA-256 hash as a hexadecimal string
 */
export function generateSHA256HashFromParamsForKiteConnect(params: {
    apiKey: string;
    requestToken: string;
    apiSecret: string;
}): string {
    return generateSHA256HashForKiteConnect(params.apiKey, params.requestToken, params.apiSecret);
}
