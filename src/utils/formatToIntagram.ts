export default function formatToIntagram(htmlText: string): string {
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
		formattedText = formattedText.replace(/<strong>/gi, '');
		formattedText = formattedText.replace(/<\/strong>/gi, '');
		formattedText = formattedText.replace(/<em>/gi, '');
		formattedText = formattedText.replace(/<\/em>/gi, '');
		formattedText = formattedText.replace(/<del>/gi, '');
		formattedText = formattedText.replace(/<\/del>/gi, '');
		formattedText = formattedText.replace(/<code>/gi, '');
		formattedText = formattedText.replace(/<\/code>/gi, '');
		formattedText = formattedText.replace(/\*/g, '');

		return formattedText;
	} catch (error) {
		throw new Error(`Erro ao formatar o texto.${error}`);
	}
}
