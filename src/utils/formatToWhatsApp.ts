export default function formatToWhatsAppFormat(
	htmlText: string,
	dbMsg: boolean = false,
) {
	try {
		if (!htmlText) {
			return '';
		}

		if (dbMsg) {
			const formattedText = htmlText
				.replace(/<p.*">/gi, '')
				.replace(/<\/p>/gi, '')
				.replace(/&amp;/gi, '&')
				.replace(/&lt;/gi, '<')
				.replace(/&gt;/gi, '>')
				.replace(/&quot;/gi, '"')
				.replace(/&#39;/gi, "'")
				.replace(/<p>/gi, '');

			return formattedText;
		}

		const formattedText = htmlText
			.replace(/<em>\s*(.*?)\s*<\/em>/gi, ' _$1_ ')
			.replace(/<strong>\s*(.*?)\s*<\/strong>/gi, '*$1*')
			.replace(/<p><br><\/p>/g, '\n')
			.replace(/<br[^>]*>/gi, '\n')
			.replace(/<p[^>]*>/gi, '')
			.replace(/<\/p>/gi, '\n')
			.replace(/<span[^>]*>/gi, '')
			.replace(/<\/span>/gi, '')
			.replace(/&nbsp;/gi, '')
			.replace(/&amp;/gi, '&')
			.replace(/&lt;/gi, '<')
			.replace(/&gt;/gi, '>')
			.replace(/&quot;/gi, '"')
			.replace(/&#39;/gi, "'")
			.replace(/<br[^>]*>/gi, '\n')
			.replace(/<strong>|<\/strong>/gi, '*')
			.replace(/<em>|<\/em>/gi, '_')
			.replace(/<del>|<\/del>/gi, '~')
			.replace(/<code>|<\/code>/gi, '```')
			.replace(/[ \t]+/g, ' ');

		// remove /n from end of string
		if (formattedText[formattedText.length - 1] === '\n') {
			return formattedText.slice(0, -1);
		}

		return formattedText;
	} catch (error) {
		throw new Error('Error converting HTML to WhatsApp format.');
	}
}
