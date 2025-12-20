"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSHA256HashForKiteConnect = generateSHA256HashForKiteConnect;
exports.generateSHA256HashFromParamsForKiteConnect = generateSHA256HashFromParamsForKiteConnect;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates SHA-256 hash of concatenated api_key + request_token + api_secret
 * @param apiKey - The API key
 * @param requestToken - The request token
 * @param apiSecret - The API secret
 * @returns SHA-256 hash as a hexadecimal string
 */
function generateSHA256HashForKiteConnect(apiKey, requestToken, apiSecret) {
    const concatenatedString = apiKey + requestToken + apiSecret;
    return crypto_1.default.createHash('sha256').update(concatenatedString).digest('hex');
}
/**
 * Alternative function with object parameter for better readability
 * @param params - Object containing apiKey, requestToken, and apiSecret
 * @returns SHA-256 hash as a hexadecimal string
 */
function generateSHA256HashFromParamsForKiteConnect(params) {
    return generateSHA256HashForKiteConnect(params.apiKey, params.requestToken, params.apiSecret);
}
