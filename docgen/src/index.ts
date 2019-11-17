import { promises as fs } from "fs";
import * as path from "path";

export function raw(string: TemplateStringsArray | string) {
	return { __raw: `${string}` };
}

export function templateGenerator<InType>(helper: (str: InType) => string) {
	type ValueArrayType = (InType | string | { __raw: string })[];
	return (strings: TemplateStringsArray, ...values: ValueArrayType) => {
		const result: ValueArrayType = [];
		strings.forEach((str, i) => {
			result.push(raw(str), values[i] || "");
		});
		return result
			.map(el =>
				typeof (el as { __raw: string }).__raw === "string"
					? (el as { __raw: string }).__raw
					: helper(el as InType)
			)
			.join("");
	};
}

export function escapeHTML(html: string) {
	return html
		.split('"')
		.join("&quot;")
		.split("<")
		.join("&lt;")
		.split(">")
		.join("&gt;")
		.split("&")
		.join("&amp;");
}

export const html_ = templateGenerator((v: string) => escapeHTML(v));
// just html triggers prettier

async function recursiveReaddir(start: string): Promise<string[]> {
	const files = await fs.readdir(start);
	const finalFiles: string[] = [];
	await Promise.all(
		files.map(async f => {
			const fileStats = await fs.stat(path.join(start, f));
			if (fileStats.isDirectory()) {
				finalFiles.push(
					...(await recursiveReaddir(path.join(start, f))).map(r =>
						path.join(f, r)
					)
				);
			} else {
				finalFiles.push(f);
			}
		})
	);
	return finalFiles;
}

async function process(
	path: string[],
	text: string
): Promise<{ html: string; discord: string }> {
	const htmlResult: string[] = [];
	const discordResult: string[] = [];

	const lines = text.split("\n");
	for (const line of lines) {
		if (line.startsWith("## ")) {
			const v = line.substr(3);
			htmlResult.push(html_`<h2>${v}</h2>`);
			discordResult.push(`**${v}**`);
			continue;
		}
		if (line.startsWith("*text*: ")) {
			const v = line.substr(8);
			htmlResult.push(html_`<p>${v}</p>`);
			discordResult.push(v);
			continue;
		}
		if (line.startsWith("*link web=inline*: ")) {
			// todo web=inline
			const v = line.substring(19 + 1, line.length - 1);
			htmlResult.push(
				html_`<p><a href="/${[...path, v].join("/")}">${v}</a></p>`
			);
			discordResult.push(`\`ip!${[...path, v].join(" ")}\``);
			continue;
		}
		if (!line.trim()) {
			discordResult.push("");
			continue;
		}
		if (line.startsWith("*when discord*: ")) {
			const v = line.substr(16);
			discordResult.push(v);
			continue;
		}
		throw new Error(`unrecognized option:::${line}`);
	}

	return { html: htmlResult.join("\n"), discord: discordResult.join("\n") };
}

const dirname = (fullpath: string) =>
	fullpath.substr(0, fullpath.lastIndexOf("/"));

(async () => {
	const start = path.join(__dirname, "../doc");
	const discorddist = path.join(__dirname, "../dist/discord");
	const webdist = path.join(__dirname, "../dist/web");
	const filesToProcess = await recursiveReaddir(start);
	await Promise.all(
		filesToProcess.map(async f => {
			const fileCont = await fs.readFile(path.join(start, f), "utf-8");
			const { html, discord } = await process(
				dirname(f).split("/"),
				fileCont
			);
			const discordfile = path.join(
				discorddist,
				f.replace(/\.dg$/, ".md")
			);
			const webfile = path.join(webdist, f.replace(/\.dg$/, ".html"));
			await fs.mkdir(dirname(discordfile), { recursive: true });
			await fs.mkdir(dirname(webfile), { recursive: true });
			await fs.writeFile(discordfile, discord, "utf-8");
			await fs.writeFile(webfile, html, "utf-8");
		})
	);
})();
