// Convertir Markdown vers HTML simple pour l'éditeur d'email
export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';

  let html = '';
  const lines = markdown.split('\n');
  let inList = false;
  let listItems: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmedLine = line.trim();

    // Ignorer les lignes vides avec juste un tiret
    if (trimmedLine === '-' || trimmedLine === '') {
      if (inList && listItems.length > 0) {
        // Fermer la liste en cours
        html += '<ul style="list-style-type: disc; margin: 10px 0; padding-left: 30px;">\n';
        listItems.forEach(item => {
          html += `  <li style="margin-bottom: 5px;">${item}</li>\n`;
        });
        html += '</ul>\n';
        inList = false;
        listItems = [];
      }
      if (trimmedLine === '') {
        html += '<br>\n';
      }
      continue;
    }

    // Titres H3 (###)
    if (trimmedLine.startsWith('### ')) {
      if (inList) {
        html += '<ul style="list-style-type: disc; margin: 10px 0; padding-left: 30px;">\n';
        listItems.forEach(item => html += `  <li style="margin-bottom: 5px;">${item}</li>\n`);
        html += '</ul>\n';
        inList = false;
        listItems = [];
      }
      const title = trimmedLine.substring(4);
      html += `<h3 style="color: #EF6855; font-size: 1.2em; font-weight: bold; margin-top: 20px; margin-bottom: 10px;">${title}</h3>\n`;
      continue;
    }

    // Titres H4 (####)
    if (trimmedLine.startsWith('#### ')) {
      if (inList) {
        html += '<ul style="list-style-type: disc; margin: 10px 0; padding-left: 30px;">\n';
        listItems.forEach(item => html += `  <li style="margin-bottom: 5px;">${item}</li>\n`);
        html += '</ul>\n';
        inList = false;
        listItems = [];
      }
      const title = trimmedLine.substring(5);
      html += `<h4 style="color: #F7931E; font-size: 1.1em; font-weight: bold; margin-top: 15px; margin-bottom: 8px;">${title}</h4>\n`;
      continue;
    }

    // Checkboxes
    if (trimmedLine.match(/^-\s+\[\s?\]\s+(.+)$/)) {
      if (inList) {
        html += '<ul style="list-style-type: disc; margin: 10px 0; padding-left: 30px;">\n';
        listItems.forEach(item => html += `  <li style="margin-bottom: 5px;">${item}</li>\n`);
        html += '</ul>\n';
        inList = false;
        listItems = [];
      }
      const content = trimmedLine.match(/^-\s+\[\s?\]\s+(.+)$/)?.[1] || '';
      html += `<p style="margin: 5px 0;">☐ ${content}</p>\n`;
      continue;
    }

    if (trimmedLine.match(/^-\s+\[x\]\s+(.+)$/)) {
      if (inList) {
        html += '<ul style="list-style-type: disc; margin: 10px 0; padding-left: 30px;">\n';
        listItems.forEach(item => html += `  <li style="margin-bottom: 5px;">${item}</li>\n`);
        html += '</ul>\n';
        inList = false;
        listItems = [];
      }
      const content = trimmedLine.match(/^-\s+\[x\]\s+(.+)$/)?.[1] || '';
      html += `<p style="margin: 5px 0;">☑ ${content}</p>\n`;
      continue;
    }

    // Listes à puces
    if (trimmedLine.match(/^-\s+(.+)$/)) {
      const content = trimmedLine.match(/^-\s+(.+)$/)?.[1] || '';
      if (content.trim()) {
        inList = true;
        // Appliquer le gras dans le contenu
        const formattedContent = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        listItems.push(formattedContent);
      }
      continue;
    }

    // Si on arrive ici et qu'on était dans une liste, la fermer
    if (inList) {
      html += '<ul style="list-style-type: disc; margin: 10px 0; padding-left: 30px;">\n';
      listItems.forEach(item => html += `  <li style="margin-bottom: 5px;">${item}</li>\n`);
      html += '</ul>\n';
      inList = false;
      listItems = [];
    }

    // Paragraphe normal
    if (trimmedLine) {
      let formattedLine = trimmedLine;
      // Gras
      formattedLine = formattedLine.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italique
      formattedLine = formattedLine.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      html += `<p style="margin: 8px 0; line-height: 1.6;">${formattedLine}</p>\n`;
    }
  }

  // Fermer la liste si on en a une ouverte à la fin
  if (inList && listItems.length > 0) {
    html += '<ul style="list-style-type: disc; margin: 10px 0; padding-left: 30px;">\n';
    listItems.forEach(item => html += `  <li style="margin-bottom: 5px;">${item}</li>\n`);
    html += '</ul>\n';
  }

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
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compte-rendu de réunion</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff;">
    <p style="margin-bottom: 15px;">${greeting},</p>

    <p style="margin-bottom: 15px;">J'espère que vous allez bien. Suite à notre réunion, je vous transmets le compte-rendu détaillé avec les points clés abordés et les décisions prises.</p>

    <hr style="border: none; border-top: 2px solid #EF6855; margin: 25px 0;">

    <h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px; margin-top: 20px;">Informations de la réunion</h2>

    <table style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="padding: 5px 0;"><strong>Titre:</strong></td>
        <td style="padding: 5px 0;">${title}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0;"><strong>Date:</strong></td>
        <td style="padding: 5px 0;">${date}</td>
      </tr>
      ${duration ? `
      <tr>
        <td style="padding: 5px 0;"><strong>Durée:</strong></td>
        <td style="padding: 5px 0;">${duration}</td>
      </tr>` : ''}
      ${participantName ? `
      <tr>
        <td style="padding: 5px 0;"><strong>Participant:</strong></td>
        <td style="padding: 5px 0;">${participantName}</td>
      </tr>` : ''}
      ${participantEmail ? `
      <tr>
        <td style="padding: 5px 0;"><strong>Email:</strong></td>
        <td style="padding: 5px 0;">${participantEmail}</td>
      </tr>` : ''}
    </table>

    <hr style="border: none; border-top: 2px solid #EF6855; margin: 25px 0;">

    <h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px; margin-top: 20px;">Compte-rendu détaillé</h2>

    <div style="margin: 15px 0;">
      ${markdownToHtml(summary)}
    </div>

    <hr style="border: none; border-top: 2px solid #EF6855; margin: 25px 0;">
`;

  // Ajouter les pièces jointes si présentes
  if (attachments.length > 0) {
    htmlBody += `
    <h2 style="color: #EF6855; font-size: 1.3em; margin-bottom: 15px; margin-top: 20px;">Documents joints</h2>
    <ul style="list-style-type: none; padding: 0; margin: 15px 0;">
`;
    attachments.forEach(att => {
      htmlBody += `      <li style="margin-bottom: 10px; padding: 8px 0;">📎 <a href="${att.url}" style="color: #EF6855; text-decoration: none; font-weight: 500;">${att.name}</a></li>\n`;
    });
    htmlBody += `    </ul>

    <hr style="border: none; border-top: 2px solid #EF6855; margin: 25px 0;">
`;
  }

  // Pied de page
  htmlBody += `
    <p style="margin: 15px 0;">Je reste à votre disposition pour toute question, clarification ou complément d'information concernant ce compte-rendu.</p>

    <p style="margin: 15px 0;">Excellente continuation à vous,</p>

    <p style="margin: 15px 0;"><strong>Cordialement,</strong></p>
`;

  // Signature
  if (senderName) {
    htmlBody += `    <p style="margin: 8px 0; font-size: 1.05em;">${senderName}</p>\n`;
  }
  if (signatureText) {
    htmlBody += `    <p style="margin: 8px 0; color: #666; font-size: 0.95em;">${signatureText}</p>\n`;
  }
  if (signatureLogoUrl) {
    htmlBody += `    <p style="margin: 15px 0 0 0;"><img src="${signatureLogoUrl}" alt="Logo" style="max-width: 150px; height: auto; display: block;"></p>\n`;
  }

  htmlBody += `
  </div>
</body>
</html>`;

  return htmlBody;
};

