import { supabase } from '../lib/supabase';

interface ShortenUrlResponse {
  shortUrl: string;
  shortCode: string;
}

export const shortenUrl = async (longUrl: string): Promise<string> => {
  try {
    // Appeler la fonction Edge de Supabase
    const { data, error } = await supabase.functions.invoke('shorten-url', {
      body: { longUrl }
    });

    if (error) {
      return longUrl; // Retourner l'URL originale en cas d'erreur
    }

    return data.shortUrl || longUrl;
  } catch (error) {
    return longUrl; // Retourner l'URL originale en cas d'erreur
  }
};

// Fonction alternative utilisant un service tiers (bit.ly, tinyurl, etc.)
export const shortenUrlWithBitly = async (longUrl: string): Promise<string> => {
  // Cette fonction nécessiterait une clé API Bitly
  // Pour l'instant, on retourne l'URL originale
  return longUrl;
};

// Fonction pour créer un lien court simple basé sur l'ID du fichier
export const createSimpleShortUrl = (fileUrl: string): string => {
  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const fileId = pathParts[pathParts.length - 2] || 'file';
    
    // Créer un lien plus court en utilisant seulement les parties importantes
    return `${url.origin}/storage/v1/object/public/meeting-attachments/${fileId}/${fileName}`;
  } catch (error) {
    return fileUrl;
  }
};

// Fonction pour afficher une URL raccourcie lisible (POUR AFFICHAGE SEULEMENT)
export const formatUrlForDisplay = (url: string, maxLength: number = 50): string => {
  if (url.length <= maxLength) {
    return url;
  }
  
  try {
    const urlObj = new URL(url);
    const fileName = urlObj.pathname.split('/').pop() || 'document';
    return `${urlObj.origin}/.../${fileName}`;
  } catch (error) {
    // Si l'URL n'est pas valide, la tronquer simplement
    return url.substring(0, maxLength) + '...';
  }
};

// Fonction pour obtenir un nom de fichier court à partir de l'URL
export const getShortFileName = (url: string, fileName: string): string => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const actualFileName = pathParts[pathParts.length - 1];
    
    // Si le nom du fichier est trop long, le raccourcir
    if (actualFileName.length > 40) {
      const ext = actualFileName.split('.').pop() || '';
      const nameWithoutExt = actualFileName.substring(0, actualFileName.length - ext.length - 1);
      return `${nameWithoutExt.substring(0, 30)}...${ext}`;
    }
    
    return actualFileName;
  } catch (error) {
    return fileName;
  }
};

// Fonction pour formater un lien avec texte d'ancrage
export const formatLinkForEmail = (url: string, displayText?: string): string => {
  const text = displayText || getShortFileName(url, 'Télécharger');
  return `${text}\n${url}`;
};

