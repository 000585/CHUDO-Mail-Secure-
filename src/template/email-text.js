export default function emailTextTemplate(text) {
    const escaped = escapeHtml(text || '');
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: monospace; padding: 20px; white-space: pre-wrap; }
    </style>
</head>
<body>${escaped}</body>
</html>`;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
