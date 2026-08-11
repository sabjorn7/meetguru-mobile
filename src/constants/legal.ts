import * as WebBrowser from 'expo-web-browser';

/** Public legal documents on the website (open without login — required for Google Play). */
export const LEGAL_URLS = {
  terms: 'https://app.meetgu.ru/oferta', // Условия использования / пользовательское соглашение
  privacy: 'https://app.meetgu.ru/politica', // Политика конфиденциальности
} as const;

/** Open a legal document in the in-app browser (matches existing WebBrowser usage). */
export const openLegal = (url: string) => WebBrowser.openBrowserAsync(url);
