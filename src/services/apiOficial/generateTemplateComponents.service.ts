import log from '@/logs';

import { handleOficialApiAWSmedia } from '.';

const variables = [
	'{{1}}',
	'{{2}}',
	'{{3}}',
	'{{4}}',
	'{{5}}',
	'{{6}}',
	'{{7}}',
	'{{8}}',
	'{{9}}',
	'{{10}}',
	'{{11}}',
	'{{12}}',
];

interface IParams {
	type: string;
	text?: string;
	document?: {
		id: string;
	};
	image?: {
		id: string;
	};
	video?: {
		id: string;
	};
	action?: {
		flow_action_data: {
			teste: string;
		};
	};
}

interface IComponent {
	type: string;
	format?: string;
	index?: number;
	text?: string;
	sub_type?: string;
	parameters?: IParams[];
	example?: {
		header_handle: string[];
	};

	buttons?: {
		type: string;
		url: string;
		text: string;
	}[];
}

interface IProps {
	components: IComponent[];
	contact_name: string;
	wab_token: string;
	phone_number_id: string;
	contexts?: string[];
	category?: string;
	button_contexts?: string[];
}

export default async function generateTemplateComponets({
	contexts,
	wab_token,
	components,
	contact_name,
	button_contexts,
	phone_number_id,
}: IProps) {
	const templateComponents: IComponent[] = [];
	const componentsPromises = components.map(async component => {
		try {
			if (
				component.type === 'HEADER' &&
				component?.format &&
				component?.format.toLowerCase() === 'text' &&
				component?.text?.includes(variables[0]) &&
				contact_name
			) {
				templateComponents.push({
					type: 'header',
					parameters: [
						{
							type: 'text',
							text: contact_name,
						},
					],
				});
			}

			if (
				component.type === 'HEADER' &&
				component?.format &&
				component?.format.toLowerCase() === 'image'
			) {
				const { response: mediaId } = await handleOficialApiAWSmedia({
					onlyId: true,
					link: component?.example?.header_handle[0] as string,
					type: 'image',
					file_name: 'header_image.png',
					phone_number_id,
					wab_token,
				});

				if (mediaId) {
					templateComponents.push({
						type: 'header',
						parameters: [
							{
								type: 'image',
								image: {
									id: mediaId,
									// link: component?.example?.header_handle[0],
								},
							},
						],
					});
				}
			}

			if (
				component.type === 'HEADER' &&
				component?.format &&
				component?.format.toLowerCase() === 'document'
			) {
				const { response: mediaId } = await handleOficialApiAWSmedia({
					onlyId: true,
					link: component?.example?.header_handle[0] as string,
					type: 'document',
					file_name: 'body_document.pdf',
					phone_number_id,
					wab_token,
				});

				if (mediaId) {
					templateComponents.push({
						type: 'header',
						parameters: [
							{
								type: 'document',
								document: {
									id: mediaId,
								},
							},
						],
					});
				}
			}

			if (
				component.type === 'HEADER' &&
				component?.format &&
				component?.format.toLowerCase() === 'video'
			) {
				const { response: mediaId } = await handleOficialApiAWSmedia({
					onlyId: true,
					link: component?.example?.header_handle[0] as string,
					type: 'video',
					file_name: 'video.mp4',
					phone_number_id,
					wab_token,
				});

				if (mediaId) {
					templateComponents.push({
						type: 'header',
						parameters: [
							{
								type: 'video',
								video: {
									id: mediaId,
								},
							},
						],
					});
				}
			}

			if (
				component.type === 'BODY' &&
				component?.text &&
				component?.text.includes(variables[0]) &&
				contact_name &&
				!contexts?.length
			) {
				templateComponents.push({
					type: 'body',
					parameters: [
						{
							type: 'text',
							text: contact_name,
						},
					],
				});
			}

			if (
				component &&
				component.type === 'BODY' &&
				component?.text &&
				component?.text.includes(variables[0]) &&
				contexts &&
				contexts.length > 0
			) {
				const parameters: IParams[] = [];
				variables.forEach((variable, index) => {
					if (component.text && component?.text.includes(variable)) {
						parameters.push({
							type: 'text',
							text: contexts[index],
						});
					}
				});

				templateComponents.push({
					type: 'body',
					parameters,
				});
			}

			if (component.type === 'BUTTONS' && component.buttons) {
				component.buttons.forEach((button, buttonIndex) => {
					if (button.type === 'FLOW') {
						templateComponents.push({
							type: 'button',
							sub_type: 'flow',
							index: buttonIndex,
							parameters: [
								{
									type: 'action',
									action: {
										flow_action_data: { teste: 'teste' },
									},
								},
							],
						});
					}

					if (button.type === 'QUICK_REPLY') {
						templateComponents.push({
							type: 'button',
							sub_type: 'quick_reply',
							index: buttonIndex,
							/* parameters: [
                {
                  type: 'payload',
                  payload: 'teste',
                },
              ], */
						});
					}

					if (button.type === 'URL') {
						const parameters_context: IParams[] = [];
						variables.forEach((variable, indexButton) => {
							if (button?.url.includes(variable) && button_contexts) {
								parameters_context.push({
									type: 'TEXT',
									text: button_contexts[indexButton],
								});
							}
						});

						if (parameters_context.length > 0) {
							templateComponents.push({
								type: 'button',
								sub_type: 'url',
								index: buttonIndex,
								parameters: contexts
									? parameters_context
									: [
											{
												type: 'TEXT',
												// url: button?.url,
												text: button?.text,
											},
										],
							});
						}
					}

					if (button.type === 'PHONE_NUMBER') {
						templateComponents.push({
							type: 'button',
							sub_type: 'url',
							index: buttonIndex,
							parameters: [
								{
									type: 'TEXT',
									text: button?.text,
								},
							],
						});
					}
				});
			}
		} catch (error) {
			log.info({
				module: 'services',
				msg: `Erro em generateTemplateComponets - ${error}`,
				success: false,
			});
		}
	});

	await Promise.all(componentsPromises);

	return templateComponents;
}
