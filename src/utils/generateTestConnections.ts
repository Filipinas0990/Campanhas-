import { IConnections } from '@/services/campaigns/getConnections.service';

export function generateTestConnections(
	connection: IConnections,
	quantity: number,
) {
	const connections = Array.from({ length: quantity }, (_, index) => {
		return {
			...connection,
			id: connection.id,
			name: `${connection.name} - ${index + 1}`,
		};
	});

	connections.unshift(connection);

	return connections as IConnections[];
}
