/**
 * Convertit le Markdown en HTML pour l'envoi d'emails
 */
export const convertMarkdownToHTML = (markdown: string): string => {
  let html = markdown;

  // Titres ### -> <h3>
  html = html.replace(/^### (.+)$/gm, '<h3 style="color: #EF6855; font-size: 1.17em; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">$1</h3>');
  
  // Titres #### -> <h4>
  html = html.replace(/^#### (.+)$/gm, '<h4 style="color: #6B4423; font-size: 1.1em; font-weight: bold; margin-top: 15px; margin-bottom: 8px;">$1</h4>');

  // Gras **texte** -> <strong>
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italique *texte* -> <em>
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Checkboxes
  html = html.replace(/^- \[ \] (.+)$/gm, '<div style="margin-left: 20px; margin-bottom: 5px;">☐ $1</div>');
  html = html.replace(/^- \[x\] (.+)$/gm, '<div style="margin-left: 20px; margin-bottom: 5px;">☑ $1</div>');

  // Listes avec tirets -> <ul><li>
  html = html.replace(/^- (.+)$/gm, (match, content) => {
    // Ne pas convertir si c'est déjà une checkbox
    if (match.includes('☐') || match.includes('☑')) {
      return match;
    }
    return `<li style="margin-left: 20px; margin-bottom: 5px;">${content}</li>`;
  });

  // Envelopper les listes consécutives dans <ul>
  html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, (match) => {
    return `<ul style="list-style-type: disc; margin: 10px 0; padding-left: 20px;">\n${match}</ul>\n`;
  });

  // Sauts de ligne -> <br>
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
};

/**
 * Crée le corps HTML complet pour un email
 */
export const createEmailHTML = (params: {
  greeting: string;
  title: string;
  date: string;
  duration?: string;
  participantInfo?: string;
  summary: string;
  attachmentInfo?: string;
  senderName?: string;
  signatureText?: string;
  signatureLogoUrl?: string;
}): string => {
  const {
    greeting,
    title,
    date,
    duration,
    participantInfo,
    summary,
    attachmentInfo,
    senderName,
    signatureText,
    signatureLogoUrl,
  } = params;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  
  <div style="background: linear-gradient(135deg, #FFF5F0 0%, #FFE8DC 100%); padding: 30px; border-radius: 15px; margin-bottom: 20px; border: 2px solid #FFD4BA;">
    <h1 style="color: #EF6855; margin: 0 0 10px 0; font-size: 1.8em;">${title}</h1>
    <p style="color: #6B4423; margin: 0; font-size: 0.95em;">Compte-rendu de réunion</p>
  </div>

  <div style="background-color: white; padding: 30px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 20px;">
    <p style="font-size: 1em; margin-bottom: 20px;">${greeting},</p>
    
    <p style="margin-bottom: 25px;">J'espère que vous allez bien. Suite à notre réunion, je vous transmets le compte-rendu détaillé avec les points clés abordés et les décisions prises.</p>

    <div style="border-top: 2px solid #FFE8DC; padding-top: 20px; margin-bottom: 25px;">
      <h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px;">📅 Informations de la réunion</h2>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${date}</p>
      ${duration ? `<p style="margin: 5px 0;"><strong>Durée:</strong> ${duration}</p>` : ''}
      ${participantInfo ? participantInfo.split('\n').map(line => `<p style="margin: 5px 0;">${line}</p>`).join('') : ''}
    </div>

    <div style="border-top: 2px solid #FFE8DC; padding-top: 20px; margin-bottom: 25px;">
      <h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px;">📋 Compte-rendu détaillé</h2>
      ${convertMarkdownToHTML(summary)}
    </div>

    ${attachmentInfo ? `
    <div style="border-top: 2px solid #FFE8DC; padding-top: 20px; margin-bottom: 25px;">
      <h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px;">📎 Documents joints</h2>
      ${attachmentInfo.split('\n').map(line => `<p style="margin: 5px 0;">${line}</p>`).join('')}
    </div>
    ` : ''}

    <div style="border-top: 2px solid #FFE8DC; padding-top: 20px;">
      <p style="margin-bottom: 15px;">Je reste à votre disposition pour toute question, clarification ou complément d'information concernant ce compte-rendu.</p>
      <p style="margin-bottom: 5px;">Excellente continuation à vous,</p>
      <p style="margin-bottom: 10px; font-weight: bold;">Cordialement,</p>
      ${senderName ? `<p style="margin: 5px 0; font-weight: bold; color: #EF6855;">${senderName}</p>` : ''}
      ${signatureText ? `<p style="margin: 5px 0; white-space: pre-line;">${signatureText}</p>` : ''}
      ${signatureLogoUrl ? `<img src="${signatureLogoUrl}" alt="Logo" style="max-width: 150px; margin-top: 10px;" />` : ''}
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 0.85em;">
    <p>Ce compte-rendu a été généré automatiquement</p>
  </div>

</body>
</html>
  `.trim();
};

