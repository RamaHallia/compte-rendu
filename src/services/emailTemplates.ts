// Convertir Markdown vers HTML simple pour l'éditeur d'email
export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';

  // Nettoyer d'abord le markdown en supprimant les lignes vides avec juste un tiret
  let lines = markdown.split('\n');
  lines = lines.filter(line => {
    // Supprimer les lignes qui sont juste "- " ou "-" ou "  -  " etc.
    const trimmed = line.trim();
    return trimmed !== '-' && trimmed !== '';
  });
  
  let html = lines.join('\n');

  // Titres H3 (###)
  html = html.replace(/^### (.+)$/gm, '<h3 style="color: #EF6855; font-size: 1.17em; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">$1</h3>');

  // Titres H4 (####)
  html = html.replace(/^#### (.+)$/gm, '<h4 style="color: #F7931E; font-size: 1em; font-weight: bold; margin-top: 15px; margin-bottom: 8px;">$1</h4>');

  // Gras (**texte**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italique (*texte*)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Checkboxes non cochées - AVANT les listes normales
  html = html.replace(/^- \[ \] (.+)$/gm, '<p style="margin: 5px 0;">☐ $1</p>');

  // Checkboxes cochées - AVANT les listes normales
  html = html.replace(/^- \[x\] (.+)$/gm, '<p style="margin: 5px 0;">☑ $1</p>');

  // Listes à puces (niveau 1) - uniquement si contenu non vide
  html = html.replace(/^- (.+)$/gm, (match, content) => {
    // Ne pas créer de <li> si le contenu est vide ou juste des espaces
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent === '') {
      return ''; // Supprimer complètement
    }
    return `<li style="margin-left: 20px; margin-bottom: 5px;">${content}</li>`;
  });

  // Envelopper les <li> dans <ul> et nettoyer les <li> vides
  html = html.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (match) => {
    // Supprimer les <li> vides ou avec juste des espaces
    const cleanedMatch = match.replace(/<li[^>]*>\s*<\/li>/g, '');
    if (!cleanedMatch.trim()) return '';
    return `<ul style="list-style-type: disc; margin: 10px 0; padding-left: 20px;">${cleanedMatch}</ul>`;
  });

  // Nettoyer les lignes vides multiples AVANT de convertir en <br>
  html = html.replace(/\n\n+/g, '\n\n');
  
  // Remplacer les retours à la ligne simples par <br>
  html = html.replace(/\n/g, '<br>');
  
  // Nettoyer les <br> multiples consécutifs (max 2 consécutifs)
  html = html.replace(/(<br>\s*){3,}/g, '<br><br>');
  
  // Nettoyer les <br> juste après les balises de fermeture de liste
  html = html.replace(/<\/ul><br>/g, '</ul>');
  html = html.replace(/<\/h3><br>/g, '</h3>');
  html = html.replace(/<\/h4><br>/g, '</h4>');

  return html;
};

interface EmailTemplateData {
  greeting?: string;
  title: string;
  date: string;
  duration?: string;
  participantName?: string;
  participantEmail?: string;
  summary: string;
  attachments?: Array<{ name: string; url: string }>;
  senderName?: string;
  signatureText?: string;
  signatureLogoUrl?: string;
}

export const generateEmailBody = (data: EmailTemplateData): string => {
  const {
    greeting = 'Bonjour',
    title,
    date,
    duration,
    participantName,
    participantEmail,
    summary,
    attachments = [],
    senderName,
    signatureText,
    signatureLogoUrl,
  } = data;

  let htmlBody = `
<p>${greeting},</p>

<p>J'espère que vous allez bien. Suite à notre réunion, je vous transmets le compte-rendu détaillé avec les points clés abordés et les décisions prises.</p>

<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">

<h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px;">Informations de la réunion</h2>

<p><strong>Titre:</strong> ${title}</p>
<p><strong>Date:</strong> ${date}</p>
${duration ? `<p><strong>Durée:</strong> ${duration}</p>` : ''}
${participantName ? `<p><strong>Participant:</strong> ${participantName}</p>` : ''}
${participantEmail ? `<p><strong>Email:</strong> ${participantEmail}</p>` : ''}

<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">

<h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px;">Compte-rendu détaillé</h2>

${markdownToHtml(summary)}

<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
`;

  // Ajouter les pièces jointes si présentes
  if (attachments.length > 0) {
    htmlBody += `
<h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px;">Documents joints</h2>
<ul style="list-style-type: none; padding: 0;">
`;
    attachments.forEach(att => {
      htmlBody += `  <li style="margin-bottom: 8px;">📎 <a href="${att.url}" style="color: #EF6855; text-decoration: none;">${att.name}</a></li>\n`;
    });
    htmlBody += `</ul>

<hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
`;
  }

  // Pied de page
  htmlBody += `
<p>Je reste à votre disposition pour toute question, clarification ou complément d'information concernant ce compte-rendu.</p>

<p>Excellente continuation à vous,</p>

<p><strong>Cordialement,</strong></p>
`;

  // Signature
  if (senderName) {
    htmlBody += `<p>${senderName}</p>`;
  }
  if (signatureText) {
    htmlBody += `<p style="color: #666;">${signatureText}</p>`;
  }
  if (signatureLogoUrl) {
    htmlBody += `<p><img src="${signatureLogoUrl}" alt="Logo" style="max-width: 150px; height: auto;"></p>`;
  }

  return htmlBody;
};

