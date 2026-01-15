import type { PathLike } from 'node:fs';
import { glob, stat } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Command } from '../commands/index.js';
import { predicate as commandPredicate } from '../commands/index.js';
import type { Event } from '../events/index.js';
import { predicate as eventPredicate } from '../events/index.js';

/**
 * A predicate to check if the structure is valid
 */
export type StructurePredicate<Structure> = (structure: unknown) => structure is Structure;

/**
 * Loads all the structures in the provided directory
 *
 * @param dir - The directory to load the structures from
 * @param predicate - The predicate to check if the structure is valid
 * @param recursive - Whether to recursively load the structures in the directory
 * @returns
 */
export async function loadStructures<Structure>(
	dir: PathLike,
	predicate: StructurePredicate<Structure>,
	recursive = true,
): Promise<Structure[]> {
	// Get the stats of the directory
	const statDir = await stat(dir);

	// If the provided directory path is not a directory, throw an error
	if (!statDir.isDirectory()) {
		throw new Error(`The directory '${dir}' is not a directory.`);
	}

	// Create an empty array to store the structures
	const structures: Structure[] = [];

	// Create a glob pattern to match the .js files
	const basePath = dir instanceof URL ? fileURLToPath(dir) : dir.toString();
	const extensions = ['js', 'ts'];
	const pattern = resolve(basePath, recursive ? `**/*.{${extensions.join(',')}}` : `*.{${extensions.join(',')}}`);

	// Loop through all the matching files in the directory
	for await (const file of glob(pattern)) {
		const fileBase = basename(file);
		if (fileBase === 'index.js' || fileBase === 'index.ts') {
			continue;
		}

		// Import the structure dynamically from the file
		const specifier = pathToFileURL(file).href;
		const { default: structure } = await import(specifier);

		// If the default export is a valid structure, add it
		if (predicate(structure)) {
			structures.push(structure);
		}
	}

	return structures;
}

export async function loadCommands(dir: PathLike, recursive = true): Promise<Map<string, Command>> {
	return (await loadStructures(dir, commandPredicate, recursive)).reduce(
		(acc, cur) => acc.set(cur.data.name, cur),
		new Map<string, Command>(),
	);
}

export async function loadEvents(dir: PathLike, recursive = true): Promise<Event[]> {
	return loadStructures(dir, eventPredicate, recursive);
}
