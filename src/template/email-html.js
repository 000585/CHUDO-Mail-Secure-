export default function emailHtmlTemplate(content, r2Domain) {
    const processedContent = content.replace(/\{\{domain\}\}/g, escapeHtml(r2Domain));
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' ${escapeHtml(r2Domain)} data:; style-src 'self' 'unsafe-inline';">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    ${processedContent}
</body>
</html>`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
