import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Fonction pour convertir le Markdown en HTML fidèle à l'affichage
function markdownToHtml(markdown: string): string {
  // Diviser en lignes pour traiter chaque ligne individuellement
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Titres ### et ####
    if (trimmedLine.startsWith('### ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      const title = trimmedLine.substring(4);
      html += `<h3 style="color: #EF6855; font-size: 16px; font-weight: bold; margin: 18px 0 10px 0; line-height: 1.4;">${title}</h3>`;
    }
    else if (trimmedLine.startsWith('#### ')) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      const title = trimmedLine.substring(5);
      html += `<h4 style="color: #EF6855; font-size: 14px; font-weight: bold; margin: 14px 0 8px 0; line-height: 1.4;">${title}</h4>`;
    }
    // Checkboxes
    else if (trimmedLine.match(/^- \[ \] /)) {
      if (!inList) {
        html += '<ul style="margin: 12px 0; padding-left: 24px; list-style: none;">';
        inList = true;
      }
      const content = trimmedLine.substring(6);
      html += `<li style="margin: 6px 0; color: #374151; font-size: 11pt; line-height: 1.6;"><span style="margin-right: 10px; font-weight: bold; color: #EF6855;">☐</span><span>${content}</span></li>`;
    }
    else if (trimmedLine.match(/^- \[x\] /)) {
      if (!inList) {
        html += '<ul style="margin: 12px 0; padding-left: 24px; list-style: none;">';
        inList = true;
      }
      const content = trimmedLine.substring(6);
      html += `<li style="margin: 6px 0; color: #374151; font-size: 11pt; line-height: 1.6;"><span style="margin-right: 10px; font-weight: bold; color: #10b981;">☑</span><span>${content}</span></li>`;
    }
    // Listes avec puces normales
    else if (trimmedLine.match(/^- /)) {
      if (!inList) {
        html += '<ul style="margin: 8px 0; padding-left: 0; list-style: none;">';
        inList = true;
      }
      const content = trimmedLine.substring(2);
      html += `<li style="margin: 8px 0; padding-left: 20px; color: #374151; font-size: 11pt; line-height: 1.7; position: relative;"><span style="position: absolute; left: 0; color: #374151; font-weight: bold;">•</span>${content}</li>`;
    }
    // Sous-listes (indentées)
    else if (trimmedLine.match(/^  - /)) {
      if (!inList) {
        html += '<ul style="margin: 8px 0; padding-left: 0; list-style: none;">';
        inList = true;
      }
      const content = trimmedLine.substring(4);
      html += `<li style="margin: 6px 0 6px 40px; padding-left: 20px; color: #6b7280; font-size: 10.5pt; line-height: 1.7; position: relative;"><span style="position: absolute; left: 0; color: #6b7280;">○</span>${content}</li>`;
    }
    // Ligne vide
    else if (trimmedLine === '') {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += '<br>';
    }
    // Paragraphe normal
    else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      if (trimmedLine) {
        // Traiter le texte en gras
        const processedLine = trimmedLine.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: bold; color: #1f2937;">$1</strong>');
        html += `<p style="margin: 12px 0; color: #374151; font-size: 11pt; line-height: 1.7;">${processedLine}</p>`;
      }
    }
  }
  
  // Fermer la liste si elle est ouverte
  if (inList) {
    html += '</ul>';
  }
  
  return html;
}

// Fonction pour générer le PDF (résumé seulement)
export async function generatePDF(title: string, summary: string): Promise<void> {
  const doc = new jsPDF();
  
  // Configuration de la page
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPosition = margin;
  
  // Fonction pour ajouter du texte avec retour à la ligne automatique
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: string = '#000000') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(color);
    
    const lines = doc.splitTextToSize(text, contentWidth);
    
    for (const line of lines) {
      if (yPosition > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.4;
    }
    yPosition += 5;
  };
  
  // Fonction pour ajouter un titre
  const addTitle = (text: string, fontSize: number = 16, color: string = '#dc2626') => {
    yPosition += 10;
    addText(text, fontSize, true, color);
    yPosition += 5;
  };
  
  // En-tête
  addTitle(title, 20, '#dc2626');
  addText(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 10, false, '#6b7280');
  yPosition += 15;
  
  // Résumé
  addTitle('RÉSUMÉ', 16, '#dc2626');
  
  // Convertir le Markdown en texte simple pour le PDF
  const cleanSummary = summary
    .replace(/^### (.+)$/gm, '$1')
    .replace(/^#### (.+)$/gm, '$1')
    .replace(/^- (.+)$/gm, '• $1')
    .replace(/^  - (.+)$/gm, '  ○ $1')
    .replace(/^- \[ \] (.+)$/gm, '☐ $1')
    .replace(/^- \[x\] (.+)$/gm, '☑ $1')
    .replace(/\*\*(.+?)\*\*/g, '$1');
  
  addText(cleanSummary, 12, false, '#374151');
  
  // Pied de page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor('#9ca3af');
    doc.text(`Page ${i} sur ${totalPages}`, pageWidth - 30, pageHeight - 10);
  }
  
  // Télécharger le PDF
  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}_rapport.pdf`);
}

// Fonction alternative utilisant jsPDF avec gestion automatique des sauts de page
export async function generatePDFFromHTML(title: string, summary: string): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Configuration des marges et dimensions
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 25;
  const marginBottom = 35;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const maxY = pageHeight - marginBottom;
  
  let yPosition = marginTop;
  
  // Fonction pour vérifier si on doit ajouter une nouvelle page
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > maxY) {
      pdf.addPage();
      yPosition = marginTop;
      return true;
    }
    return false;
  };
  
  // Fonction pour ajouter du texte avec gestion automatique des sauts de ligne et de page
  const addText = (text: string, fontSize: number, isBold: boolean, color: string, lineHeight: number = 1.5) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setTextColor(color);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineSpacing = fontSize * 0.35 * lineHeight;
    
    for (const line of lines) {
      checkPageBreak(lineSpacing);
      pdf.text(line, marginLeft, yPosition);
      yPosition += lineSpacing;
    }
  };
  
  // En-tête avec titre
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor('#EF6855');
  const titleLines = pdf.splitTextToSize(title, contentWidth);
  for (const line of titleLines) {
    pdf.text(line, marginLeft, yPosition);
    yPosition += 10;
  }
  
  // Ligne sous le titre
  pdf.setDrawColor('#EF6855');
  pdf.setLineWidth(0.8);
  pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
  yPosition += 12;
  
  // Parser et afficher le résumé
  const lines = summary.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      yPosition += 3;
      continue;
    }
    
    // Titres ###
    if (line.startsWith('### ')) {
      checkPageBreak(15);
      yPosition += 5;
      const titleText = line.substring(4);
      addText(titleText, 14, true, '#EF6855', 1.3);
      yPosition += 3;
    }
    // Sous-titres ####
    else if (line.startsWith('#### ')) {
      checkPageBreak(12);
      yPosition += 4;
      const titleText = line.substring(5);
      addText(titleText, 12, true, '#EF6855', 1.3);
      yPosition += 2;
    }
    // Checkboxes non cochées
    else if (line.match(/^- \[ \] /)) {
      checkPageBreak(8);
      const content = line.substring(6).replace(/\*\*(.+?)\*\*/g, '$1');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setDrawColor('#EF6855');
      pdf.setLineWidth(0.3);
      // Dessiner un carré vide
      pdf.rect(marginLeft, yPosition - 3, 3, 3);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor('#374151');
      const textLines = pdf.splitTextToSize(content, contentWidth - 8);
      for (const textLine of textLines) {
        pdf.text(textLine, marginLeft + 8, yPosition);
        yPosition += 5.5;
      }
    }
    // Checkboxes cochées
    else if (line.match(/^- \[x\] /)) {
      checkPageBreak(8);
      const content = line.substring(6).replace(/\*\*(.+?)\*\*/g, '$1');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setDrawColor('#10b981');
      pdf.setLineWidth(0.3);
      // Dessiner un carré avec une coche
      pdf.rect(marginLeft, yPosition - 3, 3, 3);
      pdf.setDrawColor('#10b981');
      pdf.setLineWidth(0.5);
      pdf.line(marginLeft + 0.5, yPosition - 1.5, marginLeft + 1.2, yPosition - 0.5);
      pdf.line(marginLeft + 1.2, yPosition - 0.5, marginLeft + 2.5, yPosition - 2.5);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor('#374151');
      const textLines = pdf.splitTextToSize(content, contentWidth - 8);
      for (const textLine of textLines) {
        pdf.text(textLine, marginLeft + 8, yPosition);
        yPosition += 5.5;
      }
    }
    // Listes normales
    else if (line.match(/^- /)) {
      checkPageBreak(8);
      const content = line.substring(2).replace(/\*\*(.+?)\*\*/g, '$1');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor('#374151');
      pdf.text('•', marginLeft, yPosition);
      pdf.setFont('helvetica', 'normal');
      const textLines = pdf.splitTextToSize(content, contentWidth - 8);
      for (const textLine of textLines) {
        pdf.text(textLine, marginLeft + 8, yPosition);
        yPosition += 5.5;
      }
    }
    // Sous-listes
    else if (line.match(/^  - /)) {
      checkPageBreak(8);
      const content = line.substring(4).replace(/\*\*(.+?)\*\*/g, '$1');
      pdf.setFontSize(10.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor('#6b7280');
      pdf.text('○', marginLeft + 10, yPosition);
      const textLines = pdf.splitTextToSize(content, contentWidth - 18);
      for (const textLine of textLines) {
        pdf.text(textLine, marginLeft + 18, yPosition);
        yPosition += 5.5;
      }
    }
    // Paragraphes normaux
    else {
      checkPageBreak(8);
      const content = line.replace(/\*\*(.+?)\*\*/g, '$1');
      addText(content, 11, false, '#374151', 1.6);
      yPosition += 2;
    }
  }
  
  // Ajouter les numéros de page
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(9);
    pdf.setTextColor('#9ca3af');
    pdf.text(
      `Page ${i} sur ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Télécharger le PDF
  const cleanTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  
  pdf.save(`compte_rendu_${cleanTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
}
