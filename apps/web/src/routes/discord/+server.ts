import { redirect } from '@sveltejs/kit';
import { config } from '$server/config';

export const GET = () => redirect(301, config.discordUrl || '/');
