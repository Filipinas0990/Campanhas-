import axios from 'axios';
import download from 'download';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

import log from '@/logs';

interface IReturn {
	response: string | null;
}

interface IProps {
	link: string;
	type: string;
	file_name: string;
	phone_number_id: string;
	wab_token: string;
	contact?: string;
	caption?: string;
	context?: string;
	onlyId: boolean;
}

export default async function handleOficialApiAWSmedia({
	link,
	type,
	file_name,
	phone_number_id,
	wab_token,
	contact,
	caption,
	onlyId = false,
	context,
}: IProps): Promise<IReturn> {
	const filePath = path.join(__dirname, '..', '..', '..', 'public');

	await download(link, filePath, {
		filename: file_name,
	});

	const fullFilePath = `${filePath}/${file_name}`;

	if (!fs.existsSync(fullFilePath)) {
		throw new Error('File not found');
	}

	const fileStream = fs.createReadStream(fullFilePath);

	const formData = new FormData();
	formData.append('messaging_product', 'whatsapp');
	formData.append('file', fileStream);

	const { data } = await axios.post(
		`https://graph.facebook.com/v16.0/${phone_number_id}/media`,
		formData,
		{
			headers: {
				Authorization: `Bearer ${wab_token}`,
			},
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
		},
	);

	if (!data.id) {
		throw new Error('Error sending media');
	}

	if (onlyId) {
		fs.unlinkSync(fullFilePath);
		return { response: data.id };
	}

	let msgBody = {};

	switch (type) {
		case 'image':
			msgBody = {
				messaging_product: 'whatsapp',
				recipient_type: 'individual',
				to: contact,
				type: 'image',
				context: context
					? {
							message_id: context,
						}
					: null,
				image: {
					id: data.id,
					caption,
				},
			};
			break;
		case 'audio':
			msgBody = {
				messaging_product: 'whatsapp',
				recipient_type: 'individual',
				to: contact,
				type: 'audio',
				context: context
					? {
							message_id: context,
						}
					: null,
				audio: {
					id: data.id,
					caption,
				},
			};
			break;
		case 'video':
			msgBody = {
				messaging_product: 'whatsapp',
				recipient_type: 'individual',
				to: contact,
				type: 'video',
				context: context
					? {
							message_id: context,
						}
					: null,
				video: {
					caption: caption || file_name,
					id: data.id,
				},
			};
			break;
		default:
			log.info({
				module: 'services',
				msg: 'Tipo não existe',
				success: false,
			});
			return { response: null };
	}

	const response = await axios.post(
		`https://graph.facebook.com/v16.0/${phone_number_id}/messages`,
		msgBody,
		{
			headers: { Authorization: `Bearer ${wab_token}` },
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
		},
	);

	fs.unlinkSync(fullFilePath);

	return { response: response.data.messages[0].id };
}
