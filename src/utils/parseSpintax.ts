export default async function parseSpintax(
	formated_message: string,
	array_of_greeting_message: string[],
	array_of_goodbye_message: string[],
): Promise<string> {
	let resultMessage = formated_message;

	if (array_of_greeting_message) {
		const greetingRandomMessage =
			array_of_greeting_message[
				Math.round(Math.random() * (array_of_greeting_message.length - 1))
			];

		if (greetingRandomMessage) {
			resultMessage = `${greetingRandomMessage}\n${resultMessage}\n`;
		}
	}

	if (array_of_goodbye_message) {
		const goodbyeRandomMessage =
			array_of_goodbye_message[
				Math.round(Math.random() * (array_of_goodbye_message.length - 1))
			];

		if (goodbyeRandomMessage) {
			resultMessage = `${resultMessage}\n${goodbyeRandomMessage}\n`;
		}
	}

	return resultMessage;
}
