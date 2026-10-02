import DOMPurify from 'dompurify';

export const sanitise = (html: string) => DOMPurify.sanitize(html);
