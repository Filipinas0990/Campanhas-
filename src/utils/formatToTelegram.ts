export default function formatToTelegramFormat(htmlText: string): string {
	try {
		if (!htmlText) {
			return '';
		}

		let formattedText = htmlText.replace(/<p.*">/gi, '');
		formattedText = formattedText.replace(/<\/p>/gi, '');
		formattedText = formattedText.replace(/<p>/gi, '');
		formattedText = formattedText.replace(/<span.*">/gi, '');
		formattedText = formattedText.replace(/&nbsp;/gi, '');
		formattedText = formattedText.replace(/<\/span>/gi, '');
		formattedText = formattedText.replace(/<br>/gi, '\n');
		formattedText = formattedText.replace(/\*/i, '<strong>');
		formattedText = formattedText.replace(/\*/i, '</strong>');

		return formattedText;
	} catch (error) {
		throw new Error('Erro ao formatar o texto.');
	}
}
